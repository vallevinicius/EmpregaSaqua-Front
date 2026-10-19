import { describe, it, expect, vi, afterEach } from 'vitest';
import { authApi } from '@/api/endpoints';
import { ApiError } from '@/lib/http';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function firstCall(spy: ReturnType<typeof vi.spyOn>) {
  const call = spy.mock.calls[0] as [RequestInfo | URL, RequestInit | undefined] | undefined;
  expect(call).toBeDefined();
  return { url: String(call?.[0]), init: call?.[1] };
}

describe('authApi — verificação de e-mail', () => {
  afterEach(() => vi.restoreAllMocks());

  it('verifyEmail envia o token por POST sem Authorization', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { message: 'E-mail confirmado.' }));

    const res = await authApi.verifyEmail('tok-123');

    const { url, init } = firstCall(spy);
    expect(url).toContain('/auth/verify-email');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ token: 'tok-123' });
    expect(new Headers(init?.headers).has('authorization')).toBe(false);
    expect(res.message).toBe('E-mail confirmado.');
  });

  it('verifyEmail rejeita com ApiError quando o token é inválido ou expirado', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(400, { message: 'Token inválido ou expirado.' }));

    const err = await authApi.verifyEmail('ruim').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
  });

  it('resendVerification envia o identificador por POST sem Authorization', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { message: 'Se existir, enviamos.' }));

    await authApi.resendVerification('ana@exemplo.com');

    const { url, init } = firstCall(spy);
    expect(url).toContain('/auth/resend-verification');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ identifier: 'ana@exemplo.com' });
    expect(new Headers(init?.headers).has('authorization')).toBe(false);
  });

  it('login com e-mail não verificado expõe o código EMAIL_NOT_VERIFIED', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(403, { message: 'Confirme seu e-mail.', code: 'EMAIL_NOT_VERIFIED' }),
    );

    const err = await authApi.login('ana@exemplo.com', 'Senha@123').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('EMAIL_NOT_VERIFIED');
  });
});
