import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/api/endpoints';
import { Alert, Button, Field, Input, buttonClass } from '@/components/ui';
import { ApiErrorAlert } from '@/components/feedback';
import { AuthShell } from './AuthShell';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const schema = z
  .object({
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

export default function ResetPasswordPage() {
  useDocumentTitle('Redefinir senha');
  const [sp] = useSearchParams();
  const token = sp.get('token') ?? '';
  const navigate = useNavigate();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });

  const mutation = useMutation({
    mutationFn: (v: Values) => authApi.resetPassword(token, v.password),
    onSuccess: () => {
      setTimeout(() => navigate('/entrar', { replace: true }), 2000);
    },
  });

  if (!token) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <Alert tone="danger" title="Link inválido">Token de redefinição ausente. Peça um novo link.</Alert>
        <Link to="/esqueci-minha-senha" className={buttonClass('primary', 'md', 'mt-8')}>Esqueci minha senha</Link>
      </div>
    );
  }

  return (
    <AuthShell
      title="Redefinir senha"
      subtitle="Escolha uma nova senha para sua conta."
      aside={{
        heading: 'Quase lá.',
        points: ['Use uma senha forte e única', 'Você será redirecionado para entrar em seguida'],
      }}
      footer={
        <>
          Lembrou a senha? <Link to="/entrar" className="font-semibold text-primary hover:underline">Entrar</Link>
        </>
      }
    >
      {mutation.isSuccess ? (
        <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-fg">{mutation.data.message} Redirecionando para o login…</div>
      ) : (
        <form noValidate className="flex flex-col gap-5" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <Field label="Nova senha" error={form.formState.errors.password?.message} hint="Mínimo 8 caracteres, com letras e números." required>
            {({ id, describedBy, invalid }) => (
              <Input id={id} type="password" autoComplete="new-password" autoFocus aria-describedby={describedBy} invalid={invalid} {...form.register('password')} />
            )}
          </Field>
          <Field label="Confirmar nova senha" error={form.formState.errors.confirm?.message} required>
            {({ id, describedBy, invalid }) => (
              <Input id={id} type="password" autoComplete="new-password" aria-describedby={describedBy} invalid={invalid} {...form.register('confirm')} />
            )}
          </Field>
          <ApiErrorAlert error={mutation.error} />
          <Button type="submit" size="lg" loading={mutation.isPending}>Redefinir senha</Button>
        </form>
      )}
    </AuthShell>
  );
}
