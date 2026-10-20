/**
 * Textos de convite que a empresa manda pelo chat (entrevista e convite para vaga).
 * O texto só vira RASCUNHO no campo de mensagem: a empresa lê, edita e envia — nada sai sozinho.
 */

/** Limite do rascunho vindo da URL. Bem abaixo do máximo de uma mensagem de chat. */
export const MAX_DRAFT = 500;

const MAX_TITLE = 100;
const MAX_PLACE = 100;
const MAX_NOTE = 150;

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

/** `2026-03-05` -> `05/03/2026`. Entrada fora do formato volta vazia (não quebra a tela). */
export function formatInviteDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export interface InterviewDraft {
  date: string; // AAAA-MM-DD
  time: string; // HH:MM
  place: string;
  note?: string;
}

/** Mensagem de erro em português, ou `null` se estiver tudo certo. `today` é AAAA-MM-DD (injetável para teste). */
export function validateInterview(d: InterviewDraft, today: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || Number.isNaN(new Date(`${d.date}T00:00:00`).getTime())) return 'Informe a data da entrevista.';
  if (d.date < today) return 'A data da entrevista não pode estar no passado.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)) return 'Informe o horário (ex.: 14:30).';
  if (!oneLine(d.place)) return 'Informe o local ou o link da entrevista.';
  if (d.place.length > MAX_PLACE) return `O local pode ter no máximo ${MAX_PLACE} caracteres.`;
  if ((d.note ?? '').length > MAX_NOTE) return `A observação pode ter no máximo ${MAX_NOTE} caracteres.`;
  return null;
}

export function interviewInviteMessage(jobTitle: string, d: InterviewDraft): string {
  const lines = [
    `Olá! Gostaríamos de conversar com você sobre a vaga "${clip(oneLine(jobTitle), MAX_TITLE)}".`,
    `Que tal ${formatInviteDate(d.date)} às ${d.time}?`,
    `Local: ${clip(oneLine(d.place), MAX_PLACE)}.`,
  ];
  const note = oneLine(d.note ?? '');
  if (note) lines.push(clip(note, MAX_NOTE));
  lines.push('Pode confirmar por aqui?');
  return lines.join('\n');
}

export function jobInviteMessage(jobTitle: string, jobUrl: string): string {
  return [
    `Olá! Vi o seu currículo no EmpregaSaquá e acho que você combina com a vaga "${clip(oneLine(jobTitle), MAX_TITLE)}".`,
    `Veja os detalhes e se candidate: ${jobUrl}`,
    'Se tiver interesse ou dúvidas, responda por aqui.',
  ].join('\n');
}

/** Hoje como AAAA-MM-DD no fuso local (o `<input type="date">` trabalha em horário local). */
export function todayLocal(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Rascunho vindo da URL é entrada não confiável: sem caracteres de controle e com tamanho limitado. */
export function sanitizeDraft(raw: string | null | undefined): string {
  // eslint-disable-next-line no-control-regex
  return (raw ?? '').replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, MAX_DRAFT);
}
