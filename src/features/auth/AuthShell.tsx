import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeftIcon, CheckCircleIcon } from '@/components/icons';

/** Layout dividido das telas de login/cadastro: painel de marca (desktop) + formulário. */
export function AuthShell({
  title,
  subtitle,
  aside,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  aside: { heading: string; points: string[] };
  children: ReactNode;
  footer?: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  // Sem histórico dentro do app (link direto, nova aba), "voltar" leva para a lista de vagas.
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1));

  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[1fr_1.1fr]">
      <section aria-hidden className="bg-brand panel-in relative m-4 hidden flex-col justify-center overflow-hidden rounded-2xl px-12 py-16 text-white lg:flex xl:px-16">
        <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">{aside.heading}</h2>
        <ul className="stagger mt-10 flex max-w-md flex-col gap-4 [--stagger-base:350ms]">
          {aside.points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-white/90">
              <CheckCircleIcon size={22} className="mt-0.5 shrink-0 text-yellow" />
              {p}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="stagger w-full max-w-md [--stagger-base:100ms]">
          <button
            type="button"
            onClick={goBack}
            className="mb-6 inline-flex items-center gap-1.5 self-start rounded-full py-1 pr-2 text-sm font-semibold text-muted transition-colors hover:text-primary"
          >
            <ArrowLeftIcon size={16} /> Voltar
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
        </div>
      </section>
    </div>
  );
}
