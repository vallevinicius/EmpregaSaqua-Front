import type { ApplicationStatus, ContractType, Escolaridade, Idioma, JobArea, JobStatus, NivelIdioma, Role, VerificationStatus, WorkModel } from '@/api/types';

export const JOB_AREA_LABEL: Record<JobArea, string> = {
  ADMINISTRACAO: 'Administração',
  TI: 'Tecnologia da Informação',
  SAUDE: 'Saúde',
  EDUCACAO: 'Educação',
  COMERCIO_VENDAS: 'Comércio e Vendas',
  ALIMENTACAO: 'Alimentação',
  CONSTRUCAO: 'Construção',
  LIMPEZA_SERVICOS_GERAIS: 'Limpeza e Serviços Gerais',
  LOGISTICA_TRANSPORTE: 'Logística e Transporte',
  TURISMO_HOTELARIA: 'Turismo e Hotelaria',
  OUTROS: 'Outros',
};

export const WORK_MODEL_LABEL: Record<WorkModel, string> = {
  ON_SITE: 'Presencial',
  HYBRID: 'Híbrido',
  REMOTE: 'Remoto',
};

export const CONTRACT_LABEL: Record<ContractType, string> = {
  TEMPO_DETERMINADO: 'Contrato por tempo determinado',
  INTERMITENTE: 'Trabalho intermitente',
  TERCEIRIZADO: 'Trabalho terceirizado',
  REMOTO: 'Trabalho remoto',
  PARCIAL: 'Trabalho parcial',
  JOVEM_APRENDIZ: 'Jovem aprendiz',
  ESTAGIO: 'Estágio',
  DOMESTICO: 'Trabalho doméstico',
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

export const ESCOLARIDADE_LABEL: Record<Escolaridade, string> = {
  ANALFABETO: 'Analfabeto',
  SEMIANALFABETO: 'Semianalfabeto',
  FUNDAMENTAL_COMPLETO: 'Fundamental completo',
  FUNDAMENTAL_INCOMPLETO: 'Fundamental incompleto',
  MEDIO_COMPLETO: 'Médio completo',
  MEDIO_INCOMPLETO: 'Médio incompleto',
  SUPERIOR_COMPLETO: 'Superior completo',
  SUPERIOR_INCOMPLETO: 'Superior incompleto',
  POS_GRADUACAO_COMPLETA: 'Pós-graduação completa',
  POS_GRADUACAO_INCOMPLETA: 'Pós-graduação incompleta',
  MESTRADO_COMPLETO: 'Mestrado completo',
  MESTRADO_INCOMPLETO: 'Mestrado incompleto',
  DOUTORADO_COMPLETO: 'Doutorado completo',
  DOUTORADO_INCOMPLETO: 'Doutorado incompleto',
};

export const IDIOMA_LABEL: Record<Idioma, string> = {
  INGLES: 'Inglês',
  ESPANHOL: 'Espanhol',
  FRANCES: 'Francês',
  ALEMAO: 'Alemão',
  CHINES: 'Chinês (mandarim)',
  JAPONES: 'Japonês',
  LIBRAS: 'Libras',
  OUTRO: 'Outro',
};

export const NIVEL_IDIOMA_LABEL: Record<NivelIdioma, string> = {
  BASICO: 'Básico',
  INTERMEDIARIO: 'Intermediário',
  AVANCADO: 'Avançado',
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

/** Números grandes viram "arredondado+" (ex.: 143 -> "100+", 2530 -> "2.500+") pra não parecer uma contagem exata. */
export function formatApproxCount(value: number): string {
  if (value < 100) return value.toLocaleString('pt-BR');
  const step = value < 1000 ? 100 : value < 10_000 ? 500 : 1000;
  const rounded = Math.floor(value / step) * step;
  return `${rounded.toLocaleString('pt-BR')}+`;
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

/** Máscara de CPF enquanto digita: 000.000.000-00. O back só recebe os dígitos (ver onlyDigits). */
export function formatCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  let out = d.slice(0, 3);
  if (d.length > 3) out += `.${d.slice(3, 6)}`;
  if (d.length > 6) out += `.${d.slice(6, 9)}`;
  if (d.length > 9) out += `-${d.slice(9, 11)}`;
  return out;
}

export function formatPhone(value: string | null | undefined): string {
  const d = (value ?? '').replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value ?? '';
}
