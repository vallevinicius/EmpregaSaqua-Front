import { request, seg } from '@/lib/http';
import type {
  AdminAnalytics,
  AdminCompany,
  AdminUser,
  Application,
  ApplicationStatus,
  AuthResponse,
  CandidateProfile,
  CandidateSearchResult,
  CepResponse,
  ChatMessage,
  ChatRoomSummary,
  CompanyProfile,
  ContractType,
  EmployerAnalytics,
  Education,
  Experience,
  Job,
  JobApplication,
  JobStatus,
  Paginated,
  Role,
  SavedCandidate,
  UploadResponse,
  VerificationStatus,
  WorkModel,
} from './types';

/**
 * Camada única de acesso à API. Componentes nunca chamam fetch direto.
 * Endpoints marcados com @pending NÃO existem no back hoje — o contrato está em BACKEND_CONTRACT.md.
 * Enquanto não existirem, retornam 404 e a UI mostra <PendingEndpoint/>.
 */

// ---------- mapeadores defensivos ----------

/** Remove expected_answer (gabarito das perguntas knockout) que o back hoje vaza publicamente. */
function sanitizeJob<T extends Job>(job: T): T {
  if (!job) return job;
  const questions = Array.isArray(job.questions)
    ? job.questions.map((q) => ({ id: q.id, question_text: q.question_text }))
    : job.questions;
  const cp = job.employer?.company_profile;
  const employer = job.employer
    ? {
        id: job.employer.id,
        company_profile: cp
          ? {
              nome_fantasia: cp.nome_fantasia,
              logo_url: cp.logo_url,
              verification_status: cp.verification_status,
              endereco: cp.endereco,
            }
          : null,
      }
    : job.employer;
  return { ...job, questions, employer };
}

/** Mantém só campos públicos do usuário aninhado (o back hoje devolve password_hash em includes). */
function pickUser<U extends { id: string; email: string }>(u: U | undefined | null) {
  return u ? { id: u.id, email: u.email } : undefined;
}

// ---------- Auth ----------

export interface RegisterInput {
  email: string;
  password: string;
  /** ADMIN nunca é enviado pelo front. */
  role: Extract<Role, 'JOB_SEEKER' | 'EMPLOYER'>;
  /** Cria o CompanyProfile já no cadastro (role EMPLOYER). Sem isso o perfil nunca existe (ver users.service.ts#create). */
  nome_fantasia?: string;
  cnpj?: string;
  endereco?: string;
  /** Cria o CandidateProfile já no cadastro (role JOB_SEEKER). */
  full_name?: string;
  address?: string;
  bio?: string;
  /** Compartilhado entre empresa e candidato. */
  telefone?: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (input: RegisterInput) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false }),
};

// ---------- Jobs ----------

export interface JobFilters {
  page?: number;
  limit?: number;
  title_like?: string;
  address?: string;
  work_model?: WorkModel | '';
  contract_type?: ContractType | '';
  is_pcd?: boolean;
}

export interface JobInput {
  title: string;
  description: string;
  address: string;
  work_schedule: string;
  salary_range?: string;
  mandatory_qualifications: string[];
  differential_qualifications: string[];
  benefits: string[];
  work_model: WorkModel;
  contract_type: ContractType;
  is_salary_visible?: boolean;
  is_pcd?: boolean;
  expires_at?: string;
  contact_whatsapp?: string;
  contact_email?: string;
  questions?: { question_text: string; expected_answer: boolean }[];
}

