/**
 * Tipos espelhando src/prisma/contract.prisma do back (snake_case, como a API devolve).
 * Campos sensíveis (password_hash, expected_answer, internal_notes) são deliberadamente
 * OMITIDOS: o front não deve depender deles nem propagá-los em estado.
 */

export type Role = 'JOB_SEEKER' | 'EMPLOYER' | 'ADMIN';
export type JobStatus = 'PENDING' | 'ACTIVE' | 'FILLED' | 'REJECTED';
export type ApplicationStatus = 'APPLIED' | 'REVIEWING' | 'INTERVIEW' | 'HIRED' | 'REJECTED';
export type WorkModel = 'ON_SITE' | 'HYBRID' | 'REMOTE';
export type ContractType = 'CLT' | 'PJ' | 'INTERNSHIP' | 'FREELANCE' | 'APPRENTICE';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SessionUser {
  id: string;
  email: string;
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
  logo_url: string | null;
  verification_status: VerificationStatus;
  verification_document_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobQuestion {
  id: string;
  question_text: string;
}

export interface Job {
  id: string;
  employer_id: string;
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
  is_salary_visible: boolean;
  is_pcd: boolean;
  expires_at: string | null;
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
  bio: string | null;
  telefone: string | null;
  habilidades: string | null;
  skills: string[];
  address: string | null;
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

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

/** Contrato proposto (endpoint pendente no back) — ver BACKEND_CONTRACT.md */
export interface ChatRoomSummary {
  id: string;
  job_id: string;
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
