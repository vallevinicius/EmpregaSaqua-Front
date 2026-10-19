import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/api/endpoints';
import type { ChatMessage, ChatRoomSummary } from '@/api/types';
import { useSession } from '@/auth/useAuth';
import { Alert, Badge, Button, ConfirmDialog, EmptyState, PageHeader, Spinner, Textarea, cx } from '@/components/ui';
import { ErrorState, SafeText, useToast } from '@/components/feedback';
import { formatTime, relativeDate } from '@/lib/format';
import { errorMessage } from '@/lib/http';
import { safeAssetUrl } from '@/lib/safe';
import { FileTextIcon, ImageSquareIcon, PaperclipIcon, PencilSimpleIcon, TrashIcon, XIcon } from '@/components/icons';
import { chatLink, parseChatTarget, type ChatTarget } from './chatLink';
import { useChatSocket, type Attachment } from './useChatSocket';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const MAX_ATTACHMENT_MB = 5;
const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

const MAX_LEN = 2000;
// Espelha o limite do gateway (5 msgs / 10s) para dar feedback antes de o back rejeitar.
const RATE = { max: 5, windowMs: 10_000 };
const PAGE_SIZE = 50;

export default function ChatPage() {
  useDocumentTitle("Mensagens");
  const session = useSession();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const target = parseChatTarget(sp);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [live, setLive] = useState<ChatMessage[]>([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherRead, setOtherRead] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Partial<ChatMessage>>>({});
  const roomRef = useRef<string | null>(null);
  roomRef.current = roomId;
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rooms = useQuery({ queryKey: ['chat', 'rooms'], queryFn: ({ signal }) => chatApi.rooms(signal), retry: false });
  const history = useInfiniteQuery({
    queryKey: ['chat', 'messages', roomId],
    queryFn: ({ pageParam, signal }) => chatApi.messages(roomId!, { before: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: undefined as string | undefined,
    // Página cheia = pode ter mais antigas; página incompleta = chegou no início da conversa.
    getNextPageParam: (lastPage) => (lastPage.length === PAGE_SIZE ? lastPage[0]?.created_at : undefined),
    enabled: !!roomId,
    retry: false,
    staleTime: Infinity,
  });
  // Páginas vêm da mais recente pra mais antiga; cada página já é cronológica por dentro.
  const historyMessages = history.data ? [...history.data.pages].reverse().flat() : [];

  const onMessage = useCallback(
    (m: ChatMessage) => {
      if (m.room_id === roomRef.current) {
        setLive((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.sender_id !== session?.user.id) void chatApi.markRead(m.room_id).catch(() => {});
      }
      void qc.invalidateQueries({ queryKey: ['chat', 'rooms'] });
      void qc.invalidateQueries({ queryKey: ['chat', 'unread'] });
    },
    [qc, session?.user.id],
  );
  const onTyping = useCallback((e: { roomId: string; userId: string }) => {
    if (e.roomId !== roomRef.current) return;
    setOtherTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000);
  }, []);
  const onRead = useCallback(
    (e: { roomId: string; readBy: string }) => {
      if (e.roomId !== roomRef.current || e.readBy === session?.user.id) return;
      setOtherRead(true);
    },
    [session?.user.id],
  );
  const onEdited = useCallback((m: ChatMessage) => {
    if (m.room_id !== roomRef.current) return;
    setOverrides((prev) => ({ ...prev, [m.id]: m }));
  }, []);
  const onDeleted = useCallback((e: { roomId: string; messageId: string }) => {
    if (e.roomId !== roomRef.current) return;
    setOverrides((prev) => ({
      ...prev,
      [e.messageId]: { content: '', attachment_url: null, attachment_name: null, attachment_type: null, deleted_at: new Date().toISOString() },
    }));
  }, []);
  const socket = useChatSocket(onMessage, onTyping, onRead, onEdited, onDeleted);

  // Abre a sala a partir do alvo da URL (vaga + empresa + candidato), quando o socket conecta.
  const targetKey = target ? `${target.jobId}:${target.employerId}:${target.candidateId}` : '';
  useEffect(() => {
    if (!target || socket.status !== 'connected') return;
    if (session && target.candidateId !== session.user.id && target.employerId !== session.user.id) {
      setJoinError('Você não participa desta conversa.');
      return;
    }
    let cancelled = false;
    setJoinError(null);
    socket
      .joinRoom(target)
      .then((id) => {
        if (cancelled) return;
        setRoomId(id);
        setLive([]);
        setOtherTyping(false);
        setOtherRead(false);
        setOverrides({});
        void chatApi.markRead(id).then(() => qc.invalidateQueries({ queryKey: ['chat', 'unread'] })).catch(() => {});
      })
      .catch(() => !cancelled && setJoinError('Não foi possível abrir a conversa.'));
    return () => {
      cancelled = true;
    };
  }, [targetKey, socket.status]);

  const messages = mergeMessages(historyMessages, live).map((m) => (overrides[m.id] ? { ...m, ...overrides[m.id] } : m));
  const openRoom = (r: ChatRoomSummary) => setSp(new URLSearchParams(chatLink({ jobId: r.job_id ?? undefined, employerId: r.employer_id, candidateId: r.candidate_id }).split('?')[1]));

  return (
    <div>
      <PageHeader title="Mensagens" actions={<ConnectionBadge status={socket.status} />} />
      {socket.status === 'unauthorized' && <Alert tone="danger">Não foi possível autenticar no chat. Entre novamente.</Alert>}
      <div className="grid min-h-[60vh] gap-4 lg:grid-cols-[18rem_1fr]">
        <aside aria-label="Conversas" className="rounded-2xl border border-border bg-surface shadow-card p-2">
          {rooms.isPending ? (
            <div className="p-4"><Spinner label="Carregando conversas" /></div>
          ) : rooms.isError ? (
            <ErrorState error={rooms.error} onRetry={() => void rooms.refetch()} />
          ) : rooms.data.length === 0 ? (
            <p className="p-3 text-sm text-muted">Nenhuma conversa ainda.</p>
          ) : (
            <ul className="flex flex-col">
              {rooms.data.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openRoom(r)}
                    className={cx('flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-surface-2', r.id === roomId && 'bg-primary-soft')}
                  >
                    <span className="flex w-full items-center gap-2">
                      <span className="truncate text-sm font-medium"><SafeText>{r.counterpart_name}</SafeText></span>
                      {r.unread_count > 0 && <span className="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">{r.unread_count}</span>}
                    </span>
                    <span className="w-full truncate text-xs text-muted"><SafeText>{r.job_title}</SafeText></span>
                    {r.last_message && <span className="w-full truncate text-xs text-muted"><SafeText>{r.last_message.content}</SafeText> · {relativeDate(r.last_message.created_at)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section aria-label="Conversa" className="flex min-h-[60vh] flex-col rounded-2xl border border-border bg-surface shadow-card">
          {!target ? (
            <div className="m-auto p-6"><EmptyState title="Selecione uma conversa" description="Você também pode iniciar uma conversa a partir de uma candidatura." /></div>
          ) : joinError ? (
            <div className="p-4"><Alert tone="danger">{joinError}</Alert></div>
          ) : !roomId ? (
            <div className="m-auto"><Spinner label="Abrindo conversa…" /></div>
          ) : (
            <Conversation
              roomId={roomId}
              messages={messages}
              myId={session?.user.id ?? ''}
              historyPending={history.isError}
              historyLoading={history.isPending}
              socket={socket}
              target={target}
              otherTyping={otherTyping}
              otherRead={otherRead}
              onSent={() => setOtherRead(false)}
              hasOlder={!!history.hasNextPage}
              loadingOlder={history.isFetchingNextPage}
              onLoadOlder={() => void history.fetchNextPage()}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function mergeMessages(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of [...a, ...b]) map.set(m.id, m);
  return [...map.values()].sort((x, y) => x.created_at.localeCompare(y.created_at));
}

function ConnectionBadge({ status }: { status: string }) {
  if (status === 'connected') return <Badge tone="success">Conectado</Badge>;
  if (status === 'connecting') return <Badge tone="neutral">Conectando…</Badge>;
  return <Badge tone="danger">Desconectado</Badge>;
}

const TYPING_THROTTLE_MS = 1500;

function Conversation({
  roomId,
  messages,
  myId,
  historyPending,
  historyLoading,
  socket,
  otherTyping,
  otherRead,
  onSent,
  hasOlder,
  loadingOlder,
  onLoadOlder,
}: {
  roomId: string;
  messages: ChatMessage[];
  myId: string;
  historyPending: boolean;
  historyLoading: boolean;
  socket: ReturnType<typeof useChatSocket>;
  target: ChatTarget;
  otherTyping: boolean;
  otherRead: boolean;
  onSent: () => void;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);
  const toast = useToast();
  const sentAt = useRef<number[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingEmitRef = useRef(0);

  // Rola pro fim só quando a ÚLTIMA mensagem muda (nova mensagem chegou) — carregar mensagens
  // antigas insere no início e não deve puxar a tela pra baixo.
  const lastMessageId = messages[messages.length - 1]?.id;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lastMessageId, otherTyping]);

  // Ao inserir mensagens mais antigas no início, mantém a posição visual (sem isso, a tela "pula").
  const firstMessageId = messages[0]?.id;
  const prevFirstIdRef = useRef(firstMessageId);
  const prevScrollHeightRef = useRef(0);
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (container && prevFirstIdRef.current !== firstMessageId && prevScrollHeightRef.current) {
      container.scrollTop += container.scrollHeight - prevScrollHeightRef.current;
    }
    prevFirstIdRef.current = firstMessageId;
  }, [firstMessageId]);

  const handleLoadOlder = () => {
    if (scrollContainerRef.current) prevScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
    onLoadOlder();
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const content = text.trim();
    if ((!content && !attachment) || sending) return;
    if (content.length > MAX_LEN) return setLocalError(`Máximo de ${MAX_LEN} caracteres.`);
    const now = Date.now();
    sentAt.current = sentAt.current.filter((t) => now - t < RATE.windowMs);
    if (sentAt.current.length >= RATE.max) return setLocalError('Aguarde alguns segundos antes de enviar mais mensagens.');
    setLocalError(null);
    socket.clearError();
    setSending(true);
    try {
      await socket.send(roomId, content, attachment ?? undefined);
      sentAt.current.push(now);
      setText('');
      setAttachment(null);
      onSent();
    } catch {
      setLocalError('Mensagem não enviada. Verifique a conexão e tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const onTextChange = (value: string) => {
    setText(value);
    const now = Date.now();
    if (now - lastTypingEmitRef.current > TYPING_THROTTLE_MS) {
      lastTypingEmitRef.current = now;
      socket.typing(roomId);
    }
  };

  const onFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return setLocalError('Envie uma imagem (JPEG, PNG, WebP, GIF) ou um PDF.');
    }
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      return setLocalError(`O arquivo excede o tamanho máximo de ${MAX_ATTACHMENT_MB}MB.`);
    }
    setLocalError(null);
    setUploading(true);
    try {
      const res = await chatApi.uploadAttachment(file);
      setAttachment({ url: res.url, name: file.name, type: res.type });
    } catch (err) {
      setLocalError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (m: ChatMessage) => {
    setEditingId(m.id);
    setEditText(m.content);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const content = editText.trim();
    if (!content) return;
    try {
      await socket.editMessage(editingId, content);
      setEditingId(null);
    } catch (err) {
      toast(errorMessage(err), 'danger');
    }
  };

  const confirmDelete = async () => {
    if (!toDeleteId) return;
    try {
      await socket.deleteMessage(toDeleteId);
    } catch (err) {
      toast(errorMessage(err), 'danger');
    } finally {
      setToDeleteId(null);
    }
  };

  const lastMineId = [...messages].reverse().find((m) => m.sender_id === myId)?.id;

  return (
    <>
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4" aria-live="polite" aria-relevant="additions">
        {historyPending && <p className="mb-3 text-center text-xs text-muted">Não foi possível carregar o histórico desta conversa. Mostrando apenas as mensagens desta sessão.</p>}
        {historyLoading && <div className="flex justify-center"><Spinner /></div>}
        {messages.length === 0 && !historyLoading && <p className="py-10 text-center text-sm text-muted">Nenhuma mensagem ainda. Diga olá!</p>}
        {hasOlder && !historyLoading && (
          <div className="mb-3 flex justify-center">
            <Button variant="secondary" size="sm" loading={loadingOlder} onClick={handleLoadOlder}>
              Carregar mensagens mais antigas
            </Button>
          </div>
        )}
        <ol className="flex flex-col gap-2">
          {messages.map((m) => {
            const mine = m.sender_id === myId;
            const showSeen = mine && m.id === lastMineId && otherRead;
            const deleted = !!m.deleted_at;
            const editing = editingId === m.id;
            return (
              <li key={m.id} className={cx('group flex items-center gap-1.5', mine ? 'justify-end' : 'justify-start')}>
                {mine && !deleted && !editing && (
                  <span className="hidden items-center gap-0.5 group-hover:flex">
                    <button type="button" onClick={() => startEdit(m)} aria-label="Editar mensagem" className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
                      <PencilSimpleIcon size={14} />
                    </button>
                    <button type="button" onClick={() => setToDeleteId(m.id)} aria-label="Apagar mensagem" className="rounded-full p-1.5 text-muted hover:bg-danger-soft hover:text-danger">
                      <TrashIcon size={14} />
                    </button>
                  </span>
                )}
                <div className={cx('max-w-[75%] rounded-2xl px-3.5 py-2 text-sm', mine ? 'rounded-br-sm bg-primary text-primary-fg' : 'rounded-bl-sm bg-surface-2')}>
                  {deleted ? (
                    <p className={cx('italic', mine ? 'text-primary-fg/70' : 'text-muted')}>Mensagem apagada</p>
                  ) : editing ? (
                    <div className="flex min-w-[14rem] flex-col gap-2">
                      <Textarea
                        aria-label="Editar mensagem"
                        rows={2}
                        maxLength={MAX_LEN}
                        value={editText}
                        autoFocus
                        onChange={(e) => setEditText(e.target.value)}
                        className="resize-none bg-surface text-fg"
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                        <Button type="button" size="sm" onClick={() => void saveEdit()} disabled={!editText.trim()}>Salvar</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {m.attachment_url && (
                        <MessageAttachment url={m.attachment_url} name={m.attachment_name} type={m.attachment_type} mine={mine} />
                      )}
                      {m.content && <SafeText as="p" className="mt-1 whitespace-pre-wrap break-words first:mt-0">{m.content}</SafeText>}
                    </>
                  )}
                  {!editing && (
                    <p className={cx('mt-1 text-right text-[10px]', mine ? 'opacity-80' : 'text-muted')}>
                      {formatTime(m.created_at)}
                      {!deleted && m.edited_at && ' · editada'}
                      {showSeen && ' · Visto'}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {otherTyping && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
            <span className="flex gap-0.5">
              <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted" />
            </span>
            digitando…
          </p>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => void submit(e)} className="border-t border-border p-3">
        {(localError || socket.lastError) && <p className="mb-2 text-xs text-danger" role="alert">{localError ?? socket.lastError}</p>}
        {attachment && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
            {attachment.type === 'image' ? <ImageSquareIcon size={16} className="shrink-0 text-muted" /> : <FileTextIcon size={16} className="shrink-0 text-muted" />}
            <span className="truncate">{attachment.name}</span>
            <button type="button" onClick={() => setAttachment(null)} aria-label="Remover anexo" className="ml-auto shrink-0 rounded-full p-1 hover:bg-surface">
              <XIcon size={14} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept={ALLOWED_ATTACHMENT_TYPES.join(',')} className="hidden" onChange={(e) => void onFileSelected(e)} />
          <Button
            type="button"
            variant="ghost"
            size="md"
            loading={uploading}
            disabled={!!attachment}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Anexar arquivo"
          >
            <PaperclipIcon size={18} />
          </Button>
          <Textarea
            aria-label="Mensagem"
            rows={2}
            maxLength={MAX_LEN}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter quebra linha)"
            className="resize-none"
          />
          <Button type="submit" loading={sending} disabled={(!text.trim() && !attachment) || socket.status !== 'connected'}>Enviar</Button>
        </div>
      </form>

      <ConfirmDialog
        open={!!toDeleteId}
        title="Apagar mensagem?"
        description="Quem está na conversa vai ver que a mensagem foi apagada. Isso não pode ser desfeito."
        confirmLabel="Apagar"
        onConfirm={() => void confirmDelete()}
        onClose={() => setToDeleteId(null)}
      />
    </>
  );
}

function MessageAttachment({ url, name, type, mine }: { url: string; name?: string | null; type?: string | null; mine: boolean }) {
  const safeUrl = safeAssetUrl(url);
  if (!safeUrl) return null;
  if (type === 'image') {
    return (
      <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg">
        <img src={safeUrl} alt={name ?? 'Anexo'} className="max-h-56 w-full object-cover" />
      </a>
    );
  }
  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium underline-offset-2 hover:underline',
        mine ? 'bg-primary-fg/10' : 'bg-surface',
      )}
    >
      <FileTextIcon size={18} className="shrink-0" />
      <span className="truncate"><SafeText>{name ?? 'Documento'}</SafeText></span>
    </a>
  );
}
