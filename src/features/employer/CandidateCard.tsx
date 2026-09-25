import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { talentPoolApi } from '@/api/endpoints';
import type { CandidateProfile } from '@/api/types';
import { Button, ConfirmDialog, Textarea } from '@/components/ui';
import { SafeParagraphs, SafeText, useToast } from '@/components/feedback';
import { ApiError } from '@/lib/http';
import { formatMonthYear, formatPhone } from '@/lib/format';
import { whatsappLink } from '@/lib/safe';

/** Resumo do candidato para a visão da empresa. Tudo renderizado como texto. */
export function CandidateSummary({ email, profile, extra, actions }: { email?: string; profile?: CandidateProfile | null; extra?: ReactNode; actions?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wa = whatsappLink(profile?.telefone ? (profile.telefone.length <= 11 ? `55${profile.telefone}` : profile.telefone) : null);
  const skills = profile?.skills ?? [];
  return (
    <article className="rounded-2xl border border-border bg-surface shadow-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {profile?.full_name ? <SafeText>{profile.full_name}</SafeText> : (email ?? 'Candidato')}
          </p>
          {profile?.full_name && email && <p className="truncate text-sm text-muted">{email}</p>}
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
                        <p><SafeText>{e.role}</SafeText> · <SafeText>{e.company}</SafeText> <span className="text-muted">({formatMonthYear(e.start_date)} - {formatMonthYear(e.end_date)})</span></p>
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

/**
 * Botão "Salvar no banco" com anotação opcional (POST /talent-pool aceita `notes`, até 1000
 * caracteres). Sem PATCH no back, a nota só pode ser definida agora — depois de salvo, é fixa.
 */
export function SaveToPoolButton({ candidateId, size = 'sm' }: { candidateId: string; size?: 'sm' | 'md' }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const save = useMutation({
    mutationFn: () => talentPoolApi.save(candidateId, notes.trim() || undefined),
    onSuccess: () => {
      setOpen(false);
      setNotes('');
      toast('Candidato salvo no banco de talentos.');
      void qc.invalidateQueries({ queryKey: ['talent-pool'] });
    },
    onError: (e) => {
      toast(e instanceof ApiError && e.status === 409 ? 'Este candidato já está no seu banco de talentos.' : e.message, 'danger');
    },
  });

  return (
    <>
      <Button size={size} variant="secondary" onClick={() => setOpen(true)}>
        Salvar no banco
      </Button>
      <ConfirmDialog
        open={open}
        title="Salvar no banco de talentos"
        description="Anote por que esse candidato é interessante para vagas futuras (opcional)."
        confirmLabel="Salvar"
        tone="primary"
        loading={save.isPending}
        onConfirm={() => save.mutate()}
        onClose={() => {
          setOpen(false);
          setNotes('');
        }}
      >
        <Textarea
          aria-label="Anotações sobre o candidato"
          placeholder="Ex.: boa experiência com atendimento, disponível para CLT…"
          maxLength={1000}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </ConfirmDialog>
    </>
  );
}
