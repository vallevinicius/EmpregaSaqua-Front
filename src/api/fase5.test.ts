import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminApi, analyticsApi, eventsApi, reportsApi } from '@/api/endpoints';

const res = (status: number, body: unknown, type = 'application/json'): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': type }),
    json: async () => body,
    blob: async () => new Blob([String(body)], { type }),
  }) as unknown as Response;

const call = (spy: ReturnType<typeof vi.spyOn>) => {
  const c = spy.mock.calls[0] as [RequestInfo | URL, RequestInit | undefined];
  return { url: String(c[0]), init: c[1] };
};

afterEach(() => vi.restoreAllMocks());

describe('contrato de indicadores', () => {
  it('manda o período na query e usa o token (rota de admin)', async () => {
    localStorage.clear();
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(200, {}));
    await analyticsApi.indicators({ from: '2026-01-01', to: '2026-03-31' });
    const { url } = call(spy);
    expect(url).toContain('/analytics/admin/indicators?');
    expect(url).toContain('from=2026-01-01');
    expect(url).toContain('to=2026-03-31');
  });
  it('CSV volta como Blob', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(200, 'secao;item;valor', 'text/csv'));
    const blob = await analyticsApi.indicatorsCsv({ from: '2026-01-01', to: '2026-03-31' });
    expect(blob).toBeInstanceOf(Blob);
  });
});

describe('contrato de feiras e cursos', () => {
  it('lista pública é sem login e filtra por tipo', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(200, []));
    await eventsApi.list('COURSE');
    const { url, init } = call(spy);
    expect(url).toContain('/events?kind=COURSE');
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
  });
  it('sem tipo, não manda o parâmetro', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(200, []));
    await eventsApi.list();
    expect(call(spy).url).not.toContain('kind=');
  });
  it('criar e editar vão para as rotas de admin', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(200, {}));
    await eventsApi.create({ kind: 'FAIR', title: 'Feira', description: 'Descrição longa', location: 'Ginásio', starts_at: '2026-12-05T13:00:00.000Z' });
    expect(call(spy).url).toContain('/admin/events');
    expect(call(spy).init?.method).toBe('POST');
    spy.mockClear();
    await eventsApi.update('a/b', { link: null });
    expect(call(spy).url).toContain('/admin/events/a%2Fb'); // id sempre via seg()
    expect(JSON.parse(String(call(spy).init?.body))).toEqual({ link: null });
  });
});

describe('contrato de denúncias', () => {
  it('denunciar envia vaga, motivo e justificativa', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(201, { id: '1', status: 'OPEN', created_at: 'x' }));
    await reportsApi.create({ job_id: 'j1', reason: 'SCAM', justification: 'Pedem depósito antes da entrevista.' });
    expect(call(spy).url).toContain('/reports');
    expect(JSON.parse(String(call(spy).init?.body))).toEqual({ job_id: 'j1', reason: 'SCAM', justification: 'Pedem depósito antes da entrevista.' });
  });
  it('denunciar empresa envia employer_id (e não job_id)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(201, { id: '1', status: 'OPEN', created_at: 'x' }));
    await reportsApi.create({ employer_id: 'u1', reason: 'SCAM', justification: 'Cobra taxa dos candidatos.' });
    const body = JSON.parse(String(call(spy).init?.body));
    expect(body).toEqual({ employer_id: 'u1', reason: 'SCAM', justification: 'Cobra taxa dos candidatos.' });
    expect(body).not.toHaveProperty('job_id');
  });
  it('admin suspende a empresa com suspend_company', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(200, {}));
    await adminApi.resolveReport('r1', { status: 'RESOLVED', suspend_company: true });
    expect(JSON.parse(String(call(spy).init?.body))).toEqual({ status: 'RESOLVED', suspend_company: true });
  });
  it('admin decide a denúncia com PATCH', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(200, {}));
    await adminApi.resolveReport('r1', { status: 'RESOLVED', remove_job: true });
    expect(call(spy).url).toContain('/admin/reports/r1');
    expect(call(spy).init?.method).toBe('PATCH');
  });
});
