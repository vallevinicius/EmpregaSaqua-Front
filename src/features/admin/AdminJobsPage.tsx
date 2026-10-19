import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints';
import type { Job, JobStatus } from '@/api/types';
import { Badge, Button, ConfirmDialog, EmptyState, PageHeader, Pagination, Select, Skeleton, buttonClass } from '@/components/ui';
import { ErrorState, SafeText, useToast } from '@/components/feedback';
import { CONTRACT_LABEL, JOB_STATUS_LABEL, WORK_MODEL_LABEL, formatDate } from '@/lib/format';
import { errorMessage } from '@/lib/http';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const STATUS_TONE: Record<JobStatus, 'neutral' | 'primary' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  ACTIVE: 'success',
  FILLED: 'primary',
  REJECTED: 'danger',
};

export default function AdminJobsPage() {
  useDocumentTitle('Vagas');
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [toDelete, setToDelete] = useState<Job | null>(null);

  const q = useQuery({
    queryKey: ['admin', 'jobs', status, page],
    queryFn: ({ signal }) => adminApi.listJobs({ status: status || undefined, page, limit: 10 }, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    void qc.invalidateQueries({ queryKey: ['analytics', 'admin'] });
    void qc.invalidateQueries({ queryKey: ['jobs'] });
  };

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) => adminApi.updateJob(id, { status }),
    onSuccess: () => {
      toast('Status atualizado.');
      invalidate();
    },
    onError: (e) => toast(errorMessage(e), 'danger'),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminApi.deleteJob(id),
    onSuccess: () => {
      setToDelete(null);
      toast('Vaga removida.');
      invalidate();
    },
    onError: (e) => toast(errorMessage(e), 'danger'),
  });

  return (
    <div>
      <PageHeader title="Vagas" description="Todas as vagas da plataforma, em qualquer status." />
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="st" className="text-sm text-muted">Status</label>
        <Select id="st" className="max-w-[12rem]" value={status} onChange={(e) => { setStatus(e.target.value as JobStatus | ''); setPage(1); }}>
          <option value="">Todos</option>
          {(Object.keys(JOB_STATUS_LABEL) as JobStatus[]).map((s) => <option key={s} value={s}>{JOB_STATUS_LABEL[s]}</option>)}
        </Select>
      </div>

      {q.isPending ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.data.length === 0 ? (
        <EmptyState title="Nenhuma vaga encontrada" />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {q.data.data.map((job) => (
              <li key={job.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-card p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <Link to={`/vagas/${encodeURIComponent(job.id)}`} className="font-medium hover:text-primary"><SafeText>{job.title}</SafeText></Link>
                  <p className="text-sm text-muted">
                    <SafeText>{job.employer?.company_profile?.nome_fantasia ?? '-'}</SafeText> · {WORK_MODEL_LABEL[job.work_model]} · {CONTRACT_LABEL[job.contract_type]} · criada em {formatDate(job.created_at)}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    aria-label={`Mudar status de ${job.title}`}
                    className="h-9 w-auto"
                    value={job.status}
                    disabled={changeStatus.isPending}
                    onChange={(e) => changeStatus.mutate({ id: job.id, status: e.target.value as JobStatus })}
                  >
                    {(Object.keys(JOB_STATUS_LABEL) as JobStatus[]).map((s) => <option key={s} value={s}>{JOB_STATUS_LABEL[s]}</option>)}
                  </Select>
                  <Link to={`/vagas/${encodeURIComponent(job.id)}`} className={buttonClass('secondary', 'sm')}>Ver</Link>
                  <Button size="sm" variant="danger-ghost" onClick={() => setToDelete(job)}>Remover</Button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={q.data.meta.total_pages} onChange={setPage} />
        </>
      )}

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
