import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { env } from '@/lib/env';
import { getToken } from '@/auth/session';
import type { ChatMessage } from '@/api/types';
import type { ChatTarget } from './chatLink';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'unauthorized';

interface Ack {
  status?: string;
  roomId?: string;
  messageId?: string;
}

/**
 * Conexão socket.io autenticada via handshake.auth.token (nunca via query string,
 * que vazaria o JWT em logs de proxy/servidor).
 * Só websocket: evita long-polling e o CORS '*' que o gateway expõe hoje.
 */
export function useChatSocket(onMessage: (m: ChatMessage) => void) {
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setStatus('unauthorized');
      return;
    }
    const socket = io(env.wsUrl || undefined, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 10_000,
      withCredentials: false,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      setLastError(null);
    });
    socket.on('disconnect', (reason) => {
      // "io server disconnect" = o back derrubou (token inválido/expirado): não reconectar em loop.
      setStatus(reason === 'io server disconnect' ? 'unauthorized' : 'disconnected');
    });
    socket.on('connect_error', () => setStatus('disconnected'));
    socket.on('exception', (e: unknown) => {
      const msg = typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string' ? (e as { message: string }).message : '';
      setLastError(/rate limit/i.test(msg) ? 'Você está enviando mensagens rápido demais. Aguarde alguns segundos.' : 'Não foi possível concluir a ação no chat.');
    });
    socket.on('newMessage', (m: unknown) => {
      if (isMessage(m)) handlerRef.current(m);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinRoom = async (t: ChatTarget): Promise<string> => {
    const s = socketRef.current;
    if (!s?.connected) throw new Error('Chat desconectado.');
    const ack = (await s.timeout(8000).emitWithAck('joinRoom', t)) as Ack;
    if (ack?.status !== 'joined' || typeof ack.roomId !== 'string') throw new Error('Não foi possível abrir a conversa.');
    return ack.roomId;
  };

  const send = async (roomId: string, content: string): Promise<void> => {
    const s = socketRef.current;
    if (!s?.connected) throw new Error('Chat desconectado.');
    const ack = (await s.timeout(8000).emitWithAck('sendMessage', { roomId, content })) as Ack;
    if (ack?.status !== 'sent') throw new Error('Mensagem não enviada.');
  };

  return { status, lastError, joinRoom, send, clearError: () => setLastError(null) };
}

function isMessage(m: unknown): m is ChatMessage {
  if (!m || typeof m !== 'object') return false;
  const o = m as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.room_id === 'string' && typeof o.sender_id === 'string' && typeof o.content === 'string';
}
