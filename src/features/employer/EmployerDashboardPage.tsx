import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, usersApi } from '@/api/endpoints';
import type { ApplicationStatus } from '@/api/types';
import { Alert, PageHeader, Skeleton, buttonClass } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { BarList, StatTile } from '@/components/charts';
import { APPLICATION_STATUS_LABEL } from '@/lib/format';
import type { CompanyProfile } from '@/api/types';
import { CheckCircleIcon } from '@/components/icons';
import { cx } from '@/components/ui';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const ORDER: ApplicationStatus[] = ['APPLIED', 'REVIEWING', 'INTERVIEW', 'HIRED', 'REJECTED'];

export default function EmployerDashboardPage() {
  useDocumentTitle("Painel da empresa");
  const stats = useQuery({ queryKey: ['analytics', 'employer'], queryFn: ({ signal }) => analyticsApi.employer(signal) });
  const company = useQuery({ queryKey: ['company', 'me'], queryFn: ({ signal }) => usersApi.companyProfile(signal), retry: false });

  const byStatus = new Map((stats.data?.applications_by_status ?? []).map((s) => [s.status, s.count]));
  const rows = ORDER.map((s) => ({ label: APPLICATION_STATUS_LABEL[s], value: byStatus.get(s) ?? 0 }));

  return (
    <div>
      <PageHeader
        title="Painel da empresa"
        actions={<Link to="/empresa/vagas/nova" className={buttonClass()}>Publicar vaga</Link>}
      />
      <VerificationBanner status={company.data?.verification_status} unknown={company.isError} />
      {company.data && stats.data && <OnboardingChecklist company={company.data} activeJobs={stats.data.active_jobs} />}
      {stats.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_1fr_2fr]">
          <StatTile label="Vagas ativas" value={stats.data.active_jobs} />
          <StatTile label="Candidaturas recebidas" value={stats.data.total_applications} />
          <BarList title="Candidaturas por etapa" rows={rows} />
        </div>
      )}
    </div>
  );
}

export function VerificationBanner({ status, unknown }: { status?: string; unknown?: boolean }) {
  if (status === 'APPROVED') return null;
  if (status === 'REJECTED')
    return (
      <div className="mb-6"><Alert tone="danger" title="Verificação reprovada">Envie um novo documento em <Link className="underline" to="/empresa/perfil">Empresa</Link>.</Alert></div>
    );
  return (
    <div className="mb-6">
      <Alert tone="warning" title={unknown ? 'Verificação da empresa' : 'Empresa aguardando verificação'}>
        Para publicar vagas, sua empresa precisa estar verificada. Envie o documento comprobatório (PDF) em{' '}
        <Link className="underline" to="/empresa/perfil">Empresa</Link> e aguarde a aprovação.
      </Alert>
    </div>
  );
}

/** Passo a passo para a empresa começar a receber candidatos. Some sozinho quando tudo está feito. */
function OnboardingChecklist({ company, activeJobs }: { company: CompanyProfile; activeJobs: number }) {
  const steps = [
    { done: !!company.nome_fantasia.trim() && !!company.endereco?.trim() && !!company.telefone?.trim(), label: 'Complete os dados da empresa', hint: 'Nome, endereço e telefone', to: '/empresa/perfil' },
    { done: !!company.logo_url, label: 'Envie a logo', hint: 'Aparece em todas as suas vagas', to: '/empresa/perfil' },
    { done: !!company.cnpj, label: 'Informe o CNPJ', hint: 'Passa mais confiança aos candidatos', to: '/empresa/perfil' },
    { done: company.verification_status === 'APPROVED' || !!company.verification_document_url, label: 'Envie o documento de verificação', hint: 'Obrigatório para publicar vagas', to: '/empresa/perfil' },
    { done: activeJobs > 0, label: 'Publique sua primeira vaga', hint: 'Escolha um modelo pronto e edite', to: '/empresa/vagas/nova' },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <section aria-label="Primeiros passos" className="mb-8 rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">Primeiros passos</h2>
        <span className="text-sm text-muted">{done} de {steps.length}</span>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.label}>
            <Link to={s.to} className={cx('flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2', s.done && 'opacity-60')}>
              <CheckCircleIcon size={20} filled={s.done} className={cx('mt-0.5 shrink-0', s.done ? 'text-green-ink' : 'text-muted')} />
              <span>
                <span className={cx('block font-semibold', s.done && 'line-through')}>{s.label}</span>
                <span className="block text-sm text-muted">{s.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
