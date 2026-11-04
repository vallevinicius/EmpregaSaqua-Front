import type { CityEvent, EventKind } from '@/api/types';
import { formatDate, formatTime } from './format';

export const EVENT_KIND_LABEL: Record<EventKind, string> = { FAIR: 'Feira de emprego', COURSE: 'Curso' };

const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

/** "5 de dez. de 2026, 10:00 às 18:00" no mesmo dia; "1 a 10 …" quando atravessa dias. */
export function formatEventWhen(e: Pick<CityEvent, 'starts_at' | 'ends_at'>): string {
  const start = `${formatDate(e.starts_at)}, ${formatTime(e.starts_at)}`;
  if (!e.ends_at) return start;
  if (sameDay(e.starts_at, e.ends_at)) return `${start} às ${formatTime(e.ends_at)}`;
  return `${start} até ${formatDate(e.ends_at)}, ${formatTime(e.ends_at)}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO -> valor de <input type="datetime-local"> (horário local, sem fuso). Vazio se inválido. */
export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Valor de datetime-local -> ISO (UTC). Vazio/inválido = null. */
export function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
