/** Prazo de inscrição da vaga: estado para o selo da lista da empresa e data nova ao renovar. */

export type ExpiryState = 'none' | 'ok' | 'soon' | 'expired';

export const RENEW_DAYS = 30;
const SOON_DAYS = 7;
const DAY_MS = 86_400_000;

export function expiryState(expiresAt: string | null | undefined, now = Date.now()): { state: ExpiryState; daysLeft: number } {
  if (!expiresAt) return { state: 'none', daysLeft: Infinity };
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return { state: 'none', daysLeft: Infinity };
  if (t < now) return { state: 'expired', daysLeft: 0 };
  const daysLeft = Math.ceil((t - now) / DAY_MS);
  return { state: daysLeft <= SOON_DAYS ? 'soon' : 'ok', daysLeft };
}

/** Novo prazo: fim do dia, `RENEW_DAYS` dias a partir de hoje (horário local), em ISO. */
export function renewedExpiry(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + RENEW_DAYS, 23, 59, 59);
  return d.toISOString();
}