export const jobsApi = {
  list: async (filters: JobFilters, signal?: AbortSignal) => {
    const res = await request<Paginated<Job>>('/jobs', { query: { ...filters }, auth: false, signal });
    return { ...res, data: res.data.map(sanitizeJob) };
  },
  get: async (id: string, signal?: AbortSignal) => sanitizeJob(await request<Job>(`/jobs/${seg(id)}`, { auth: false, signal })),
  create: (input: JobInput) => request<Job>('/jobs', { method: 'POST', body: input }),
  update: (id: string, input: Partial<JobInput>) => request<Job>(`/jobs/${seg(id)}`, { method: 'PATCH', body: input }),
  remove: (id: string) => request<{ message: string }>(`/jobs/${seg(id)}`, { method: 'DELETE' }),
  /** @pending GET /jobs/mine — vagas do employer em qualquer status. */
  mine: async (params: { page: number; limit: number; status?: JobStatus | '' }, signal?: AbortSignal) => {
    const res = await request<Paginated<Job>>('/jobs/mine', { query: params, signal });
    return { ...res, data: res.data.map(sanitizeJob) };
  },
};

// ---------- Applications ----------

export interface ApplyInput {
  cover_letter?: string;
  resume_url?: string;
  answers?: { question_id: string; answer: boolean }[];
}

export const applicationsApi = {
  apply: (jobId: string, input: ApplyInput) =>
    request<Application>(`/jobs/${seg(jobId)}/applications`, { method: 'POST', body: input }),
  mine: (signal?: AbortSignal) => request<Application[]>('/applications', { signal }),
  withdraw: (id: string) => request<void>(`/applications/${seg(id)}`, { method: 'DELETE' }),
  forJob: async (jobId: string, signal?: AbortSignal) => {
    const list = await request<JobApplication[]>(`/jobs/${seg(jobId)}/applications`, { signal });
    return list.map((a) => ({
      id: a.id,
      job_id: a.job_id,
      applicant_id: a.applicant_id,
      cover_letter: a.cover_letter,
      resume_url: a.resume_url,
      status: a.status,
      is_knocked_out: a.is_knocked_out,
      created_at: a.created_at,
      updated_at: a.updated_at,
      match_score: a.match_score,
      applicant: a.applicant
        ? { ...pickUser(a.applicant)!, candidate_profile: a.applicant.candidate_profile ?? null }
        : undefined,
    })) satisfies JobApplication[];
  },
  updateStatus: (id: string, status: ApplicationStatus) =>
    request<Application>(`/applications/${seg(id)}/status`, { method: 'PATCH', body: { status } }),
};

// ---------- Candidates ----------

export interface CandidateProfileInput {
  full_name?: string;
  bio?: string;
  telefone?: string;
  address?: string;
  skills?: string[];
  experiences?: Omit<Experience, 'id'>[];
  educations?: Omit<Education, 'id'>[];
}

export const candidatesApi = {
  search: (params: { skills?: string; role?: string; location?: string; page?: number; limit?: number }, signal?: AbortSignal) =>
    request<CandidateSearchResult>('/candidates', { query: params, signal }),
  me: (signal?: AbortSignal) => request<CandidateProfile>('/candidates/me', { signal }),
  updateProfile: (input: CandidateProfileInput) =>
    request<CandidateProfile>('/candidates/profile', { method: 'PATCH', body: input }),
  downloadResume: () => request<Blob>('/candidates/me/resume/pdf', { responseType: 'blob', timeoutMs: 30_000 }),
};

// ---------- Users / Company ----------

export const usersApi = {
  companyProfile: (signal?: AbortSignal) => request<CompanyProfile>('/users/company-profile', { signal }),
  updateCompanyProfile: (input: { nome_fantasia?: string; endereco?: string; telefone?: string; cnpj?: string }) =>
    request<CompanyProfile>('/users/company-profile', { method: 'PATCH', body: input }),
  deleteAccount: () => request<void>('/users/account', { method: 'DELETE' }),
};

// ---------- Uploads ----------

export const uploadsApi = {
  logo: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<UploadResponse>('/uploads/logo', { method: 'POST', body: fd, timeoutMs: 60_000 });
  },
  verificationDocument: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<UploadResponse>('/uploads/verification-document', { method: 'POST', body: fd, timeoutMs: 60_000 });
  },
};

// ---------- Talent pool ----------

