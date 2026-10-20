import { afterEach, describe, expect, it, vi } from 'vitest';
import { companiesApi, jobsApi } from '@/api/endpoints';
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

const ID = '2d19c71e-cd1f-43d7-bd6e-8d879913659c';

function firstCall(spy: ReturnType<typeof vi.spyOn>) {
  const call = spy.mock.calls[0] as [RequestInfo | URL, RequestInit | undefined] | undefined;
  expect(call).toBeDefined();
  return { url: String(call?.[0]), init: call?.[1] };
}

describe('companiesApi.get', () => {
  afterEach(() => vi.restoreAllMocks());

  it('busca a empresa pelo id, por GET e sem Authorization (página pública)', async () => {
    const body = { id: ID, nome_fantasia: 'Padaria', logo_url: null, endereco: null, active_jobs_count: 2 };
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, body));

    const res = await companiesApi.get(ID);

    const { url, init } = firstCall(spy);
    expect(url).toContain(`/companies/${ID}`);
    expect((init?.method ?? 'GET').toUpperCase()).toBe('GET');
    expect(new Headers(init?.headers).has('authorization')).toBe(false);
    expect(res).toEqual(body);
  });

  it('escapa o id no caminho (nunca deixa "../" virar outra rota)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, {}));
    await companiesApi.get('../admin/users');
    expect(firstCall(spy).url).toContain('/companies/..%2Fadmin%2Fusers');
  });

  it('empresa pendente ou inexistente vira ApiError 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(404, { message: 'Empresa não encontrada.' }));
    const err = await companiesApi.get(ID).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
  });
});

describe('jobsApi.list com employer_id', () => {
  afterEach(() => vi.restoreAllMocks());

  it('manda employer_id na query junto da paginação', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { data: [], meta: { total_items: 0, total_pages: 0, current_page: 1, per_page: 10 } }));
    await jobsApi.list({ employer_id: ID, page: 2, limit: 10 });
    const url = new URL(firstCall(spy).url, 'http://x');
    expect(url.searchParams.get('employer_id')).toBe(ID);
    expect(url.searchParams.get('page')).toBe('2');
  });
});
