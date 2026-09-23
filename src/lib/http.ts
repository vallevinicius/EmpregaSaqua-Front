import { env } from './env';
import { clearSession, getToken } from '@/auth/session';

/**
 * Cliente HTTP único. Regras:
 * - Timeout obrigatório (AbortController) — nenhuma requisição fica pendurada em pico.
 * - Só JSON (ou FormData/Blob explícitos). Nunca interpreta resposta como HTML.
 * - 401 com token => derruba sessão (token expirado/conta removida).
 * - Mensagens de erro exibidas ao usuário vêm do corpo padronizado do GlobalExceptionFilter;
 *   500 sempre vira mensagem genérica (o back já mascara, reforçamos aqui).
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: string[];
  readonly path: string;

  constructor(status: number, message: string, opts: { code?: string; details?: string[]; path: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = opts.code ?? 'UNKNOWN';
    this.details = opts.details ?? [];
    this.path = opts.path;
  }

  get isNetwork() {
    return this.status === 0;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  auth?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
  responseType?: 'json' | 'blob';
}

const DEFAULT_TIMEOUT = 15_000;

export function buildUrl(path: string, query?: Query): string {
  if (!path.startsWith('/')) throw new Error('path deve começar com /');
  const qs = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      qs.append(k, String(v));
    }
  }
  const s = qs.toString();
  return `${env.apiUrl}${path}${s ? `?${s}` : ''}`;
}

/** Encode seguro de segmentos de path (IDs vindos de URL/estado). */
export function seg(value: string): string {
  return encodeURIComponent(value);
}

function statusFallbackMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Dados inválidos. Revise os campos.';
    case 401:
      return 'Sua sessão expirou. Entre novamente.';
    case 403:
      return 'Você não tem permissão para esta ação.';
    case 404:
      return 'Recurso não encontrado.';
    case 409:
      return 'Conflito: o registro já existe ou está em um estado inválido.';
    case 413:
      return 'Arquivo muito grande.';
    case 415:
      return 'Tipo de arquivo não suportado.';
    case 429:
      return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
    case 503:
      return 'Serviço temporariamente indisponível.';
    default:
      return 'Ocorreu um erro inesperado. Tente novamente.';
  }
}

async function parseError(res: Response, path: string): Promise<ApiError> {
  let message = statusFallbackMessage(res.status);
  let details: string[] = [];
  let code: string | undefined;

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    try {
      const body = (await res.json()) as { message?: unknown; code?: unknown };
      if (typeof body.code === 'string') code = body.code;
      if (res.status < 500) {
        if (Array.isArray(body.message)) {
          details = body.message.filter((m): m is string => typeof m === 'string').slice(0, 10);
          if (details[0]) message = details[0];
        } else if (typeof body.message === 'string' && body.message.length < 300) {
          message = body.message;
        }
      }
    } catch {
      /* corpo inválido: mantém fallback */
    }
  }
  return new ApiError(res.status, message, { code, details, path });
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, timeoutMs = DEFAULT_TIMEOUT, signal, responseType = 'json' } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });

  const headers: Record<string, string> = { Accept: responseType === 'blob' ? '*/*' : 'application/json' };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body; // browser define o boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: payload,
      signal: controller.signal,
      credentials: 'same-origin',
      redirect: 'error',
      referrerPolicy: 'strict-origin-when-cross-origin',
    });
  } catch (err) {
    const aborted = controller.signal.aborted && !signal?.aborted;
    if (signal?.aborted) throw err;
    throw new ApiError(0, aborted ? 'O servidor demorou para responder.' : 'Sem conexão com o servidor.', { path });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  if (!res.ok) {
    const error = await parseError(res, path);
    if (res.status === 401 && token) clearSession('unauthorized');
    throw error;
  }

  if (responseType === 'blob') return (await res.blob()) as T;
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return undefined as T;
  return (await res.json()) as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Ocorreu um erro inesperado.';
}
