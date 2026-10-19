import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, jobsApi } from '@/api/endpoints';
import type { ApplicationStatus, JobApplication } from '@/api/types';
import { useSession } from '@/auth/useAuth';
import { Badge, Button, EmptyState, PageHeader, Select, Skeleton } from '@/components/ui';
import { ErrorState, SafeParagraphs, useToast } from '@/components/feedback';
import { APPLICATION_STATUS_LABEL, formatDate } from '@/lib/format';
import { decodeEntities, safeHttpUrl } from '@/lib/safe';
import { chatLink } from '@/features/chat/chatLink';
import { CandidateSummary, SaveToPoolButton } from './CandidateCard';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const STATUSES = Object.keys(APPLICATION_STATUS_LABEL) as ApplicationStatus[];

function scoreTone(score: number) {
  if (score >= 75) return 'success' as const;
  if (score >= 40) return 'warning' as const;
  return 'neutral' as const;
}

export default function JobApplicationsPage() {
  useDocumentTitle("Candidatos da vaga");
  const { id = '' } = useParams();
  const session = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [view, setView] = useState<'list' | 'board'>('list');
  const job = useQuery({ queryKey: ['jobs', 'detail', id], queryFn: ({ signal }) => jobsApi.get(id, signal) });
  const apps = useQuery({ queryKey: ['applications', 'job', id], queryFn: ({ signal }) => applicationsApi.forJob(id, signal) });

  const updateStatus = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: ApplicationStatus }) => applicationsApi.updateStatus(appId, status),
    onMutate: async ({ appId, status }) => {
      await qc.cancelQueries({ queryKey: ['applications', 'job', id] });
      const prev = qc.getQueryData<JobApplication[]>(['applications', 'job', id]);
      qc.setQueryData<JobApplication[]>(['applications', 'job', id], (old) => old?.map((a) => (a.id === appId ? { ...a, status } : a)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['applications', 'job', id], ctx.prev);
      toast(e.message, 'danger');
    },
    onSuccess: () => {
      toast('Status atualizado.');
      void qc.invalidateQueries({ queryKey: ['analytics', 'employer'] });
    },
  });

  return (
    <div>
      <Link to="/empresa/vagas" className="text-sm text-primary hover:underline">← Minhas vagas</Link>
      <PageHeader title="Candidatos" description={job.data ? decodeEntities(job.data.title) : undefined} />
      {apps.data && apps.data.length > 0 && (
        <div className="mb-4 inline-flex rounded-full border border-border p-1 text-sm font-semibold" role="group" aria-label="Modo de exibição">
          {(['list', 'board'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={view === v ? 'rounded-full bg-primary px-4 py-1.5 text-primary-fg' : 'rounded-full px-4 py-1.5 text-muted hover:text-fg'}
            >
              {v === 'list' ? 'Lista' : 'Quadro por etapa'}
            </button>
          ))}
        </div>
      )}
      {apps.isPending ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : apps.isError ? (
        <ErrorState error={apps.error} onRetry={() => void apps.refetch()} />
      ) : apps.data.length === 0 ? (
        <EmptyState title="Nenhuma candidatura ainda" description="Assim que alguém se candidatar, aparece aqui ordenado por compatibilidade." />
      ) : view === 'board' ? (
        <KanbanBoard apps={apps.data} onMove={(appId, status) => updateStatus.mutate({ appId, status })} />
      ) : (
        <ul className="flex flex-col gap-3">
          {apps.data.map((a) => {
            const resume = safeHttpUrl(a.resume_url);
            return (
              <li key={a.id}>
                <CandidateSummary
                  email={a.applicant?.email}
                  profile={a.applicant?.candidate_profile}
                  extra={
                    <div className="mt-3 flex flex-col gap-2 text-sm">
                      <p className="text-muted">
                        Candidatou-se em {formatDate(a.created_at)}
                        {a.is_knocked_out && <> · <Badge tone="danger">Reprovado na triagem</Badge></>}
                      </p>
                      {a.cover_letter && (
                        <details>
                          <summary className="cursor-pointer text-primary">Carta de apresentação</summary>
                          <SafeParagraphs text={a.cover_letter} className="mt-2 text-muted" />
                        </details>
                      )}
                      {resume && (
                        <a href={resume} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline">
                          Abrir currículo externo ↗
                        </a>
                      )}
                    </div>
                  }
                  actions={
                    <>
                      <Badge tone={scoreTone(a.match_score)}>{a.match_score}% compatível</Badge>
                      <Select
                        aria-label="Status da candidatura"
                        className="h-8 w-auto"
                        value={a.status}
                        disabled={updateStatus.isPending && updateStatus.variables?.appId === a.id}
                        onChange={(e) => updateStatus.mutate({ appId: a.id, status: e.target.value as ApplicationStatus })}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABEL[s]}</option>)}
                      </Select>
                      {session && (
                        <Button size="sm" variant="secondary" onClick={() => navigate(chatLink({ jobId: id, employerId: session.user.id, candidateId: a.applicant_id }))}>
                          Mensagem
                        </Button>
                      )}
                      <SaveToPoolButton candidateId={a.applicant_id} />
                    </>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Quadro por etapa: arraste o cartão para outra coluna para mudar o status. */
function KanbanBoard({ apps, onMove }: { apps: JobApplication[]; onMove: (appId: string, status: ApplicationStatus) => void }) {
  const [over, setOver] = useState<ApplicationStatus | null>(null);
  return (
    <div className="grid gap-4 overflow-x-auto pb-2 md:grid-cols-5">
      {STATUSES.map((status) => {
        const items = apps.filter((a) => a.status === status);
        return (
          <section
            key={status}
            aria-label={APPLICATION_STATUS_LABEL[status]}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver((o) => (o === status ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData('text/plain');
              const app = apps.find((a) => a.id === id);
              if (app && app.status !== status) onMove(id, status);
            }}
            className={`min-h-40 min-w-56 rounded-2xl border p-3 transition-colors ${over === status ? 'border-primary bg-primary-soft' : 'border-border bg-surface-2'}`}
          >
            <h3 className="mb-3 flex items-center justify-between text-sm font-bold">
              {APPLICATION_STATUS_LABEL[status]}
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{items.length}</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {items.map((a) => (
                <li
                  key={a.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)}
                  className="cursor-grab rounded-xl border border-border bg-surface p-3 text-sm shadow-card active:cursor-grabbing"
                >
                  <p className="truncate font-semibold">{a.applicant?.candidate_profile?.full_name || a.applicant?.email || 'Candidato'}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <Badge tone={scoreTone(a.match_score)}>{a.match_score}%</Badge>
                    <Select
                      aria-label="Mover para"
                      className="h-8 w-auto text-xs"
                      value={a.status}
                      onChange={(e) => onMove(a.id, e.target.value as ApplicationStatus)}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABEL[s]}</option>)}
                    </Select>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
