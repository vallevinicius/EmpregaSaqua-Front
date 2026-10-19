export interface ChatTarget {
  // Ausente = conversa direta (banco de talentos), sem vaga associada.
  jobId?: string;
  employerId: string;
  candidateId: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function chatLink(t: ChatTarget): string {
  const p = new URLSearchParams({ empresa: t.employerId, candidato: t.candidateId });
  if (t.jobId) p.set('vaga', t.jobId);
  return `/mensagens?${p.toString()}`;
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
