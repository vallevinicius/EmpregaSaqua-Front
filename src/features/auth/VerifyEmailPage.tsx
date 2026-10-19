import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/endpoints';
import { Alert, buttonClass } from '@/components/ui';
import { ApiErrorAlert } from '@/components/feedback';
import { AuthShell } from './AuthShell';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function VerifyEmailPage() {
  useDocumentTitle('Confirmar e-mail');
  const [sp] = useSearchParams();
  const token = sp.get('token') ?? '';
  const triggered = useRef(false);

  const mutation = useMutation({
    mutationFn: (t: string) => authApi.verifyEmail(t),
  });

  useEffect(() => {
    if (!token || triggered.current) return;
    triggered.current = true;
    mutation.mutate(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <Alert tone="danger" title="Link inválido">Token de confirmação ausente. Peça um novo link de confirmação na tela de login.</Alert>
        <Link to="/entrar" className={buttonClass('primary', 'md', 'mt-8')}>Voltar para o login</Link>
      </div>
    );
  }

  return (
    <AuthShell
      title="Confirmar e-mail"
      subtitle="Estamos confirmando o seu cadastro."
      aside={{
        heading: 'Quase lá.',
        points: ['Isso leva só um instante', 'Depois é só entrar normalmente'],
      }}
      footer={
        <>
          Já confirmou? <Link to="/entrar" className="font-semibold text-primary hover:underline">Entrar</Link>
        </>
      }
    >
      {mutation.isSuccess ? (
        <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-fg">
          {mutation.data.message}
          <Link to="/entrar" className={buttonClass('primary', 'md', 'mt-4 w-full')}>Entrar</Link>
        </div>
      ) : mutation.isError ? (
        <>
          <ApiErrorAlert error={mutation.error} />
          <Link to="/entrar" className={buttonClass('secondary', 'md', 'mt-4 w-full')}>Voltar para o login</Link>
        </>
      ) : (
        <p className="text-sm text-fg-muted">Confirmando…</p>
      )}
    </AuthShell>
  );
}
