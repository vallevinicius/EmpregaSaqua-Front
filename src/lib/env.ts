/**
 * Config pública do bundle. NUNCA coloque segredos em VITE_* — tudo aqui vai para o browser.
 */
function normalizeBase(raw: string | undefined, fallback: string): string {
  const value = (raw ?? '').trim() || fallback;
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export const env = {
  apiUrl: normalizeBase(import.meta.env.VITE_API_URL, '/api'),
  /** Vazio = mesma origem da página (proxy /socket.io). */
  wsUrl: (import.meta.env.VITE_WS_URL ?? '').trim(),
} as const;
