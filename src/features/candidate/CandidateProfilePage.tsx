import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { applicationsApi, candidatesApi, jobsApi, usersApi, type CandidateProfileInput } from '@/api/endpoints';
import type { ApplicationStatus, CandidateProfile, Job } from '@/api/types';
import { useSession } from '@/auth/useAuth';
import { Badge, Button, Card, CardSectionTitle, ConfirmDialog, Field, Input, PageHeader, PageLoader, Skeleton, Textarea, buttonClass } from '@/components/ui';
import { ApiErrorAlert, SafeText, useToast } from '@/components/feedback';
import { CepLookup, StringListInput, cepToAddress } from '@/components/inputs';
import { BriefcaseIcon, FileTextIcon, GraduationCapIcon, IdentificationCardIcon, SparkleIcon, TrashIcon } from '@/components/icons';
import { APPLICATION_STATUS_LABEL, formatDate } from '@/lib/format';
import { decodeEntities, onlyDigits } from '@/lib/safe';
import { errorMessage } from '@/lib/http';
import { ResumePreview } from './ResumePreview';
import { profileCompleteness } from '@/lib/profile';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const month = z.string().regex(/^\d{4}-\d{2}$/, 'Use o formato AAAA-MM.');
const optionalMonth = z.union([month, z.literal('')]).optional();

const schema = z.object({
  full_name: z.string().trim().max(150),
  bio: z.string().trim().max(2000, 'Máximo de 2000 caracteres.'),
  telefone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{10,13}$/.test(onlyDigits(v)), 'Telefone com DDD (10 a 13 dígitos).'),
  address: z.string().trim().max(200),
  skills: z.array(z.string().trim().min(1).max(50)).max(30),
  experiences: z
    .array(
      z.object({
        company: z.string().trim().min(1, 'Obrigatório.').max(150),
        role: z.string().trim().min(1, 'Obrigatório.').max(150),
        start_date: month,
        end_date: optionalMonth,
        description: z.string().trim().min(1, 'Obrigatório.').max(2000),
      }),
    )
    .max(20),
  educations: z
    .array(
      z.object({
        institution: z.string().trim().min(1, 'Obrigatório.').max(150),
        degree: z.string().trim().min(1, 'Obrigatório.').max(150),
        field_of_study: z.string().trim().min(1, 'Obrigatório.').max(150),
        start_date: month,
        end_date: optionalMonth,
      }),
    )
    .max(20),
});
type Values = z.infer<typeof schema>;

const EMPTY: Values = { full_name: '', bio: '', telefone: '', address: '', skills: [], experiences: [], educations: [] };

function toValues(p: CandidateProfile): Values {
  return {
    full_name: decodeEntities(p.full_name),
    bio: decodeEntities(p.bio),
    telefone: p.telefone ?? '',
    address: decodeEntities(p.address),
    skills: (p.skills ?? []).map(decodeEntities),
    experiences: (p.experiences ?? []).map((e) => ({
      company: decodeEntities(e.company),
      role: decodeEntities(e.role),
      start_date: e.start_date,
      end_date: e.end_date ?? '',
      description: decodeEntities(e.description),
    })),
    educations: (p.educations ?? []).map((e) => ({
      institution: decodeEntities(e.institution),
      degree: decodeEntities(e.degree),
      field_of_study: decodeEntities(e.field_of_study),
      start_date: e.start_date,
      end_date: e.end_date ?? '',
    })),
  };
}

