import type { ReportReason, ReportStatus } from '@/api/types';

/** Mesmos limites do DTO do back (CreateReportDto). */
export const JUSTIFICATION_MIN = 10;
export const JUSTIFICATION_MAX = 500;

export const REPORT_REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: 'SCAM', label: 'Golpe ou cobrança de dinheiro', hint: 'Pede depósito, taxa, compra de material ou dados bancários.' },
  { value: 'FAKE_JOB', label: 'Vaga falsa ou inexistente', hint: 'A empresa não existe ou não está contratando.' },
  { value: 'DISCRIMINATION', label: 'Discriminação', hint: 'Exige ou exclui por idade, gênero, cor, religião, etc.' },
  { value: 'WRONG_INFO', label: 'Informação errada', hint: 'Salário, local ou condições diferentes do anunciado.' },
  { value: 'OTHER', label: 'Outro motivo', hint: 'Explique na justificativa.' },
];

export const REPORT_REASON_LABEL = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label])) as Record<ReportReason, string>;

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  OPEN: 'Aguardando análise',
  RESOLVED: 'Procedente',
  DISMISSED: 'Descartada',
};

/** Mensagem de erro da justificativa (ou null se estiver ok). Conta o texto já sem espaços nas pontas, como o back. */
export function validateJustification(text: string): string | null {
  const t = text.trim();
  if (t.length === 0) return 'Explique o motivo da denúncia.';
  if (t.length < JUSTIFICATION_MIN) return `Escreva um pouco mais (mínimo de ${JUSTIFICATION_MIN} caracteres).`;
  if (t.length > JUSTIFICATION_MAX) return `Máximo de ${JUSTIFICATION_MAX} caracteres.`;
  return null;
}
