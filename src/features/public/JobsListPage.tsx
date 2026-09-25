import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { jobsApi, type JobFilters } from '@/api/endpoints';
import type { ContractType, WorkModel } from '@/api/types';
import { Button, EmptyState, Pagination, Skeleton, cx } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { CONTRACT_LABEL, WORK_MODEL_LABEL } from '@/lib/format';
import {
  AccessibilityIcon,
  CheckCircleIcon,
  FileTextIcon,
  FilterIcon,
  MapPinIcon,
  SearchIcon,
  SendIcon,
  ShieldCheckIcon,
  MessageIcon,
  UsersIcon,
  XIcon,
} from '@/components/icons';
import { JobCard } from './JobCard';

const WORK_MODELS = Object.keys(WORK_MODEL_LABEL) as WorkModel[];
const CONTRACTS = Object.keys(CONTRACT_LABEL) as ContractType[];
const PAGE_SIZE = 10;

/** Atalhos do hero: bairros de Saquarema, aplicados no filtro de local (mesmo campo da busca). */
const BAIRROS = ['Centro', 'Bacaxá', 'Itaúna', 'Jaconé', 'Vilatur', 'Porto da Roça'];

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
  const landing = !hasFilters && filters.page === 1;
  const total = query.data?.meta.total_items;

  const clearAll = () => {
    setQ('');
    setLocal('');
    setSp(new URLSearchParams());
  };

  const activeChips: { label: string; clear: () => void }[] = [
    filters.title_like && { label: `“${filters.title_like}”`, clear: () => { setQ(''); update({ q: undefined }); } },
    filters.address && { label: filters.address, clear: () => { setLocal(''); update({ local: undefined }); } },
    filters.work_model && { label: WORK_MODEL_LABEL[filters.work_model], clear: () => update({ modelo: undefined }) },
    filters.contract_type && { label: CONTRACT_LABEL[filters.contract_type], clear: () => update({ contrato: undefined }) },
    filters.is_pcd && { label: 'Vagas PcD', clear: () => update({ pcd: undefined }) },
  ].filter((c): c is { label: string; clear: () => void } => !!c);

  return (
    <div>
      {/* ---------- Hero + busca ---------- */}
      <section className="bg-hero border-b border-border">
        <div className={cx('mx-auto max-w-7xl px-4 sm:px-6', landing ? 'py-16 sm:py-24' : 'py-10')}>
          <div className="max-w-3xl">
            {/* O título é o elemento de destaque da página: grande, compacto, numa cor só. */}
            <h1
              className={cx(
                'rise font-black text-balance',
                landing ? 'text-5xl leading-[0.98] tracking-[-0.035em] sm:text-[4.5rem]' : 'text-3xl tracking-tight sm:text-4xl',
              )}
            >
              {landing ? 'Seu próximo emprego está perto de casa' : 'Encontre sua vaga'}
            </h1>
            {landing && (
              <p className="rise mt-6 max-w-xl text-lg text-muted [animation-delay:60ms]">
                Vagas de empresas locais em Saquarema e região. Candidate-se em poucos cliques.
              </p>
            )}
          </div>

          <form
            onSubmit={onSubmit}
            role="search"
            className="rise mt-8 grid max-w-4xl [animation-delay:120ms] gap-1 rounded-2xl border border-border bg-surface p-2 text-fg shadow-lift sm:grid-cols-[1fr_1px_1fr_auto] sm:items-center sm:rounded-full"
          >
            <label className="flex h-12 items-center gap-3 rounded-full px-4 focus-within:bg-surface-2">
              <SearchIcon size={20} className="shrink-0 text-primary" />
              <span className="sr-only">Cargo ou palavra-chave</span>
              <input
                placeholder="Cargo, área ou palavra-chave"
                value={q}
                maxLength={100}
                onChange={(e) => setQ(e.target.value)}
                className="h-full w-full bg-transparent text-[15px] placeholder:text-muted focus:outline-none"
              />
            </label>
            <span className="hidden h-8 bg-border sm:block" aria-hidden />
            <label className="flex h-12 items-center gap-3 rounded-full px-4 focus-within:bg-surface-2">
              <MapPinIcon size={20} className="shrink-0 text-primary" />
              <span className="sr-only">Bairro ou cidade</span>
              <input
                placeholder="Bairro ou cidade"
                value={local}
                maxLength={100}
                onChange={(e) => setLocal(e.target.value)}
                className="h-full w-full bg-transparent text-[15px] placeholder:text-muted focus:outline-none"
              />
            </label>
            <Button type="submit" size="lg">
              <SearchIcon size={18} /> Buscar vagas
            </Button>
          </form>

          {landing && (
            <div className="rise mt-6 flex flex-wrap items-center gap-2 [animation-delay:180ms]">
              <span className="mr-1 text-sm text-muted">Vagas por bairro:</span>
              {BAIRROS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setLocal(b);
                    update({ local: b });
                  }}
                  className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-fg transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
                >
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {landing && (
        <section aria-label="Vantagens" className="border-b border-border">
          <ul className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm font-semibold sm:flex-row sm:flex-wrap sm:gap-x-10 sm:px-6">
            <Perk icon={<ShieldCheckIcon size={20} />}>Empresas verificadas antes de anunciar</Perk>
            <Perk icon={<CheckCircleIcon size={20} />}>Grátis para candidatos</Perk>
            <Perk icon={<MessageIcon size={20} />}>Converse direto com a empresa</Perk>
          </ul>
        </section>
      )}

      {/* ---------- Resultados ---------- */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
          <aside aria-label="Filtros" className="lg:sticky lg:top-24 lg:self-start">
            <details className="group border-y border-border lg:border-0" open>
              <summary className="flex cursor-pointer list-none items-center gap-2 py-4 text-lg font-bold lg:pointer-events-none lg:pt-0 [&::-webkit-details-marker]:hidden">
                <FilterIcon size={16} className="text-primary" />
                Filtros
                {activeChips.length > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-fg">{activeChips.length}</span>
                )}
              </summary>
              <div className="flex flex-col gap-6 pb-5 lg:pb-0">
                <FacetGroup
                  legend="Modelo de trabalho"
                  name="modelo"
                  value={filters.work_model ?? ''}
                  options={WORK_MODELS.map((w) => ({ value: w, label: WORK_MODEL_LABEL[w] }))}
                  onChange={(v) => update({ modelo: v || undefined })}
                />
                <FacetGroup
                  legend="Tipo de contrato"
                  name="contrato"
                  value={filters.contract_type ?? ''}
                  options={CONTRACTS.map((c) => ({ value: c, label: CONTRACT_LABEL[c] }))}
                  onChange={(v) => update({ contrato: v || undefined })}
                />
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-surface-2 px-3.5 py-3 text-sm font-semibold">
                  <span className="inline-flex items-center gap-2">
                    <AccessibilityIcon size={16} className="text-primary" />
                    Somente vagas PcD
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={!!filters.is_pcd}
                    onChange={(e) => update({ pcd: e.target.checked ? '1' : undefined })}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className="relative h-6 w-11 shrink-0 rounded-full bg-border transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:ring-4 peer-focus-visible:ring-ring/25"
                  />
                </label>
                {hasFilters && (
                  <Button variant="secondary" size="sm" onClick={clearAll}>
                    Limpar filtros
                  </Button>
                )}
              </div>
            </details>
          </aside>

          <section aria-live="polite" aria-busy={query.isFetching} className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-extrabold tracking-tight">
                {total === undefined ? 'Vagas' : `${total.toLocaleString('pt-BR')} ${total === 1 ? 'vaga encontrada' : 'vagas encontradas'}`}
              </h2>
              {activeChips.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {activeChips.map((c) => (
                    <li key={c.label}>
                      <button
                        type="button"
                        onClick={c.clear}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft py-1 pl-3 pr-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-fg"
                        aria-label={`Remover filtro ${c.label}`}
                      >
                        {c.label}
                        <XIcon size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {query.isPending ? (
              <div className="flex flex-col gap-px overflow-hidden rounded-2xl border border-border">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-28 rounded-none" />
                ))}
              </div>
            ) : query.isError ? (
              <ErrorState error={query.error} onRetry={() => void query.refetch()} />
            ) : query.data.data.length === 0 ? (
              <EmptyState
                title="Nenhuma vaga encontrada"
                description={hasFilters ? 'Tente outra palavra-chave ou remova alguns filtros.' : 'Novas vagas aparecem aqui assim que aprovadas.'}
                action={hasFilters ? <Button variant="secondary" onClick={clearAll}>Limpar filtros</Button> : undefined}
              />
            ) : (
              <>
                <ul className={cx('divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface transition-opacity', query.isPlaceholderData && 'opacity-60')}>
                  {query.data.data.map((job) => (
                    <li key={job.id}>
                      <JobCard job={job} />
                    </li>
                  ))}
                </ul>
                <Pagination page={filters.page} totalPages={query.data.meta.total_pages} onChange={(p) => update({ page: String(p) }, false)} />
              </>
            )}
          </section>
        </div>
      </div>

      {landing && <HowItWorks />}
      {landing && <EmployerCta />}
    </div>
  );
}

function Perk({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-2.5">
      <span className="text-green-ink">{icon}</span>
      {children}
    </li>
  );
}

/** Lista de opções em pílulas (estilo facetas), com "Todos". Radios nativos para acessibilidade. */
function FacetGroup({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {[{ value: '', label: 'Todos' }, ...options].map((o) => (
          <label
            key={o.value || 'all'}
            className={cx(
              'cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/25',
              value === o.value ? 'border-primary bg-primary text-primary-fg' : 'border-border text-fg hover:border-primary hover:text-primary',
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function HowItWorks() {
  const steps = [
    { icon: <FileTextIcon size={22} />, title: 'Monte seu currículo', text: 'Cadastre-se e preencha experiências, formação e habilidades.' },
    { icon: <SearchIcon size={22} />, title: 'Encontre a vaga certa', text: 'Filtre por contrato, modelo de trabalho, bairro e vagas PcD.' },
    { icon: <SendIcon size={22} />, title: 'Candidate-se', text: 'Envie sua candidatura e acompanhe cada etapa pelo seu painel.' },
  ];
  return (
    <section className="border-t border-border bg-surface-2">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">Do cadastro à contratação</h2>
        {/* Linha do tempo: coluna única no mobile (linha vertical), três etapas na horizontal a partir de md. */}
        <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((s, i) => (
            <li key={s.title} className="relative flex gap-5 md:flex-col md:gap-0">
              {/* Conector até a próxima etapa (vertical no mobile, horizontal a partir de md). */}
              {i < steps.length - 1 && (
                <span aria-hidden className="absolute left-6 top-12 -bottom-10 w-px bg-green md:-right-8 md:bottom-auto md:left-12 md:top-6 md:h-px md:w-auto" />
              )}
              <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg ring-8 ring-surface-2">
                {s.icon}
              </span>
              <div className="md:mt-6">
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function EmployerCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="bg-brand relative overflow-hidden rounded-2xl px-6 py-12 text-white sm:px-12 sm:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Sua empresa está contratando?</h2>
            <p className="mt-3 max-w-lg text-white/85">
              Anuncie vagas, receba candidatos da região e gerencie todo o processo seletivo em um só lugar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/cadastro?tipo=empresa" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-yellow px-7 text-base font-semibold text-ink shadow-sm transition-colors hover:bg-white active:scale-[0.98]">
                Anunciar vaga
              </Link>
            </div>
          </div>
          <ul className="grid gap-3 text-sm">
            {[
              { icon: <UsersIcon size={18} />, text: 'Busca de talentos e banco de candidatos' },
              { icon: <SendIcon size={18} />, text: 'Chat direto com candidatos' },
              { icon: <CheckCircleIcon size={18} />, text: 'Perguntas eliminatórias na candidatura' },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-base text-white">
                <span className="text-yellow">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