export default function CandidateProfilePage() {
  useDocumentTitle("Meu currículo");
  const qc = useQueryClient();
  const toast = useToast();
  const session = useSession();
  const profile = useQuery({ queryKey: ['candidate', 'me'], queryFn: ({ signal }) => candidatesApi.me(signal), retry: false });

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const exps = useFieldArray({ control: form.control, name: 'experiences' });
  const edus = useFieldArray({ control: form.control, name: 'educations' });
  const { errors, dirtyFields, isDirty } = form.formState;
  const liveValues = useWatch({ control: form.control });

  useEffect(() => {
    if (profile.data) form.reset(toValues(profile.data));
  }, [profile.data, form]);

  const save = useMutation({
    mutationFn: (v: Values) => {
      // O PATCH do back SUBSTITUI experiences/educations quando enviados.
      // Enviamos só campos alterados: sem o GET /candidates/me, mandar o form vazio apagaria dados existentes.
      const body: CandidateProfileInput = {};
      if (dirtyFields.full_name) body.full_name = v.full_name;
      if (dirtyFields.bio) body.bio = v.bio;
      if (dirtyFields.telefone) body.telefone = onlyDigits(v.telefone);
      if (dirtyFields.address) body.address = v.address;
      if (dirtyFields.skills) body.skills = v.skills;
      if (dirtyFields.experiences) body.experiences = v.experiences.map((e) => ({ ...e, end_date: e.end_date || undefined }));
      if (dirtyFields.educations) body.educations = v.educations.map((e) => ({ ...e, end_date: e.end_date || undefined }));
      return candidatesApi.updateProfile(body);
    },
    onSuccess: (updated) => {
      qc.setQueryData(['candidate', 'me'], updated);
      form.reset(toValues(updated));
      toast('Currículo salvo.');
    },
  });

  if (profile.isPending) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Criar currículo"
        description="Preencha suas informações e acompanhe o currículo tomando forma ao lado. Ele aparece para as empresas quando você se candidata."
        actions={<ResumeDownload />}
      />
      {profile.isError && <div className="mb-6"><ApiErrorAlert error={profile.error} /></div>}

      <ProgressCard values={liveValues} />
      <MyApplicationsCard />

      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <form noValidate className="flex flex-col gap-6" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
          <Card>
            <CardSectionTitle icon={<IdentificationCardIcon size={18} />} title="Sobre você" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo" error={errors.full_name?.message} className="sm:col-span-2" required>
                {({ id, describedBy, invalid }) => <Input id={id} maxLength={150} autoComplete="name" aria-describedby={describedBy} invalid={invalid} {...form.register('full_name')} />}
              </Field>
              <Field label="Resumo profissional" error={errors.bio?.message} className="sm:col-span-2" hint="Um parágrafo curto sobre sua experiência e o que você busca.">
                {({ id, describedBy, invalid }) => <Textarea id={id} rows={5} maxLength={2000} aria-describedby={describedBy} invalid={invalid} {...form.register('bio')} />}
              </Field>
              <Field label="Telefone / WhatsApp" error={errors.telefone?.message} hint="Com DDD. Ex.: 22999999999">
                {({ id, describedBy, invalid }) => <Input id={id} type="tel" inputMode="tel" autoComplete="tel" aria-describedby={describedBy} invalid={invalid} {...form.register('telefone')} />}
              </Field>
              <Field label="Endereço" error={errors.address?.message}>
                {({ id, describedBy, invalid }) => <Input id={id} autoComplete="street-address" maxLength={200} aria-describedby={describedBy} invalid={invalid} {...form.register('address')} />}
              </Field>
              <CepLookup className="sm:col-span-2" onFound={(r) => form.setValue('address', cepToAddress(r), { shouldDirty: true, shouldValidate: true })} />
            </div>
          </Card>

          <Card>
            <CardSectionTitle icon={<SparkleIcon size={18} />} title="Habilidades" />
            <Controller
              control={form.control}
              name="skills"
              render={({ field }) => <StringListInput value={field.value} onChange={field.onChange} placeholder="Ex.: Atendimento ao cliente" maxItems={30} maxLength={50} />}
            />
          </Card>

          <Card>
            <div className="mb-5 flex items-center justify-between">
              <CardSectionTitle icon={<BriefcaseIcon size={18} />} title="Experiência profissional" className="mb-0" />
              <Button size="sm" variant="secondary" disabled={exps.fields.length >= 20} onClick={() => exps.append({ company: '', role: '', start_date: '', end_date: '', description: '' })}>
                Adicionar
              </Button>
            </div>
            {exps.fields.length === 0 && <EmptyHint text="Nenhuma experiência adicionada ainda." />}
            <div className="flex flex-col gap-4">
              {exps.fields.map((f, i) => {
                const e = errors.experiences?.[i];
                return (
                  <fieldset key={f.id} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                    <legend className="sr-only">Experiência {i + 1}</legend>
                    <Field label="Empresa" error={e?.company?.message} required>{({ id, invalid }) => <Input id={id} invalid={invalid} {...form.register(`experiences.${i}.company`)} />}</Field>
                    <Field label="Cargo" error={e?.role?.message} required>{({ id, invalid }) => <Input id={id} invalid={invalid} {...form.register(`experiences.${i}.role`)} />}</Field>
                    <Field label="Início" error={e?.start_date?.message} required>{({ id, invalid }) => <Input id={id} type="month" invalid={invalid} {...form.register(`experiences.${i}.start_date`)} />}</Field>
                    <Field label="Fim" error={e?.end_date?.message} hint="Deixe vazio se for o emprego atual.">{({ id, invalid }) => <Input id={id} type="month" invalid={invalid} {...form.register(`experiences.${i}.end_date`)} />}</Field>
                    <Field label="Atividades" error={e?.description?.message} required className="sm:col-span-2">{({ id, invalid }) => <Textarea id={id} rows={3} maxLength={2000} invalid={invalid} {...form.register(`experiences.${i}.description`)} />}</Field>
                    <div className="sm:col-span-2"><Button size="sm" variant="danger-ghost" onClick={() => exps.remove(i)}><TrashIcon size={14} /> Remover experiência</Button></div>
                  </fieldset>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="mb-5 flex items-center justify-between">
              <CardSectionTitle icon={<GraduationCapIcon size={18} />} title="Formação" className="mb-0" />
              <Button size="sm" variant="secondary" disabled={edus.fields.length >= 20} onClick={() => edus.append({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '' })}>
                Adicionar
              </Button>
            </div>
            {edus.fields.length === 0 && <EmptyHint text="Nenhuma formação adicionada ainda." />}
            <div className="flex flex-col gap-4">
              {edus.fields.map((f, i) => {
                const e = errors.educations?.[i];
                return (
                  <fieldset key={f.id} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                    <legend className="sr-only">Formação {i + 1}</legend>
                    <Field label="Instituição" error={e?.institution?.message} required>{({ id, invalid }) => <Input id={id} invalid={invalid} {...form.register(`educations.${i}.institution`)} />}</Field>
                    <Field label="Grau" error={e?.degree?.message} required>{({ id, invalid }) => <Input id={id} placeholder="Ex.: Ensino Médio, Técnico, Bacharelado" invalid={invalid} {...form.register(`educations.${i}.degree`)} />}</Field>
                    <Field label="Área de estudo" error={e?.field_of_study?.message} required className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} {...form.register(`educations.${i}.field_of_study`)} />}</Field>
                    <Field label="Início" error={e?.start_date?.message} required>{({ id, invalid }) => <Input id={id} type="month" invalid={invalid} {...form.register(`educations.${i}.start_date`)} />}</Field>
                    <Field label="Conclusão" error={e?.end_date?.message}>{({ id, invalid }) => <Input id={id} type="month" invalid={invalid} {...form.register(`educations.${i}.end_date`)} />}</Field>
                    <div className="sm:col-span-2"><Button size="sm" variant="danger-ghost" onClick={() => edus.remove(i)}><TrashIcon size={14} /> Remover formação</Button></div>
                  </fieldset>
                );
              })}
            </div>
          </Card>

          <ApiErrorAlert error={save.error} />
          <div className="sticky bottom-4 flex justify-end">
            <Button type="submit" size="lg" loading={save.isPending} disabled={!isDirty} className="shadow-lift">Salvar currículo</Button>
          </div>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-sm font-bold text-muted">Prévia do seu currículo</p>
          <ResumePreview
            email={session?.user.email ?? ''}
            fullName={liveValues.full_name || ''}
            values={{
              bio: liveValues.bio ?? '',
              telefone: liveValues.telefone ?? '',
              address: liveValues.address ?? '',
              skills: (liveValues.skills ?? []).filter((s): s is string => !!s),
              experiences: (liveValues.experiences ?? []).filter((e): e is Values['experiences'][number] => !!e?.company || !!e?.role),
              educations: (liveValues.educations ?? []).filter((e): e is Values['educations'][number] => !!e?.institution || !!e?.degree),
            }}
          />
        </aside>
      </div>

      <DangerZone />
    </div>
  );
}

/** Barra de progresso do currículo: mostra o que falta e cresce enquanto a pessoa digita. */
function ProgressCard({ values }: { values: Parameters<typeof profileCompleteness>[0] }) {
  const { percent, missing } = profileCompleteness(values);
  return (
    <Card className="mb-8">
      <div className="flex items-center justify-between gap-4">
        <p className="font-bold">Seu currículo está {percent}% completo</p>
        <span className="text-sm text-muted">{percent === 100 ? 'Tudo pronto!' : `Falta: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`}</span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do currículo">
        <div className="h-full rounded-full bg-green transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
    </Card>
  );
}

const STATUS_TONE: Record<ApplicationStatus, 'neutral' | 'primary' | 'success' | 'warning' | 'danger'> = {
  APPLIED: 'neutral',
  REVIEWING: 'primary',
  INTERVIEW: 'warning',
  HIRED: 'success',
  REJECTED: 'danger',
};
const MAX_SHOWN = 4;

/**
 * Resumo das vagas em que a pessoa se candidatou, direto no perfil. A lista completa (com retirar
 * candidatura e mensagem) continua em "Minhas candidaturas" — aqui é só um retrato rápido.
 */
function MyApplicationsCard() {
  const apps = useQuery({ queryKey: ['applications', 'mine'], queryFn: ({ signal }) => applicationsApi.mine(signal) });

  // GET /applications não inclui a vaga: buscamos cada uma (cacheadas, mesma queryKey da lista completa).
  const jobIds = [...new Set((apps.data ?? []).map((a) => a.job_id))];
  const jobs = useQueries({
    queries: jobIds.map((id) => ({
      queryKey: ['jobs', 'detail', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => jobsApi.get(id, signal),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  const jobById = new Map<string, Job>();
  jobs.forEach((q, i) => {
    const id = jobIds[i];
    if (q.data && id) jobById.set(id, q.data);
  });

  if (apps.isPending) return <Skeleton className="mb-8 h-32" />;
  if (apps.isError || apps.data.length === 0) return null;

  const list = [...apps.data].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const shown = list.slice(0, MAX_SHOWN);

  return (
    <Card className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <CardSectionTitle icon={<BriefcaseIcon size={18} />} title="Vagas em que você se candidatou" className="mb-0" />
        {list.length > MAX_SHOWN && (
          <Link to="/candidato/candidaturas" className="text-sm font-semibold text-primary hover:underline">Ver todas ({list.length})</Link>
        )}
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {shown.map((app) => {
          const job = jobById.get(app.job_id);
          return (
            <li key={app.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                {job ? (
                  <Link to={`/vagas/${encodeURIComponent(job.id)}`} className="font-semibold hover:text-primary hover:underline">
                    <SafeText>{job.title}</SafeText>
                  </Link>
                ) : (
                  <span className="font-semibold text-muted">Vaga indisponível</span>
                )}
                <p className="text-sm text-muted">
                  {job?.employer?.company_profile?.nome_fantasia && <><SafeText>{job.employer.company_profile.nome_fantasia}</SafeText> · </>}
                  Enviada em {formatDate(app.created_at)}
                </p>
              </div>
              <Badge tone={STATUS_TONE[app.status]}>{APPLICATION_STATUS_LABEL[app.status]}</Badge>
            </li>
          );
        })}
      </ul>
      {list.length <= MAX_SHOWN && (
        <Link to="/candidato/candidaturas" className={buttonClass('secondary', 'sm', 'mt-4')}>Ver detalhes e gerenciar</Link>
      )}
    </Card>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="mb-4 text-sm text-muted">{text}</p>;
}

function ResumeDownload() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const download = async () => {
    setLoading(true);
    try {
      const blob = await candidatesApi.downloadResume();
      if (blob.type && blob.type !== 'application/pdf') throw new Error('Resposta inesperada do servidor.');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'curriculo.pdf';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      toast(errorMessage(e), 'danger');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button variant="secondary" onClick={() => void download()} loading={loading}>
      <FileTextIcon size={16} /> Baixar em PDF
    </Button>
  );
}

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const req = useMutation({
    mutationFn: () => usersApi.requestAccountDeletion(),
  });
  return (
    <Card className="mt-10 border-danger/40">
      <h2 className="font-bold text-danger">Excluir conta</h2>
      <p className="mt-1 text-sm text-muted">
        Excluímos permanentemente todos os seus dados do site (perfil, vagas, candidaturas, mensagens). Essa ação não pode ser desfeita.
      </p>
      <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>Excluir minha conta</Button>
      <ConfirmDialog
        open={open}
        title="Excluir sua conta?"
        description={
          req.isSuccess
            ? undefined
            : 'Digite "EXCLUIR" para receber um e-mail de confirmação. Nada é apagado até você clicar no link do e-mail.'
        }
        confirmLabel={req.isSuccess ? 'Fechar' : 'Enviar e-mail de confirmação'}
        loading={req.isPending}
        onConfirm={() => {
          if (req.isSuccess) {
            setOpen(false);
            setConfirmText('');
            req.reset();
          } else if (confirmText === 'EXCLUIR') {
            req.mutate();
          }
        }}
        onClose={() => {
          setOpen(false);
          setConfirmText('');
          req.reset();
        }}
      >
        {req.isSuccess ? (
          <p className="text-sm text-fg">{req.data.message}</p>
        ) : (
          <>
            <Input aria-label="Confirmação" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
            {req.isError && <p className="mt-2 text-xs text-danger">{errorMessage(req.error)}</p>}
          </>
        )}
      </ConfirmDialog>
    </Card>
  );
}
