import { describe, expect, it } from 'vitest';
import { defaultRange, formatMonthKey, labelRows, validateRange } from './indicators';

describe('labelRows', () => {
  it('traduz o que conhece e mantém o resto como veio', () => {
    expect(labelRows([{ label: 'HIRED', count: 3 }, { label: 'NOVO', count: 1 }], { HIRED: 'Contratado' })).toEqual([
      { label: 'Contratado', value: 3 },
      { label: 'NOVO', value: 1 },
    ]);
  });
  it('lista vazia = vazia', () => expect(labelRows([], {})).toEqual([]));
});

describe('defaultRange', () => {
  it('12 meses: do 1º dia de 11 meses atrás até hoje, atravessando o ano', () => {
    expect(defaultRange(new Date(2026, 10, 4))).toEqual({ from: '2025-12-01', to: '2026-11-04' });
    expect(defaultRange(new Date(2026, 0, 15))).toEqual({ from: '2025-02-01', to: '2026-01-15' });
  });
});

describe('validateRange', () => {
  it('aceita período normal e o limite de 5 anos', () => {
    expect(validateRange('2026-01-01', '2026-03-31')).toBeNull();
    expect(validateRange('2021-12-01', '2026-11-30')).toBeNull(); // 60 meses
  });
  it('recusa vazio, invertido e maior que 5 anos', () => {
    expect(validateRange('', '2026-03-31')).toMatch(/duas datas/);
    expect(validateRange('2026-03-02', '2026-03-01')).toMatch(/depois da final/);
    expect(validateRange('2020-01-01', '2026-01-01')).toMatch(/5 anos/);
  });
});

describe('formatMonthKey', () => {
  it('formata e não quebra com lixo', () => {
    expect(formatMonthKey('2026-03')).toBe('mar/2026');
    expect(formatMonthKey('2026-13')).toBe('2026-13');
  });
});
