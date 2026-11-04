import type { CountRow } from '@/api/types';

const MAX_SPAN_MONTHS = 60;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Troca códigos da API por rótulos em português; o que não está no mapa aparece como veio (nunca some). */
export function labelRows(rows: CountRow[], labels: Record<string, string>): { label: string; value: number }[] {
  return rows.map((r) => ({ label: labels[r.label] ?? r.label, value: r.count }));
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Mesmo padrão do back: do 1º dia do mês de 11 meses atrás até hoje. */
export function defaultRange(today: Date = new Date()): { from: string; to: string } {
  return { from: ymd(new Date(today.getFullYear(), today.getMonth() - 11, 1)), to: ymd(today) };
}

/** Mensagem de erro do período (ou null). Confere o mesmo que o back, para avisar antes de ir ao servidor. */
export function validateRange(from: string, to: string): string | null {
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return 'Informe as duas datas.';
  if (from > to) return 'A data inicial não pode ser depois da final.';
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + (Number(to.slice(5, 7)) - Number(from.slice(5, 7))) + 1;
  if (months > MAX_SPAN_MONTHS) return 'O período máximo é de 5 anos.';
  return null;
}

/** "2026-03" -> "mar/2026" */
export function formatMonthKey(key: string): string {
  const [y, m] = key.split('-');
  const names = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const idx = Number(m) - 1;
  return names[idx] ? `${names[idx]}/${y}` : key;
}
