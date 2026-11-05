import { describe, expect, it, vi } from 'vitest';
import { buildReport, createReporter, sanitizeUrlPath } from './errorReport';

describe('sanitizeUrlPath', () => {
  it('remove query e hash (podem ter token)', () => {
    expect(sanitizeUrlPath('https://x.com/redefinir-senha?token=abc#frag')).toBe('/redefinir-senha');
  });
  it('não quebra com lixo', () => {
    expect(sanitizeUrlPath('http://')).toBe('/');
  });
});

describe('buildReport', () => {
  it('aceita Error, string e valores estranhos', () => {
    expect(buildReport(new Error('boom'), 'window', 'https://x.com/a?b=1').message).toBe('boom');
    expect(buildReport('texto', 'promise', 'https://x.com/').message).toBe('texto');
    expect(buildReport({ a: 1 }, 'promise', 'https://x.com/').message).toBe('Erro desconhecido');
  });
  it('limita o tamanho da mensagem e não leva a query', () => {
    const r = buildReport(new Error('x'.repeat(5000)), 'boundary', 'https://x.com/p?token=1');
    expect(r.message.length).toBe(2000);
    expect(r.path).toBe('/p');
  });
});

describe('createReporter', () => {
  it('deduplica o mesmo erro', () => {
    const send = vi.fn();
    const report = createReporter(send);
    const e = new Error('igual');
    report(e, 'window', 'https://x.com/');
    report(e, 'window', 'https://x.com/');
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('respeita o teto por sessão', () => {
    const send = vi.fn();
    const report = createReporter(send, 3);
    for (let i = 0; i < 10; i++) report(new Error(`e${i}`), 'window', 'https://x.com/');
    expect(send).toHaveBeenCalledTimes(3);
  });
});
