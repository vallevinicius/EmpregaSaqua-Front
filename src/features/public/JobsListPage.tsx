import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { jobsApi, type JobFilters } from '@/api/endpoints';
import type { ContractType, WorkModel } from '@/api/types';
import { Button, Checkbox, EmptyState, Input, Pagination, Select, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { CONTRACT_LABEL, WORK_MODEL_LABEL } from '@/lib/format';
import { JobCard } from './JobCard';

const WORK_MODELS = Object.keys(WORK_MODEL_LABEL) as WorkModel[];
const CONTRACTS = Object.keys(CONTRACT_LABEL) as ContractType[];
const PAGE_SIZE = 10;

/** Lê e VALIDA filtros da URL — valores inválidos são descartados em vez de irem para o back. */
function readFilters(sp: URLSearchParams): Required<Pick<JobFilters, 'page'>> & JobFilters {
  const page = Math.max(1, Math.min(10_000, Number.parseInt(sp.get('page') ?? '1', 10) || 1));
  const wm = sp.get('modelo') as WorkModel | null;
  const ct = sp.get('contrato') as ContractType | null;
  return {
    page,
    limit: PAGE_SIZE,
    title_like: (sp.get('q') ?? '').slice(0, 100) || undefined,
    address: (sp.get('local') ?? '').slice(0, 100) || undefined,
    work_model: wm && WORK_MODELS.includes(wm) ? wm : undefined,
    contract_type: ct && CONTRACTS.includes(ct) ? ct : undefined,
    is_pcd: sp.get('pcd') === '1' ? true : undefined,
  };
}

export function JobsListPage() {
  const [sp, setSp] = useSearchParams();
  const filters = readFilters(sp);
  const [q, setQ] = useState(filters.title_like ?? '');
  const [local, setLocal] = useState(filters.address ?? '');

  const query = useQuery({
    queryKey: ['jobs', 'public', filters],
    queryFn: ({ signal }) => jobsApi.list(filters, signal),
    placeholderData: keepPreviousData,
  });

  const update = (patch: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (resetPage) next.delete('page');
    setSp(next);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    update({ q: q.trim() || undefined, local: local.trim() || undefined });
  };

  const hasFilters = !!(filters.title_like || filters.address || filters.work_model || filters.contract_type || filters.is_pcd);

  return (
    <div>
      <section className="mb-8 rounded-2xl bg-gradient-to-br from-primary to-primary-hover px-6 py-10 text-primary-fg sm:px-10">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Trabalho perto de casa, em Saquarema e região.</h1>
        <p className="mt-2 max-w-xl text-sm opacity-90">Vagas verificadas de empresas locais. Candidate-se em poucos cliques.</p>
        <form onSubmit={onSubmit} role="search" className="mt-6 grid gap-2 rounded-xl bg-surface p-2 text-fg shadow-lg sm:grid-cols-[1fr_1fr_auto]">
          <Input aria-label="Cargo ou palavra-chave" placeholder="Cargo ou palavra-chave" value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} className="border-transparent" />
          <Input aria-label="Bairro ou cidade" placeholder="Bairro ou cidade" value={local} maxLength={100} onChange={(e) => setLocal(e.target.value)} className="border-transparent" />
          <Button type="submit">Buscar vagas</Button>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        <aside aria-label="Filtros" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-modelo" className="text-sm font-medium">Modelo de trabalho</label>
            <Select id="f-modelo" value={filters.work_model ?? ''} onChange={(e) => update({ modelo: e.target.value || undefined })}>
              <option value="">Todos</option>
              {WORK_MODELS.map((w) => (
                <option key={w} value={w}>{WORK_MODEL_LABEL[w]}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-contrato" className="text-sm font-medium">Tipo de contrato</label>
            <Select id="f-contrato" value={filters.contract_type ?? ''} onChange={(e) => update({ contrato: e.target.value || undefined })}>
              <option value="">Todos</option>
              {CONTRACTS.map((c) => (
                <option key={c} value={c}>{CONTRACT_LABEL[c]}</option>
              ))}
            </Select>
          </div>
          <Checkbox label="Somente vagas PcD" checked={!!filters.is_pcd} onChange={(e) => update({ pcd: e.target.checked ? '1' : undefined })} />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ('');
                setLocal('');
                setSp(new URLSearchParams());
              }}
            >
              Limpar filtros
            </Button>
          )}
        </aside>

        <section aria-live="polite" aria-busy={query.isFetching}>
          {query.isPending ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : query.data.data.length === 0 ? (
            <EmptyState title="Nenhuma vaga encontrada" description={hasFilters ? 'Tente remover alguns filtros.' : 'Novas vagas aparecem aqui assim que aprovadas.'} />
          ) : (
            <>
              <p className="mb-3 text-sm text-muted">
                {query.data.meta.total_items} {query.data.meta.total_items === 1 ? 'vaga' : 'vagas'}
              </p>
              <div className={query.isPlaceholderData ? 'flex flex-col gap-3 opacity-60' : 'flex flex-col gap-3'}>
                {query.data.data.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              <Pagination page={filters.page} totalPages={query.data.meta.total_pages} onChange={(p) => update({ page: String(p) }, false)} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
