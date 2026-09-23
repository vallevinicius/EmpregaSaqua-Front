import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { jobsApi, type JobInput } from '@/api/endpoints';
import type { ContractType, Job, WorkModel } from '@/api/types';
import { useSession } from '@/auth/useAuth';
import { Alert, Button, Card, Checkbox, Field, Input, PageHeader, PageLoader, Select, Textarea } from '@/components/ui';
import { ApiErrorAlert, ErrorState, SafeText, useToast } from '@/components/feedback';
import { CepLookup, StringListInput, cepToAddress } from '@/components/inputs';
import { CONTRACT_LABEL, WORK_MODEL_LABEL } from '@/lib/format';
import { decodeEntities, onlyDigits } from '@/lib/safe';
import { ApiError } from '@/lib/http';

const WORK_MODELS = Object.keys(WORK_MODEL_LABEL) as [WorkModel, ...WorkModel[]];
const CONTRACTS = Object.keys(CONTRACT_LABEL) as [ContractType, ...ContractType[]];
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
    .array(z.object({ question_text: z.string().trim().min(5, 'Mínimo de 5 caracteres.').max(300), expected_answer: z.enum(['yes', 'no']) }))
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
  contract_type: 'CLT',
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
    mandatory_qualifications: job.mandatory_qualifications.map(decodeEntities),
    differential_qualifications: job.differential_qualifications.map(decodeEntities),
    benefits: job.benefits.map(decodeEntities),
    expires_at: job.expires_at ? job.expires_at.slice(0, 10) : '',
    contact_whatsapp: job.contact_whatsapp ?? '',
    contact_email: job.contact_email ?? '',
    // O gabarito (expected_answer) não chega ao front; editar perguntas exige redefini-las.
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
    mandatory_qualifications: v.mandatory_qualifications,
    differential_qualifications: v.differential_qualifications,
    benefits: v.benefits,
    expires_at: v.expires_at ? new Date(`${v.expires_at}T23:59:59`).toISOString() : undefined,
    contact_whatsapp: v.contact_whatsapp ? onlyDigits(v.contact_whatsapp) : undefined,
    contact_email: v.contact_email || undefined,
  };
  if (!isEdit || v.replace_questions) {
    input.questions = v.questions.map((q) => ({ question_text: q.question_text, expected_answer: q.expected_answer === 'yes' }));
  }
  return input;
}

export default function JobFormPage() {
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
  const { errors } = form.formState;
  const replaceQuestions = form.watch('replace_questions');

  useEffect(() => {
    if (existing.data) form.reset(toValues(existing.data));
  }, [existing.data, form]);

  const save = useMutation({
    mutationFn: (v: Values) => (isEdit ? jobsApi.update(id!, toInput(v, true)) : jobsApi.create(toInput(v, false))),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['jobs'] });
      toast(isEdit ? 'Vaga atualizada.' : 'Vaga enviada para análise.');
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
            <Field label="Local de trabalho" error={errors.address?.message} required className="sm:col-span-2">
              {({ id: fid, invalid }) => <Input id={fid} maxLength={150} invalid={invalid} {...form.register('address')} />}
            </Field>
            <CepLookup className="sm:col-span-2" onFound={(r) => form.setValue('address', cepToAddress(r).slice(0, 150), { shouldDirty: true, shouldValidate: true })} />
            <Field label="Jornada" error={errors.work_schedule?.message} required>
              {({ id: fid, invalid }) => <Input id={fid} maxLength={100} placeholder="Ex.: 6x1, 08h às 17h" invalid={invalid} {...form.register('work_schedule')} />}
            </Field>
            <Field label="Faixa salarial" error={errors.salary_range?.message}>
              {({ id: fid, invalid }) => <Input id={fid} maxLength={100} placeholder="Ex.: R$ 1.800 a R$ 2.200" invalid={invalid} {...form.register('salary_range')} />}
            </Field>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Checkbox label="Exibir salário para candidatos" {...form.register('is_salary_visible')} />
              <Checkbox label="Vaga afirmativa para PcD" {...form.register('is_pcd')} />
            </div>
            <Field label="Inscrições até" error={errors.expires_at?.message} hint="Opcional.">
              {({ id: fid, invalid }) => <Input id={fid} type="date" invalid={invalid} {...form.register('expires_at')} />}
            </Field>
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
          <p className="mb-4 text-sm text-muted">Perguntas de sim/não. Candidatos que responderem diferente do esperado são automaticamente reprovados.</p>
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
                <div key={f.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <Field label={`Pergunta ${i + 1}`} error={errors.questions?.[i]?.question_text?.message}>
                    {({ id: fid, invalid }) => <Input id={fid} maxLength={300} invalid={invalid} {...form.register(`questions.${i}.question_text`)} />}
                  </Field>
                  <Field label="Resposta esperada">
                    {({ id: fid }) => (
                      <Select id={fid} {...form.register(`questions.${i}.expected_answer`)}>
                        <option value="yes">Sim</option>
                        <option value="no">Não</option>
                      </Select>
                    )}
                  </Field>
                  <Button variant="danger-ghost" onClick={() => questions.remove(i)}>Remover</Button>
                </div>
              ))}
              <div>
                <Button size="sm" variant="secondary" disabled={questions.fields.length >= 10} onClick={() => questions.append({ question_text: '', expected_answer: 'yes' })}>
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
