import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/api/endpoints';
import { useSession } from '@/auth/useAuth';
import { chatLink } from '@/features/chat/chatLink';
import { Alert, Button, Checkbox, ConfirmDialog, Field, Input, Select, Skeleton, Textarea } from '@/components/ui';
import { CalendarIcon, SendIcon } from '@/components/icons';
import { decodeEntities } from '@/lib/safe';
import { interviewInviteMessage, jobInviteMessage, todayLocal, validateInterview } from '@/lib/invite';

/**
 * Agendar entrevista: a empresa escolhe data, hora e local e cai no chat com a mensagem pronta no campo de texto.
 * Nada é enviado aqui — ela revisa a mensagem e envia no chat.
 */
export function ScheduleInterviewButton({
  jobId,
  jobTitle,
  candidateId,
  alreadyInterview,
  onMarkInterview,
}: {
  jobId: string;
  jobTitle: string;
  candidateId: string;
  /** Candidatura já está em Entrevista (ou Contratado): não oferece mover de etapa. */
  alreadyInterview: boolean;
  onMarkInterview: () => void;
}) {
  const session = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [move, setMove] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!session) return null;

  const submit = () => {
    const msg = validateInterview({ date, time, place, note }, todayLocal());
    if (msg) return setError(msg);
    setOpen(false);
    if (move && !alreadyInterview) onMarkInterview();
    navigate(chatLink({ jobId, employerId: session.user.id, candidateId }, interviewInviteMessage(decodeEntities(jobTitle), { date, time, place, note })));
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => { setError(null); setOpen(true); }}>
        <CalendarIcon size={14} /> Agendar entrevista
      </Button>
      <ConfirmDialog
        open={open}
        title="Agendar entrevista"
        description="Você vai para o chat com a mensagem pronta. Revise e envie."
        confirmLabel="Ir para o chat"
        tone="primary"
        onConfirm={submit}
        onClose={() => setOpen(false)}
      >
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Data" required>
            {({ id }) => <Input id={id} type="date" min={todayLocal()} value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <Field label="Horário" required>
            {({ id }) => <Input id={id} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
          </Field>
          <Field label="Local ou link" required className="sm:col-span-2">
            {({ id }) => <Input id={id} maxLength={100} placeholder="Ex.: Rua das Flores, 10 - Centro, ou link da chamada" value={place} onChange={(e) => setPlace(e.target.value)} />}
          </Field>
          <Field label="Observação" hint="Opcional. Ex.: leve um documento com foto." className="sm:col-span-2">
            {({ id }) => <Textarea id={id} rows={2} maxLength={150} value={note} onChange={(e) => setNote(e.target.value)} />}
          </Field>
        </div>
        {!alreadyInterview && (
          <div className="mt-3">
            <Checkbox label="Mover a candidatura para “Entrevista”" checked={move} onChange={(e) => setMove(e.target.checked)} />
          </div>
        )}
        {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
      </ConfirmDialog>
    </>
  );
}

/**
 * Convidar candidato (banco de talentos / busca) para uma das vagas ativas da empresa.
 * Abre uma conversa direta com a mensagem e o link da vaga já no campo de texto.
 */
export function InviteToJobButton({ candidateId }: { candidateId: string }) {
  const session = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState('');

  const jobs = useQuery({
    queryKey: ['jobs', 'mine', 'active-for-invite'],
    queryFn: ({ signal }) => jobsApi.mine({ page: 1, limit: 50, status: 'ACTIVE' }, signal),
    enabled: open,
    staleTime: 60_000,
    retry: false,
  });

  if (!session) return null;
  const list = jobs.data?.data ?? [];
  const chosen = list.find((j) => j.id === jobId) ?? list[0];

  const submit = () => {
    if (!chosen) return;
    setOpen(false);
    const url = `${window.location.origin}/vagas/${encodeURIComponent(chosen.id)}`;
    navigate(chatLink({ employerId: session.user.id, candidateId }, jobInviteMessage(decodeEntities(chosen.title), url)));
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <SendIcon size={14} /> Convidar para vaga
      </Button>
      <ConfirmDialog
        open={open}
        title="Convidar para uma vaga"
        description="Escolha a vaga. Você vai para o chat com o convite pronto — revise e envie."
        confirmLabel="Ir para o chat"
        tone="primary"
        onConfirm={submit}
        onClose={() => setOpen(false)}
      >
        <div className="mt-4">
          {jobs.isPending ? (
            <Skeleton className="h-11" />
          ) : jobs.isError ? (
            <Alert tone="danger">Não foi possível carregar suas vagas. Tente de novo.</Alert>
          ) : list.length === 0 ? (
            <Alert tone="warning" title="Você não tem vagas ativas">
              Só dá para convidar para vagas já aprovadas. <Link className="font-semibold underline" to="/empresa/vagas">Ver minhas vagas</Link>
            </Alert>
          ) : (
            <Field label="Vaga">
              {({ id }) => (
                <Select id={id} value={chosen?.id ?? ''} onChange={(e) => setJobId(e.target.value)}>
                  {list.map((j) => (
                    <option key={j.id} value={j.id}>{decodeEntities(j.title)}</option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </div>
      </ConfirmDialog>
    </>
  );
}
