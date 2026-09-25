import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints';
import type { Role } from '@/api/types';
import { useSession } from '@/auth/useAuth';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, PageHeader, Pagination, Select, Skeleton } from '@/components/ui';
import { ErrorState, useToast } from '@/components/feedback';
import { ROLE_LABEL, formatDate } from '@/lib/format';
import { UUID_RE } from './uuid';

const ROLES = Object.keys(ROLE_LABEL) as Role[];

type Pending = { kind: 'role'; id: string; role: Role; label: string } | { kind: 'delete'; id: string; label: string };

export default function AdminUsersPage() {
  const session = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [pending, setPending] = useState<Pending | null>(null);

  const q = useQuery({
    queryKey: ['admin', 'users', roleFilter, page],
    queryFn: ({ signal }) => adminApi.listUsers({ role: roleFilter, page, limit: 20 }, signal),
    retry: false,
  });

  const act = useMutation({
    mutationFn: (p: Pending) => (p.kind === 'role' ? adminApi.updateUserRole(p.id, p.role) : adminApi.deleteUser(p.id)),
    onSuccess: (_d, p) => {
      setPending(null);
      toast(p.kind === 'role' ? 'Permissão atualizada.' : 'Usuário removido.');
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      void qc.invalidateQueries({ queryKey: ['analytics', 'admin'] });
    },
    onError: (e) => toast(e.message, 'danger'),
  });

  /** Impede o admin de rebaixar/remover a si mesmo e ficar sem acesso. O back também deveria bloquear. */
  const request = (p: Pending) => {
    if (p.id === session?.user.id) {
      toast('Você não pode alterar ou remover a sua própria conta por aqui.', 'danger');
      return;
    }
    setPending(p);
  };

  return (
    <div>
      <PageHeader title="Usuários" />
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="rf" className="text-sm text-muted">Perfil</label>
        <Select id="rf" className="max-w-[12rem]" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as Role | ''); setPage(1); }}>
          <option value="">Todos</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
      </div>

      {q.isPending ? (
        <Skeleton className="h-60" />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} pending={{ endpoint: 'GET /admin/users', feature: 'Listagem de usuários' }} />
      ) : q.data.data.length === 0 ? (
        <EmptyState title="Nenhum usuário" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <tr><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Criado em</th><th className="px-4 py-3"><span className="sr-only">Ações</span></th></tr>
              </thead>
              <tbody>
                {q.data.data.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{u.email}{u.deleted_at && <> <Badge tone="danger">anonimizado</Badge></>}</td>
                    <td className="px-4 py-3">
                      <Select
                        aria-label={`Perfil de ${u.email}`}
                        className="h-8 w-auto"
                        value={u.role}
                        disabled={u.id === session?.user.id}
                        onChange={(e) => request({ kind: 'role', id: u.id, role: e.target.value as Role, label: u.email })}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="danger-ghost" disabled={u.id === session?.user.id} onClick={() => request({ kind: 'delete', id: u.id, label: u.email })}>Remover</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={q.data.meta.total_pages} onChange={setPage} />
        </>
      )}

      <ManualUserAction onRequest={request} />

      <ConfirmDialog
        open={!!pending}
        title={pending?.kind === 'delete' ? 'Remover usuário?' : 'Alterar permissão?'}
        description={
          pending?.kind === 'delete'
            ? `${pending.label} será removido permanentemente, com todos os dados relacionados.`
            : pending
              ? `${pending.label} passará a ter o perfil ${ROLE_LABEL[pending.role]}.${pending.role === 'ADMIN' ? ' Isso concede acesso total à plataforma.' : ''}`
              : undefined
        }
        confirmLabel={pending?.kind === 'delete' ? 'Remover' : 'Confirmar'}
        tone={pending?.kind === 'role' && pending.role !== 'ADMIN' ? 'primary' : 'danger'}
        loading={act.isPending}
        onConfirm={() => pending && act.mutate(pending)}
        onClose={() => setPending(null)}
      />
    </div>
  );
}

function ManualUserAction({ onRequest }: { onRequest: (p: Pending) => void }) {
  const [id, setId] = useState('');
  const [role, setRole] = useState<Role>('JOB_SEEKER');
  const [err, setErr] = useState<string | null>(null);
  const valid = () => {
    if (!UUID_RE.test(id.trim())) {
      setErr('Informe um ID (UUID) válido.');
      return false;
    }
    setErr(null);
    return true;
  };
  return (
    <Card className="mt-6">
      <h2 className="text-sm font-semibold">Ação por ID</h2>
      <p className="mt-1 text-xs text-muted">Funciona com os endpoints atuais enquanto a listagem não existe.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_12rem]">
        <Field label="ID do usuário">{({ id: fid }) => <Input id={fid} className="font-mono" value={id} onChange={(e) => setId(e.target.value)} />}</Field>
        <Field label="Novo perfil">
          {({ id: fid }) => (
            <Select id={fid} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
          )}
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={() => valid() && onRequest({ kind: 'role', id: id.trim(), role, label: id.trim() })}>Alterar perfil</Button>
        <Button variant="danger-outline" onClick={() => valid() && onRequest({ kind: 'delete', id: id.trim(), label: id.trim() })}>Remover usuário</Button>
      </div>
      {err && <p className="mt-2 text-xs text-danger" role="alert">{err}</p>}
    </Card>
  );
}
