import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError } from '@/lib/http';
import { Alert, Button, cx } from './ui';
import { decodeEntities } from '@/lib/safe';

/** Texto vindo da API: decodifica entidades e renderiza SEMPRE como texto (nunca innerHTML). */
export function SafeText({ children, className, as: As = 'span' }: { children: string | null | undefined; className?: string; as?: 'span' | 'p' | 'div' }) {
  return <As className={className}>{decodeEntities(children)}</As>;
}

/** Texto multi-linha preservando quebras sem HTML. */
export function SafeParagraphs({ text, className }: { text: string | null | undefined; className?: string }) {
  const blocks = decodeEntities(text).split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className={cx('space-y-3', className)}>
      {blocks.map((b, i) => (
        <p key={i} className="whitespace-pre-line">
          {b}
        </p>
      ))}
    </div>
  );
}

/** Mostrado quando a UI depende de um endpoint que o back ainda não expõe. */
export function PendingEndpoint({ endpoint, feature }: { endpoint: string; feature: string }) {
  return (
    <Alert tone="warning" title={`${feature} indisponível`}>
      Esta tela depende de <code className="rounded bg-black/5 px-1 font-mono text-xs dark:bg-white/10">{endpoint}</code>, que
      ainda não existe no backend. Veja <strong>BACKEND_CONTRACT.md</strong> no repositório do front.
    </Alert>
  );
}

export function isPendingEndpoint(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

export function ErrorState({
  error,
  onRetry,
  pending,
}: {
  error: unknown;
  onRetry?: () => void;
  pending?: { endpoint: string; feature: string };
}) {
  if (pending && isPendingEndpoint(error)) return <PendingEndpoint {...pending} />;
  const msg = error instanceof ApiError ? error.message : 'Não foi possível carregar os dados.';
  return (
    <Alert tone="danger" title="Algo deu errado">
      <p>{msg}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </Alert>
  );
}

/** Erros de validação do class-validator (array de mensagens). */
export function ApiErrorAlert({ error }: { error: unknown }) {
  if (!error) return null;
  if (error instanceof ApiError && error.details.length > 1) {
    return (
      <Alert tone="danger" title="Corrija os campos abaixo">
        <ul className="list-disc pl-5">
          {error.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </Alert>
    );
  }
  return <Alert tone="danger">{error instanceof ApiError ? error.message : 'Ocorreu um erro inesperado.'}</Alert>;
}

// ---------- Toasts ----------

type ToastTone = 'success' | 'danger' | 'primary';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}
const ToastCtx = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const push = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = ++seq.current;
    setItems((prev) => [...prev.slice(-3), { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);
  const value = useMemo(() => push, [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto rounded-full px-5 py-3 text-sm font-semibold shadow-lift',
              t.tone === 'success' && 'bg-success text-white dark:text-black',
              t.tone === 'danger' && 'bg-danger text-white dark:text-black',
              t.tone === 'primary' && 'bg-primary text-primary-fg',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
