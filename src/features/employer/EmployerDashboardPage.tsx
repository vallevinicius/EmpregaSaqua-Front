import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, usersApi } from '@/api/endpoints';
import type { ApplicationStatus } from '@/api/types';
import { Alert, PageHeader, Skeleton } from '@/components/ui';
import { ErrorState, isPendingEndpoint } from '@/components/feedback';
import { BarList, StatTile } from '@/components/charts';
import { APPLICATION_STATUS_LABEL } from '@/lib/format';

const ORDER: ApplicationStatus[] = ['APPLIED', 'REVIEWING', 'INTERVIEW', 'HIRED', 'REJECTED'];

export default function EmployerDashboardPage() {
  const stats = useQuery({ queryKey: ['analytics', 'employer'], queryFn: ({ signal }) => analyticsApi.employer(signal) });
  const company = useQuery({ queryKey: ['company', 'me'], queryFn: ({ signal }) => usersApi.companyProfile(signal), retry: false });

  const byStatus = new Map((stats.data?.applications_by_status ?? []).map((s) => [s.status, s.count]));
  const rows = ORDER.map((s) => ({ label: APPLICATION_STATUS_LABEL[s], value: byStatus.get(s) ?? 0 }));

  return (
    <div>
      <PageHeader
        title="Painel da empresa"
        actions={<Link to="/empresa/vagas/nova" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover">Publicar vaga</Link>}
      />
      <VerificationBanner status={company.data?.verification_status} unknown={company.isError && isPendingEndpoint(company.error)} />
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
