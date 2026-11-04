import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { eventsApi, type EventInput } from '@/api/endpoints';
import type { CityEvent } from '@/api/types';
import { Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, Field, Input, PageHeader, Pagination, Select, Skeleton, Textarea } from '@/components/ui';
import { ApiErrorAlert, ErrorState, SafeText, useToast } from '@/components/feedback';
import { BAIRROS_SAQUAREMA, isBairro } from '@/lib/bairros';
import { EVENT_KIND_LABEL, formatEventWhen, fromDatetimeLocal, toDatetimeLocal } from '@/lib/events';
import { errorMessage } from '@/lib/http';
import { safeHttpUrl } from '@/lib/safe';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

/** Limites iguais aos do back (CreateEventDto). */
const schema = z
  .object({
    kind: z.enum(['FAIR', 'COURSE']),
    title: z.string().trim().min(3, 'Mínimo de 3 caracteres.').max(150, 'Máximo de 150 caracteres.'),
    description: z.string().trim().min(10, 'Descreva em pelo menos 10 caracteres.').max(2000, 'Máximo de 2000 caracteres.'),
    location: z.string().trim().min(3, 'Informe o local.').max(200, 'Máximo de 200 caracteres.'),
    bairro: z.string().refine((v): boolean => v === '' || isBairro(v), 'Escolha um bairro da lista.'),
    starts_at: z.string().min(1, 'Informe a data e a hora de início.'),
    ends_at: z.string(),
    link: z
      .string()
      .trim()
      .max(300, 'Máximo de 300 caracteres.')
      .refine((v): boolean => v === '' || (/^https?:\/\//i.test(v) && safeHttpUrl(v) !== null), 'Use um link que comece com http:// ou https://.'),
    published: z.boolean(),
  })
  .refine((v) => !v.ends_at || !v.starts_at || new Date(v.ends_at).getTime() >= new Date(v.starts_at).getTime(), {
    path: ['ends_at'],
    message: 'O fim não pode ser antes do início.',
  });
type Values = z.infer<typeof schema>;

const EMPTY: Values = { kind: 'FAIR', title: '', description: '', location: '', bairro: '', starts_at: '', ends_at: '', link: '', published: true };

const toValues = (e: CityEvent): Values => ({
  kind: e.kind,
  title: e.title,
  description: e.description,
  location: e.location,
  bairro: isBairro(e.bairro) ? e.bairro : '',
  starts_at: toDatetimeLocal(e.starts_at),
  ends_at: toDatetimeLocal(e.ends_at),
  link: e.link ?? '',
  published: e.published,
});

/** Cadastro de feiras de emprego e cursos: o que o admin publica aparece em /eventos para todo mundo. */
export default function AdminEventsPage() {
  useDocumentTitle('Feiras e cursos');
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CityEvent | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<CityEvent | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'events', page],
    queryFn: ({ signal }) => eventsApi.adminList({ page, limit: 10 }, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'events'] });
    void qc.invalidateQueries({ queryKey: ['events'] });
  };

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const errors = form.formState.errors;

  const open = (target: CityEvent | 'new') => {
    form.reset(target === 'new' ? EMPTY : toValues(target));
    save.reset();
    setEditing(target);
  };
  const close = () => setEditing(null);

  const save = useMutation({
    mutationFn: (v: Values) => {
      const input: EventInput = {
        kind: v.kind,
        title: v.title,
        description: v.description,
        location: v.location,
        bairro: v.bairro || null,
        starts_at: fromDatetimeLocal(v.starts_at) ?? v.starts_at,
        ends_at: fromDatetimeLocal(v.ends_at),
        link: v.link || null,
        published: v.published,
      };
      return editing && editing !== 'new' ? eventsApi.update(editing.id, input) : eventsApi.create(input);
    },
    onSuccess: () => {
      toast(editing === 'new' ? 'Evento cadastrado.' : 'Evento atualizado.', 'success');
      close();
      invalidate();
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => eventsApi.remove(id),
    onSuccess: () => {
      setToDelete(null);
      toast('Evento removido.');
      invalidate();
    },
    onError: (e) => toast(errorMessage(e), 'danger'),
  });

  return (
    <div>
      <PageHeader
        title="Feiras e cursos"
        description="O que você publicar aparece para todos na página Feiras e cursos, até o dia em que o evento termina."
        actions={!editing && <Button onClick={() => open('new')}>Novo evento</Button>}
      />

      {editing && (
        <Card className="mb-8">
          <h2 className="mb-5 text-lg font-bold">{editing === 'new' ? 'Novo evento' : 'Editar evento'}</h2>
          <form noValidate className="grid gap-5 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
            <Field label="Tipo" required>
              {({ id }) => (
                <Select id={id} {...form.register('kind')}>
                  <option value="FAIR">{EVENT_KIND_LABEL.FAIR}</option>
                  <option value="COURSE">{EVENT_KIND_LABEL.COURSE}</option>
                </Select>
              )}
            </Field>
            <Field label="Título" error={errors.title?.message} required>
              {({ id, invalid }) => <Input id={id} maxLength={150} invalid={invalid} {...form.register('title')} />}
            </Field>
            <Field label="Início" error={errors.starts_at?.message} required>
              {({ id, invalid }) => <Input id={id} type="datetime-local" invalid={invalid} {...form.register('starts_at')} />}
            </Field>
            <Field label="Fim" error={errors.ends_at?.message} hint="Opcional.">
              {({ id, invalid }) => <Input id={id} type="datetime-local" invalid={invalid} {...form.register('ends_at')} />}
            </Field>
            <Field label="Local" error={errors.location?.message} required>
              {({ id, invalid }) => <Input id={id} maxLength={200} placeholder="Ex.: Ginásio Municipal, Rua Principal, 100" invalid={invalid} {...form.register('location')} />}
            </Field>
            <Field label="Bairro" error={errors.bairro?.message} hint="Opcional.">
              {({ id, invalid }) => (
                <Select id={id} invalid={invalid} {...form.register('bairro')}>
                  <option value="">Não informar</option>
                  {BAIRROS_SAQUAREMA.map((b) => <option key={b} value={b}>{b}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Descrição" error={errors.description?.message} className="sm:col-span-2" required>
              {({ id, invalid }) => <Textarea id={id} rows={5} maxLength={2000} invalid={invalid} {...form.register('description')} />}
            </Field>
            <Field label="Link de informações ou inscrição" error={errors.link?.message} className="sm:col-span-2" hint="Opcional. Começa com https://">
              {({ id, invalid }) => <Input id={id} type="url" inputMode="url" maxLength={300} invalid={invalid} {...form.register('link')} />}
            </Field>
            <div className="sm:col-span-2">
              <Checkbox label="Publicado (desmarque para guardar como rascunho)" {...form.register('published')} />
            </div>
            <div className="sm:col-span-2"><ApiErrorAlert error={save.error} /></div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={save.isPending}>{editing === 'new' ? 'Cadastrar' : 'Salvar'}</Button>
              <Button type="button" variant="secondary" onClick={close} disabled={save.isPending}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      {list.isPending ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.data.length === 0 ? (
        <EmptyState title="Nenhum evento cadastrado" description='Clique em "Novo evento" para divulgar a primeira feira ou curso.' />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {list.data.data.map((e) => (
              <li key={e.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={e.kind === 'FAIR' ? 'primary' : 'green'}>{EVENT_KIND_LABEL[e.kind]}</Badge>
                    <Badge tone={e.published ? 'success' : 'warning'}>{e.published ? 'Publicado' : 'Rascunho'}</Badge>
                  </div>
                  <p className="mt-2 font-bold"><SafeText>{e.title}</SafeText></p>
                  <p className="text-sm text-muted">{formatEventWhen(e)} · <SafeText>{e.location}</SafeText></p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => open(e)}>Editar</Button>
                  <Button size="sm" variant="danger" onClick={() => setToDelete(e)}>Remover</Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6"><Pagination page={page} totalPages={list.data.meta.total_pages} onChange={setPage} /></div>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Remover este evento?"
        description="Ele deixa de aparecer na página pública. Não dá para desfazer."
        confirmLabel="Remover"
        loading={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
