/**
 * Tipos espelhando src/prisma/contract.prisma do back (snake_case, como a API devolve).
 * Campos sensíveis (password_hash, eliminates do QuestionOption, internal_notes) são
 * deliberadamente OMITIDOS: o front não deve depender deles nem propagá-los em estado.
 */

export type Role = 'JOB_SEEKER' | 'EMPLOYER' | 'ADMIN';
export type JobStatus = 'PENDING' | 'ACTIVE' | 'FILLED' | 'REJECTED';
export type ApplicationStatus = 'APPLIED' | 'REVIEWING' | 'INTERVIEW' | 'HIRED' | 'REJECTED';
export type WorkModel = 'ON_SITE' | 'HYBRID' | 'REMOTE';
export type ContractType =
  | 'TEMPO_DETERMINADO'
  | 'INTERMITENTE'
  | 'TERCEIRIZADO'
  | 'REMOTO'
  | 'PARCIAL'
  | 'JOVEM_APRENDIZ'
  | 'ESTAGIO'
  | 'DOMESTICO';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type JobArea =
  | 'ADMINISTRACAO'
  | 'TI'
  | 'SAUDE'
  | 'EDUCACAO'
  | 'COMERCIO_VENDAS'
  | 'ALIMENTACAO'
  | 'CONSTRUCAO'
  | 'LIMPEZA_SERVICOS_GERAIS'
  | 'LOGISTICA_TRANSPORTE'
  | 'TURISMO_HOTELARIA'
  | 'OUTROS';

export type Escolaridade =
  | 'ANALFABETO'
  | 'SEMIANALFABETO'
  | 'FUNDAMENTAL_COMPLETO'
  | 'FUNDAMENTAL_INCOMPLETO'
  | 'MEDIO_COMPLETO'
  | 'MEDIO_INCOMPLETO'
  | 'SUPERIOR_COMPLETO'
  | 'SUPERIOR_INCOMPLETO'
  | 'POS_GRADUACAO_COMPLETA'
  | 'POS_GRADUACAO_INCOMPLETA'
  | 'MESTRADO_COMPLETO'
  | 'MESTRADO_INCOMPLETO'
  | 'DOUTORADO_COMPLETO'
  | 'DOUTORADO_INCOMPLETO';

export type Idioma = 'INGLES' | 'ESPANHOL' | 'FRANCES' | 'ALEMAO' | 'CHINES' | 'JAPONES' | 'LIBRAS' | 'OUTRO';
export type NivelIdioma = 'BASICO' | 'INTERMEDIARIO' | 'AVANCADO';

export interface CandidateLanguage {
  id?: string;
  idioma: Idioma;
  idioma_outro?: string | null;
  nivel: NivelIdioma;
}

export interface SessionUser {
  id: string;
  email: string;
  username?: string;
  role: Role;
}

export interface AuthResponse {
  access_token: string;
  user: SessionUser & { created_at?: string };
}

export interface PaginationMeta {
  total_items: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface CompanyProfile {
  id: string;
  user_id: string;
  nome_fantasia: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  logo_url: string | null;
  verification_status: VerificationStatus;
  verification_document_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  option_text: string;
}

export interface JobQuestion {
  id: string;
  question_text: string;
  options: QuestionOption[];
}

/** Página pública da empresa (GET /companies/:id). Só empresas aprovadas; sem CNPJ, telefone nem documentos. */
export interface PublicCompany {
  /** Mesmo valor do `employer_id` das vagas. */
  id: string;
  nome_fantasia: string;
  logo_url: string | null;
  endereco: string | null;
  active_jobs_count: number;
}

export interface Job {
  id: string;
  employer_id: string;
  /** Bairro de Saquarema (lista oficial). Ausente em vagas antigas, de antes da regra. */
  bairro?: string | null;
  title: string;
  description: string;
  address: string;
  work_schedule: string;
  salary_range: string | null;
  mandatory_qualifications: string[];
  differential_qualifications: string[];
  benefits: string[];
  work_model: WorkModel;
  contract_type: ContractType;
  area?: JobArea | null;
  is_salary_visible: boolean;
  is_pcd: boolean;
  expires_at: string | null;
  escolaridade_exigida?: Escolaridade | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  employer?: {
    id: string;
    company_profile?: Pick<CompanyProfile, 'nome_fantasia' | 'logo_url'> & Partial<CompanyProfile> | null;
  } | null;
  questions?: JobQuestion[];
  language_requirements?: CandidateLanguage[];
}

export interface Experience {
  id?: string;
  company: string;
  role: string;
  start_date: string;
  end_date?: string | null;
  description: string;
}

export interface Education {
  id?: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date?: string | null;
}

export interface CandidateProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  bio: string | null;
  telefone: string | null;
  habilidades: string | null;
  skills: string[];
  languages: CandidateLanguage[];
  area?: JobArea | null;
  avatar_url?: string | null;
  address: string | null;
  bairro?: string | null;
  genero?: string | null;
  cargo_interesse?: string | null;
  is_pcd: boolean;
  /** Visibilidade para empresas ("aberto a oportunidades"). Depende do back expor o campo — ver `open_to_work` em endpoints.ts. */
  open_to_work?: boolean;
  escolaridade?: Escolaridade | null;
  created_at: string;
  updated_at: string;
  user?: { id: string; email: string };
  experiences?: Experience[];
  educations?: Education[];
}

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter: string | null;
  resume_url: string | null;
  status: ApplicationStatus;
  is_knocked_out: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobApplication extends Application {
  match_score: number;
  applicant?: { id: string; email: string; candidate_profile?: CandidateProfile | null };
}

