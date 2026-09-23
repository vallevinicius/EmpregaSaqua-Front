import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { talentPoolApi } from '@/api/endpoints';
import type { SavedCandidate } from '@/api/types';
import { Button, ConfirmDialog, EmptyState, PageHeader, Pagination, Skeleton } from '@/components/ui';
import { ErrorState, SafeText, useToast } from '@/components/feedback';
import { formatDate } from '@/lib/format';
import { CandidateSummary } from './CandidateCard';

export default function TalentPoolPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [toRemove, setToRemove] = useState<SavedCandidate | null>(null);

  const q = useQuery({
    queryKey: ['talent-pool', page],
    queryFn: ({ signal }) => talentPoolApi.list(page, 10, signal),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (id: string) => talentPoolApi.remove(id),
    onSuccess: () => {
      setToRemove(null);
      toast('Removido do banco de talentos.');
      void qc.invalidateQueries({ queryKey: ['talent-pool'] });
    },
    onError: (e) => toast(e.message, 'danger'),
  });

  return (
    <div>
      <PageHeader title="Banco de talentos" description="Candidatos que você salvou para futuras vagas." />
      {q.isPending ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.data.length === 0 ? (
        <EmptyState title="Seu banco de talentos está vazio" description="Salve candidatos a partir da busca ou das candidaturas das suas vagas." />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {q.data.data.map((s) => (
              <li key={s.id}>
                <CandidateSummary
                  email={s.candidate?.email}
                  profile={s.candidate?.candidate_profile}
                  extra={
                    <p className="mt-2 text-sm text-muted">
                      Salvo em {formatDate(s.created_at)}
                      {s.notes && <> · <SafeText>{s.notes}</SafeText></>}
                    </p>
                  }
                  actions={<Button size="sm" variant="danger-ghost" onClick={() => setToRemove(s)}>Remover</Button>}
                />
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={q.data.meta.total_pages} onChange={setPage} />
        </>
      )}
      <ConfirmDialog
        open={!!toRemove}
        title="Remover do banco de talentos?"
        confirmLabel="Remover"
        loading={remove.isPending}
        onConfirm={() => toRemove && remove.mutate(toRemove.id)}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}
