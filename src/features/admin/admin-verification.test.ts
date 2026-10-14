import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { adminApi } from '@/api/endpoints';

describe('Admin Verification Document Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('solicita o blob do documento para a URL correta com id escapado', async () => {
    const mockBlob = new Blob(['%PDF-1.4 test content'], { type: 'application/pdf' });
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/pdf' }),
      blob: async () => mockBlob,
    } as unknown as Response;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const result = await adminApi.getVerificationDocument('empresa/123');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const firstCall = fetchSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const calledUrl = String(firstCall?.[0]);
    expect(calledUrl).toContain('/admin/companies/empresa%2F123/verification-document');
    expect(result).toBe(mockBlob);

  });

  it('propaga exceção de erro quando a resposta é 403 ou 404', async () => {
    const errorResponse = {
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'Acesso negado' }),
    } as unknown as Response;

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse);

    await expect(adminApi.getVerificationDocument('emp-1')).rejects.toThrow();
  });
});
