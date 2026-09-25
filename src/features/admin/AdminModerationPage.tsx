import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints';
import { Button, Card, EmptyState, Input, PageHeader, Pagination, Skeleton, cx } from '@/components/ui';
import { ErrorState, SafeText, useToast } from '@/components/feedback';
import { CONTRACT_LABEL, WORK_MODEL_LABEL, formatDate } from '@/lib/format';
import { UUID_RE } from './uuid';

type Tab = 'jobs' | 'companies';

export default function AdminModerationPage() {
  const [tab, setTab] = useState<Tab>('jobs');
  return (
    <div>
      <PageHeader title="Moderação" description="Aprove ou reprove vagas e empresas antes de ficarem públicas." />
      <div role="tablist" aria-label="Tipo de moderação" className="mb-6 inline-flex rounded-lg border border-border bg-surface p-1">
        {(
          [
            ['jobs', 'Vagas pendentes'],
            ['companies', 'Empresas pendentes'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cx('rounded-md px-4 py-1.5 text-sm font-medium', tab === k ? 'bg-primary text-primary-fg' : 'text-muted hover:text-fg')}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'jobs' ? <PendingJobs /> : <PendingCompanies />}
    </div>
  );
}

function useModerationAction(kind: Tab) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }): Promise<unknown> =>
      kind === 'jobs'
        ? approve ? adminApi.approveJob(id) : adminApi.rejectJob(id)
        : approve ? adminApi.approveCompany(id) : adminApi.rejectCompany(id),
    onSuccess: (_d, v) => {
      toast(v.approve ? 'Aprovado.' : 'Reprovado.');
      void qc.invalidateQueries({ queryKey: ['admin'] });
      void qc.invalidateQueries({ queryKey: ['analytics', 'admin'] });
      void qc.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (e) => toast(e.message, 'danger'),
  });
}

function PendingJobs() {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['admin', 'jobs', 'PENDING', page], queryFn: ({ signal }) => adminApi.listJobs({ status: 'PENDING', page, limit: 10 }, signal), retry: false });
  const act = useModerationAction('jobs');
  return (
    <div className="flex flex-col gap-6">
      {q.isPending ? (
        <Skeleton className="h-40" />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} pending={{ endpoint: 'GET /admin/jobs?status=PENDING', feature: 'Fila de vagas pendentes' }} />
      ) : q.data.data.length === 0 ? (
        <EmptyState title="Nenhuma vaga pendente" />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {q.data.data.map((j) => (
              <li key={j.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-card p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <Link to={`/vagas/${encodeURIComponent(j.id)}`} className="font-medium hover:text-primary"><SafeText>{j.title}</SafeText></Link>
                  <p className="text-sm text-muted">
                    <SafeText>{j.employer?.company_profile?.nome_fantasia ?? '-'}</SafeText> · {WORK_MODEL_LABEL[j.work_model]} · {CONTRACT_LABEL[j.contract_type]} · {formatDate(j.created_at)}
                  </p>
                </div>
                <ApproveReject disabled={act.isPending} onApprove={() => act.mutate({ id: j.id, approve: true })} onReject={() => act.mutate({ id: j.id, approve: false })} />
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={q.data.meta.total_pages} onChange={setPage} />
        </>
      )}
      <ManualAction kind="jobs" />
    </div>
  );
}

function PendingCompanies() {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['admin', 'companies', 'PENDING', page], queryFn: ({ signal }) => adminApi.listCompanies({ status: 'PENDING', page, limit: 10 }, signal), retry: false });
  const act = useModerationAction('companies');
  return (
    <div className="flex flex-col gap-6">
      {q.isPending ? (
        <Skeleton className="h-40" />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} pending={{ endpoint: 'GET /admin/companies?status=PENDING', feature: 'Fila de empresas pendentes' }} />
      ) : q.data.data.length === 0 ? (
        <EmptyState title="Nenhuma empresa pendente" />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {q.data.data.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-card p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium"><SafeText>{c.nome_fantasia}</SafeText></p>
                  <p className="text-sm text-muted">
                    {c.user?.email ?? '-'} · CNPJ {c.cnpj ?? 'não informado'} · {formatDate(c.created_at)}
                  </p>
                  {c.verification_document_url ? (
                    <p className="text-sm">Documento enviado (acesso via endpoint autenticado, ver contrato)</p>
                  ) : (
                    <p className="text-sm text-warning">Sem documento enviado</p>
                  )}
                </div>
                <ApproveReject disabled={act.isPending} onApprove={() => act.mutate({ id: c.id, approve: true })} onReject={() => act.mutate({ id: c.id, approve: false })} />
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={q.data.meta.total_pages} onChange={setPage} />
        </>
      )}
      <ManualAction kind="companies" />
    </div>
  );
}

function ApproveReject({ onApprove, onReject, disabled }: { onApprove: () => void; onReject: () => void; disabled?: boolean }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={onApprove} disabled={disabled}>Aprovar</Button>
      <Button size="sm" variant="danger-outline" onClick={onReject} disabled={disabled}>Reprovar</Button>
    </div>
  );
}

/** Funciona HOJE com os endpoints existentes (PATCH approve/reject por ID). */
function ManualAction({ kind }: { kind: Tab }) {
  const [id, setId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const act = useModerationAction(kind);
  const run = (approve: boolean) => (e?: FormEvent) => {
    e?.preventDefault();
    const v = id.trim();
    if (!UUID_RE.test(v)) return setErr('Informe um ID (UUID) válido.');
    setErr(null);
    act.mutate({ id: v, approve }, { onSuccess: () => setId('') });
  };
  return (
    <Card>
      <h2 className="text-sm font-semibold">Moderar por ID</h2>
      <p className="mt-1 text-xs text-muted">{kind === 'jobs' ? 'ID da vaga.' : 'ID do perfil da empresa (CompanyProfile.id).'}</p>
      <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={run(true)}>
        <Input aria-label="ID" placeholder="00000000-0000-0000-0000-000000000000" value={id} onChange={(e) => setId(e.target.value)} className="font-mono" />
        <Button type="submit" loading={act.isPending && act.variables?.approve}>Aprovar</Button>
        <Button variant="danger-outline" onClick={() => run(false)()} disabled={act.isPending}>Reprovar</Button>
      </form>
      {err && <p className="mt-2 text-xs text-danger" role="alert">{err}</p>}
    </Card>
  );
}
