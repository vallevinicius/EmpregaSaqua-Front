/**
 * Captura de erros do navegador. Sem dependência externa: loga no console e, se
 * `VITE_ERROR_ENDPOINT` estiver definido, envia um JSON mínimo via sendBeacon.
 * Nunca envia dados do usuário: só mensagem, pilha e rota (sem query string/hash, que podem ter tokens).
 */
export interface ErrorReport {
  message: string;
  stack?: string;
  source: 'window' | 'promise' | 'boundary';
  path: string;
  at: string;
}

const MAX_TEXT = 2000;
const MAX_PER_SESSION = 20;

/** Tira query/hash (tokens de reset/verificação ficam ali) e limita o tamanho. */
export function sanitizeUrlPath(href: string): string {
  try {
    return new URL(href, 'http://x').pathname;
  } catch {
    return '/';
  }
}

export function buildReport(error: unknown, source: ErrorReport['source'], href: string, now = new Date()): ErrorReport {
  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Erro desconhecido');
  return {
    message: err.message.slice(0, MAX_TEXT),
    stack: err.stack?.slice(0, MAX_TEXT),
    source,
    path: sanitizeUrlPath(href),
    at: now.toISOString(),
  };
}

/** Cria um reporter com deduplicação (mesmo erro não se repete) e teto por sessão (evita flood). */
export function createReporter(send: (r: ErrorReport) => void, max = MAX_PER_SESSION) {
  const seen = new Set<string>();
  return (error: unknown, source: ErrorReport['source'], href = window.location.href) => {
    if (seen.size >= max) return;
    const report = buildReport(error, source, href);
    const key = `${report.source}|${report.message}|${report.stack?.split('\n')[1] ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    send(report);
  };
}

function defaultSend(endpoint: string) {
  return (report: ErrorReport) => {
    console.error('[erro]', report.message, report);
    if (!endpoint || typeof navigator.sendBeacon !== 'function') return;
    try {
      navigator.sendBeacon(endpoint, new Blob([JSON.stringify(report)], { type: 'application/json' }));
    } catch {
      /* relatório de erro nunca pode gerar outro erro */
    }
  };
}

let report: ReturnType<typeof createReporter> | null = null;

/** Registra os handlers globais (chamar uma vez, no main.tsx). Devolve `reportError` para o ErrorBoundary. */
export function installErrorReporting(endpoint: string) {
  report = createReporter(defaultSend(endpoint));
  window.addEventListener('error', (e) => report?.(e.error ?? e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => report?.(e.reason, 'promise'));
}

export function reportBoundaryError(error: unknown) {
  report?.(error, 'boundary');
}
