import type { ApplicationStatus, ContractType, JobStatus, Role, VerificationStatus, WorkModel } from '@/api/types';

export const WORK_MODEL_LABEL: Record<WorkModel, string> = {
  ON_SITE: 'Presencial',
  HYBRID: 'Híbrido',
  REMOTE: 'Remoto',
};

export const CONTRACT_LABEL: Record<ContractType, string> = {
  CLT: 'CLT',
  PJ: 'PJ',
  INTERNSHIP: 'Estágio',
  FREELANCE: 'Freelance',
  APPRENTICE: 'Jovem Aprendiz',
};

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  PENDING: 'Em análise',
  ACTIVE: 'Ativa',
  FILLED: 'Preenchida',
  REJECTED: 'Reprovada',
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: 'Enviada',
  REVIEWING: 'Em análise',
  INTERVIEW: 'Entrevista',
  HIRED: 'Contratado',
  REJECTED: 'Não selecionado',
};

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  PENDING: 'Verificação pendente',
  APPROVED: 'Empresa verificada',
  REJECTED: 'Verificação reprovada',
};

export const ROLE_LABEL: Record<Role, string> = {
  JOB_SEEKER: 'Candidato',
  EMPLOYER: 'Empresa',
  ADMIN: 'Administrador',
};

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : dateFmt.format(d);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : timeFmt.format(d);
}

export function relativeDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const diffDays = Math.round((d - Date.now()) / 86_400_000);
  if (Math.abs(diffDays) < 1) return 'hoje';
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
  return formatDate(iso);
}

const monthYearFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });

/** "2023-05" -> "mai. 2023". Usado no currículo (experiências/formação). */
export function formatMonthYear(value: string | null | undefined): string {
  if (!value) return 'Atual';
  const [y, m] = value.split('-').map(Number);
  if (!y || !m) return value;
  const d = new Date(y, m - 1, 1);
  return Number.isNaN(d.getTime()) ? value : monthYearFmt.format(d);
}

export function formatCep(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Máscara de CNPJ enquanto digita: 00.000.000/0000-00. O back só recebe os dígitos (ver onlyDigits). */
export function formatCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  let out = d.slice(0, 2);
  if (d.length > 2) out += `.${d.slice(2, 5)}`;
  if (d.length > 5) out += `.${d.slice(5, 8)}`;
  if (d.length > 8) out += `/${d.slice(8, 12)}`;
  if (d.length > 12) out += `-${d.slice(12, 14)}`;
  return out;
}

export function formatPhone(value: string | null | undefined): string {
  const d = (value ?? '').replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value ?? '';
}
