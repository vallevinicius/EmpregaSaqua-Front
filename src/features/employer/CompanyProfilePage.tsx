import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { uploadsApi, usersApi } from '@/api/endpoints';
import { Alert, Badge, Button, Card, CardSectionTitle, Field, Input, PageHeader, PageLoader } from '@/components/ui';
import { ApiErrorAlert, useToast } from '@/components/feedback';
import { CepLookup, cepToAddress } from '@/components/inputs';
import { IdentificationCardIcon, ImageSquareIcon, ShieldCheckIcon } from '@/components/icons';
import { VERIFICATION_LABEL, formatCnpj } from '@/lib/format';
import { IMAGE_TYPES, decodeEntities, isPdfFile, onlyDigits } from '@/lib/safe';
import { errorMessage } from '@/lib/http';
import { DangerZone } from '@/features/candidate/CandidateProfilePage';
import { CompanyLogo } from '@/features/public/JobCard';

const schema = z.object({
  nome_fantasia: z.string().trim().min(2, 'Informe o nome da empresa.').max(150),
  endereco: z.string().trim().max(200),
  telefone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{10,13}$/.test(onlyDigits(v)), 'Telefone com DDD (10 a 13 dígitos).'),
  cnpj: z
    .string()
    .trim()
    .refine((v) => v === '' || onlyDigits(v).length === 14, 'CNPJ deve ter 14 dígitos.'),
});
type Values = z.infer<typeof schema>;

function toValues(p: { nome_fantasia: string; endereco: string | null; telefone: string | null; cnpj: string | null }): Values {
  return {
    nome_fantasia: decodeEntities(p.nome_fantasia),
    endereco: decodeEntities(p.endereco),
    telefone: p.telefone ?? '',
    cnpj: p.cnpj ? formatCnpj(p.cnpj) : '',
  };
}

const MAX_LOGO = 2 * 1024 * 1024;
const MAX_DOC = 5 * 1024 * 1024;

export default function CompanyProfilePage() {
  const qc = useQueryClient();
  const toast = useToast();
  const profile = useQuery({ queryKey: ['company', 'me'], queryFn: ({ signal }) => usersApi.companyProfile(signal), retry: false });

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { nome_fantasia: '', endereco: '', telefone: '', cnpj: '' } });
  const { errors, dirtyFields, isDirty } = form.formState;

  useEffect(() => {
    if (profile.data) form.reset(toValues(profile.data));
  }, [profile.data, form]);

  const save = useMutation({
    mutationFn: (v: Values) =>
      usersApi.updateCompanyProfile({
        ...(dirtyFields.nome_fantasia && { nome_fantasia: v.nome_fantasia }),
        ...(dirtyFields.endereco && { endereco: v.endereco }),
        ...(dirtyFields.telefone && { telefone: onlyDigits(v.telefone) }),
        ...(dirtyFields.cnpj && { cnpj: onlyDigits(v.cnpj) }),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(['company', 'me'], updated);
      form.reset(toValues(updated));
      toast('Dados da empresa salvos.');
    },
  });

  if (profile.isPending) return <PageLoader />;
  const status = profile.data?.verification_status;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Perfil da empresa"
        description="Esses dados aparecem para candidatos nas vagas e no chat."
        actions={status && <Badge tone={status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'danger' : 'warning'}>{VERIFICATION_LABEL[status]}</Badge>}
      />
      {profile.isError && <div className="mb-6"><ApiErrorAlert error={profile.error} /></div>}

      <div className="flex flex-col gap-6">
        <Card>
          <CardSectionTitle icon={<IdentificationCardIcon size={18} />} title="Dados da empresa" />
          <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
            <Field label="Nome fantasia" error={errors.nome_fantasia?.message} required className="sm:col-span-2">
              {({ id, invalid }) => <Input id={id} maxLength={150} autoComplete="organization" invalid={invalid} {...form.register('nome_fantasia')} />}
            </Field>
            <Field label="Endereço" error={errors.endereco?.message} className="sm:col-span-2">
              {({ id, invalid }) => <Input id={id} maxLength={200} invalid={invalid} {...form.register('endereco')} />}
            </Field>
            <CepLookup className="sm:col-span-2" onFound={(r) => form.setValue('endereco', cepToAddress(r).slice(0, 200), { shouldDirty: true, shouldValidate: true })} />

            <Field label="CNPJ" error={errors.cnpj?.message} hint="Opcional.">
              {({ id, invalid }) => (
                <Input
                  id={id}
                  inputMode="numeric"
                  invalid={invalid}
                  {...form.register('cnpj')}
                  onChange={(e) => form.setValue('cnpj', formatCnpj(e.target.value), { shouldDirty: true, shouldValidate: true })}
                />
              )}
            </Field>
            <Field label="Telefone comercial" error={errors.telefone?.message} hint="Opcional. Com DDD.">
              {({ id, invalid }) => <Input id={id} type="tel" inputMode="tel" autoComplete="tel" invalid={invalid} {...form.register('telefone')} />}
            </Field>

            <ApiErrorAlert error={save.error} />
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" loading={save.isPending} disabled={!isDirty}>Salvar</Button>
            </div>
          </form>
        </Card>

        <LogoUpload currentUrl={profile.data?.logo_url} name={profile.data?.nome_fantasia ?? form.getValues('nome_fantasia')} />
        <VerificationUpload status={status} />
      </div>
      <DangerZone />
    </div>
  );
}

