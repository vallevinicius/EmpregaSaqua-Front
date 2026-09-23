import { Link } from 'react-router';
import type { Job } from '@/api/types';
import { Badge } from '@/components/ui';
import { SafeText } from '@/components/feedback';
import { CONTRACT_LABEL, WORK_MODEL_LABEL, relativeDate } from '@/lib/format';
import { decodeEntities, safeAssetUrl } from '@/lib/safe';

export function CompanyLogo({ name, url, size = 44 }: { name: string; url: string | null | undefined; size?: number }) {
  const src = safeAssetUrl(url);
  const initials = decodeEntities(name)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return src ? (
    <img src={src} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-lg border border-border bg-surface object-contain" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="flex shrink-0 items-center justify-center rounded-lg bg-primary-soft text-sm font-semibold text-primary" style={{ width: size, height: size }}>
      {initials || '—'}
    </span>
  );
}

export function JobCard({ job }: { job: Job }) {
  const company = job.employer?.company_profile?.nome_fantasia ?? 'Empresa';
  return (
    <article className="group relative flex gap-4 rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring/40">
      <CompanyLogo name={company} url={job.employer?.company_profile?.logo_url} />
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold leading-snug">
          <Link to={`/vagas/${encodeURIComponent(job.id)}`} className="after:absolute after:inset-0 focus:outline-none group-hover:text-primary">
            <SafeText>{job.title}</SafeText>
          </Link>
        </h2>
        <p className="mt-0.5 truncate text-sm text-muted">
          <SafeText>{company}</SafeText> · <SafeText>{job.address}</SafeText>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="primary">{WORK_MODEL_LABEL[job.work_model] ?? job.work_model}</Badge>
          <Badge>{CONTRACT_LABEL[job.contract_type] ?? job.contract_type}</Badge>
          {job.is_pcd && <Badge tone="success">Vaga PcD</Badge>}
          {job.salary_range && job.is_salary_visible && (
            <span className="text-sm font-medium">
              <SafeText>{job.salary_range}</SafeText>
            </span>
          )}
          <span className="ml-auto text-xs text-muted">{relativeDate(job.created_at)}</span>
        </div>
      </div>
    </article>
  );
}
