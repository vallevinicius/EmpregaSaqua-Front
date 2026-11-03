import { afterEach, describe, expect, it, vi } from 'vitest';
import { authApi, jobsApi } from '@/api/endpoints';
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

afterEach(() => vi.restoreAllMocks());

describe('cadastro exige CEP de Saquarema e CNPJ de empresa', () => {
  it('envia cep e cnpj no corpo do cadastro da empresa', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(201, { access_token: 't', user: { id: '1', email: 'a@a.com', role: 'EMPLOYER' } }));
    await authApi.register({ email: 'a@a.com', username: 'padaria', password: 'Senha1234', role: 'EMPLOYER', nome_fantasia: 'Padaria', cnpj: '11222333000181', cep: '28992621' });
    const { url, init } = firstCall(spy);
    expect(url).toContain('/auth/register');
    expect(JSON.parse(String(init?.body))).toMatchObject({ role: 'EMPLOYER', cnpj: '11222333000181', cep: '28992621' });
  });

  it('CEP de outra cidade volta como ApiError 400 com a mensagem do back', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(400, { message: 'Este site é exclusivo para moradores e empresas de Saquarema-RJ. O CEP informado é de outra cidade.' }));
    const err = await authApi
      .register({ email: 'a@a.com', username: 'ana', password: 'Senha1234', role: 'JOB_SEEKER', full_name: 'Ana', cep: '28987191' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).message).toMatch(/exclusivo.*Saquarema/);
  });
});

describe('vagas por bairro', () => {
  it('a busca manda o bairro na query', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { data: [], meta: { total_items: 0, total_pages: 0, current_page: 1, per_page: 10 } }));
    await jobsApi.list({ bairro: 'Porto da Roça I', page: 1, limit: 10 });
    const url = new URL(firstCall(spy).url, 'http://x');
    expect(url.searchParams.get('bairro')).toBe('Porto da Roça I');
  });

  it('publicar vaga envia o bairro no corpo', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(201, { id: 'j1' }));
    await jobsApi.create({
      title: 'Atendente', description: 'desc', bairro: 'Centro', address: 'Rua A, 10', work_schedule: '6x1',
      mandatory_qualifications: [], differential_qualifications: [], benefits: [], work_model: 'ON_SITE', contract_type: 'TEMPO_DETERMINADO',
    });
    expect(JSON.parse(String(firstCall(spy).init?.body))).toMatchObject({ bairro: 'Centro' });
  });
});
