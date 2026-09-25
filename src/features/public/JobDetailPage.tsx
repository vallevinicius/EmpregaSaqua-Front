import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { applicationsApi, jobsApi } from '@/api/endpoints';
import type { Job } from '@/api/types';
import { useSession } from '@/auth/useAuth';
import { Alert, Badge, Button, Card, Field, Input, Skeleton, Textarea, buttonClass, cx } from '@/components/ui';
import {
  AccessibilityIcon,
  ArrowLeftIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  MailIcon,
  MapPinIcon,
  WhatsappIcon,
  MonitorIcon,
  SendIcon,
  WalletIcon,
} from '@/components/icons';
import { ApiErrorAlert, ErrorState, SafeParagraphs, SafeText, useToast } from '@/components/feedback';
import { CONTRACT_LABEL, JOB_STATUS_LABEL, WORK_MODEL_LABEL, formatDate } from '@/lib/format';
import { mailtoLink, safeHttpUrl, whatsappLink } from '@/lib/safe';
import { ApiError } from '@/lib/http';
import { CompanyLogo } from './JobCard';

export default function JobDetailPage() {
  const { id = '' } = useParams();
  const session = useSession();
  const query = useQuery({ queryKey: ['jobs', 'detail', id], queryFn: ({ signal }) => jobsApi.get(id, signal), enabled: !!id });

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) return <Unavailable />;
    return (
      <Container>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Container>
    );
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
    <div>
      <header className="border-b border-border bg-surface">
        <Container className="py-8 sm:py-10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
            <ArrowLeftIcon size={16} /> Voltar para vagas
          </Link>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <CompanyLogo name={company} url={job.employer?.company_profile?.logo_url} size={72} />
            <div className="min-w-0">
              <p className="font-semibold text-primary">
                <SafeText>{company}</SafeText>
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                <SafeText>{job.title}</SafeText>
              </h1>
              <div className="mt-4 flex flex-wrap gap-2">
                {job.status !== 'ACTIVE' && <Badge tone="warning">{JOB_STATUS_LABEL[job.status]}</Badge>}
                <Badge tone="primary"><MonitorIcon size={13} /> {WORK_MODEL_LABEL[job.work_model]}</Badge>
                <Badge tone="primary"><BriefcaseIcon size={13} /> {CONTRACT_LABEL[job.contract_type]}</Badge>
                {job.is_pcd && <Badge tone="primary"><AccessibilityIcon size={13} /> Vaga PcD</Badge>}
              </div>
            </div>
          </div>
        </Container>
      </header>

      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_23rem]">
        <article className="flex min-w-0 flex-col gap-6">
          <dl className="grid gap-5 rounded-2xl bg-surface-2 p-6 sm:grid-cols-2">
            <Info icon={<MapPinIcon />} label="Local"><SafeText>{job.address}</SafeText></Info>
            <Info icon={<ClockIcon />} label="Jornada"><SafeText>{job.work_schedule}</SafeText></Info>
            <Info icon={<WalletIcon />} label="Salário">{job.is_salary_visible && job.salary_range ? <SafeText>{job.salary_range}</SafeText> : 'A combinar'}</Info>
            <Info icon={<CalendarIcon />} label="Inscrições até">{job.expires_at ? formatDate(job.expires_at) : 'Sem prazo'}</Info>
          </dl>

          <div className="flex max-w-[70ch] flex-col gap-10 pt-2">
            <Section title="Descrição da vaga">
              <SafeParagraphs text={job.description} className="leading-relaxed text-fg/90" />
            </Section>
            <ListSection title="Requisitos obrigatórios" items={job.mandatory_qualifications} />
            <ListSection title="Diferenciais" items={job.differential_qualifications} />
            <ListSection title="Benefícios" items={job.benefits} />
          </div>
        </article>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {isOwner ? (
            <Card>
              <h2 className="font-bold">Esta vaga é sua</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className={buttonClass('primary', 'sm')} to={`/empresa/vagas/${encodeURIComponent(job.id)}/candidatos`}>Ver candidatos</Link>
                <Link className={buttonClass('secondary', 'sm')} to={`/empresa/vagas/${encodeURIComponent(job.id)}/editar`}>Editar</Link>
              </div>
            </Card>
          ) : expired ? (
            <Alert tone="warning" title="Inscrições encerradas">O prazo desta vaga terminou.</Alert>
          ) : !session ? (
            <Card>
              <h2 className="text-lg font-bold">Gostou desta vaga?</h2>
              <p className="mt-1 text-sm text-muted">Para se candidatar, entre ou crie sua conta de candidato. É gratuito.</p>
              <div className="mt-5 flex flex-col gap-2">
                <Link to="/cadastro" className={buttonClass('primary', 'lg')}>Cadastre-se</Link>
                <Link to="/entrar" state={{ from: `/vagas/${job.id}` }} className={buttonClass('secondary')}>Entrar</Link>
              </div>
            </Card>
          ) : session.user.role === 'JOB_SEEKER' ? (
            <ApplyForm job={job} />
          ) : null}

          {(wa || mail) && (
            <Card>
              <h2 className="font-bold">Contato da empresa</h2>
              <div className="mt-4 flex flex-col gap-2">
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary', 'sm', 'justify-start')}><WhatsappIcon size={16} /> WhatsApp</a>}
                {mail && <a href={mail} className={buttonClass('secondary', 'sm', 'justify-start')}><MailIcon size={16} /> E-mail</a>}
              </div>
            </Card>
          )}
        </aside>
      </Container>
    </div>
  );
}

