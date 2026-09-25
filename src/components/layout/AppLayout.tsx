import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, matchPath, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthActions, useSession } from '@/auth/useAuth';
import { chatApi } from '@/api/endpoints';
import { consumeLogoutReason, subscribe } from '@/auth/session';
import { Button, buttonClass, cx } from '../ui';
import { LogOutIcon, MenuIcon, XIcon } from '../icons';
import logo from '@/assets/logo.svg';
import logoInverted from '@/assets/logo-inverted.svg';
import { useToast } from '../feedback';
import type { Role } from '@/api/types';
import { ROLE_LABEL } from '@/lib/format';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV: Record<Role | 'PUBLIC', NavItem[]> = {
  PUBLIC: [
    { to: '/', label: 'Vagas', end: true },
    { to: '/curriculo', label: 'Crie seu currículo' },
  ],
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

const FULL_BLEED = ['/', '/vagas/:id', '/entrar', '/cadastro'];

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

  const unreadCount = unread.data?.count ?? 0;
  // Páginas com faixa de topo própria (hero/split) ocupam a largura toda; as demais usam o container padrão.
  const fullBleed = FULL_BLEED.some((pattern) => matchPath(pattern, location.pathname));

  const navLink = (item: NavItem, mobile = false) => (
    <NavLink
      key={item.to + item.label}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cx(
          'relative inline-flex items-center text-sm font-semibold transition-colors',
          mobile
            ? cx('rounded-xl px-3 py-2.5', isActive ? 'bg-primary-soft text-primary' : 'text-fg hover:bg-surface-2')
            : cx(
                'h-16 px-3 after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full',
                isActive ? 'text-primary after:bg-primary' : 'text-muted hover:text-fg',
              ),
        )
      }
    >
      {item.label}
      {item.to === '/mensagens' && unreadCount > 0 && (
        <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
          {Math.min(unreadCount, 99)}
          <span className="sr-only"> mensagens não lidas</span>
        </span>
      )}
    </NavLink>
  );

  const doLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Principal" className="ml-6 hidden items-center lg:flex">
            {items.map((i) => navLink(i))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {session ? (
              <>
                <div className="hidden items-center gap-3 md:flex">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold uppercase text-primary" aria-hidden>
                    {session.user.email.slice(0, 1)}
                  </span>
                  <span className="text-xs leading-tight">
                    <span className="block max-w-[12rem] truncate font-semibold">{session.user.email}</span>
                    <span className="text-muted">{ROLE_LABEL[session.user.role]}</span>
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={doLogout} className="max-sm:hidden">
                  <LogOutIcon size={16} /> Sair
                </Button>
              </>
            ) : (
              <>
                <Link to="/cadastro?tipo=empresa" className="mr-2 hidden text-sm font-semibold text-muted hover:text-primary md:inline">
                  Anunciar vaga
                </Link>
                <Link to="/entrar" className={buttonClass('secondary', 'sm', 'max-[419px]:hidden')}>
                  Entrar
                </Link>
                <Link to="/cadastro" className={buttonClass('primary', 'sm')}>
                  Cadastre-se
                </Link>
              </>
            )}
            <button
              type="button"
              className="rounded-full p-2 hover:bg-surface-2 lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="sr-only">Menu</span>
              {menuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="menu-mobile" aria-label="Principal (mobile)" className="flex flex-col gap-1 border-t border-border px-4 py-3 lg:hidden">
            {items.map((i) => navLink(i, true))}
            {session ? (
              <button type="button" onClick={doLogout} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-danger hover:bg-danger-soft sm:hidden">
                <LogOutIcon size={16} /> Sair
              </button>
            ) : (
              <>
                <Link to="/entrar" className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-surface-2 min-[420px]:hidden">Entrar</Link>
                <Link to="/cadastro?tipo=empresa" className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-surface-2">Anunciar vaga</Link>
              </>
            )}
          </nav>
        )}
      </header>
      <main id="conteudo" className={fullBleed ? 'flex-1' : 'mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6'}>
        <Outlet />
      </main>
      <Footer loggedIn={!!session} />
    </div>
  );
}

function Logo({ inverted }: { inverted?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
      <img src={inverted ? logoInverted : logo} alt="" className="size-8" />
      {/* Cores da logo: "Emprega" verde, "Saquá" azul (branco sobre o rodapé azul). */}
      <span className="hidden min-[360px]:inline">
        <span className="text-green">Emprega</span>
        <span className={inverted ? 'text-white' : 'text-primary'}>Saquá</span>
      </span>
    </Link>
  );
}

function Footer({ loggedIn }: { loggedIn: boolean }) {
  const col = 'flex flex-col gap-2.5 text-sm';
  const link = 'text-white/80 transition-colors hover:text-white';
  return (
    <footer className="bg-brand text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">
            O portal de empregos de Saquarema e região. Conectamos quem quer trabalhar perto de casa às empresas da cidade.
          </p>
        </div>
        <div className={col}>
          <p className="mb-1 font-bold">Para candidatos</p>
          <Link to="/" className={link}>Buscar vagas</Link>
          {!loggedIn && <Link to="/cadastro" className={link}>Cadastre-se</Link>}
          <Link to="/candidato/candidaturas" className={link}>Minhas candidaturas</Link>
        </div>
        <div className={col}>
          <p className="mb-1 font-bold">Para empresas</p>
          {!loggedIn && <Link to="/cadastro?tipo=empresa" className={link}>Anunciar vaga</Link>}
          <Link to="/empresa/talentos" className={link}>Buscar talentos</Link>
          <Link to="/empresa" className={link}>Painel da empresa</Link>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/75 sm:px-6">
          © {new Date().getFullYear()} EmpregaSaqua. Vagas em Saquarema e região.
        </p>
      </div>
    </footer>
  );
}
