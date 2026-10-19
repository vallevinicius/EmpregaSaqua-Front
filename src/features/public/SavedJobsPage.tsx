import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobAlertsApi } from '@/api/endpoints';
import { useSession } from '@/auth/useAuth';
import { PageHeader, EmptyState, Button, buttonClass, CardSectionTitle, Skeleton } from '@/components/ui';
import { SafeText, useToast } from '@/components/feedback';
import { BellIcon, MapPinIcon, TrashIcon } from '@/components/icons';
import { errorMessage } from '@/lib/http';
import { removeSavedJob, useSavedJobs } from '@/lib/savedJobs';
import { CONTRACT_LABEL, WORK_MODEL_LABEL, relativeDate } from '@/lib/format';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function SavedJobsPage() {
  useDocumentTitle('Vagas salvas');
  const jobs = useSavedJobs();
  const session = useSession();
  return (
    <div>
      <PageHeader title="Vagas salvas" description="Guardadas neste navegador. Toque no coração de uma vaga para salvar ou remover." />
      {jobs.length === 0 ? (
        <EmptyState
          title="Você ainda não salvou nenhuma vaga"
          description="Salve as vagas que interessam para decidir depois."
          action={<Link to="/" className={buttonClass('primary')}>Ver vagas</Link>}
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {jobs.map((j) => (
            <li key={j.id} className="flex items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <Link to={`/vagas/${encodeURIComponent(j.id)}`} className="text-lg font-bold hover:text-primary hover:underline">
                  <SafeText>{j.title}</SafeText>
                </Link>
                <p className="truncate text-muted"><SafeText>{j.company}</SafeText></p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                  <MapPinIcon size={15} /> <SafeText>{j.address}</SafeText>
                  <span className="ml-2 text-xs">Salva {relativeDate(j.saved_at)}</span>
                </p>
              </div>
              <Button variant="danger-ghost" size="sm" onClick={() => removeSavedJob(j.id)} aria-label={`Remover ${j.title} das vagas salvas`}>
                <TrashIcon size={14} /> Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      {session?.user.role === 'JOB_SEEKER' && (
        <div className="mt-10">
          <MyJobAlerts />
        </div>
      )}
    </div>
  );
}

function MyJobAlerts() {
  const toast = useToast();
  const qc = useQueryClient();
  const alerts = useQuery({ queryKey: ['job-alerts', 'mine'], queryFn: ({ signal }) => jobAlertsApi.mine(signal) });
  const remove = useMutation({
    mutationFn: (id: string) => jobAlertsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-alerts', 'mine'] });
      toast('Alerta removido.', 'success');
    },
    onError: (e) => toast(errorMessage(e), 'danger'),
  });

  if (alerts.isPending) return <Skeleton className="h-24" />;
  if (alerts.isError || alerts.data.length === 0) return null;

  return (
    <div>
      <CardSectionTitle icon={<BellIcon size={18} />} title="Meus alertas de vaga" />
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {alerts.data.map((a) => {
          const criteria = [
            a.keyword && `“${a.keyword}”`,
            a.address,
            a.work_model && WORK_MODEL_LABEL[a.work_model],
            a.contract_type && CONTRACT_LABEL[a.contract_type],
            a.is_pcd && 'Vagas PcD',
          ].filter(Boolean);
          return (
            <li key={a.id} className="flex items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-semibold"><SafeText>{criteria.join(' · ') || 'Qualquer vaga nova'}</SafeText></p>
                <p className="mt-1 text-xs text-muted">Criado {relativeDate(a.created_at)}</p>
              </div>
              <Button
                variant="danger-ghost"
                size="sm"
                onClick={() => remove.mutate(a.id)}
                disabled={remove.isPending}
                aria-label="Remover alerta"
              >
                <TrashIcon size={14} /> Remover
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