/** Mesmo formato da página carregada, para não "pular" quando os dados chegam. */
function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando vaga">
      <div className="border-b border-border">
        <Container className="py-10">
          <Skeleton className="h-4 w-32" />
          <div className="mt-6 flex items-center gap-5">
            <Skeleton className="size-[72px] shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-9 w-2/3 max-w-md" />
            </div>
          </div>
        </Container>
      </div>
      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_23rem]">
        <div className="space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-52" />
      </Container>
    </div>
  );
}

function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('mx-auto w-full max-w-7xl px-4 sm:px-6', className)}>{children}</div>;
}

function Unavailable() {
  return (
    <Container className="max-w-md py-24 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-soft text-green-ink">
        <BriefcaseIcon size={26} />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold">Vaga indisponível</h1>
      <p className="mt-2 text-muted">Esta vaga não existe, foi encerrada ou ainda está em análise.</p>
      <Link to="/" className={buttonClass('primary', 'md', 'mt-8')}>Ver outras vagas</Link>
    </Container>
  );
}

function Info({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">{icon}</span>
      <div className="min-w-0">
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="mt-0.5 font-semibold">{children}</dd>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <Section title={title}>
      <ul className="flex flex-col gap-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-soft text-green-ink">
              <CheckIcon size={13} strokeWidth={3} />
            </span>
            <SafeText>{it}</SafeText>
          </li>
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
      <h2 className="text-lg font-bold">Candidatar-se</h2>
      <form className="mt-4 flex flex-col gap-4" noValidate onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
        {questions.map((q) => (
          <fieldset key={q.id} className="flex flex-col gap-2">
            <legend className="text-sm font-medium"><SafeText>{q.question_text}</SafeText></legend>
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-2"><input type="radio" className="size-4 accent-[var(--es-primary)]" value="yes" {...form.register(`answers.${q.id}` as never)} /> Sim</label>
              <label className="inline-flex items-center gap-2"><input type="radio" className="size-4 accent-[var(--es-primary)]" value="no" {...form.register(`answers.${q.id}` as never)} /> Não</label>
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
        <Button type="submit" size="lg" loading={mutation.isPending}><SendIcon size={16} /> Enviar candidatura</Button>
      </form>
    </Card>
  );
}
