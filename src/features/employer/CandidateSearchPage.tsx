import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidatesApi, talentPoolApi } from '@/api/endpoints';
import { Button, EmptyState, Input, PageHeader, Pagination, Skeleton } from '@/components/ui';
import { ErrorState, useToast } from '@/components/feedback';
import { ApiError } from '@/lib/http';
import { CandidateSummary } from './CandidateCard';

interface Filters {
  skills: string;
  role: string;
  location: string;
}
const EMPTY: Filters = { skills: '', role: '', location: '' };

export default function CandidateSearchPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ['candidates', 'search', filters, page],
    queryFn: ({ signal }) =>
      candidatesApi.search(
        { skills: filters.skills || undefined, role: filters.role || undefined, location: filters.location || undefined, page, limit: 10 },
        signal,
      ),
    placeholderData: keepPreviousData,
  });

  const save = useMutation({
    mutationFn: (candidateUserId: string) => talentPoolApi.save(candidateUserId),
    onSuccess: () => {
      toast('Candidato salvo no banco de talentos.');
      void qc.invalidateQueries({ queryKey: ['talent-pool'] });
    },
    onError: (e) => toast(e instanceof ApiError && e.status === 409 ? 'Este candidato já está no seu banco de talentos.' : e.message, 'danger'),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFilters({ skills: draft.skills.trim().slice(0, 200), role: draft.role.trim().slice(0, 100), location: draft.location.trim().slice(0, 100) });
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="Buscar talentos" description="Encontre candidatos por habilidade, cargo anterior ou localização." />
      <form onSubmit={submit} role="search" className="mb-6 grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Input aria-label="Habilidades" placeholder="Habilidades (separe por vírgula)" value={draft.skills} onChange={(e) => setDraft({ ...draft, skills: e.target.value })} />
        <Input aria-label="Cargo" placeholder="Cargo anterior" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
        <Input aria-label="Localização" placeholder="Bairro ou cidade" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
        <Button type="submit">Buscar</Button>
      </form>

      {q.isPending ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.data.length === 0 ? (
        <EmptyState title="Nenhum candidato encontrado" description="Tente termos mais amplos." />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">{q.data.total} candidato(s)</p>
          <ul className={q.isPlaceholderData ? 'flex flex-col gap-3 opacity-60' : 'flex flex-col gap-3'}>
            {q.data.data.map((c) => (
              <li key={c.id}>
                <CandidateSummary
                  email={c.user?.email}
                  profile={c}
                  actions={
                    <Button size="sm" variant="secondary" loading={save.isPending && save.variables === c.user_id} onClick={() => save.mutate(c.user_id)}>
                      Salvar no banco
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={q.data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
