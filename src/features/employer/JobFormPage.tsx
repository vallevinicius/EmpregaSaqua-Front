import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { jobsApi, type JobInput } from '@/api/endpoints';
import type { ContractType, Escolaridade, Idioma, Job, JobArea, NivelIdioma, WorkModel } from '@/api/types';
import { useSession } from '@/auth/useAuth';
import { Alert, Button, Card, Checkbox, Field, Input, PageHeader, PageLoader, Select, Textarea } from '@/components/ui';
import { ApiErrorAlert, ErrorState, SafeText, useToast } from '@/components/feedback';
import { CepLookup, StringListInput, cepToAddress } from '@/components/inputs';
import { CONTRACT_LABEL, ESCOLARIDADE_LABEL, IDIOMA_LABEL, JOB_AREA_LABEL, NIVEL_IDIOMA_LABEL, WORK_MODEL_LABEL } from '@/lib/format';
import { decodeEntities, onlyDigits } from '@/lib/safe';
import { maskCurrencyInput } from '@/lib/currency';
import { ApiError } from '@/lib/http';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { JOB_TEMPLATES } from './jobTemplates';
import type { Control, FieldErrors } from 'react-hook-form';

const WORK_MODELS = Object.keys(WORK_MODEL_LABEL) as [WorkModel, ...WorkModel[]];
const CONTRACTS = Object.keys(CONTRACT_LABEL) as [ContractType, ...ContractType[]];
const AREAS = Object.keys(JOB_AREA_LABEL) as [JobArea, ...JobArea[]];
const ESCOLARIDADES = Object.keys(ESCOLARIDADE_LABEL) as [Escolaridade, ...Escolaridade[]];
const IDIOMAS = Object.keys(IDIOMA_LABEL) as [Idioma, ...Idioma[]];
const NIVEIS_IDIOMA = Object.keys(NIVEL_IDIOMA_LABEL) as [NivelIdioma, ...NivelIdioma[]];
const list = z.array(z.string().trim().min(1).max(150)).max(20);