function FilePicker({ accept, label, onPick, disabled }: { accept: string; label: string; onPick: (f: File) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) onPick(f);
  };
  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={onChange} tabIndex={-1} aria-hidden />
      <Button variant="secondary" onClick={() => ref.current?.click()} disabled={disabled}>{label}</Button>
    </>
  );
}

function LogoUpload({ currentUrl, name }: { currentUrl?: string | null; name: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const upload = useMutation({
    mutationFn: (f: File) => uploadsApi.logo(f),
    onSuccess: (r) => {
      setUploadedUrl(r.url);
      toast('Logo enviada.');
      void qc.invalidateQueries({ queryKey: ['company', 'me'] });
    },
  });

  const pick = (f: File) => {
    setLocalError(null);
    if (!(IMAGE_TYPES as readonly string[]).includes(f.type)) return setLocalError('Use JPEG, PNG, WebP ou GIF.');
    if (f.size > MAX_LOGO) return setLocalError('A imagem deve ter no máximo 2MB.');
    setPreview(URL.createObjectURL(f));
    upload.mutate(f);
  };

  return (
    <Card>
      <CardSectionTitle icon={<ImageSquareIcon size={18} />} title="Logo" />
      <p className="-mt-3 mb-4 text-sm text-muted">Aparece nas suas vagas e no seu perfil. JPEG, PNG, WebP ou GIF até 2MB — convertida automaticamente para WebP.</p>
      <div className="flex items-center gap-4">
        {preview ? (
          <img src={preview} alt="Pré-visualização da logo" className="size-20 rounded-xl border border-border bg-surface object-contain p-1" />
        ) : (
          <CompanyLogo name={name || 'Empresa'} url={uploadedUrl ?? currentUrl} size={80} />
        )}
        <FilePicker accept={IMAGE_TYPES.join(',')} label={upload.isPending ? 'Enviando…' : 'Enviar logo'} onPick={pick} disabled={upload.isPending} />
      </div>
      {localError && <p className="mt-2 text-xs text-danger" role="alert">{localError}</p>}
      {upload.isError && <p className="mt-2 text-xs text-danger" role="alert">{errorMessage(upload.error)}</p>}
    </Card>
  );
}

function VerificationUpload({ status }: { status?: string }) {
  const toast = useToast();
  const [localError, setLocalError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const upload = useMutation({
    mutationFn: (f: File) => uploadsApi.verificationDocument(f),
    onSuccess: () => {
      setSent(true);
      toast('Documento enviado. Aguarde a verificação.');
    },
  });

  const pick = async (f: File) => {
    setLocalError(null);
    if (f.size > MAX_DOC) return setLocalError('O PDF deve ter no máximo 5MB.');
    if (!(await isPdfFile(f))) return setLocalError('Envie um arquivo PDF válido.');
    upload.mutate(f);
  };

  if (status === 'APPROVED') {
    return (
      <Card>
        <CardSectionTitle icon={<ShieldCheckIcon size={18} />} title="Verificação da empresa" className="mb-0" />
        <p className="mt-1 text-sm text-success">Empresa verificada. Você já pode publicar vagas.</p>
      </Card>
    );
  }
  return (
    <Card>
      <CardSectionTitle icon={<ShieldCheckIcon size={18} />} title="Verificação da empresa" />
      <p className="-mt-3 mb-4 text-sm text-muted">Envie o cartão CNPJ ou contrato social em PDF (até 5MB). Necessário para publicar vagas.</p>
      {sent ? (
        <Alert tone="success">Documento recebido. Nossa equipe fará a análise em breve.</Alert>
      ) : (
        <FilePicker accept="application/pdf" label={upload.isPending ? 'Enviando…' : 'Enviar documento PDF'} onPick={(f) => void pick(f)} disabled={upload.isPending} />
      )}
      {localError && <p className="mt-2 text-xs text-danger" role="alert">{localError}</p>}
      {upload.isError && <p className="mt-2 text-xs text-danger" role="alert">{errorMessage(upload.error)}</p>}
    </Card>
  );
}
