import { describe, expect, it } from 'vitest';
import { profileCompleteness } from './profile';
import { formatCnpj, formatMonthYear } from './format';

describe('profileCompleteness', () => {
  it('perfil vazio = 0% e lista tudo que falta', () => {
    const r = profileCompleteness(null);
    expect(r.percent).toBe(0);
    expect(r.missing).toHaveLength(7);
  });
  it('conta o que já foi preenchido', () => {
    const r = profileCompleteness({ full_name: 'Joana', telefone: '22999999999', skills: ['Excel'] });
    expect(r.percent).toBe(Math.round((3 / 7) * 100));
    expect(r.missing).not.toContain('nome completo');
    expect(r.missing).toContain('experiência profissional');
  });
  it('ignora espaços em branco', () => {
    expect(profileCompleteness({ full_name: '   ' }).percent).toBe(0);
  });
  it('perfil completo = 100%', () => {
    const r = profileCompleteness({ full_name: 'a', telefone: '1', address: 'b', bio: 'c', skills: [1], experiences: [1], educations: [1] });
    expect(r).toEqual({ percent: 100, missing: [] });
  });
});

describe('formatCnpj', () => {
  it('aplica a máscara progressivamente', () => {
    expect(formatCnpj('12')).toBe('12');
    expect(formatCnpj('12345')).toBe('12.345');
    expect(formatCnpj('12345678')).toBe('12.345.678');
    expect(formatCnpj('123456780001')).toBe('12.345.678/0001');
    expect(formatCnpj('12345678000190')).toBe('12.345.678/0001-90');
  });
  it('ignora letras e corta em 14 dígitos', () => {
    expect(formatCnpj('12.345.678/0001-90999')).toBe('12.345.678/0001-90');
    expect(formatCnpj('ab')).toBe('');
  });
});

describe('formatMonthYear', () => {
  it('sem data = Atual', () => expect(formatMonthYear('')).toBe('Atual'));
  it('formata AAAA-MM', () => expect(formatMonthYear('2022-03')).toMatch(/mar.*2022/i));
  it('valor inválido volta cru', () => expect(formatMonthYear('abc')).toBe('abc'));
});
