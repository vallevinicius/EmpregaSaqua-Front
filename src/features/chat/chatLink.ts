import { sanitizeDraft } from '@/lib/invite';

export interface ChatTarget {
  // Ausente = conversa direta (banco de talentos), sem vaga associada.
  jobId?: string;
  employerId: string;
  candidateId: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `draft` vira texto já digitado no campo de mensagem (nunca é enviado sozinho). */
export function chatLink(t: ChatTarget, draft?: string): string {
  const p = new URLSearchParams({ empresa: t.employerId, candidato: t.candidateId });
  if (t.jobId) p.set('vaga', t.jobId);
  const d = sanitizeDraft(draft);
  if (d) p.set('rascunho', d);
  return `/mensagens?${p.toString()}`;
}

/** Rascunho da URL (entrada não confiável): só preenche o campo, a pessoa revisa e envia. */
export function parseChatDraft(sp: URLSearchParams): string {
  return sanitizeDraft(sp.get('rascunho'));
}

/** Só aceita UUIDs — parâmetros de URL são entrada não-confiável. */
export function parseChatTarget(sp: URLSearchParams): ChatTarget | null {
  const jobId = sp.get('vaga');
  const employerId = sp.get('empresa') ?? '';
  const candidateId = sp.get('candidato') ?? '';
  if (![employerId, candidateId].every((v) => UUID.test(v))) return null;
  if (jobId && !UUID.test(jobId)) return null;
  return { jobId: jobId || undefined, employerId, candidateId };
}
