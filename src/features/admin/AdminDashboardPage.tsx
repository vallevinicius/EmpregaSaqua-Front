import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api/endpoints';
import { PageHeader, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { StatTile } from '@/components/charts';

export default function AdminDashboardPage() {
  const q = useQuery({ queryKey: ['analytics', 'admin'], queryFn: ({ signal }) => analyticsApi.admin(signal), refetchInterval: 60_000 });
  return (
    <div>
      <PageHeader title="Painel administrativo" actions={<Link to="/admin/moderacao" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover">Ir para moderação</Link>} />
      {q.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Vagas aguardando análise" value={q.data.pending_jobs} />
          <StatTile label="Vagas ativas" value={q.data.active_jobs} />
          <StatTile label="Empresas" value={q.data.total_companies} />
          <StatTile label="Usuários" value={q.data.total_users} />
        </div>
      )}
    </div>
  );
}
