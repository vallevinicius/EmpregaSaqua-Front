import { describe, expect, it } from 'vitest';
import { FAQ, filterFaq } from './faq';

describe('FAQ', () => {
  it('ids únicos e textos preenchidos', () => {
    expect(new Set(FAQ.map((i) => i.id)).size).toBe(FAQ.length);
    for (const i of FAQ) {
      expect(i.question.length).toBeGreaterThan(5);
      expect(i.answer.length).toBeGreaterThan(20);
    }
  });
  it('links internos começam com / (nunca URL externa)', () => {
    for (const i of FAQ) if (i.link) expect(i.link.to).toMatch(/^\/[^/]/);
  });
});

describe('filterFaq', () => {
  it('"all" mostra tudo', () => expect(filterFaq(FAQ, 'all', '')).toHaveLength(FAQ.length));
  it('candidato vê gerais + de candidato, sem as de empresa', () => {
    const r = filterFaq(FAQ, 'candidate', '');
    expect(r.every((i) => i.audience !== 'company')).toBe(true);
    expect(r.some((i) => i.audience === 'all')).toBe(true);
    expect(r.some((i) => i.audience === 'candidate')).toBe(true);
  });
  it('empresa vê gerais + de empresa, sem as de candidato', () => {
    expect(filterFaq(FAQ, 'company', '').every((i) => i.audience !== 'candidate')).toBe(true);
  });
  it('busca ignora acento, maiúscula e espaços nas pontas', () => {
    expect(filterFaq(FAQ, 'all', '  CURRICULO ').map((i) => i.id)).toContain('curriculo');
    expect(filterFaq(FAQ, 'all', 'confirmação').map((i) => i.id)).toContain('confirmar-email');
  });
  it('busca sem resultado volta lista vazia', () => expect(filterFaq(FAQ, 'all', 'xyzxyz')).toEqual([]));
  it('a busca respeita o público escolhido', () => {
    expect(filterFaq(FAQ, 'candidate', 'cnpj').map((i) => i.id)).not.toContain('cnpj');
  });
});