export const talentPoolApi = {
  list: async (page: number, limit: number, signal?: AbortSignal) => {
    const res = await request<Paginated<SavedCandidate>>('/talent-pool', { query: { page, limit }, signal });
    return {
      ...res,
      data: res.data.map((s) => ({
        ...s,
        candidate: s.candidate
          ? { ...pickUser(s.candidate)!, candidate_profile: s.candidate.candidate_profile ?? null }
          : undefined,
      })),
    };
  },
  save: (candidate_id: string, notes?: string) =>
    request<SavedCandidate>('/talent-pool', { method: 'POST', body: { candidate_id, notes: notes || undefined } }),
  remove: (id: string) => request<void>(`/talent-pool/${seg(id)}`, { method: 'DELETE' }),
};

// ---------- Analytics ----------

export const analyticsApi = {
  admin: (signal?: AbortSignal) => request<AdminAnalytics>('/analytics/admin', { signal }),
  employer: (signal?: AbortSignal) => request<EmployerAnalytics>('/analytics/employer', { signal }),
};

// ---------- Admin ----------

export const adminApi = {
  approveCompany: (id: string) => request<CompanyProfile>(`/admin/companies/${seg(id)}/approve`, { method: 'PATCH' }),
  rejectCompany: (id: string) => request<CompanyProfile>(`/admin/companies/${seg(id)}/reject`, { method: 'PATCH' }),
  approveJob: (id: string) => request<Job>(`/admin/jobs/${seg(id)}/approve`, { method: 'PATCH' }),
  rejectJob: (id: string) => request<Job>(`/admin/jobs/${seg(id)}/reject`, { method: 'PATCH' }),
  updateJob: (id: string, input: Partial<JobInput> & { status?: JobStatus }) =>
    request<Job>(`/admin/jobs/${seg(id)}`, { method: 'PATCH', body: input }),
  deleteJob: (id: string) => request<unknown>(`/admin/jobs/${seg(id)}`, { method: 'DELETE' }),
  updateUserRole: (id: string, role: Role) =>
    request<unknown>(`/admin/users/${seg(id)}/role`, { method: 'PATCH', body: { role } }),
  deleteUser: (id: string) => request<unknown>(`/admin/users/${seg(id)}`, { method: 'DELETE' }),
  /** @pending GET /admin/jobs */
  listJobs: async (params: { status?: JobStatus; page: number; limit: number }, signal?: AbortSignal) => {
    const res = await request<Paginated<Job>>('/admin/jobs', { query: params, signal });
    return { ...res, data: res.data.map(sanitizeJob) };
  },
  /** @pending GET /admin/companies */
  listCompanies: (params: { status?: VerificationStatus; page: number; limit: number }, signal?: AbortSignal) =>
    request<Paginated<AdminCompany>>('/admin/companies', { query: params, signal }),
  /** @pending GET /admin/users */
  listUsers: (params: { role?: Role | ''; page: number; limit: number }, signal?: AbortSignal) =>
    request<Paginated<AdminUser>>('/admin/users', { query: params, signal }),
};

// ---------- Chat (REST) ----------

export const chatApi = {
  unreadCount: (signal?: AbortSignal) => request<{ count: number }>('/chat/unread-count', { signal }),
  markRead: (roomId: string) => request<{ status: string }>(`/chat/room/${seg(roomId)}/read`, { method: 'PATCH' }),
  /** @pending GET /chat/rooms */
  rooms: (signal?: AbortSignal) => request<ChatRoomSummary[]>('/chat/rooms', { signal }),
  /** @pending GET /chat/room/:roomId/messages */
  messages: (roomId: string, signal?: AbortSignal) => request<ChatMessage[]>(`/chat/room/${seg(roomId)}/messages`, { signal }),
};

// ---------- CEP ----------

export const cepApi = {
  lookup: (cep: string, signal?: AbortSignal) => {
    if (!/^\d{8}$/.test(cep)) return Promise.reject(new Error('CEP inválido'));
    return request<CepResponse>(`/cep/${cep}`, { auth: false, signal, timeoutMs: 10_000 });
  },
};
