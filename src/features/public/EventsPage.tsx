import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/api/endpoints';
import type { CityEvent, EventKind } from '@/api/types';
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton, buttonClass, cx } from '@/components/ui';
import { ErrorState, SafeParagraphs, SafeText } from '@/components/feedback';
import { EVENT_KIND_LABEL, eventSummary, formatEventWhen } from '@/lib/events';
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
  const [selected, setSelected] = useState<CityEvent | null>(null);
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
          {q.data.map((e) => (
            <li key={e.id}>
              <Card as="article" className="group relative cursor-pointer transition-[border-color,box-shadow] hover:border-primary/50 hover:shadow-lift focus-within:ring-4 focus-within:ring-ring/25">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={e.kind === 'FAIR' ? 'primary' : 'green'}>{EVENT_KIND_LABEL[e.kind]}</Badge>
                  <span className="text-sm font-semibold text-primary">{formatEventWhen(e)}</span>
                </div>
                <h2 className="mt-3 text-xl font-bold">
                  {/* O botão ocupa o card inteiro (after:inset-0): clicar em qualquer lugar abre o pop-up, e o teclado/leitor de tela continua com um único controle. */}
                  <button
                    type="button"
                    onClick={() => setSelected(e)}
                    aria-haspopup="dialog"
                    className="text-left focus-visible:outline-none after:absolute after:inset-0 after:content-['']"
                  >
                    <SafeText>{e.title}</SafeText>
                  </button>
                </h2>
                <p className="mt-1 text-sm text-muted">
                  <SafeText>{e.location}</SafeText>
                  {e.bairro && <> · <SafeText>{e.bairro}</SafeText></>}
                </p>
                <p className="mt-3 text-sm leading-relaxed">
                  <SafeText>{eventSummary(e)}</SafeText>
                </p>
                <span aria-hidden className={buttonClass('secondary', 'sm', 'mt-4 group-hover:border-primary group-hover:text-primary')}>
                  Mais informações
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <EventDialog event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/** Pop-up com os detalhes completos. Usa <dialog> nativo: foco preso, Esc fecha, clique fora fecha. */
function EventDialog({ event, onClose }: { event: CityEvent | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  // Mantém o último evento durante a animação/fechamento para o conteúdo não piscar vazio.
  const [shown, setShown] = useState<CityEvent | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (event) {
      setShown(event);
      if (!d.open) d.showModal();
    } else if (d.open) {
      d.close();
    }
  }, [event]);

  const link = shown ? safeHttpUrl(shown.link) : null;
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose(); // clique no fundo escurecido
      }}
      aria-labelledby="event-dialog-title"
      className="m-auto max-h-[90vh] w-[min(94vw,40rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-fg shadow-lift backdrop:bg-black/50"
    >
      {shown && (
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={shown.kind === 'FAIR' ? 'primary' : 'green'}>{EVENT_KIND_LABEL[shown.kind]}</Badge>
            <span className="text-sm font-semibold text-primary">{formatEventWhen(shown)}</span>
          </div>
          <h2 id="event-dialog-title" className="mt-3 text-2xl font-bold">
            <SafeText>{shown.title}</SafeText>
          </h2>
          <SafeParagraphs text={shown.description} className="mt-5 text-[15px] leading-relaxed" />
          <dl className="mt-6 grid gap-4 rounded-xl bg-surface-2 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-muted">Quando</dt>
              <dd className="mt-0.5"><SafeText>{formatEventWhen(shown)}</SafeText></dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">Onde</dt>
              <dd className="mt-0.5">
                <SafeText>{shown.location}</SafeText>
                {shown.bairro && <> · <SafeText>{shown.bairro}</SafeText></>}
              </dd>
            </div>
            {link && (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-muted">Link de informações ou inscrição</dt>
                <dd className="mt-0.5 break-all">
                  <a href={link} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">{link}</a>
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-8 flex flex-wrap justify-end gap-2">
            {link && (
              <a href={link} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'md')}>
                Acessar página do evento
              </a>
            )}
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
