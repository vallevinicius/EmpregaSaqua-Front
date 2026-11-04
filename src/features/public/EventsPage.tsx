import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/api/endpoints';
import type { EventKind } from '@/api/types';
import { Badge, Card, EmptyState, PageHeader, Skeleton, buttonClass, cx } from '@/components/ui';
import { ErrorState, SafeParagraphs, SafeText } from '@/components/feedback';
import { EVENT_KIND_LABEL, formatEventWhen } from '@/lib/events';
import { safeHttpUrl } from '@/lib/safe';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const TABS: { value: EventKind | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'FAIR', label: 'Feiras de emprego' },
  { value: 'COURSE', label: 'Cursos' },
];

/** Feiras de emprego e cursos divulgados pela Prefeitura (só os que ainda vão acontecer). Página pública. */
export default function EventsPage() {
  useDocumentTitle('Feiras e cursos', 'Feiras de emprego e cursos em Saquarema.');
  const [kind, setKind] = useState<EventKind | ''>('');
  const q = useQuery({ queryKey: ['events', kind], queryFn: ({ signal }) => eventsApi.list(kind || undefined, signal), staleTime: 60_000 });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Feiras e cursos" description="Oportunidades para se qualificar e conhecer empresas que estão contratando em Saquarema." />

      <div role="group" aria-label="Filtrar por tipo" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={kind === t.value}
            onClick={() => setKind(t.value)}
            className={cx(
              'rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25',
              kind === t.value ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-muted hover:border-primary/50',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {q.isPending ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title="Nenhum evento programado por enquanto" description="Volte em breve: novas feiras e cursos são divulgados aqui." />
      ) : (
        <ul className="flex flex-col gap-4">
          {q.data.map((e) => {
            const link = safeHttpUrl(e.link);
            return (
              <li key={e.id}>
                <Card as="article">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={e.kind === 'FAIR' ? 'primary' : 'green'}>{EVENT_KIND_LABEL[e.kind]}</Badge>
                    <span className="text-sm font-semibold text-primary">{formatEventWhen(e)}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold">
                    <SafeText>{e.title}</SafeText>
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    <SafeText>{e.location}</SafeText>
                    {e.bairro && <> · <SafeText>{e.bairro}</SafeText></>}
                  </p>
                  <SafeParagraphs text={e.description} className="mt-3 text-sm leading-relaxed" />
                  {link && (
                    <a href={link} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary', 'sm', 'mt-4')}>
                      Mais informações
                    </a>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
