import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { applicationsApi, jobsApi } from '@/api/endpoints';
import type { Job } from '@/api/types';
import { useSession } from '@/auth/useAuth';
import { Alert, Badge, Button, Card, Field, Input, PageLoader, Textarea } from '@/components/ui';
import { ApiErrorAlert, ErrorState, SafeParagraphs, SafeText, useToast } from '@/components/feedback';
import { CONTRACT_LABEL, JOB_STATUS_LABEL, WORK_MODEL_LABEL, formatDate } from '@/lib/format';
import { mailtoLink, safeHttpUrl, whatsappLink } from '@/lib/safe';
import { ApiError } from '@/lib/http';
import { CompanyLogo } from './JobCard';

export default function JobDetailPage() {
  const { id = '' } = useParams();
  const session = useSession();
  const query = useQuery({ queryKey: ['jobs', 'detail', id], queryFn: ({ signal }) => jobsApi.get(id, signal), enabled: !!id });

  if (query.isPending) return <PageLoader />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) return <Unavailable />;
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const job = query.data;
  const isOwner = session?.user.id === job.employer_id;
  const isAdmin = session?.user.role === 'ADMIN';
  // O GET /jobs/:id do back devolve vagas em qualquer status (inclusive removidas). Escondemos no front
  // para quem não é dono/admin — o fix definitivo é no back (ver BACKEND_CONTRACT.md).
  if ((job.status !== 'ACTIVE' || job.deleted_at) && !isOwner && !isAdmin) return <Unavailable />;

  const company = job.employer?.company_profile?.nome_fantasia ?? 'Empresa';
  const wa = whatsappLink(job.contact_whatsapp, `Olá! Vi a vaga "${job.title}" no EmpregaSaqua.`);
  const mail = mailtoLink(job.contact_email, `Vaga: ${job.title}`);
  const expired = job.expires_at ? new Date(job.expires_at).getTime() < Date.now() : false;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <article className="min-w-0">
        <Link to="/" className="text-sm text-primary hover:underline">← Voltar para vagas</Link>
        <header className="mt-4 flex gap-4">
          <CompanyLogo name={company} url={job.employer?.company_profile?.logo_url} size={56} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              <SafeText>{job.title}</SafeText>
            </h1>
            <p className="text-muted">
              <SafeText>{company}</SafeText>
            </p>
          </div>
        </header>

        <div className="mt-4 flex flex-wrap gap-2">
          {job.status !== 'ACTIVE' && <Badge tone="warning">{JOB_STATUS_LABEL[job.status]}</Badge>}
          <Badge tone="primary">{WORK_MODEL_LABEL[job.work_model]}</Badge>
          <Badge>{CONTRACT_LABEL[job.contract_type]}</Badge>
          {job.is_pcd && <Badge tone="success">Vaga PcD</Badge>}
        </div>

        <dl className="mt-6 grid gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2">
          <Info label="Local"><SafeText>{job.address}</SafeText></Info>
          <Info label="Jornada"><SafeText>{job.work_schedule}</SafeText></Info>
          <Info label="Salário">{job.is_salary_visible && job.salary_range ? <SafeText>{job.salary_range}</SafeText> : 'A combinar'}</Info>
          <Info label="Inscrições até">{job.expires_at ? formatDate(job.expires_at) : 'Sem prazo'}</Info>
        </dl>

        <Section title="Descrição">
          <SafeParagraphs text={job.description} className="text-sm leading-relaxed" />
        </Section>
        <ListSection title="Requisitos obrigatórios" items={job.mandatory_qualifications} />
        <ListSection title="Diferenciais" items={job.differential_qualifications} />
        <ListSection title="Benefícios" items={job.benefits} />
      </article>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        {isOwner ? (
          <Card>
            <p className="text-sm text-muted">Esta vaga é sua.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link className="text-sm font-medium text-primary hover:underline" to={`/empresa/vagas/${encodeURIComponent(job.id)}/candidatos`}>Ver candidatos</Link>
              <Link className="text-sm font-medium text-primary hover:underline" to={`/empresa/vagas/${encodeURIComponent(job.id)}/editar`}>Editar</Link>
            </div>
          </Card>
        ) : expired ? (
          <Alert tone="warning" title="Inscrições encerradas">O prazo desta vaga terminou.</Alert>
        ) : !session ? (
          <Card>
            <h2 className="font-semibold">Quer se candidatar?</h2>
            <p className="mt-1 text-sm text-muted">Entre ou crie sua conta de candidato gratuitamente.</p>
            <div className="mt-4 flex gap-2">
              <Link to="/entrar" state={{ from: `/vagas/${job.id}` }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover">Entrar</Link>
              <Link to="/cadastro" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2">Criar conta</Link>
            </div>
          </Card>
        ) : session.user.role === 'JOB_SEEKER' ? (
          <ApplyForm job={job} />
        ) : null}

        {(wa || mail) && (
          <Card>
            <h2 className="text-sm font-semibold">Contato da empresa</h2>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WhatsApp</a>}
              {mail && <a href={mail} className="text-primary hover:underline">E-mail</a>}
            </div>
          </Card>
        )}
      </aside>
    </div>
  );
}

