import { useState } from 'react';
import { Link } from 'react-router';
import { Card, EmptyState, Input, PageHeader, buttonClass, cx } from '@/components/ui';
import { FAQ, filterFaq, type FaqAudience } from '@/lib/faq';
import { useSession } from '@/auth/useAuth';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const TABS: { value: FaqAudience; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'candidate', label: 'Quero trabalhar' },
  { value: 'company', label: 'Quero contratar' },
];

/** Central de ajuda: perguntas frequentes com busca. Estática de propósito (sem chamada à API). */
export default function HelpPage() {
  useDocumentTitle('Central de ajuda');
  const session = useSession();
  const [audience, setAudience] = useState<FaqAudience>(session?.user.role === 'EMPLOYER' ? 'company' : session?.user.role === 'JOB_SEEKER' ? 'candidate' : 'all');
  const [query, setQuery] = useState('');
  const items = filterFaq(FAQ, audience, query);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Central de ajuda" description="Respostas rápidas para as dúvidas mais comuns sobre o portal." />

      <div className="mb-6 flex flex-col gap-4">
        <div role="group" aria-label="Filtrar por perfil" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={audience === t.value}
              onClick={() => setAudience(t.value)}
              className={cx(
                'rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25',
                audience === t.value ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-muted hover:border-primary/50',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="sr-only">Buscar na ajuda</span>
          <Input type="search" placeholder="Buscar: senha, currículo, CNPJ…" value={query} maxLength={80} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nada encontrado" description="Tente outras palavras ou escolha “Todas”." />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((i) => (
            <li key={i.id}>
              <Card as="div" className="p-0">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 [&::-webkit-details-marker]:hidden">
                    {i.question}
                    <span aria-hidden className="text-xl text-primary transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <div className="px-5 pb-5 text-sm leading-relaxed text-muted">
                    <p>{i.answer}</p>
                    {i.link && (
                      <Link to={i.link.to} className={buttonClass('secondary', 'sm', 'mt-3')}>
                        {i.link.label}
                      </Link>
                    )}
                  </div>
                </details>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
