import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints';
import type { AdminCompany, VerificationStatus } from '@/api/types';
import { Badge, Button, EmptyState, PageHeader, Pagination, Select, Skeleton } from '@/components/ui';
import { ErrorState, SafeText, useToast } from '@/components/feedback';
import { VERIFICATION_LABEL, formatDate } from '@/lib/format';
import { errorMessage } from '@/lib/http';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const STATUS_TONE: Record<VerificationStatus, 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export default function AdminCompaniesPage() {
  useDocumentTitle('Empresas');
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<VerificationStatus | ''>('');

  const q = useQuery({
    queryKey: ['admin', 'companies', status, page],
    queryFn: ({ signal }) => adminApi.listCompanies({ status: status || undefined, page, limit: 10 }, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'companies'] });
    void qc.invalidateQueries({ queryKey: ['analytics', 'admin'] });
  };

  const act = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      approve ? adminApi.approveCompany(id) : adminApi.rejectCompany(id),
    onSuccess: (_d, v) => {
      toast(v.approve ? 'Empresa aprovada.' : 'Empresa reprovada.');
      invalidate();
    },
    onError: (e) => toast(errorMessage(e), 'danger'),
  });

  return (
    <div>
      <PageHeader title="Empresas" description="Todas as empresas cadastradas, em qualquer status de verificação." />
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="st" className="text-sm text-muted">Status</label>
        <Select id="st" className="max-w-[14rem]" value={status} onChange={(e) => { setStatus(e.target.value as VerificationStatus | ''); setPage(1); }}>
          <option value="">Todos</option>
          {(Object.keys(VERIFICATION_LABEL) as VerificationStatus[]).map((s) => <option key={s} value={s}>{VERIFICATION_LABEL[s]}</option>)}
        </Select>
      </div>

      {q.isPending ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.data.length === 0 ? (
        <EmptyState title="Nenhuma empresa encontrada" />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {q.data.data.map((c: AdminCompany) => (
              <li key={c.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-card p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium"><SafeText>{c.nome_fantasia || 'Sem nome'}</SafeText></p>
                  <p className="text-sm text-muted">
                    {c.user?.email ?? '-'} · CNPJ {c.cnpj ?? 'não informado'} · cadastrada em {formatDate(c.created_at)}
                  </p>
                  {c.endereco && <p className="text-sm text-muted"><SafeText>{c.endereco}</SafeText></p>}
                  {c.verification_document_url ? (
                    <p className="text-sm">Documento enviado (acesso via endpoint autenticado, ver contrato)</p>
                  ) : (
                    <p className="text-sm text-warning">Sem documento enviado</p>
                  )}
                </div>
                <Badge tone={STATUS_TONE[c.verification_status]}>{VERIFICATION_LABEL[c.verification_status]}</Badge>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={act.isPending || c.verification_status === 'APPROVED'} onClick={() => act.mutate({ id: c.id, approve: true })}>
                    Aprovar
                  </Button>
                  <Button size="sm" variant="danger-outline" disabled={act.isPending || c.verification_status === 'REJECTED'} onClick={() => act.mutate({ id: c.id, approve: false })}>
                    Reprovar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={q.data.meta.total_pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
