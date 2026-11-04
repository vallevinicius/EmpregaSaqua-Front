import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobAlertsApi } from '@/api/endpoints';
import type { JobAlert } from '@/api/types';
import { Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, Skeleton, buttonClass } from '@/components/ui';
import { BellIcon } from '@/components/icons';
import { ErrorState, SafeText, useToast } from '@/components/feedback';
import { alertCriteria, MAX_ALERTS } from '@/lib/alerts';
import { formatDate } from '@/lib/format';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

/** Alertas criados na busca de vagas ("Avise-me de vagas assim"): aqui o candidato vê o que está acompanhando e remove. */
export default function MyAlertsPage() {
  useDocumentTitle('Meus alertas');
  const qc = useQueryClient();
  const toast = useToast();
  const [toRemove, setToRemove] = useState<JobAlert | null>(null);

  const alerts = useQuery({ queryKey: ['job-alerts', 'mine'], queryFn: ({ signal }) => jobAlertsApi.mine(signal) });

  const remove = useMutation({
    mutationFn: (id: string) => jobAlertsApi.remove(id),
    onSuccess: () => {
      setToRemove(null);
      toast('Alerta removido. Você não receberá mais e-mails dele.');
      void qc.invalidateQueries({ queryKey: ['job-alerts', 'mine'] });
    },
    onError: (e) => toast(e.message, 'danger'),
  });

  const list = alerts.data ?? [];

  return (
    <>
      <PageHeader
        title="Meus alertas de vagas"
        description="Você recebe um e-mail quando surge uma vaga que combina com um dos alertas abaixo."
        actions={
          <Link to="/" className={buttonClass('secondary', 'md')}>
            Buscar vagas
          </Link>
        }
      />

      {alerts.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : alerts.isError ? (
        <ErrorState error={alerts.error} onRetry={() => void alerts.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          title="Você ainda não tem alertas"
          description='Faça uma busca (por exemplo, por bairro) e clique em "Avise-me de vagas assim". Pronto: o aviso vem por e-mail.'
          action={
            <Link to="/" className={buttonClass('primary', 'md')}>
              Ir para a busca de vagas
            </Link>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            {list.length} de {MAX_ALERTS} alertas usados.
          </p>
          <ul className="flex flex-col gap-3">
            {list.map((a) => (
              <li key={a.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs text-muted">
                      <BellIcon size={14} /> Criado em {formatDate(a.created_at)}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {alertCriteria(a).map((c) => (
                        <li key={c}>
                          <Badge tone="primary">
                            <SafeText>{c}</SafeText>
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setToRemove(a)}>
                    Remover
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={toRemove !== null}
        title="Remover este alerta?"
        description="Você deixa de receber e-mails sobre vagas com esses critérios. Dá para criar de novo depois, na busca."
        confirmLabel="Remover"
        loading={remove.isPending}
        onConfirm={() => toRemove && remove.mutate(toRemove.id)}
        onClose={() => setToRemove(null)}
      />
    </>
  );
}
