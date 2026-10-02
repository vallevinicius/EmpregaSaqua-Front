import { NavLink, Outlet } from 'react-router';
import { cx } from '@/components/ui';

const TABS: { to: string; label: string; end?: boolean }[] = [
  { to: '/admin', label: 'Painel', end: true },
  { to: '/admin/moderacao', label: 'Moderação' },
  { to: '/admin/vagas', label: 'Vagas' },
  { to: '/admin/empresas', label: 'Empresas' },
  { to: '/admin/usuarios', label: 'Usuários' },
];

/**
 * Navegação própria do admin (abas), separada da navbar principal: evita lotar o header do site
 * com 5 links de uma área que só o admin usa.
 */
export default function AdminLayout() {
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
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
