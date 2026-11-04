import { NavLink, Outlet } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints';
import { cx } from '@/components/ui';

const TABS: { to: string; label: string; end?: boolean }[] = [
  { to: '/admin', label: 'Painel', end: true },
  { to: '/admin/moderacao', label: 'Moderação' },
  { to: '/admin/denuncias', label: 'Denúncias' },
  { to: '/admin/indicadores', label: 'Indicadores' },
  { to: '/admin/eventos', label: 'Feiras e cursos' },
  { to: '/admin/vagas', label: 'Vagas' },
  { to: '/admin/empresas', label: 'Empresas' },
  { to: '/admin/usuarios', label: 'Usuários' },
];

/**
 * Navegação própria do admin (abas), separada da navbar principal: evita lotar o header do site
 * com 5 links de uma área que só o admin usa.
 */
export default function AdminLayout() {
  const open = useOpenReportsCount();
  return (
    <div>
      <nav aria-label="Admin" className="mb-8 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cx(
                'relative px-3.5 py-2.5 text-sm font-semibold transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:rounded-t-full',
                isActive ? 'text-primary after:bg-primary' : 'text-muted hover:text-fg',
              )
            }
          >
            {t.label}
            {t.to === '/admin/denuncias' && open > 0 && (
              <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
                {Math.min(open, 99)}
                <span className="sr-only"> denúncias aguardando análise</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

/** Quantas denúncias aguardam análise (aviso nas abas e no painel). Pede só 1 item: interessa o total, não a lista. */
export function useOpenReportsCount(): number {
  const q = useQuery({
    queryKey: ['admin', 'reports', 'open-count'],
    queryFn: ({ signal }) => adminApi.listReports({ status: 'OPEN', page: 1, limit: 1 }, signal),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });
  return q.data?.meta.total_items ?? 0;
}