function Unavailable() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">Vaga indisponível</h1>
      <p className="mt-2 text-sm text-muted">Esta vaga não existe, foi encerrada ou ainda está em análise.</p>
      <Link to="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">Ver outras vagas</Link>
    </div>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <Section title={title}>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((it, i) => (
          <li key={i}><SafeText>{it}</SafeText></li>
        ))}
      </ul>
    </Section>
  );
}

// ---------- Candidatura ----------

function buildSchema(questionIds: string[]) {
  return z.object({
    cover_letter: z.string().trim().max(3000, 'Máximo de 3000 caracteres.').optional(),
    resume_url: z
      .string()
      .trim()
      .max(500)
      .optional()
      .refine((v) => !v || safeHttpUrl(v) !== null, 'Informe um link http(s) válido.'),
    // Toda pergunta precisa de resposta — o back hoje só avalia knockout se "answers" vier preenchido.
    answers: z.object(Object.fromEntries(questionIds.map((qid) => [qid, z.enum(['yes', 'no'], { message: 'Responda esta pergunta.' })]))),
  });
}

function ApplyForm({ job }: { job: Job }) {
  const questions = job.questions ?? [];
  const questionKey = questions.map((q) => q.id).join(',');
  const schema = useMemo(() => buildSchema(questionKey ? questionKey.split(',') : []), [questionKey]);
  type FormValues = z.infer<typeof schema>;
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { cover_letter: '', resume_url: '', answers: {} } });
  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      applicationsApi.apply(job.id, {
        cover_letter: v.cover_letter || undefined,
        resume_url: v.resume_url ? safeHttpUrl(v.resume_url) ?? undefined : undefined,
        answers: questions.length
          ? questions.map((q) => ({ question_id: q.id, answer: (v.answers as Record<string, string>)[q.id] === 'yes' }))
          : undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['applications', 'mine'] });
      toast('Candidatura enviada!');
      navigate('/candidato/candidaturas');
    },
  });

  const errors = form.formState.errors;
  const answerErrors = (errors.answers ?? {}) as Record<string, { message?: string } | undefined>;

  return (
    <Card>
      <h2 className="font-semibold">Candidatar-se</h2>
      <form className="mt-4 flex flex-col gap-4" noValidate onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
        {questions.map((q) => (
          <fieldset key={q.id} className="flex flex-col gap-2">
            <legend className="text-sm font-medium"><SafeText>{q.question_text}</SafeText></legend>
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-2"><input type="radio" value="yes" {...form.register(`answers.${q.id}` as never)} /> Sim</label>
              <label className="inline-flex items-center gap-2"><input type="radio" value="no" {...form.register(`answers.${q.id}` as never)} /> Não</label>
            </div>
            {answerErrors[q.id]?.message && <p className="text-xs text-danger" role="alert">{answerErrors[q.id]?.message}</p>}
          </fieldset>
        ))}
        <Field label="Carta de apresentação" error={errors.cover_letter?.message} hint="Opcional. Conte por que você combina com a vaga.">
          {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} maxLength={3000} {...form.register('cover_letter')} />}
        </Field>
        <Field label="Link do currículo" error={errors.resume_url?.message} hint="Opcional. Ex.: link do Drive ou LinkedIn.">
          {({ id, describedBy, invalid }) => <Input id={id} type="url" inputMode="url" placeholder="https://" aria-describedby={describedBy} invalid={invalid} {...form.register('resume_url')} />}
        </Field>
        <ApiErrorAlert error={mutation.error} />
        <Button type="submit" loading={mutation.isPending}>Enviar candidatura</Button>
      </form>
    </Card>
  );
}
