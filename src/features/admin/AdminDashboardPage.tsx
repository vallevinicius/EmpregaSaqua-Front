import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api/endpoints';
import { PageHeader, Skeleton, buttonClass } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { StatTile } from '@/components/charts';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminDashboardPage() {
  useDocumentTitle("Painel administrativo");
  const q = useQuery({ queryKey: ['analytics', 'admin'], queryFn: ({ signal }) => analyticsApi.admin(signal), refetchInterval: 60_000 });
  return (
    <div>
      <PageHeader title="Painel administrativo" actions={<Link to="/admin/moderacao" className={buttonClass()}>Ir para moderação</Link>} />
      {q.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/admin/moderacao" className="rounded-2xl transition-transform hover:scale-[1.02]"><StatTile label="Vagas aguardando análise" value={q.data.pending_jobs} /></Link>
          <Link to="/admin/vagas" className="rounded-2xl transition-transform hover:scale-[1.02]"><StatTile label="Vagas ativas" value={q.data.active_jobs} /></Link>
          <Link to="/admin/empresas" className="rounded-2xl transition-transform hover:scale-[1.02]"><StatTile label="Empresas" value={q.data.total_companies} /></Link>
          <Link to="/admin/usuarios" className="rounded-2xl transition-transform hover:scale-[1.02]"><StatTile label="Usuários" value={q.data.total_users} /></Link>
        </div>
      )}
    </div>
  );
}
