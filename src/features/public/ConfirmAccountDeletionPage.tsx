import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { usersApi } from '@/api/endpoints';
import { useAuthActions } from '@/auth/useAuth';
import { Spinner, buttonClass } from '@/components/ui';
import { CheckCircleIcon, XIcon } from '@/components/icons';
import { errorMessage } from '@/lib/http';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function ConfirmAccountDeletionPage() {
  useDocumentTitle('Confirmar exclusão de conta');
  const [sp] = useSearchParams();
  const token = sp.get('token') ?? '';
  const { logout } = useAuthActions();
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Link inválido: token de confirmação ausente.');
      return;
    }
    let cancelled = false;
    usersApi
      .confirmAccountDeletion(token)
      .then((res) => {
        if (cancelled) return;
        logout();
        setState('done');
        setMessage(res.message);
      })
      .catch((e) => {
        if (cancelled) return;
        setState('error');
        setMessage(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="mx-auto max-w-md py-24 text-center">
      {state === 'loading' && (
        <>
          <Spinner size={32} />
          <p className="mt-4 text-muted">Confirmando exclusão da sua conta…</p>
        </>
      )}
      {state === 'done' && (
        <>
          <CheckCircleIcon size={56} className="mx-auto text-success" />
          <h1 className="mt-4 text-2xl font-extrabold">Conta excluída</h1>
          <p className="mt-2 text-muted">{message}</p>
          <Link to="/" className={buttonClass('primary', 'md', 'mt-8')}>Voltar para o início</Link>
        </>
      )}
      {state === 'error' && (
        <>
          <XIcon size={56} className="mx-auto text-danger" />
          <h1 className="mt-4 text-2xl font-extrabold">Não foi possível confirmar</h1>
          <p className="mt-2 text-muted">{message}</p>
          <Link to="/" className={buttonClass('secondary', 'md', 'mt-8')}>Voltar para o início</Link>
        </>
      )}
    </div>
  );
}
