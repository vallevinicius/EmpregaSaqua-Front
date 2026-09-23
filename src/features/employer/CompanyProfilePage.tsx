import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { uploadsApi, usersApi } from '@/api/endpoints';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, PageLoader } from '@/components/ui';
import { ApiErrorAlert, isPendingEndpoint, PendingEndpoint, useToast } from '@/components/feedback';
import { CepLookup, cepToAddress } from '@/components/inputs';
import { VERIFICATION_LABEL } from '@/lib/format';
import { IMAGE_TYPES, decodeEntities, isPdfFile } from '@/lib/safe';
import { errorMessage } from '@/lib/http';
import { DangerZone } from '@/features/candidate/CandidateProfilePage';
import { CompanyLogo } from '@/features/public/JobCard';

const schema = z.object({
  nome_fantasia: z.string().trim().min(2, 'Informe o nome da empresa.').max(150),
  endereco: z.string().trim().max(200),
});
type Values = z.infer<typeof schema>;

const MAX_LOGO = 2 * 1024 * 1024;
const MAX_DOC = 5 * 1024 * 1024;

export default function CompanyProfilePage() {
  const qc = useQueryClient();
  const toast = useToast();
  const profile = useQuery({ queryKey: ['company', 'me'], queryFn: ({ signal }) => usersApi.companyProfile(signal), retry: false });
  const pendingGet = profile.isError && isPendingEndpoint(profile.error);

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { nome_fantasia: '', endereco: '' } });
  const { errors, dirtyFields, isDirty } = form.formState;

  useEffect(() => {
    if (profile.data) form.reset({ nome_fantasia: decodeEntities(profile.data.nome_fantasia), endereco: decodeEntities(profile.data.endereco) });
  }, [profile.data, form]);

  const save = useMutation({
    mutationFn: (v: Values) =>
      usersApi.updateCompanyProfile({
        ...(dirtyFields.nome_fantasia && { nome_fantasia: v.nome_fantasia }),
        ...(dirtyFields.endereco && { endereco: v.endereco }),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(['company', 'me'], updated);
      form.reset({ nome_fantasia: decodeEntities(updated.nome_fantasia), endereco: decodeEntities(updated.endereco) });
      toast('Dados da empresa salvos.');
    },
  });

  if (profile.isPending) return <PageLoader />;
  const status = profile.data?.verification_status;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Perfil da empresa" actions={status && <Badge tone={status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'danger' : 'warning'}>{VERIFICATION_LABEL[status]}</Badge>} />
      {pendingGet && <div className="mb-4"><PendingEndpoint endpoint="GET /users/company-profile" feature="Carregar dados salvos da empresa" /></div>}
      {profile.isError && !pendingGet && <div className="mb-4"><ApiErrorAlert error={profile.error} /></div>}

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-4 font-semibold">Dados da empresa</h2>
          <form noValidate className="grid gap-4" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
            <Field label="Nome fantasia" error={errors.nome_fantasia?.message} required>
              {({ id, invalid }) => <Input id={id} maxLength={150} autoComplete="organization" invalid={invalid} {...form.register('nome_fantasia')} />}
            </Field>
            <Field label="Endereço" error={errors.endereco?.message}>
              {({ id, invalid }) => <Input id={id} maxLength={200} invalid={invalid} {...form.register('endereco')} />}
            </Field>
            <CepLookup onFound={(r) => form.setValue('endereco', cepToAddress(r).slice(0, 200), { shouldDirty: true, shouldValidate: true })} />
            {profile.data?.cnpj && <p className="text-sm text-muted">CNPJ: {profile.data.cnpj}</p>}
            <ApiErrorAlert error={save.error} />
            <div className="flex justify-end">
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
      <h2 className="mb-1 font-semibold">Logo</h2>
      <p className="mb-4 text-sm text-muted">JPEG, PNG, WebP ou GIF até 2MB. Convertida automaticamente para WebP.</p>
      <div className="flex items-center gap-4">
        {preview ? <img src={preview} alt="Pré-visualização da logo" className="size-16 rounded-lg border border-border object-contain" /> : <CompanyLogo name={name || 'Empresa'} url={uploadedUrl ?? currentUrl} size={64} />}
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

  if (status === 'APPROVED') return null;
  return (
    <Card>
      <h2 className="mb-1 font-semibold">Verificação da empresa</h2>
      <p className="mb-4 text-sm text-muted">Envie o cartão CNPJ ou contrato social em PDF (até 5MB). Necessário para publicar vagas.</p>
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
