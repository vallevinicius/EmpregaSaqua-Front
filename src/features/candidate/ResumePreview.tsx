import { BriefcaseIcon, FileTextIcon, GraduationCapIcon, SparkleIcon } from '@/components/icons';
import { formatMonthYear, formatPhone } from '@/lib/format';

/** Mesma forma dos campos do formulário — mantida solta aqui para não importar o schema da página. */
export interface ResumePreviewValues {
  bio: string;
  telefone: string;
  address: string;
  skills: string[];
  experiences: { company: string; role: string; start_date: string; end_date?: string; description: string }[];
  educations: { institution: string; degree: string; field_of_study: string; start_date: string; end_date?: string }[];
}

/**
 * Espelha, na tela, a mesma ordem e o mesmo conteúdo do PDF gerado pelo back
 * (PdfService#buildResumeStream): nome completo (com fallback pro prefixo do e-mail, igual ao PDF),
 * contato, resumo, habilidades, experiências e formação. Atualiza em tempo real enquanto a
 * pessoa preenche o formulário.
 */
export function ResumePreview({ email, fullName, values }: { email: string; fullName: string; values: ResumePreviewValues }) {
  const name = fullName.trim() || email.split('@')[0] || 'Candidato';
  const contact = [email, values.telefone && formatPhone(values.telefone), values.address].filter(Boolean);
  const isEmpty = !values.bio && values.skills.length === 0 && values.experiences.length === 0 && values.educations.length === 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="border-b border-border bg-surface-2 px-6 py-5 text-center">
        {/* Sem capitalize: quando não há nome, cai no prefixo do e-mail cru, igual ao PDF. */}
        <p className="text-lg font-extrabold tracking-tight">{name}</p>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted">
          {contact.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 && <span aria-hidden>·</span>}
              {c}
            </span>
          ))}
        </p>
      </div>

      <div className="flex flex-col gap-6 px-6 py-6">
        {isEmpty ? (
          <p className="py-6 text-center text-sm text-muted">
            Seu currículo aparece aqui conforme você preenche os campos ao lado.
          </p>
        ) : (
          <>
            {values.bio && <PreviewSection icon={<FileTextIcon size={15} />} title="Resumo profissional"><p className="whitespace-pre-line text-[13px] leading-relaxed text-fg/90">{values.bio}</p></PreviewSection>}

            {values.skills.length > 0 && (
              <PreviewSection icon={<SparkleIcon size={15} />} title="Habilidades">
                <ul className="flex flex-wrap gap-1.5">
                  {values.skills.map((s, i) => (
                    <li key={i} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">{s}</li>
                  ))}
                </ul>
              </PreviewSection>
            )}

            {values.experiences.length > 0 && (
              <PreviewSection icon={<BriefcaseIcon size={15} />} title="Experiência profissional">
                <ul className="flex flex-col gap-3">
                  {values.experiences.map((e, i) => (
                    <li key={i}>
                      <p className="text-[13px] font-bold">{e.role || 'Cargo'}</p>
                      <p className="text-xs text-muted">
                        {e.company || 'Empresa'} · {e.start_date ? formatMonthYear(e.start_date) : '…'} – {formatMonthYear(e.end_date)}
                      </p>
                      {e.description && <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-fg/90">{e.description}</p>}
                    </li>
                  ))}
                </ul>
              </PreviewSection>
            )}

            {values.educations.length > 0 && (
              <PreviewSection icon={<GraduationCapIcon size={15} />} title="Formação acadêmica">
                <ul className="flex flex-col gap-2.5">
                  {values.educations.map((e, i) => (
                    <li key={i}>
                      <p className="text-[13px] font-bold">
                        {e.degree || 'Curso'}{e.field_of_study && ` em ${e.field_of_study}`}
                      </p>
                      <p className="text-xs text-muted">
                        {e.institution || 'Instituição'} · {e.start_date ? formatMonthYear(e.start_date) : '…'} – {formatMonthYear(e.end_date)}
                      </p>
                    </li>
                  ))}
                </ul>
              </PreviewSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PreviewSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}
