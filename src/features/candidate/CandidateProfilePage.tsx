import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { candidatesApi, usersApi, type CandidateProfileInput } from '@/api/endpoints';
import type { CandidateProfile } from '@/api/types';
import { useAuthActions } from '@/auth/useAuth';
import { Alert, Button, Card, ConfirmDialog, Field, Input, PageHeader, PageLoader, Textarea } from '@/components/ui';
import { ApiErrorAlert, isPendingEndpoint, PendingEndpoint, useToast } from '@/components/feedback';
import { CepLookup, StringListInput, cepToAddress } from '@/components/inputs';
import { decodeEntities, onlyDigits } from '@/lib/safe';
import { errorMessage } from '@/lib/http';

const month = z.string().regex(/^\d{4}-\d{2}$/, 'Use o formato AAAA-MM.');
const optionalMonth = z.union([month, z.literal('')]).optional();

const schema = z.object({
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

const EMPTY: Values = { bio: '', telefone: '', address: '', skills: [], experiences: [], educations: [] };

function toValues(p: CandidateProfile): Values {
  return {
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
  const qc = useQueryClient();
  const toast = useToast();
  const profile = useQuery({ queryKey: ['candidate', 'me'], queryFn: ({ signal }) => candidatesApi.me(signal), retry: false });
  const pendingGet = profile.isError && isPendingEndpoint(profile.error);

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const exps = useFieldArray({ control: form.control, name: 'experiences' });
  const edus = useFieldArray({ control: form.control, name: 'educations' });
  const { errors, dirtyFields, isDirty } = form.formState;

  useEffect(() => {
    if (profile.data) form.reset(toValues(profile.data));
  }, [profile.data, form]);

  const save = useMutation({
    mutationFn: (v: Values) => {
      // O PATCH do back SUBSTITUI experiences/educations quando enviados.
      // Enviamos só campos alterados: sem o GET /candidates/me, mandar o form vazio apagaria dados existentes.
      const body: CandidateProfileInput = {};
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
      <PageHeader title="Meu currículo" description="Essas informações aparecem para as empresas quando você se candidata." actions={<ResumeDownload />} />
      {pendingGet && (
        <div className="mb-4 flex flex-col gap-2">
          <PendingEndpoint endpoint="GET /candidates/me" feature="Carregar currículo salvo" />
          <Alert tone="primary">Você ainda pode editar: apenas as seções que você alterar serão enviadas, sem apagar o resto.</Alert>
        </div>
      )}
      {profile.isError && !pendingGet && <ApiErrorAlert error={profile.error} />}

      <form noValidate className="flex flex-col gap-6" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
        <Card>
          <h2 className="mb-4 font-semibold">Sobre você</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Resumo profissional" error={errors.bio?.message} className="sm:col-span-2">
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
          <h2 className="mb-4 font-semibold">Habilidades</h2>
          <Controller
            control={form.control}
            name="skills"
            render={({ field }) => <StringListInput value={field.value} onChange={field.onChange} placeholder="Ex.: Atendimento ao cliente" maxItems={30} maxLength={50} />}
          />
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Experiência profissional</h2>
            <Button size="sm" variant="secondary" disabled={exps.fields.length >= 20} onClick={() => exps.append({ company: '', role: '', start_date: '', end_date: '', description: '' })}>
              Adicionar
            </Button>
          </div>
          {exps.fields.length === 0 && <p className="text-sm text-muted">Nenhuma experiência adicionada.</p>}
          <div className="flex flex-col gap-4">
            {exps.fields.map((f, i) => {
              const e = errors.experiences?.[i];
              return (
                <fieldset key={f.id} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
                  <legend className="sr-only">Experiência {i + 1}</legend>
                  <Field label="Empresa" error={e?.company?.message} required>{({ id, invalid }) => <Input id={id} invalid={invalid} {...form.register(`experiences.${i}.company`)} />}</Field>
                  <Field label="Cargo" error={e?.role?.message} required>{({ id, invalid }) => <Input id={id} invalid={invalid} {...form.register(`experiences.${i}.role`)} />}</Field>
                  <Field label="Início" error={e?.start_date?.message} required>{({ id, invalid }) => <Input id={id} type="month" invalid={invalid} {...form.register(`experiences.${i}.start_date`)} />}</Field>
                  <Field label="Fim" error={e?.end_date?.message} hint="Deixe vazio se for o emprego atual.">{({ id, invalid }) => <Input id={id} type="month" invalid={invalid} {...form.register(`experiences.${i}.end_date`)} />}</Field>
                  <Field label="Atividades" error={e?.description?.message} required className="sm:col-span-2">{({ id, invalid }) => <Textarea id={id} rows={3} maxLength={2000} invalid={invalid} {...form.register(`experiences.${i}.description`)} />}</Field>
                  <div className="sm:col-span-2"><Button size="sm" variant="danger-ghost" onClick={() => exps.remove(i)}>Remover experiência</Button></div>
                </fieldset>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Formação</h2>
            <Button size="sm" variant="secondary" disabled={edus.fields.length >= 20} onClick={() => edus.append({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '' })}>
              Adicionar
            </Button>
          </div>
          {edus.fields.length === 0 && <p className="text-sm text-muted">Nenhuma formação adicionada.</p>}
          <div className="flex flex-col gap-4">
            {edus.fields.map((f, i) => {
              const e = errors.educations?.[i];
              return (
                <fieldset key={f.id} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
                  <legend className="sr-only">Formação {i + 1}</legend>
                  <Field label="Instituição" error={e?.institution?.message} required>{({ id, invalid }) => <Input id={id} invalid={invalid} {...form.register(`educations.${i}.institution`)} />}</Field>
                  <Field label="Grau" error={e?.degree?.message} required>{({ id, invalid }) => <Input id={id} placeholder="Ex.: Ensino Médio, Técnico, Bacharelado" invalid={invalid} {...form.register(`educations.${i}.degree`)} />}</Field>
                  <Field label="Área de estudo" error={e?.field_of_study?.message} required className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} {...form.register(`educations.${i}.field_of_study`)} />}</Field>
                  <Field label="Início" error={e?.start_date?.message} required>{({ id, invalid }) => <Input id={id} type="month" invalid={invalid} {...form.register(`educations.${i}.start_date`)} />}</Field>
                  <Field label="Conclusão" error={e?.end_date?.message}>{({ id, invalid }) => <Input id={id} type="month" invalid={invalid} {...form.register(`educations.${i}.end_date`)} />}</Field>
                  <div className="sm:col-span-2"><Button size="sm" variant="danger-ghost" onClick={() => edus.remove(i)}>Remover formação</Button></div>
                </fieldset>
              );
            })}
          </div>
        </Card>

        <ApiErrorAlert error={save.error} />
        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" loading={save.isPending} disabled={!isDirty} className="shadow-lg">Salvar currículo</Button>
        </div>
      </form>

      <DangerZone />
    </div>
  );
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
      Baixar currículo em PDF
    </Button>
  );
}

export function DangerZone() {
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const del = useMutation({
    mutationFn: () => usersApi.deleteAccount(),
    onSuccess: () => {
      logout();
      navigate('/', { replace: true });
    },
  });
  return (
    <Card className="mt-10 border-danger/40">
      <h2 className="font-semibold text-danger">Excluir conta</h2>
      <p className="mt-1 text-sm text-muted">Seus dados pessoais serão anonimizados (LGPD). Essa ação não pode ser desfeita.</p>
      <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>Excluir minha conta</Button>
      <ConfirmDialog
        open={open}
        title="Excluir sua conta?"
        description='Digite "EXCLUIR" para confirmar.'
        confirmLabel="Excluir definitivamente"
        loading={del.isPending}
        onConfirm={() => confirmText === 'EXCLUIR' && del.mutate()}
        onClose={() => {
          setOpen(false);
          setConfirmText('');
        }}
      >
        <Input aria-label="Confirmação" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
        {del.isError && <p className="mt-2 text-xs text-danger">{errorMessage(del.error)}</p>}
      </ConfirmDialog>
    </Card>
  );
}
