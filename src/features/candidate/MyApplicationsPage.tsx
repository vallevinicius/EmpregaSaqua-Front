import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, jobsApi } from '@/api/endpoints';
import type { Application, ApplicationStatus, Job } from '@/api/types';
import { useSession } from '@/auth/useAuth';
import { Badge, Button, ConfirmDialog, EmptyState, PageHeader, Skeleton, cx } from '@/components/ui';
import { ErrorState, SafeText, useToast } from '@/components/feedback';
import { APPLICATION_STATUS_LABEL, formatDate } from '@/lib/format';
import { chatLink } from '@/features/chat/chatLink';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const STATUS_TONE: Record<ApplicationStatus, 'neutral' | 'primary' | 'success' | 'warning' | 'danger'> = {
  APPLIED: 'neutral',
  REVIEWING: 'primary',
  INTERVIEW: 'warning',
  HIRED: 'success',
  REJECTED: 'danger',
};

export default function MyApplicationsPage() {
  useDocumentTitle("Minhas candidaturas");
  const session = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [toWithdraw, setToWithdraw] = useState<Application | null>(null);

  const apps = useQuery({ queryKey: ['applications', 'mine'], queryFn: ({ signal }) => applicationsApi.mine(signal) });

  // GET /applications não inclui a vaga: buscamos cada uma (cacheadas). Trade-off: N requisições.
  // O ideal é o back fazer include('job') — ver BACKEND_CONTRACT.md.
  const jobIds = [...new Set((apps.data ?? []).map((a) => a.job_id))];
  const jobs = useQueries({
    queries: jobIds.map((id) => ({
      queryKey: ['jobs', 'detail', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => jobsApi.get(id, signal),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  const jobById = new Map<string, Job>();
  jobs.forEach((q, i) => {
    const id = jobIds[i];
    if (q.data && id) jobById.set(id, q.data);
  });

  const withdraw = useMutation({
    mutationFn: (id: string) => applicationsApi.withdraw(id),
    onSuccess: () => {
      setToWithdraw(null);
      toast('Candidatura retirada.');
      void qc.invalidateQueries({ queryKey: ['applications', 'mine'] });
    },
    onError: (e) => toast(e.message, 'danger'),
  });

  const list = [...(apps.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div>
      <PageHeader title="Minhas candidaturas" description="Acompanhe o status das vagas em que você se inscreveu." />
      {apps.isPending ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : apps.isError ? (
        <ErrorState error={apps.error} onRetry={() => void apps.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title="Você ainda não se candidatou" description="Encontre vagas perto de você." action={<Link to="/" className="text-sm font-medium text-primary hover:underline">Ver vagas</Link>} />
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((app) => {
            const job = jobById.get(app.job_id);
            return (
              <li key={app.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-card p-4 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {job ? (
                      <Link to={`/vagas/${encodeURIComponent(job.id)}`} className="hover:text-primary"><SafeText>{job.title}</SafeText></Link>
                    ) : (
                      <span className="text-muted">Vaga indisponível</span>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {job?.employer?.company_profile?.nome_fantasia && <><SafeText>{job.employer.company_profile.nome_fantasia}</SafeText> · </>}
                    Enviada em {formatDate(app.created_at)}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[app.status]}>{APPLICATION_STATUS_LABEL[app.status]}</Badge>
                <div className="flex gap-2">
                  {job && session && (
                    <Button size="sm" variant="secondary" onClick={() => navigate(chatLink({ jobId: job.id, employerId: job.employer_id, candidateId: session.user.id }))}>
                      Mensagem
                    </Button>
                  )}
                  {app.status !== 'HIRED' && (
                    <Button size="sm" variant="danger-ghost" onClick={() => setToWithdraw(app)}>Retirar</Button>
                  )}
                </div>
                <StatusSteps status={app.status} knockedOut={app.is_knocked_out} />
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={!!toWithdraw}
        title="Retirar candidatura?"
        description="A empresa deixará de ver sua candidatura. Essa ação não pode ser desfeita."
        confirmLabel="Retirar"
        loading={withdraw.isPending}
        onConfirm={() => toWithdraw && withdraw.mutate(toWithdraw.id)}
        onClose={() => setToWithdraw(null)}
      />
    </div>
  );
}

const STEPS: { status: ApplicationStatus; label: string }[] = [
  { status: 'APPLIED', label: 'Enviada' },
  { status: 'REVIEWING', label: 'Em análise' },
  { status: 'INTERVIEW', label: 'Entrevista' },
  { status: 'HIRED', label: 'Contratado' },
];

/** Linha do tempo da candidatura. Não selecionado interrompe a linha e explica o motivo quando é a triagem. */
function StatusSteps({ status, knockedOut }: { status: ApplicationStatus; knockedOut: boolean }) {
  if (status === 'REJECTED') {
    return (
      <p className="text-sm text-danger sm:basis-full">
        {knockedOut ? 'Não selecionado na triagem: suas respostas não atenderam aos requisitos da vaga.' : 'Não selecionado para esta vaga.'}
      </p>
    );
  }
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="flex items-center gap-2 text-xs sm:basis-full" aria-label="Etapas da candidatura">
      {STEPS.map((s, i) => (
        <li key={s.status} className="flex flex-1 items-center gap-2" aria-current={i === current ? 'step' : undefined}>
          <span className={cx('flex size-6 shrink-0 items-center justify-center rounded-full font-bold', i <= current ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-muted')}>
            {i < current ? '✓' : i + 1}
          </span>
          <span className={cx('hidden sm:inline', i === current ? 'font-bold text-fg' : 'text-muted')}>{s.label}</span>
          {i < STEPS.length - 1 && <span aria-hidden className={cx('h-px flex-1', i < current ? 'bg-primary' : 'bg-border')} />}
        </li>
      ))}
    </ol>
  );
}
