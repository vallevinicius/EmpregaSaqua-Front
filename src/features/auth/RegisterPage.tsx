import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthActions } from '@/auth/useAuth';
import { homeFor } from '@/auth/guards';
import { Button, Field, Input, Textarea, cx } from '@/components/ui';
import { ApiErrorAlert } from '@/components/feedback';
import { CepLookup, cepToAddress } from '@/components/inputs';
import { BuildingIcon, UserIcon } from '@/components/icons';
import { formatCnpj } from '@/lib/format';
import { onlyDigits } from '@/lib/safe';
import { AuthShell } from './AuthShell';

/**
 * Política de senha mais forte que o back (que só exige 6 chars). 72 é o limite efetivo do bcrypt.
 * O role enviado é restrito a JOB_SEEKER | EMPLOYER no schema — o front NUNCA envia ADMIN
 * (e agora o back também recusa: create-user.dto.ts usa @IsIn, não mais @IsEnum).
 *
 * nome_fantasia/full_name são obrigatórios conforme o role: o back cria o CompanyProfile/
 * CandidateProfile já no cadastro (users.service.ts#create), então esses dados precisam
 * vir aqui — depois do cadastro não existe mais um jeito de "completar" um perfil vazio,
 * só de editar um que já existe.
 */
const digitsOrEmpty = (min: number, max: number) => (v: string) => v === '' || (onlyDigits(v).length >= min && onlyDigits(v).length <= max);

