import { Link } from 'react-router';
import type { Job } from '@/api/types';
import { Badge } from '@/components/ui';
import { SafeText } from '@/components/feedback';
import { AccessibilityIcon, BriefcaseIcon, MapPinIcon, MonitorIcon } from '@/components/icons';
import { CONTRACT_LABEL, WORK_MODEL_LABEL, relativeDate } from '@/lib/format';
import { decodeEntities, safeAssetUrl } from '@/lib/safe';

export function CompanyLogo({ name, url, size = 52 }: { name: string; url: string | null | undefined; size?: number }) {
  const src = safeAssetUrl(url);
  const initials = decodeEntities(name)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return src ? (
    <img src={src} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-xl border border-border bg-white object-contain p-1" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="flex shrink-0 items-center justify-center rounded-xl bg-primary-soft text-base font-extrabold text-primary" style={{ width: size, height: size }}>
      {initials || '-'}
    </span>
  );
}

const NEW_JOB_MS = 3 * 86_400_000;

/**
 * Linha de classificado: logo | título, empresa e dados | salário e data alinhados à direita (como preço de anúncio).
 * No mobile a coluna da direita desce para baixo dos dados.
 */
export function JobCard({ job }: { job: Job }) {
  const company = job.employer?.company_profile?.nome_fantasia ?? 'Empresa';
  const created = new Date(job.created_at).getTime();
  const isNew = !Number.isNaN(created) && Date.now() - created < NEW_JOB_MS;
  const rel = relativeDate(job.created_at);
  return (
    <article className="group relative grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 p-5 transition-colors hover:bg-surface-2 focus-within:bg-surface-2 sm:grid-cols-[auto_1fr_auto] sm:gap-x-6 sm:p-6">
      <CompanyLogo name={company} url={job.employer?.company_profile?.logo_url} size={48} />
      <div className="min-w-0">
        <h2 className="text-lg font-bold leading-snug">
          <Link to={`/vagas/${encodeURIComponent(job.id)}`} className="after:absolute after:inset-0 focus:outline-none group-hover:text-primary group-hover:underline group-hover:underline-offset-4">
            <SafeText>{job.title}</SafeText>
          </Link>
          {isNew && (
            <span className="ml-2 align-middle">
              <Badge tone="green">Nova</Badge>
            </span>
          )}
        </h2>
        <p className="mt-0.5 truncate text-muted">
          <SafeText>{company}</SafeText>
        </p>
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <li className="inline-flex min-w-0 items-center gap-1.5">
            <MapPinIcon size={15} className="shrink-0" />
            <SafeText className="truncate">{job.address}</SafeText>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <MonitorIcon size={15} />
            {WORK_MODEL_LABEL[job.work_model] ?? job.work_model}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <BriefcaseIcon size={15} />
            {CONTRACT_LABEL[job.contract_type] ?? job.contract_type}
          </li>
          {job.is_pcd && (
            <li className="inline-flex items-center gap-1.5 font-semibold text-primary">
              <AccessibilityIcon size={15} />
              Vaga PcD
            </li>
          )}
        </ul>
      </div>
      <div className="col-start-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 sm:col-start-3 sm:row-start-1 sm:flex-col sm:items-end sm:justify-start sm:text-right">
        {job.salary_range && job.is_salary_visible ? (
          <span className="whitespace-nowrap font-bold text-green-ink">
            <SafeText>{job.salary_range}</SafeText>
          </span>
        ) : (
          <span className="text-sm text-muted">Salário a combinar</span>
        )}
        <span className="whitespace-nowrap text-xs text-muted sm:mt-1">Publicada {/^\d/.test(rel) ? `em ${rel}` : rel}</span>
      </div>
    </article>
  );
}
