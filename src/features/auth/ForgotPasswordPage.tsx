import { Link } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/api/endpoints';
import { Button, Field, Input } from '@/components/ui';
import { ApiErrorAlert } from '@/components/feedback';
import { AuthShell } from './AuthShell';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const schema = z.object({
  identifier: z.string().trim().min(3, 'Informe seu e-mail, usuário ou CPF.').max(254),
});
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  useDocumentTitle('Esqueci minha senha');
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { identifier: '' } });

  const mutation = useMutation({
    mutationFn: (v: Values) => authApi.forgotPassword(v.identifier),
  });

  return (
    <AuthShell
      title="Esqueci minha senha"
      subtitle="Informe seu e-mail, usuário ou CPF e enviaremos um link para redefinir a senha."
      aside={{
        heading: 'Vamos recuperar seu acesso.',
        points: ['O link vale por 1 hora', 'Só funciona se o cadastro existir', 'Depois é só criar uma nova senha'],
      }}
      footer={
        <>
          Lembrou a senha? <Link to="/entrar" className="font-semibold text-primary hover:underline">Entrar</Link>
        </>
      }
    >
      {mutation.isSuccess ? (
        <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-fg">{mutation.data.message}</div>
      ) : (
        <form noValidate className="flex flex-col gap-5" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <Field label="E-mail, usuário ou CPF" error={form.formState.errors.identifier?.message} required>
            {({ id, describedBy, invalid }) => (
              <Input id={id} autoComplete="username" autoFocus aria-describedby={describedBy} invalid={invalid} {...form.register('identifier')} />
            )}
          </Field>
          <ApiErrorAlert error={mutation.error} />
          <Button type="submit" size="lg" loading={mutation.isPending}>Enviar link de redefinição</Button>
        </form>
      )}
    </AuthShell>
  );
}
