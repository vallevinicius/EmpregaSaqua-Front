import { Link, useLocation, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthActions } from '@/auth/useAuth';
import { homeFor, safeRedirect } from '@/auth/guards';
import { Button, Field, Input } from '@/components/ui';
import { ApiErrorAlert } from '@/components/feedback';
import { ApiError } from '@/lib/http';
import { AuthShell } from './AuthShell';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const schema = z.object({
  identifier: z.string().trim().min(3, 'Informe seu e-mail, usuário ou CPF.').max(254),
  password: z.string().min(6, 'Mínimo de 6 caracteres.').max(72, 'Máximo de 72 caracteres.'),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  useDocumentTitle("Entrar");
  const { login } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { identifier: '', password: '' } });

  const mutation = useMutation({
    mutationFn: (v: Values) => login(v.identifier, v.password),
    onSuccess: (s) => {
      const from = (location.state as { from?: unknown } | null)?.from;
      navigate(safeRedirect(from, homeFor(s.user.role)), { replace: true });
    },
    onError: () => form.resetField('password'),
  });

  const err = mutation.error;
  // Mensagem genérica em 401: não revelar se o identificador existe (enumeração de usuários).
  const shownError = err instanceof ApiError && err.status === 401 ? new ApiError(401, 'Credenciais incorretas.', { path: err.path }) : err;

  return (
    <AuthShell
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta EmpregaSaqua."
      aside={{
        heading: 'Oportunidades em Saquarema esperam por você.',
        points: ['Acompanhe suas candidaturas', 'Converse direto com as empresas', 'Encontre vagas perto de casa'],
      }}
      footer={
        <>
          Não tem conta? <Link to="/cadastro" className="font-semibold text-primary hover:underline">Cadastre-se</Link>
        </>
      }
    >
      <form noValidate className="stagger flex flex-col gap-5 [--stagger-base:250ms]" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
        <Field label="E-mail, usuário ou CPF" error={form.formState.errors.identifier?.message} required>
          {({ id, describedBy, invalid }) => (
            <Input id={id} autoComplete="username" autoFocus placeholder="voce@email.com" aria-describedby={describedBy} invalid={invalid} {...form.register('identifier')} />
          )}
        </Field>
        <Field label="Senha" error={form.formState.errors.password?.message} required>
          {({ id, describedBy, invalid }) => (
            <Input id={id} type="password" autoComplete="current-password" aria-describedby={describedBy} invalid={invalid} {...form.register('password')} />
          )}
        </Field>
        <div className="-mt-2 text-right text-sm">
          <Link to="/esqueci-minha-senha" className="font-semibold text-primary hover:underline">Esqueci minha senha</Link>
        </div>
        <ApiErrorAlert error={shownError} />
        <Button type="submit" size="lg" loading={mutation.isPending}>Entrar</Button>
      </form>
    </AuthShell>
  );
}