/** Limites espelham CreateJobDto do back (MaxLength, ArrayMaxSize, Matches). */
const schema = z.object({
  title: z.string().trim().min(3, 'Mínimo de 3 caracteres.').max(150),
  description: z.string().trim().min(20, 'Descreva a vaga com pelo menos 20 caracteres.').max(3000),
  address: z.string().trim().min(3, 'Informe o local.').max(150),
  work_schedule: z.string().trim().min(3, 'Informe a jornada.').max(100),
  salary_range: z.string().trim().max(100),
  is_salary_visible: z.boolean(),
  is_pcd: z.boolean(),
  work_model: z.enum(WORK_MODELS),
  contract_type: z.enum(CONTRACTS),
  area: z.enum(AREAS, { message: 'Escolha a área da vaga.' }),
  escolaridade_exigida: z.union([z.enum(ESCOLARIDADES), z.literal('')]),
  language_requirements: z
    .array(z.object({ idioma: z.enum(IDIOMAS), idioma_outro: z.string().trim().max(50), nivel: z.enum(NIVEIS_IDIOMA) }))
    .max(10),
  mandatory_qualifications: list,
  differential_qualifications: list,
  benefits: list,
  expires_at: z
    .string()
    .refine((v) => v === '' || (/^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T23:59:59`).getTime() > Date.now()), 'A data deve ser futura.'),
  contact_whatsapp: z.string().refine((v) => v === '' || /^\d{10,15}$/.test(onlyDigits(v)), 'Somente números, com DDI e DDD (10 a 15 dígitos).'),
  contact_email: z.union([z.literal(''), z.email('E-mail inválido.')]),
  replace_questions: z.boolean(),
  questions: z
    .array(
      z.object({
        question_text: z.string().trim().min(5, 'Mínimo de 5 caracteres.').max(300),
        options: z
          .array(z.object({ option_text: z.string().trim().min(1, 'Informe o texto da opção.').max(150), eliminates: z.boolean() }))
          .min(2, 'Cada pergunta precisa de pelo menos 2 opções.')
          .max(6),
      }),
    )
    .max(10),
});
type Values = z.infer<typeof schema>;

const EMPTY: Values = {
  title: '',
  description: '',
  address: '',
  work_schedule: '',
  salary_range: '',
  is_salary_visible: true,
  is_pcd: false,
  work_model: 'ON_SITE',
  contract_type: 'TEMPO_DETERMINADO',
  area: '' as JobArea,
  escolaridade_exigida: '',
  language_requirements: [],
  mandatory_qualifications: [],
  differential_qualifications: [],
  benefits: [],
  expires_at: '',
  contact_whatsapp: '',
  contact_email: '',
  replace_questions: true,
  questions: [],
};

function toValues(job: Job): Values {
  return {
    ...EMPTY,
    title: decodeEntities(job.title),
    description: decodeEntities(job.description),
    address: decodeEntities(job.address),
    work_schedule: decodeEntities(job.work_schedule),
    salary_range: decodeEntities(job.salary_range),
    is_salary_visible: job.is_salary_visible,
    is_pcd: job.is_pcd,
    work_model: job.work_model,
    contract_type: job.contract_type,
    area: job.area ?? ('' as JobArea),
    escolaridade_exigida: job.escolaridade_exigida ?? '',
    language_requirements: (job.language_requirements ?? []).map((l) => ({ idioma: l.idioma, idioma_outro: decodeEntities(l.idioma_outro ?? ''), nivel: l.nivel })),
    mandatory_qualifications: job.mandatory_qualifications.map(decodeEntities),
    differential_qualifications: job.differential_qualifications.map(decodeEntities),
    benefits: job.benefits.map(decodeEntities),
    expires_at: job.expires_at ? job.expires_at.slice(0, 10) : '',
    contact_whatsapp: job.contact_whatsapp ?? '',
    contact_email: job.contact_email ?? '',
    // O gabarito (eliminates) não chega ao front; editar perguntas exige redefini-las.
    replace_questions: false,
    questions: [],
  };
}

function toInput(v: Values, isEdit: boolean): JobInput {
  const input: JobInput = {
    title: v.title,
    description: v.description,
    address: v.address,
    work_schedule: v.work_schedule,
    salary_range: v.salary_range || undefined,
    is_salary_visible: v.is_salary_visible,
    is_pcd: v.is_pcd,
    work_model: v.work_model,
    contract_type: v.contract_type,
    area: v.area,
    escolaridade_exigida: (v.escolaridade_exigida || undefined) as JobInput['escolaridade_exigida'],
    language_requirements: v.language_requirements.map((l) => ({
      idioma: l.idioma,
      idioma_outro: l.idioma === 'OUTRO' ? l.idioma_outro || undefined : undefined,
      nivel: l.nivel,
    })),
    mandatory_qualifications: v.mandatory_qualifications,
    differential_qualifications: v.differential_qualifications,
    benefits: v.benefits,
    expires_at: v.expires_at ? new Date(`${v.expires_at}T23:59:59`).toISOString() : undefined,
    contact_whatsapp: v.contact_whatsapp ? onlyDigits(v.contact_whatsapp) : undefined,
    contact_email: v.contact_email || undefined,
  };
  if (!isEdit || v.replace_questions) {
    input.questions = v.questions.map((q) => ({
      question_text: q.question_text,
      options: q.options.map((o) => ({ option_text: o.option_text, eliminates: o.eliminates })),
    }));
  }
  return input;
}

function QuestionOptionsField({
  control,
  register,
  questionIndex,
  errors,
}: {
  control: Control<Values>;
  register: ReturnType<typeof useForm<Values>>['register'];
  questionIndex: number;
  errors: FieldErrors<Values>;
}) {
  const options = useFieldArray({ control, name: `questions.${questionIndex}.options` });
  const optionsError = errors.questions?.[questionIndex]?.options;
  const optionsErrorMessage = Array.isArray(optionsError) ? undefined : optionsError?.message;

  return (
    <div className="flex flex-col gap-2 sm:col-span-3">
      <span className="text-sm font-medium">Opções de resposta</span>
      {options.fields.map((opt, j) => (
        <div key={opt.id} className="flex items-center gap-2">
          <Input
            maxLength={150}
            placeholder={`Opção ${j + 1}`}
            {...register(`questions.${questionIndex}.options.${j}.option_text`)}
          />
          <Checkbox label="Elimina" {...register(`questions.${questionIndex}.options.${j}.eliminates`)} />
          <Button type="button" size="sm" variant="danger-ghost" disabled={options.fields.length <= 2} onClick={() => options.remove(j)}>
            Remover
          </Button>
        </div>
      ))}
      {optionsErrorMessage && <p className="text-sm text-danger">{optionsErrorMessage}</p>}
      <div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={options.fields.length >= 6}
          onClick={() => options.append({ option_text: '', eliminates: false })}
        >
          Adicionar opção
        </Button>
      </div>
    </div>
  );
}

export default function JobFormPage() {
  useDocumentTitle("Publicar vaga");
  const { id } = useParams();
  const isEdit = !!id;
  const session = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [verificationBlocked, setVerificationBlocked] = useState(false);

  const existing = useQuery({ queryKey: ['jobs', 'detail', id], queryFn: ({ signal }) => jobsApi.get(id!, signal), enabled: isEdit });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const questions = useFieldArray({ control: form.control, name: 'questions' });
  const languageRequirements = useFieldArray({ control: form.control, name: 'language_requirements' });
  const languageRequirementValues = form.watch('language_requirements');
  const { errors } = form.formState;
  const replaceQuestions = form.watch('replace_questions');

  useEffect(() => {
    if (existing.data) form.reset(toValues(existing.data));
  }, [existing.data, form]);

  const save = useMutation({
    mutationFn: (v: Values) => (isEdit ? jobsApi.update(id!, toInput(v, true)) : jobsApi.create(toInput(v, false))),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['jobs'] });
      toast(isEdit ? (existing.data?.status === 'ACTIVE' ? 'Vaga atualizada. Ela passa por nova análise antes de voltar ao ar.' : 'Vaga atualizada.') : 'Vaga enviada para análise.');
      navigate('/empresa/vagas');
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 403 && !isEdit) setVerificationBlocked(true);
    },
  });

  if (isEdit && existing.isPending) return <PageLoader />;
  if (isEdit && existing.isError) return <ErrorState error={existing.error} onRetry={() => void existing.refetch()} />;
  if (isEdit && existing.data && existing.data.employer_id !== session?.user.id) {
    return <Alert tone="danger" title="Acesso negado">Esta vaga pertence a outra empresa.</Alert>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={isEdit ? 'Editar vaga' : 'Publicar vaga'} description="Toda vaga passa por uma análise rápida antes de ficar visível." />
      {verificationBlocked && (
        <div className="mb-4">
          <Alert tone="warning" title="Empresa não verificada">
            Envie seu documento comprobatório em <Link className="underline" to="/empresa/perfil">Empresa</Link> e aguarde a aprovação para publicar vagas.
          </Alert>
        </div>
      )}
      <form noValidate className="flex flex-col gap-6" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
        {!isEdit && (
          <Card>
            <h2 className="font-semibold">Comece com um modelo</h2>
            <p className="mt-1 text-sm text-muted">Preenche o título, a descrição, a jornada e os requisitos. Você edita o que quiser depois.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {JOB_TEMPLATES.map((t) => (
                <Button
                  key={t.name}
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const { name: _name, ...fields } = t;
                    (Object.keys(fields) as (keyof typeof fields)[]).forEach((k) => form.setValue(k, fields[k] as never, { shouldDirty: true, shouldValidate: true }));
                  }}
                >
                  {t.name}
                </Button>
              ))}
            </div>
          </Card>
        )}
        <Card>
          <h2 className="mb-4 font-semibold">Informações principais</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título da vaga" error={errors.title?.message} required className="sm:col-span-2">
              {({ id: fid, invalid }) => <Input id={fid} maxLength={150} invalid={invalid} placeholder="Ex.: Atendente de loja" {...form.register('title')} />}
            </Field>
            <Field label="Descrição e responsabilidades" error={errors.description?.message} required className="sm:col-span-2">
              {({ id: fid, invalid }) => <Textarea id={fid} rows={7} maxLength={3000} invalid={invalid} {...form.register('description')} />}
            </Field>
            <Field label="Modelo de trabalho" error={errors.work_model?.message} required>
              {({ id: fid }) => (
                <Select id={fid} {...form.register('work_model')}>
                  {WORK_MODELS.map((w) => <option key={w} value={w}>{WORK_MODEL_LABEL[w]}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Tipo de contrato" error={errors.contract_type?.message} required>
              {({ id: fid }) => (
                <Select id={fid} {...form.register('contract_type')}>
                  {CONTRACTS.map((c) => <option key={c} value={c}>{CONTRACT_LABEL[c]}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Área da vaga" error={errors.area?.message} required hint="Candidatos com área de atuação diferente não conseguem se candidatar.">
              {({ id: fid }) => (
                <Select id={fid} invalid={!!errors.area} {...form.register('area')}>
                  <option value="" disabled>Selecione...</option>
                  {AREAS.map((a) => <option key={a} value={a}>{JOB_AREA_LABEL[a]}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Local de trabalho" error={errors.address?.message} required className="sm:col-span-2">
              {({ id: fid, invalid }) => <Input id={fid} maxLength={150} invalid={invalid} {...form.register('address')} />}
            </Field>
            <CepLookup className="sm:col-span-2" onFound={(r) => form.setValue('address', cepToAddress(r).slice(0, 150), { shouldDirty: true, shouldValidate: true })} />
            <Field label="Jornada" error={errors.work_schedule?.message} required>
              {({ id: fid, invalid }) => <Input id={fid} maxLength={100} placeholder="Ex.: 6x1, 08h às 17h" invalid={invalid} {...form.register('work_schedule')} />}
            </Field>
            <Field label="Faixa salarial" error={errors.salary_range?.message} hint='Ex.: digite o valor mínimo, depois escreva " a R$ 2.200,00" se quiser uma faixa.'>
              {({ id: fid, invalid }) => (
                <Controller
                  control={form.control}
                  name="salary_range"
                  render={({ field }) => (
                    <Input
                      id={fid}
                      maxLength={100}
                      placeholder="Ex.: R$ 1.800,00"
                      invalid={invalid}
                      value={field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Enquanto for só um número sendo digitado, formata como moeda. Ao digitar
                        // "a" ou "até" (indicando faixa), para de mascarar e deixa o texto livre.
                        const looksLikeRange = /\ba\b/i.test(value) || /até/i.test(value);
                        field.onChange(looksLikeRange ? value : maskCurrencyInput(value));
                      }}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              )}
            </Field>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Checkbox label="Exibir salário para candidatos" {...form.register('is_salary_visible')} />
              <Checkbox label="Vaga afirmativa para PcD" {...form.register('is_pcd')} />
            </div>
            <Field label="Inscrições até" error={errors.expires_at?.message} hint="Opcional.">
              {({ id: fid, invalid }) => <Input id={fid} type="date" invalid={invalid} {...form.register('expires_at')} />}
            </Field>
            <Field label="Escolaridade exigida" error={errors.escolaridade_exigida?.message}>
              {({ id: fid }) => (
                <Select id={fid} {...form.register('escolaridade_exigida')}>
                  <option value="">Não exigir</option>
                  {ESCOLARIDADES.map((e) => <option key={e} value={e}>{ESCOLARIDADE_LABEL[e]}</option>)}
                </Select>
              )}
            </Field>
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Idiomas exigidos (opcional)</h2>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={languageRequirements.fields.length >= 10}
              onClick={() => languageRequirements.append({ idioma: 'INGLES', idioma_outro: '', nivel: 'BASICO' })}
            >
              Adicionar
            </Button>
          </div>
          {languageRequirements.fields.length === 0 && <p className="text-sm text-muted">Nenhum idioma exigido.</p>}
          <div className="flex flex-col gap-3">
            {languageRequirements.fields.map((f, i) => (
              <div key={f.id} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
                <Field label="Idioma">
                  {({ id: fid }) => (
                    <Select id={fid} {...form.register(`language_requirements.${i}.idioma`)}>
                      {IDIOMAS.map((idm) => <option key={idm} value={idm}>{IDIOMA_LABEL[idm]}</option>)}
                    </Select>
                  )}
                </Field>
                {languageRequirementValues?.[i]?.idioma === 'OUTRO' && (
                  <Field label="Qual idioma?">
                    {({ id: fid, invalid }) => <Input id={fid} maxLength={50} invalid={invalid} {...form.register(`language_requirements.${i}.idioma_outro`)} />}
                  </Field>
                )}
                <Field label="Nível mínimo">
                  {({ id: fid }) => (
                    <Select id={fid} {...form.register(`language_requirements.${i}.nivel`)}>
                      {NIVEIS_IDIOMA.map((n) => <option key={n} value={n}>{NIVEL_IDIOMA_LABEL[n]}</option>)}
                    </Select>
                  )}
                </Field>
                <div className="flex items-end">
                  <Button type="button" size="sm" variant="danger-ghost" onClick={() => languageRequirements.remove(i)}>Remover</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Requisitos e benefícios</h2>
          <div className="flex flex-col gap-5">
            {(['mandatory_qualifications', 'differential_qualifications', 'benefits'] as const).map((name) => (
              <Field key={name} label={{ mandatory_qualifications: 'Requisitos obrigatórios', differential_qualifications: 'Diferenciais', benefits: 'Benefícios' }[name]} error={errors[name]?.message}>
                {({ id: fid, describedBy, invalid }) => (
                  <Controller control={form.control} name={name} render={({ field }) => <StringListInput id={fid} describedBy={describedBy} invalid={invalid} value={field.value} onChange={field.onChange} />} />
                )}
              </Field>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">Perguntas de triagem</h2>
          <p className="mb-4 text-sm text-muted">Crie as opções de resposta e marque quais eliminam o candidato automaticamente.</p>
          {isEdit && (
            <div className="mb-4 flex flex-col gap-2">
              {existing.data?.questions?.length ? (
                <ul className="list-disc pl-5 text-sm text-muted">
                  {existing.data.questions.map((q) => <li key={q.id}><SafeText>{q.question_text}</SafeText></li>)}
                </ul>
              ) : (
                <p className="text-sm text-muted">Esta vaga não tem perguntas.</p>
              )}
              <Checkbox label="Substituir as perguntas atuais" {...form.register('replace_questions')} />
            </div>
          )}
          {(!isEdit || replaceQuestions) && (
            <div className="flex flex-col gap-3">
              {questions.fields.map((f, i) => (
                <div key={f.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-3">
                  <Field label={`Pergunta ${i + 1}`} error={errors.questions?.[i]?.question_text?.message} className="sm:col-span-3">
                    {({ id: fid, invalid }) => <Input id={fid} maxLength={300} invalid={invalid} {...form.register(`questions.${i}.question_text`)} />}
                  </Field>
                  <QuestionOptionsField control={form.control} register={form.register} questionIndex={i} errors={errors} />
                  <div className="sm:col-span-3">
                    <Button type="button" variant="danger-ghost" onClick={() => questions.remove(i)}>Remover pergunta</Button>
                  </div>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={questions.fields.length >= 10}
                  onClick={() =>
                    questions.append({
                      question_text: '',
                      options: [
                        { option_text: 'Sim', eliminates: false },
                        { option_text: 'Não', eliminates: true },
                      ],
                    })
                  }
                >
                  Adicionar pergunta
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Contato direto (opcional)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="WhatsApp" error={errors.contact_whatsapp?.message} hint="Com DDI e DDD. Ex.: 5522999999999">
              {({ id: fid, invalid }) => <Input id={fid} inputMode="numeric" invalid={invalid} {...form.register('contact_whatsapp')} />}
            </Field>
            <Field label="E-mail" error={errors.contact_email?.message}>
              {({ id: fid, invalid }) => <Input id={fid} type="email" invalid={invalid} {...form.register('contact_email')} />}
            </Field>
          </div>
        </Card>

        <ApiErrorAlert error={verificationBlocked ? null : save.error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" loading={save.isPending}>{isEdit ? 'Salvar alterações' : 'Enviar para análise'}</Button>
        </div>
      </form>
    </div>
  );
}