export interface CandidateSearchResult {
  data: CandidateProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SavedCandidate {
  id: string;
  employer_id: string;
  candidate_id: string;
  notes: string | null;
  created_at: string;
  candidate?: { id: string; email: string; candidate_profile?: CandidateProfile | null };
}

export interface JobAlert {
  id: string;
  candidate_id: string;
  keyword: string | null;
  address: string | null;
  work_model: WorkModel | null;
  contract_type: ContractType | null;
  is_pcd: boolean;
  created_at: string;
}

export interface AdminAnalytics {
  total_users: number;
  total_companies: number;
  pending_jobs: number;
  active_jobs: number;
}

export interface EmployerAnalytics {
  active_jobs: number;
  total_applications: number;
  applications_by_status: { status: ApplicationStatus; count: number }[];
}

export interface CepResponse {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface UploadResponse {
  message: string;
  url: string;
  filename: string;
  size_bytes: number;
}

/** Documento de verificação não devolve URL: fica fora do storage público — ver GET /admin/companies/:id/verification-document. */
export interface DocumentUploadResponse {
  message: string;
  filename: string;
  size_bytes: number;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: 'image' | 'document' | null;
  edited_at?: string | null;
  deleted_at?: string | null;
}

/** Resumo de sala de conversa */
export interface ChatRoomSummary {

  id: string;
  job_id: string | null;
  candidate_id: string;
  employer_id: string;
  job_title: string;
  counterpart_name: string;
  last_message: Pick<ChatMessage, 'content' | 'created_at' | 'sender_id'> | null;
  unread_count: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: Role;
  created_at: string;
  deleted_at: string | null;
}

export interface AdminCompany extends CompanyProfile {
  user?: { id: string; email: string };
}

// ---------- Denúncias ----------

export type ReportReason = 'SCAM' | 'FAKE_JOB' | 'DISCRIMINATION' | 'WRONG_INFO' | 'OTHER';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

/** Denúncia como o admin enxerga (a resposta do POST ao denunciante é só id/status/created_at). */
export interface AdminReport {
  id: string;
  /** Uma denúncia é de uma vaga (job_id) OU de uma empresa (employer_id). */
  job_id: string | null;
  employer_id: string | null;
  reporter_id: string;
  reason: ReportReason;
  justification: string;
  status: ReportStatus;
  admin_note: string | null;
  resolved_at: string | null;
  created_at: string;
  job?: {
    id: string;
    title: string;
    status: JobStatus;
    bairro: string | null;
    employer_id: string;
    employer?: { company_profile?: { nome_fantasia: string } | null } | null;
  } | null;
  employer?: { id: string; company_profile?: { nome_fantasia: string; verification_status: VerificationStatus } | null } | null;
  reporter?: { id: string; email: string } | null;
}

// ---------- Indicadores (admin) ----------

export interface CountRow {
  label: string;
  count: number;
}

export interface Indicators {
  period: { from: string; to: string };
  totals: { active_jobs: number; approved_companies: number; candidates: number; applications: number };
  in_period: { new_jobs: number; new_applications: number; hires: number; new_candidates: number; new_companies: number };
  jobs_by_bairro: CountRow[];
  candidates_by_bairro: CountRow[];
  jobs_by_area: CountRow[];
  jobs_by_contract_type: CountRow[];
  applications_by_status: CountRow[];
  monthly: { month: string; jobs: number; applications: number; hires: number; candidates: number }[];
}

// ---------- Feiras e cursos ----------

export type EventKind = 'FAIR' | 'COURSE';

export interface CityEvent {
  id: string;
  kind: EventKind;
  title: string;
  description: string;
  location: string;
  bairro: string | null;
  starts_at: string;
  ends_at: string | null;
  link: string | null;
  published: boolean;
  created_at: string;
}
