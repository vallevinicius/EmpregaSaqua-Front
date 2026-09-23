import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSession } from './useAuth';
import type { Role } from '@/api/types';

/**
 * Guards de rota são UX, não segurança: escondem telas que o usuário não pode usar.
 * O enforcement real é o JwtAuthGuard/RolesGuard do back — nunca confie neste componente.
 */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (!session) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />;
  }
  if (roles && !roles.includes(session.user.role)) {
    return <Navigate to={homeFor(session.user.role)} replace />;
  }
  return <>{children}</>;
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const session = useSession();
  if (session) return <Navigate to={homeFor(session.user.role)} replace />;
  return <>{children}</>;
}

export function homeFor(role: Role): string {
  switch (role) {
    case 'EMPLOYER':
      return '/empresa';
    case 'ADMIN':
      return '/admin';
    default:
      return '/candidato/candidaturas';
  }
}

/** Evita open redirect: só aceita caminhos internos relativos. */
export function safeRedirect(from: unknown, fallback: string): string {
  if (typeof from !== 'string') return fallback;
  if (!from.startsWith('/') || from.startsWith('//') || from.startsWith('/\\')) return fallback;
  return from;
}
