import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthActions, useSession } from '@/auth/useAuth';
import { chatApi } from '@/api/endpoints';
import { consumeLogoutReason, subscribe } from '@/auth/session';
import { Button, cx } from '../ui';
import { useToast } from '../feedback';
import type { Role } from '@/api/types';
import { ROLE_LABEL } from '@/lib/format';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV: Record<Role | 'PUBLIC', NavItem[]> = {
  PUBLIC: [{ to: '/', label: 'Vagas', end: true }],
  JOB_SEEKER: [
    { to: '/', label: 'Vagas', end: true },
    { to: '/candidato/candidaturas', label: 'Minhas candidaturas' },
    { to: '/candidato/perfil', label: 'Meu currículo' },
    { to: '/mensagens', label: 'Mensagens' },
  ],
  EMPLOYER: [
    { to: '/empresa', label: 'Painel', end: true },
    { to: '/empresa/vagas', label: 'Minhas vagas' },
    { to: '/empresa/talentos', label: 'Buscar talentos' },
    { to: '/empresa/banco-de-talentos', label: 'Banco de talentos' },
    { to: '/mensagens', label: 'Mensagens' },
    { to: '/empresa/perfil', label: 'Empresa' },
  ],
  ADMIN: [
    { to: '/admin', label: 'Painel', end: true },
    { to: '/admin/moderacao', label: 'Moderação' },
    { to: '/admin/usuarios', label: 'Usuários' },
    { to: '/', label: 'Vagas públicas', end: true },
  ],
};

function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: ['chat', 'unread'],
    queryFn: ({ signal }) => chatApi.unreadCount(signal),
    enabled,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
    retry: false,
  });
}

export function AppLayout() {
  const session = useSession();
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = session?.user.role;
  const items = NAV[role ?? 'PUBLIC'];
  const unread = useUnreadCount(!!session && role !== 'ADMIN');

  useEffect(() => setMenuOpen(false), [location.pathname]);

  // Avisa quando a sessão cai por expiração/401 (não por logout manual).
  useEffect(
    () =>
      subscribe(() => {
        const reason = consumeLogoutReason();
        if (reason === 'expired' || reason === 'unauthorized') {
          toast('Sua sessão expirou. Entre novamente.', 'danger');
          navigate('/entrar', { replace: true });
        }
      }),
    [navigate, toast],
  );

  const navLink = (item: NavItem) => (
    <NavLink
      key={item.to + item.label}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cx(
          'relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-fg',
        )
      }
    >
      {item.label}
      {item.to === '/mensagens' && (unread.data?.count ?? 0) > 0 && (
        <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">
          {Math.min(unread.data!.count, 99)}
          <span className="sr-only"> mensagens não lidas</span>
        </span>
      )}
    </NavLink>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <img src="/favicon.svg" alt="" className="size-7" />
            <span className="hidden min-[400px]:inline">
              Emprega<span className="text-primary">Saqua</span>
            </span>
          </Link>
          <nav aria-label="Principal" className="ml-4 hidden items-center gap-1 lg:flex">
            {items.map(navLink)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {session ? (
              <>
                <span className="hidden text-right text-xs leading-tight text-muted md:block">
                  <span className="block max-w-[14rem] truncate text-fg">{session.user.email}</span>
                  {ROLE_LABEL[session.user.role]}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    logout();
                    navigate('/', { replace: true });
                  }}
                >
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Link to="/entrar" className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium hover:bg-surface-2">
                  Entrar
                </Link>
                <Link to="/cadastro" className="whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover">
                  Criar conta
                </Link>
              </>
            )}
            <button
              type="button"
              className="rounded-md p-2 hover:bg-surface-2 lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="sr-only">Menu</span>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="menu-mobile" aria-label="Principal (mobile)" className="flex flex-col gap-1 border-t border-border px-4 py-3 lg:hidden">
            {items.map(navLink)}
          </nav>
        )}
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        EmpregaSaqua · Vagas em Saquarema e região
      </footer>
    </div>
  );
}
