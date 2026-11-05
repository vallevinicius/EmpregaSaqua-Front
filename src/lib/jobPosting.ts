import type { ContractType, Job } from '@/api/types';
import { decodeEntities, safeHttpUrl } from './safe';

/** schema.org employmentType (valores que o Google aceita). */
const EMPLOYMENT_TYPE: Record<ContractType, string> = {
  TEMPO_DETERMINADO: 'CONTRACTOR',
  INTERMITENTE: 'TEMPORARY',
  TERCEIRIZADO: 'CONTRACTOR',
  REMOTO: 'FULL_TIME',
  PARCIAL: 'PART_TIME',
  JOVEM_APRENDIZ: 'OTHER',
  ESTAGIO: 'INTERN',
  DOMESTICO: 'OTHER',
};

/**
 * JSON-LD `JobPosting` para o Google for Jobs. Só vagas ativas e não expiradas geram dado
 * (vaga encerrada com JobPosting vira penalidade no Search Console). Texto vem decodificado
 * (a API sanitiza com entidades) e é serializado com JSON.stringify; ver `toJsonLdScript`.
 */
export function buildJobPostingJsonLd(job: Job, origin: string, now = new Date()): Record<string, unknown> | null {
  if (job.status !== 'ACTIVE' || job.deleted_at) return null;
  if (job.expires_at && new Date(job.expires_at) <= now) return null;

  const company = job.employer?.company_profile;
  const logo = company?.logo_url ? safeHttpUrl(company.logo_url) : null;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: decodeEntities(job.title),
    description: decodeEntities(job.description),
    datePosted: job.created_at,
    employmentType: EMPLOYMENT_TYPE[job.contract_type],
    hiringOrganization: {
      '@type': 'Organization',
      name: decodeEntities(company?.nome_fantasia ?? 'Empresa de Saquarema'),
      ...(logo ? { logo } : {}),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: decodeEntities(job.address),
        ...(job.bairro ? { addressLocality: job.bairro } : {}),
        addressRegion: 'RJ',
        addressCountry: 'BR',
      },
    },
    url: `${origin}/vagas/${encodeURIComponent(job.id)}`,
  };
  if (job.expires_at) data.validThrough = job.expires_at;
  if (job.work_model === 'REMOTE') data.jobLocationType = 'TELECOMMUTE';
  return data;
}

/** Serializa para <script type="application/ld+json">: escapa `<` para o texto nunca fechar a tag. */
export function toJsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
