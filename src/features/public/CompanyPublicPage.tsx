import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { companiesApi, jobsApi } from '@/api/endpoints';
import { ErrorState, SafeText } from '@/components/feedback';
import { BriefcaseIcon, MapPinIcon, ShieldCheckIcon } from '@/components/icons';
import { EmptyState, Pagination, Skeleton, buttonClass } from '@/components/ui';
import { UUID_RE } from '@/features/admin/uuid';
import { ApiError } from '@/lib/http';
import { decodeEntities } from '@/lib/safe';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { CompanyLogo, JobCard } from './JobCard';

const PAGE_SIZE = 10;

/** Página pública da empresa: dados que ela já mostra nas vagas + as vagas ativas. Sem CNPJ, telefone ou documentos. */
export default function CompanyPublicPage() {
  const { id = '' } = useParams();
  const valid = UUID_RE.test(id);
  const [page, setPage] = useState(1);

  const company = useQuery({ queryKey: ['companies', id], queryFn: ({ signal }) => companiesApi.get(id, signal), enabled: valid, retry: false });
  const jobs = useQuery({
    queryKey: ['jobs', 'company', id, page],
    queryFn: ({ signal }) => jobsApi.list({ employer_id: id, page, limit: PAGE_SIZE }, signal),
    enabled: valid && company.isSuccess,
    placeholderData: keepPreviousData,
  });

  const name = company.data ? decodeEntities(company.data.nome_fantasia) : '';
  useDocumentTitle(name ? `${name} - Vagas` : 'Empresa', name ? `Vagas abertas em ${name}. Veja e candidate-se pelo EmpregaSaquá.` : undefined);

  if (!valid || (company.isError && company.error instanceof ApiError && company.error.status === 404)) return <Unavailable />;
  if (company.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState error={company.error} onRetry={() => void company.refetch()} />
      </div>
    );
  }
  if (company.isPending) return <PageSkeleton />;

  const c = company.data;
  return (
    <div>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <CompanyLogo name={c.nome_fantasia} url={c.logo_url} size={88} />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              <SafeText>{c.nome_fantasia}</SafeText>
            </h1>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
              {c.endereco && (
                <li className="inline-flex items-center gap-1.5">
                  <MapPinIcon size={16} className="shrink-0" />
                  <SafeText>{c.endereco}</SafeText>
                </li>
              )}
              <li className="inline-flex items-center gap-1.5">
                <BriefcaseIcon size={16} className="shrink-0" />
                {c.active_jobs_count === 1 ? '1 vaga aberta' : `${c.active_jobs_count} vagas abertas`}
              </li>
              <li className="inline-flex items-center gap-1.5 font-semibold text-green-ink">
                <ShieldCheckIcon size={16} className="shrink-0" />
                Empresa verificada
              </li>
            </ul>
          </div>
        </div>
      </header>

      <section aria-label="Vagas da empresa" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h2 className="mb-5 text-xl font-extrabold tracking-tight">Vagas abertas</h2>
        {jobs.isPending ? (
          <div className="flex flex-col gap-px overflow-hidden rounded-2xl border border-border">
            {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-none" />)}
          </div>
        ) : jobs.isError ? (
          <ErrorState error={jobs.error} onRetry={() => void jobs.refetch()} />
        ) : jobs.data.data.length === 0 ? (
          <EmptyState title="Nenhuma vaga aberta no momento" description="Volte em breve ou veja vagas de outras empresas." action={<Link to="/" className="text-sm font-medium text-primary hover:underline">Ver todas as vagas</Link>} />
        ) : (
          <>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {jobs.data.data.map((job) => (
                <li key={job.id}>
                  <JobCard job={job} />
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={jobs.data.meta.total_pages} onChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando empresa">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-10 sm:px-6">
          <Skeleton className="size-[88px] shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-9 w-2/3 max-w-md" />
            <Skeleton className="h-4 w-1/2 max-w-xs" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Unavailable() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-soft text-green-ink">
        <BriefcaseIcon size={26} />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold">Empresa indisponível</h1>
      <p className="mt-2 text-muted">Esta página não existe ou a empresa ainda não foi verificada.</p>
      <Link to="/" className={buttonClass('primary', 'md', 'mt-8')}>Ver vagas</Link>
    </div>
  );
}
