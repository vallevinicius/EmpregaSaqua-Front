import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronLeftIcon, ChevronRightIcon, InboxIcon } from '../icons';

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// ---------- Button ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost' | 'danger-outline';
type Size = 'sm' | 'md' | 'lg';

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg shadow-sm hover:bg-primary-hover',
  secondary: 'bg-surface text-fg border border-border hover:border-primary hover:text-primary',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90 dark:text-black',
  'danger-ghost': 'text-danger hover:bg-danger-soft',
  'danger-outline': 'bg-surface text-danger border border-border hover:border-danger hover:bg-danger-soft',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
};

/** Classes de botão para `<Link>`/`<a>` que precisam parecer botão. */
export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cx(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[color,background-color,border-color,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
    sizeClass[size],
    variantClass[variant],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
});

// ---------- Field wrappers ----------

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
}

export function Field({ label, error, hint, required, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const controlBase =
  'w-full rounded-xl border bg-surface px-3.5 text-sm text-fg placeholder:text-muted/70 transition-colors hover:border-muted/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-ring/15 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(controlBase, 'h-11', invalid ? 'border-danger' : 'border-border', className)}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cx(controlBase, 'py-2.5', invalid ? 'border-danger' : 'border-border', className)}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(controlBase, 'h-11 pr-8', invalid ? 'border-danger' : 'border-border', className)}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

export function Checkbox({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input id={id} type="checkbox" className="size-4 rounded border-border accent-[var(--es-primary)]" {...rest} />
      {label}
    </label>
  );
}

// ---------- Display ----------

export function Card({ className, children, as: As = 'section' }: { className?: string; children: ReactNode; as?: 'section' | 'article' | 'div' }) {
  return <As className={cx('rounded-2xl border border-border bg-surface p-6 shadow-card', className)}>{children}</As>;
}

type Tone = 'neutral' | 'primary' | 'green' | 'success' | 'warning' | 'danger';
const toneClass: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  primary: 'bg-primary-soft text-primary',
  green: 'bg-green text-ink',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', toneClass[tone])}>
      {children}
    </span>
  );
}

export function Spinner({ size = 20, label }: { size?: number; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      {label && <span className="text-sm text-muted">{label}</span>}
    </span>
  );
}

export function PageLoader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[30vh] items-center justify-center text-primary">
      <Spinner size={28} label={label} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-2xl bg-surface-2', className)} aria-hidden />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <span className="mb-2 flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <InboxIcon size={26} />
      </span>
      <p className="text-lg font-bold">{title}</p>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Alert({ tone = 'danger', title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('rounded-xl px-4 py-3.5 text-sm', toneClass[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Cabeçalho de seção dentro de um Card: ícone em caixinha + título. Usado nos formulários de perfil. */
export function CardSectionTitle({ icon, title, className }: { icon: ReactNode; title: string; className?: string }) {
  return (
    <h2 className={cx('mb-5 flex items-center gap-2 text-base font-bold', className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">{icon}</span>
      {title}
    </h2>
  );
}

// ---------- Pagination ----------

/** Janela de páginas com reticências: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page: number, total: number): (number | '…')[] {
  const out: (number | '…')[] = [];
  const from = Math.max(2, page - 2);
  const to = Math.min(total - 1, page + 2);
  out.push(1);
  if (from > 2) out.push('…');
  for (let p = from; p <= to; p++) out.push(p);
  if (to < total - 1) out.push('…');
  if (total > 1) out.push(total);
  return out;
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pill = 'inline-flex size-10 items-center justify-center rounded-full text-sm font-semibold transition-colors';
  return (
    <nav aria-label="Paginação" className="mt-8 flex items-center justify-center gap-1.5">
      <button type="button" className={cx(pill, 'text-fg hover:bg-surface-2 disabled:opacity-40')} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">
        <ChevronLeftIcon />
      </button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden>…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cx(pill, p === page ? 'bg-primary text-primary-fg' : 'text-fg hover:bg-surface-2')}
          >
            <span className="sr-only">Página </span>
            {p}
          </button>
        ),
      )}
      <button type="button" className={cx(pill, 'text-fg hover:bg-surface-2 disabled:opacity-40')} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Próxima página">
        <ChevronRightIcon />
      </button>
    </nav>
  );
}

// ---------- Dialog (nativo, com foco preso pelo browser) ----------

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  tone = 'danger',
  loading,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        if (loading) e.preventDefault();
      }}
      className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-border bg-surface p-0 text-fg shadow-lift"
    >
      <div className="p-6">
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
