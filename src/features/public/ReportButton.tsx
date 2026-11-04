import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { reportsApi, type ReportTarget } from '@/api/endpoints';
import type { ReportReason } from '@/api/types';
import { ConfirmDialog, Field, Select, Textarea, buttonClass } from '@/components/ui';
import { ApiErrorAlert, useToast } from '@/components/feedback';
import { JUSTIFICATION_MAX, REPORT_REASONS, validateJustification } from '@/lib/reports';

const COPY = {
  vaga: { button: 'Denunciar esta vaga', title: 'Denunciar vaga', done: 'A Prefeitura vai analisar a vaga.', decide: 'a vaga sai do ar', ask: 'Algo errado com esta vaga?' },
  empresa: { button: 'Denunciar esta empresa', title: 'Denunciar empresa', done: 'A Prefeitura vai analisar a empresa.', decide: 'a empresa é suspensa', ask: 'Algo errado com esta empresa?' },
} as const;

/**
 * Denúncia de vaga ou de empresa. Só quem está logado denuncia (o back também exige) e a justificativa é obrigatória.
 * Deslogado, o link leva ao login e volta para a página de origem (`from`).
 */
export function ReportButton({ target, noun, from, loggedIn }: { target: ReportTarget; noun: 'vaga' | 'empresa'; from: string; loggedIn: boolean }) {
  const copy = COPY[noun];
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('SCAM');
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const error = touched ? validateJustification(text) : null;

  const mutation = useMutation({
    mutationFn: () => reportsApi.create({ ...target, reason, justification: text.trim() }),
    onSuccess: () => {
      toast(`Denúncia enviada. ${copy.done} Obrigado por avisar!`, 'success');
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
        {copy.ask}{' '}
        <Link to="/entrar" state={{ from }} className="font-semibold text-primary hover:underline">
          Entre para denunciar
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass('ghost', 'sm', 'self-center text-muted')}>
        {copy.button}
      </button>
      <ConfirmDialog
        open={open}
        title={copy.title}
        description={`Conte o que há de errado. A Prefeitura analisa cada denúncia e decide se ${copy.decide}.`}
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
