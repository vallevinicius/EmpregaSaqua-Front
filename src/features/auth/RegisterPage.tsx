import { Link, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthActions } from '@/auth/useAuth';
import { homeFor } from '@/auth/guards';
import { Button, Card, Field, Input, cx } from '@/components/ui';
import { ApiErrorAlert } from '@/components/feedback';

/**
 * Política de senha mais forte que o back (que só exige 6 chars). 72 é o limite efetivo do bcrypt.
 * O role enviado é restrito a JOB_SEEKER | EMPLOYER no schema — o front NUNCA envia ADMIN.
 * (O back ainda aceita ADMIN no DTO; isso precisa ser corrigido lá — ver BACKEND_CONTRACT.md.)
 */
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
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não conferem.' });
type Values = z.infer<typeof schema>;

const ROLE_OPTIONS = [
  { value: 'JOB_SEEKER', title: 'Quero trabalhar', desc: 'Busque vagas e candidate-se.' },
  { value: 'EMPLOYER', title: 'Quero contratar', desc: 'Publique vagas para sua empresa.' },
] as const;

export default function RegisterPage() {
  const { register: registerUser } = useAuthActions();
  const navigate = useNavigate();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role: 'JOB_SEEKER', email: '', password: '', confirm: '' } });
  const role = form.watch('role');
  const errors = form.formState.errors;

  const mutation = useMutation({
    mutationFn: (v: Values) => registerUser({ email: v.email, password: v.password, role: v.role }),
    onSuccess: (s) => navigate(s.user.role === 'EMPLOYER' ? '/empresa/perfil' : homeFor(s.user.role), { replace: true }),
  });

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="text-center text-2xl font-semibold tracking-tight">Criar conta</h1>
      <Card className="mt-6">
        <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Tipo de conta</legend>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={cx(
                    'cursor-pointer rounded-lg border p-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40',
                    role === o.value ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-2',
                  )}
                >
                  <input type="radio" value={o.value} className="sr-only" {...form.register('role')} />
                  <span className="block font-medium">{o.title}</span>
                  <span className="block text-xs text-muted">{o.desc}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="E-mail" error={errors.email?.message} required>
            {({ id, describedBy, invalid }) => <Input id={id} type="email" autoComplete="email" aria-describedby={describedBy} invalid={invalid} {...form.register('email')} />}
          </Field>
          <Field label="Senha" error={errors.password?.message} hint="Mínimo 8 caracteres, com letras e números." required>
            {({ id, describedBy, invalid }) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={describedBy} invalid={invalid} {...form.register('password')} />}
          </Field>
          <Field label="Confirmar senha" error={errors.confirm?.message} required>
            {({ id, describedBy, invalid }) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={describedBy} invalid={invalid} {...form.register('confirm')} />}
          </Field>
          <ApiErrorAlert error={mutation.error} />
          <Button type="submit" loading={mutation.isPending}>Criar conta</Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-muted">
        Já tem conta? <Link to="/entrar" className="font-medium text-primary hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
