import { useState, type ReactNode } from 'react';
import type { CandidateProfile } from '@/api/types';
import { Button } from '@/components/ui';
import { SafeParagraphs, SafeText } from '@/components/feedback';
import { formatPhone } from '@/lib/format';
import { whatsappLink } from '@/lib/safe';

/** Resumo do candidato para a visão da empresa. Tudo renderizado como texto. */
export function CandidateSummary({ email, profile, extra, actions }: { email?: string; profile?: CandidateProfile | null; extra?: ReactNode; actions?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wa = whatsappLink(profile?.telefone ? (profile.telefone.length <= 11 ? `55${profile.telefone}` : profile.telefone) : null);
  const skills = profile?.skills ?? [];
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{email ?? 'Candidato'}</p>
          {profile?.address && <p className="text-sm text-muted"><SafeText>{profile.address}</SafeText></p>}
          {skills.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {skills.slice(0, 8).map((s, i) => (
                <li key={i} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs"><SafeText>{s}</SafeText></li>
              ))}
              {skills.length > 8 && <li className="text-xs text-muted">+{skills.length - 8}</li>}
            </ul>
          )}
          {extra}
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      {profile && (
        <>
          <Button size="sm" variant="ghost" className="mt-2 -ml-2" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? 'Ocultar currículo' : 'Ver currículo'}
          </Button>
          {open && (
            <div className="mt-3 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
              {profile.bio && <div className="sm:col-span-2"><h4 className="mb-1 font-medium">Resumo</h4><SafeParagraphs text={profile.bio} className="text-muted" /></div>}
              {profile.telefone && (
                <div>
                  <h4 className="mb-1 font-medium">Telefone</h4>
                  <p className="text-muted">
                    {formatPhone(profile.telefone)}{' '}
                    {wa && <a className="text-primary hover:underline" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                  </p>
                </div>
              )}
              {!!profile.experiences?.length && (
                <div className="sm:col-span-2">
                  <h4 className="mb-1 font-medium">Experiência</h4>
                  <ul className="space-y-2">
                    {profile.experiences.map((e, i) => (
                      <li key={e.id ?? i}>
                        <p><SafeText>{e.role}</SafeText> · <SafeText>{e.company}</SafeText> <span className="text-muted">({e.start_date} – {e.end_date || 'atual'})</span></p>
                        <p className="text-muted"><SafeText>{e.description}</SafeText></p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!!profile.educations?.length && (
                <div className="sm:col-span-2">
                  <h4 className="mb-1 font-medium">Formação</h4>
                  <ul className="space-y-1">
                    {profile.educations.map((e, i) => (
                      <li key={e.id ?? i}>
                        <SafeText>{e.degree}</SafeText> em <SafeText>{e.field_of_study}</SafeText> · <SafeText>{e.institution}</SafeText>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}
