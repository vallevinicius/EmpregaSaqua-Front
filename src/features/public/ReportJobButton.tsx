import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { reportsApi } from '@/api/endpoints';
import type { Job, ReportReason } from '@/api/types';
import { ConfirmDialog, Field, Select, Textarea, buttonClass } from '@/components/ui';
import { ApiErrorAlert, useToast } from '@/components/feedback';
import { JUSTIFICATION_MAX, REPORT_REASONS, validateJustification } from '@/lib/reports';

/**
 * Denúncia de vaga. Só quem está logado denuncia (o back também exige) e a justificativa é obrigatória.
 * Deslogado, o botão leva ao login e volta para a vaga.
 */
export function ReportJobButton({ job, loggedIn }: { job: Job; loggedIn: boolean }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('SCAM');
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const error = touched ? validateJustification(text) : null;

  const mutation = useMutation({
    mutationFn: () => reportsApi.create({ job_id: job.id, reason, justification: text.trim() }),
    onSuccess: () => {
      toast('Denúncia enviada. A Prefeitura vai analisar a vaga. Obrigado por avisar!', 'success');
      close();
    },
  });

  const close = () => {
    setOpen(false);
    setText('');
    setTouched(false);
    mutation.reset();
  };

  const submit = () => {
    setTouched(true);
    if (validateJustification(text)) return;
    mutation.mutate();
  };

  if (!loggedIn) {
    return (
      <p className="text-center text-xs text-muted">
        Algo errado com esta vaga?{' '}
        <Link to="/entrar" state={{ from: `/vagas/${job.id}` }} className="font-semibold text-primary hover:underline">
          Entre para denunciar
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass('ghost', 'sm', 'self-center text-muted')}>
        Denunciar esta vaga
      </button>
      <ConfirmDialog
        open={open}
        title="Denunciar vaga"
        description="Conte o que há de errado. A Prefeitura analisa cada denúncia e decide se a vaga sai do ar."
        confirmLabel="Enviar denúncia"
        loading={mutation.isPending}
        onConfirm={submit}
        onClose={close}
      >
        <div className="flex flex-col gap-4">
          <Field label="Motivo" required>
            {({ id }) => (
              <Select id={id} value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            )}
          </Field>
          <p className="-mt-2 text-xs text-muted">{REPORT_REASONS.find((r) => r.value === reason)?.hint}</p>
          <Field label="Justificativa" error={error ?? undefined} hint={`${text.trim().length}/${JUSTIFICATION_MAX}`} required>
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                rows={4}
                maxLength={JUSTIFICATION_MAX}
                aria-describedby={describedBy}
                invalid={invalid}
                placeholder="O que aconteceu? Quanto mais detalhes, mais fácil de verificar."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={() => setTouched(true)}
              />
            )}
          </Field>
          <ApiErrorAlert error={mutation.error} />
        </div>
      </ConfirmDialog>
    </>
  );
}
