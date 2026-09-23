import type { Role, SessionUser } from '@/api/types';

/**
 * Armazenamento da sessão.
 *
 * Decisão: token em memória + sessionStorage (escopo da aba).
 * - Por quê não localStorage: persiste indefinidamente e é compartilhado entre abas,
 *   aumentando a janela de exfiltração em caso de XSS.
 * - Por quê não só memória: F5 derrubaria a sessão (UX ruim) e o back não tem refresh token.
 * - O que isso piora: qualquer XSS na origem ainda lê o sessionStorage. A solução correta é o back
 *   emitir o JWT em cookie HttpOnly + SameSite=Strict (+ CSRF token) — ver BACKEND_CONTRACT.md.
 *
 * O payload do JWT é lido só para UX (role/expiração). Autorização real é SEMPRE do back.
 */

const STORAGE_KEY = 'es.session.v1';
const ROLES: readonly Role[] = ['JOB_SEEKER', 'EMPLOYER', 'ADMIN'];

export interface Session {
  token: string;
  user: SessionUser;
  /** epoch ms */
  expiresAt: number;
}

interface JwtPayload {
  sub?: unknown;
  email?: unknown;
  role?: unknown;
  exp?: unknown;
}

function base64UrlDecode(part: string): string {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeJwt(token: string): { user: SessionUser; expiresAt: number } | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const p = JSON.parse(base64UrlDecode(parts[1])) as JwtPayload;
    if (typeof p.sub !== 'string' || typeof p.email !== 'string' || typeof p.exp !== 'number') return null;
    if (typeof p.role !== 'string' || !ROLES.includes(p.role as Role)) return null;
    return { user: { id: p.sub, email: p.email, role: p.role as Role }, expiresAt: p.exp * 1000 };
  } catch {
    return null;
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();
let current: Session | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  for (const l of listeners) l();
}

function scheduleExpiry(session: Session | null) {
  if (expiryTimer) clearTimeout(expiryTimer);
  if (!session) return;
  // Margem de 5s para não disparar requisições com token no limite.
  const ms = session.expiresAt - Date.now() - 5_000;
  expiryTimer = setTimeout(() => clearSession('expired'), Math.max(ms, 0));
}

function safeStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadSession(): Session | null {
  const raw = safeStorage()?.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const { token } = JSON.parse(raw) as { token?: unknown };
    if (typeof token !== 'string') throw new Error('invalid');
    const decoded = decodeJwt(token);
    if (!decoded || decoded.expiresAt <= Date.now()) throw new Error('expired');
    return { token, ...decoded };
  } catch {
    safeStorage()?.removeItem(STORAGE_KEY);
    return null;
  }
}

export function setSession(token: string): Session {
  const decoded = decodeJwt(token);
  if (!decoded) throw new Error('Token recebido do servidor é inválido.');
  current = { token, ...decoded };
  // Persistimos só o token; user/role são sempre re-derivados dele.
  safeStorage()?.setItem(STORAGE_KEY, JSON.stringify({ token }));
  scheduleExpiry(current);
  emit();
  return current;
}

export type LogoutReason = 'manual' | 'expired' | 'unauthorized';
let lastLogoutReason: LogoutReason | null = null;

export function clearSession(reason: LogoutReason = 'manual') {
  if (!current && !safeStorage()?.getItem(STORAGE_KEY)) return;
  current = null;
  lastLogoutReason = reason;
  safeStorage()?.removeItem(STORAGE_KEY);
  scheduleExpiry(null);
  emit();
}

export function consumeLogoutReason(): LogoutReason | null {
  const r = lastLogoutReason;
  lastLogoutReason = null;
  return r;
}

export function getSession(): Session | null {
  return current;
}

export function getToken(): string | null {
  if (current && current.expiresAt <= Date.now()) {
    clearSession('expired');
    return null;
  }
  return current?.token ?? null;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Boot
current = loadSession();
scheduleExpiry(current);