const schema = z
  .object({
    role: z.enum(['JOB_SEEKER', 'EMPLOYER']),
    email: z.email('E-mail inválido.').max(254),
    password: z
      .string()
      .min(8, 'Mínimo de 8 caracteres.')
      .max(72, 'Máximo de 72 caracteres.')
      .regex(/[A-Za-z]/, 'Inclua ao menos uma letra.')
      .regex(/\d/, 'Inclua ao menos um número.'),
    confirm: z.string(),
    telefone: z.string().trim().refine(digitsOrEmpty(10, 13), 'Telefone com DDD (10 a 13 dígitos).'),
    // Empresa
    nome_fantasia: z.string().trim().max(150),
    cnpj: z.string().trim().refine(digitsOrEmpty(14, 14), 'CNPJ deve ter 14 dígitos.'),
    endereco: z.string().trim().max(200),
    // Candidato
    full_name: z.string().trim().max(150),
    address: z.string().trim().max(200),
    bio: z.string().trim().max(2000),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não conferem.' })
  .refine((v) => v.role !== 'EMPLOYER' || v.nome_fantasia.length >= 2, { path: ['nome_fantasia'], message: 'Informe o nome da empresa.' })
  .refine((v) => v.role !== 'JOB_SEEKER' || v.full_name.length >= 2, { path: ['full_name'], message: 'Informe seu nome completo.' });
type Values = z.infer<typeof schema>;

const ROLE_OPTIONS = [
  { value: 'JOB_SEEKER', title: 'Quero trabalhar', desc: 'Busque vagas e candidate-se.' },
  { value: 'EMPLOYER', title: 'Quero contratar', desc: 'Publique vagas para sua empresa.' },
] as const;

const EMPTY: Omit<Values, 'role'> = {
  email: '',
  password: '',
  confirm: '',
  telefone: '',
  nome_fantasia: '',
  cnpj: '',
  endereco: '',
  full_name: '',
  address: '',
  bio: '',
};

export default function RegisterPage() {
  const { register: registerUser } = useAuthActions();
  const navigate = useNavigate();
  // `?tipo=empresa` (links "Para empresas") pré-seleciona a conta de empresa.
  const [sp] = useSearchParams();
  const initialRole = sp.get('tipo') === 'empresa' ? 'EMPLOYER' : 'JOB_SEEKER';
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role: initialRole, ...EMPTY } });
  const role = form.watch('role');
  const errors = form.formState.errors;

  const mutation = useMutation({
    mutationFn: (v: Values) =>
      registerUser({
        email: v.email,
        password: v.password,
        role: v.role,
        telefone: v.telefone ? onlyDigits(v.telefone) : undefined,
        ...(v.role === 'EMPLOYER'
          ? { nome_fantasia: v.nome_fantasia, cnpj: v.cnpj ? onlyDigits(v.cnpj) : undefined, endereco: v.endereco || undefined }
          : { full_name: v.full_name, address: v.address || undefined, bio: v.bio || undefined }),
      }),
    onSuccess: (s) => navigate(s.user.role === 'EMPLOYER' ? '/empresa/perfil' : homeFor(s.user.role), { replace: true }),
  });

  return (
    <AuthShell
      title="Crie sua conta"
      subtitle="Escolha o tipo de conta e preencha seus dados."
      aside={
        role === 'EMPLOYER'
          ? {
              heading: 'Contrate talentos da sua região.',
              points: ['Publique vagas e receba candidatos locais', 'Busque currículos e monte seu banco de talentos', 'Gerencie o processo seletivo em um só lugar'],
            }
          : {
              heading: 'Seu próximo emprego começa aqui.',
              points: ['Monte seu currículo online', 'Candidate-se a vagas verificadas', 'Acompanhe cada etapa do processo'],
            }
      }
      footer={
        <>
          Já tem conta? <Link to="/entrar" className="font-semibold text-primary hover:underline">Entrar</Link>
        </>
      }
    >
      <form noValidate className="stagger flex flex-col gap-5 [--stagger-base:250ms]" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Você quer…</legend>
          <div className="stagger grid grid-cols-2 gap-3 [--stagger-base:320ms]">
            {ROLE_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={cx(
                  'flex cursor-pointer flex-col gap-2 rounded-2xl border-2 p-4 text-sm transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/25',
                  role === o.value ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary/50',
                )}
              >
                <input type="radio" value={o.value} className="sr-only" {...form.register('role')} />
                <span className={cx('flex size-9 items-center justify-center rounded-xl', role === o.value ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-muted')}>
                  {o.value === 'EMPLOYER' ? <BuildingIcon size={18} /> : <UserIcon size={18} />}
                </span>
                <span className="block font-bold">{o.title}</span>
                <span className="block text-xs text-muted">{o.desc}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="E-mail" error={errors.email?.message} required>
          {({ id, describedBy, invalid }) => <Input id={id} type="email" autoComplete="email" placeholder="voce@email.com" aria-describedby={describedBy} invalid={invalid} {...form.register('email')} />}
        </Field>
        <Field label="Senha" error={errors.password?.message} hint="Mínimo 8 caracteres, com letras e números." required>
          {({ id, describedBy, invalid }) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={describedBy} invalid={invalid} {...form.register('password')} />}
        </Field>
        <Field label="Confirmar senha" error={errors.confirm?.message} required>
          {({ id, describedBy, invalid }) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={describedBy} invalid={invalid} {...form.register('confirm')} />}
        </Field>

        <div className="border-t border-border pt-5">
          {role === 'EMPLOYER' ? (
            <div className="flex flex-col gap-5">
              <p className="-mt-1 text-sm font-semibold text-muted">Sobre a empresa</p>
              <Field label="Nome da empresa" error={errors.nome_fantasia?.message} required>
                {({ id, invalid }) => <Input id={id} maxLength={150} placeholder="Ex.: Mercado Bom Preço" autoComplete="organization" invalid={invalid} {...form.register('nome_fantasia')} />}
              </Field>
              <Field label="CNPJ" error={errors.cnpj?.message} hint="Opcional. Pode ser enviado depois.">
                {({ id, invalid }) => (
                  <Input
                    id={id}
                    inputMode="numeric"
                    invalid={invalid}
                    {...form.register('cnpj')}
                    onChange={(e) => form.setValue('cnpj', formatCnpj(e.target.value), { shouldValidate: true })}
                  />
                )}
              </Field>
              <Field label="Endereço" error={errors.endereco?.message} hint="Opcional.">
                {({ id, invalid }) => <Input id={id} maxLength={200} invalid={invalid} {...form.register('endereco')} />}
              </Field>
              <CepLookup onFound={(r) => form.setValue('endereco', cepToAddress(r).slice(0, 200), { shouldDirty: true, shouldValidate: true })} />
              <Field label="Telefone comercial" error={errors.telefone?.message} hint="Opcional. Com DDD. Ex.: 22999999999">
                {({ id, invalid }) => <Input id={id} type="tel" inputMode="tel" autoComplete="tel" invalid={invalid} {...form.register('telefone')} />}
              </Field>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <p className="-mt-1 text-sm font-semibold text-muted">Sobre você</p>
              <Field label="Nome completo" error={errors.full_name?.message} required>
                {({ id, invalid }) => <Input id={id} maxLength={150} placeholder="Ex.: Joana da Silva" autoComplete="name" invalid={invalid} {...form.register('full_name')} />}
              </Field>
              <Field label="Telefone / WhatsApp" error={errors.telefone?.message} hint="Opcional. Com DDD. Ex.: 22999999999">
                {({ id, invalid }) => <Input id={id} type="tel" inputMode="tel" autoComplete="tel" invalid={invalid} {...form.register('telefone')} />}
              </Field>
              <Field label="Cidade / bairro" error={errors.address?.message} hint="Opcional.">
                {({ id, invalid }) => <Input id={id} maxLength={200} invalid={invalid} {...form.register('address')} />}
              </Field>
              <CepLookup onFound={(r) => form.setValue('address', cepToAddress(r).slice(0, 200), { shouldDirty: true, shouldValidate: true })} />
              <Field label="Resumo profissional" error={errors.bio?.message} hint="Opcional. Você pode detalhar depois, no seu currículo.">
                {({ id, invalid }) => <Textarea id={id} rows={3} maxLength={2000} invalid={invalid} {...form.register('bio')} />}
              </Field>
            </div>
          )}
        </div>

        <ApiErrorAlert error={mutation.error} />
        <Button type="submit" size="lg" loading={mutation.isPending}>Criar conta</Button>
      </form>
    </AuthShell>
  );
}
