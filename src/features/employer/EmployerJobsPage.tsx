import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/api/endpoints';
import type { Job, JobStatus } from '@/api/types';
import { Badge, Button, ConfirmDialog, EmptyState, PageHeader, Pagination, Select, Skeleton, buttonClass } from '@/components/ui';
import { ErrorState, SafeText, useToast } from '@/components/feedback';
import { CONTRACT_LABEL, JOB_STATUS_LABEL, WORK_MODEL_LABEL, formatDate } from '@/lib/format';
import { RENEW_DAYS, expiryState, renewedExpiry } from '@/lib/jobExpiry';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const STATUS_TONE: Record<JobStatus, 'neutral' | 'primary' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  ACTIVE: 'success',
  FILLED: 'primary',
  REJECTED: 'danger',
};

export default function EmployerJobsPage() {
  useDocumentTitle("Minhas vagas");
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [toDelete, setToDelete] = useState<Job | null>(null);
  const [toRenew, setToRenew] = useState<Job | null>(null);

  const q = useQuery({
    queryKey: ['jobs', 'mine', { page, status }],
    queryFn: ({ signal }) => jobsApi.mine({ page, limit: 10, status }, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const del = useMutation({
    mutationFn: (id: string) => jobsApi.remove(id),
    onSuccess: () => {
      setToDelete(null);
      toast('Vaga removida.');
      void qc.invalidateQueries({ queryKey: ['jobs'] });
      void qc.invalidateQueries({ queryKey: ['analytics', 'employer'] });
    },
    onError: (e) => toast(e.message, 'danger'),
  });

  const renew = useMutation({
    mutationFn: (id: string) => jobsApi.update(id, { expires_at: renewedExpiry() }),
    onSuccess: () => {
      setToRenew(null);
      toast('Prazo renovado.');
      void qc.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (e) => toast(e.message, 'danger'),
  });

  return (
    <div>
      <PageHeader
        title="Minhas vagas"
        description="Vagas novas passam por análise antes de ficarem públicas."
        actions={<Link to="/empresa/vagas/nova" className={buttonClass()}>Publicar vaga</Link>}
      />
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="st" className="text-sm text-muted">Status</label>
        <Select id="st" className="max-w-[12rem]" value={status} onChange={(e) => { setStatus(e.target.value as JobStatus | ''); setPage(1); }}>
          <option value="">Todos</option>
          {(Object.keys(JOB_STATUS_LABEL) as JobStatus[]).map((s) => <option key={s} value={s}>{JOB_STATUS_LABEL[s]}</option>)}
        </Select>
      </div>

      {q.isPending ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.data.length === 0 ? (
        <EmptyState title="Nenhuma vaga ainda" description="Publique sua primeira vaga para começar a receber candidatos." />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {q.data.data.map((job) => (
              <li key={job.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-card p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium"><SafeText>{job.title}</SafeText></p>
                  <p className="text-sm text-muted">
                    {WORK_MODEL_LABEL[job.work_model]} · {CONTRACT_LABEL[job.contract_type]} · criada em {formatDate(job.created_at)}
                  </p>
                  <ExpiryNote expiresAt={job.expires_at} />
                </div>
                <Badge tone={STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/empresa/vagas/${encodeURIComponent(job.id)}/candidatos`} className={buttonClass('secondary', 'sm')}>Candidatos</Link>
                  <Link to={`/empresa/vagas/${encodeURIComponent(job.id)}/editar`} className={buttonClass('secondary', 'sm')}>Editar</Link>
                  <Link to={`/empresa/vagas/nova?copiar=${encodeURIComponent(job.id)}`} className={buttonClass('secondary', 'sm')}>Duplicar</Link>
                  {job.expires_at && expiryState(job.expires_at).state !== 'ok' && (
                    <Button size="sm" variant="secondary" onClick={() => setToRenew(job)}>Renovar prazo</Button>
                  )}
                  <Button size="sm" variant="danger-ghost" onClick={() => setToDelete(job)}>Remover</Button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={q.data.meta.total_pages} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!toRenew}
        title="Renovar prazo da vaga?"
        description={`O novo prazo de inscrição será de ${RENEW_DAYS} dias a partir de hoje. Vagas já publicadas podem passar por uma nova análise antes de voltar ao ar.`}
        confirmLabel="Renovar"
        tone="primary"
        loading={renew.isPending}
        onConfirm={() => toRenew && renew.mutate(toRenew.id)}
        onClose={() => setToRenew(null)}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Remover vaga?"
        description="A vaga deixa de aparecer para candidatos. As candidaturas recebidas são mantidas."
        confirmLabel="Remover"
        loading={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

/** Aviso de prazo na lista: só aparece quando falta pouco ou já venceu. */
function ExpiryNote({ expiresAt }: { expiresAt: string | null | undefined }) {
  const { state, daysLeft } = expiryState(expiresAt);
  if (state === 'expired') return <p className="text-sm font-semibold text-danger">Inscrições encerradas em {formatDate(expiresAt as string)}</p>;
  if (state === 'soon') return <p className="text-sm font-semibold text-warning">Inscrições terminam {daysLeft <= 1 ? 'em menos de 1 dia' : `em ${daysLeft} dias`}</p>;
  return null;
}
