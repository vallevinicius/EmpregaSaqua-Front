import type { CandidateProfile, Job } from '@/api/types';

/**
 * Recomendação feita no navegador, em cima das vagas que o back já devolve: não depende de endpoint novo.
 * Mantém a mesma regra de área do back (ApplicationsService#applyForJob): se os DOIS têm área e ela difere, a vaga fica de fora.
 */

type MatchJob = Pick<
  Job,
  'id' | 'title' | 'description' | 'area' | 'contract_type' | 'work_model' | 'is_pcd' | 'address' | 'mandatory_qualifications' | 'differential_qualifications' | 'created_at'
>;
type MatchProfile = Pick<CandidateProfile, 'area' | 'cargo_interesse' | 'skills' | 'is_pcd' | 'address'>;

export interface Recommendation<J> {
  job: J;
  score: number;
  /** Motivos curtos para mostrar na tela ("Combina com sua área"). */
  reasons: string[];
}

const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'com', 'em', 'na', 'no', 'nas', 'nos', 'por', 'uma', 'um', 'e', 'ou', 'a', 'o', 'as', 'os', 'vaga', 'vagas']);

/** minúsculas, sem acento, só letras/números. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokens(value: string | null | undefined): string[] {
  return [...new Set(normalizeText(value).split(' ').filter((t) => t.length >= 3 && !STOPWORDS.has(t)))];
}

function jobHaystack(job: MatchJob): string {
  return normalizeText([job.title, job.description, ...(job.mandatory_qualifications ?? []), ...(job.differential_qualifications ?? [])].join(' '));
}

/** Vaga de outra área do que a do candidato: o back recusa a candidatura, então nem sugerimos. */
export function isAreaBlocked(job: Pick<Job, 'area'>, profile: Pick<CandidateProfile, 'area'> | null | undefined): boolean {
  return !!job.area && !!profile?.area && job.area !== profile.area;
}

export function scoreJob(job: MatchJob, profile: MatchProfile | null | undefined): Recommendation<MatchJob> | null {
  if (!profile || isAreaBlocked(job, profile)) return null;
  const reasons: string[] = [];
  let score = 0;

  if (job.area && profile.area && job.area === profile.area) {
    score += 3;
    reasons.push('Combina com a sua área');
  }

  const title = normalizeText(job.title);
  const interest = tokens(profile.cargo_interesse);
  if (interest.length && interest.some((t) => title.includes(t))) {
    score += 4;
    reasons.push('Parecida com o cargo que você procura');
  }

  const haystack = jobHaystack(job);
  const matchedSkills = (profile.skills ?? []).filter((s) => {
    const n = normalizeText(s);
    return n.length >= 3 && haystack.includes(n);
  });
  if (matchedSkills.length) {
    score += Math.min(matchedSkills.length, 5);
    const shown = matchedSkills.slice(0, 2).join(', ');
    reasons.push(`Pede ${matchedSkills.length > 2 ? `${shown} e mais` : shown}`);
  }

  if (profile.is_pcd && job.is_pcd) {
    score += 1;
    reasons.push('Vaga PcD');
  }

  const place = tokens(profile.address);
  const jobPlace = normalizeText(job.address);
  if (place.length && place.some((t) => jobPlace.includes(t))) {
    score += 1;
    reasons.push('Perto de você');
  }

  return score > 0 ? { job, score, reasons } : null;
}

/** Melhores vagas para o perfil: pontuação, depois as mais novas. Vagas já usadas (candidatura/ocultas) saem pelo `excludeIds`. */
export function recommendJobs<J extends MatchJob>(
  jobs: readonly J[],
  profile: MatchProfile | null | undefined,
  opts: { limit?: number; excludeIds?: ReadonlySet<string> } = {},
): Recommendation<J>[] {
  const { limit = 5, excludeIds } = opts;
  const out: Recommendation<J>[] = [];
  for (const job of jobs) {
    if (excludeIds?.has(job.id)) continue;
    const r = scoreJob(job, profile);
    if (r) out.push({ ...r, job });
  }
  return out
    .sort((a, b) => b.score - a.score || b.job.created_at.localeCompare(a.job.created_at))
    .slice(0, Math.max(0, limit));
}

/** Vagas parecidas com a que a pessoa está vendo (mesma área, título parecido, mesmo contrato/modelo). */
export function similarJobs<J extends MatchJob>(current: MatchJob, pool: readonly J[], limit = 4): J[] {
  const base = tokens(current.title);
  const scored = pool
    .filter((j) => j.id !== current.id)
    .map((j) => {
      let score = 0;
      if (current.area && j.area && current.area === j.area) score += 3;
      const shared = tokens(j.title).filter((t) => base.includes(t)).length;
      score += Math.min(shared, 3) * 2;
      if (current.contract_type === j.contract_type) score += 1;
      if (current.work_model === j.work_model) score += 1;
      return { j, score };
    })
    // Só área/contrato/modelo iguais (<=5) é pouco; exige alguma ligação de verdade.
    .filter((x) => x.score >= 4);
  return scored
    .sort((a, b) => b.score - a.score || b.j.created_at.localeCompare(a.j.created_at))
    .slice(0, Math.max(0, limit))
    .map((x) => x.j);
}
