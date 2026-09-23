import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/api/endpoints';
import type { ChatMessage, ChatRoomSummary } from '@/api/types';
import { useSession } from '@/auth/useAuth';
import { Alert, Badge, Button, EmptyState, PageHeader, Spinner, Textarea, cx } from '@/components/ui';
import { ErrorState, SafeText, isPendingEndpoint } from '@/components/feedback';
import { formatTime, relativeDate } from '@/lib/format';
import { chatLink, parseChatTarget, type ChatTarget } from './chatLink';
import { useChatSocket } from './useChatSocket';

const MAX_LEN = 2000;
// Espelha o limite do gateway (5 msgs / 10s) para dar feedback antes de o back rejeitar.
const RATE = { max: 5, windowMs: 10_000 };

export default function ChatPage() {
  const session = useSession();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const target = parseChatTarget(sp);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [live, setLive] = useState<ChatMessage[]>([]);
  const roomRef = useRef<string | null>(null);
  roomRef.current = roomId;

  const rooms = useQuery({ queryKey: ['chat', 'rooms'], queryFn: ({ signal }) => chatApi.rooms(signal), retry: false });
  const history = useQuery({
    queryKey: ['chat', 'messages', roomId],
    queryFn: ({ signal }) => chatApi.messages(roomId!, signal),
    enabled: !!roomId,
    retry: false,
    staleTime: Infinity,
  });

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
  const socket = useChatSocket(onMessage);

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
        void chatApi.markRead(id).then(() => qc.invalidateQueries({ queryKey: ['chat', 'unread'] })).catch(() => {});
      })
      .catch(() => !cancelled && setJoinError('Não foi possível abrir a conversa. A conversa só existe quando há uma candidatura para a vaga.'));
    return () => {
      cancelled = true;
    };
  }, [targetKey, socket.status]);

  const messages = mergeMessages(history.data ?? [], live);
  const openRoom = (r: ChatRoomSummary) => setSp(new URLSearchParams(chatLink({ jobId: r.job_id, employerId: r.employer_id, candidateId: r.candidate_id }).split('?')[1]));

  return (
    <div>
      <PageHeader title="Mensagens" actions={<ConnectionBadge status={socket.status} />} />
      {socket.status === 'unauthorized' && <Alert tone="danger">Não foi possível autenticar no chat. Entre novamente.</Alert>}
      <div className="grid min-h-[60vh] gap-4 lg:grid-cols-[18rem_1fr]">
        <aside aria-label="Conversas" className="rounded-xl border border-border bg-surface p-2">
          {rooms.isPending ? (
            <div className="p-4"><Spinner label="Carregando conversas" /></div>
          ) : rooms.isError ? (
            isPendingEndpoint(rooms.error) ? (
              <p className="p-3 text-xs text-muted">
                A lista de conversas depende de <code className="font-mono">GET /chat/rooms</code> (pendente no back). Abra uma conversa pelas candidaturas.
              </p>
            ) : (
              <ErrorState error={rooms.error} onRetry={() => void rooms.refetch()} />
            )
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

        <section aria-label="Conversa" className="flex min-h-[60vh] flex-col rounded-xl border border-border bg-surface">
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
              historyPending={history.isError && isPendingEndpoint(history.error)}
              historyLoading={history.isPending}
              socket={socket}
              target={target}
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

function Conversation({
  roomId,
  messages,
  myId,
  historyPending,
  historyLoading,
  socket,
}: {
  roomId: string;
  messages: ChatMessage[];
  myId: string;
  historyPending: boolean;
  historyLoading: boolean;
  socket: ReturnType<typeof useChatSocket>;
  target: ChatTarget;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const sentAt = useRef<number[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    if (content.length > MAX_LEN) return setLocalError(`Máximo de ${MAX_LEN} caracteres.`);
    const now = Date.now();
    sentAt.current = sentAt.current.filter((t) => now - t < RATE.windowMs);
    if (sentAt.current.length >= RATE.max) return setLocalError('Aguarde alguns segundos antes de enviar mais mensagens.');
    setLocalError(null);
    socket.clearError();
    setSending(true);
    try {
      await socket.send(roomId, content);
      sentAt.current.push(now);
      setText('');
    } catch {
      setLocalError('Mensagem não enviada. Verifique a conexão e tente novamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4" aria-live="polite" aria-relevant="additions">
        {historyPending && <p className="mb-3 text-center text-xs text-muted">Histórico indisponível (GET /chat/room/:id/messages pendente no back). Mostrando apenas mensagens desta sessão.</p>}
        {historyLoading && <div className="flex justify-center"><Spinner /></div>}
        {messages.length === 0 && !historyLoading && <p className="py-10 text-center text-sm text-muted">Nenhuma mensagem ainda. Diga olá!</p>}
        <ol className="flex flex-col gap-2">
          {messages.map((m) => {
            const mine = m.sender_id === myId;
            return (
              <li key={m.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
                <div className={cx('max-w-[75%] rounded-2xl px-3.5 py-2 text-sm', mine ? 'rounded-br-sm bg-primary text-primary-fg' : 'rounded-bl-sm bg-surface-2')}>
                  <SafeText as="p" className="whitespace-pre-wrap break-words">{m.content}</SafeText>
                  <p className={cx('mt-1 text-right text-[10px]', mine ? 'opacity-80' : 'text-muted')}>{formatTime(m.created_at)}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => void submit(e)} className="border-t border-border p-3">
        {(localError || socket.lastError) && <p className="mb-2 text-xs text-danger" role="alert">{localError ?? socket.lastError}</p>}
        <div className="flex items-end gap-2">
          <Textarea
            aria-label="Mensagem"
            rows={2}
            maxLength={MAX_LEN}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter quebra linha)"
            className="resize-none"
          />
          <Button type="submit" loading={sending} disabled={!text.trim() || socket.status !== 'connected'}>Enviar</Button>
        </div>
      </form>
    </>
  );
}
