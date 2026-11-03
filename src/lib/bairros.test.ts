import { describe, expect, it } from 'vitest';
import { BAIRROS_DESTAQUE, BAIRROS_SAQUAREMA, isBairro, isSaquarema } from './bairros';

describe('BAIRROS_SAQUAREMA', () => {
  it('tem os 46 bairros oficiais, sem repetição', () => {
    expect(BAIRROS_SAQUAREMA).toHaveLength(46);
    expect(new Set(BAIRROS_SAQUAREMA).size).toBe(46);
  });
  it('está em ordem alfabética (pt-BR), com as áreas rurais no fim', () => {
    const regulares = BAIRROS_SAQUAREMA.filter((b) => !b.startsWith('Área Rural'));
    expect([...regulares].sort((a, b) => a.localeCompare(b, 'pt-BR'))).toEqual(regulares);
    expect(BAIRROS_SAQUAREMA.slice(-3).every((b) => b.startsWith('Área Rural'))).toBe(true);
  });
  it('os atalhos da home são bairros da lista', () => {
    for (const b of BAIRROS_DESTAQUE) expect(isBairro(b)).toBe(true);
  });
});

describe('isBairro', () => {
  it('aceita só o nome exato da lista', () => {
    expect(isBairro('Centro')).toBe(true);
    expect(isBairro('Porto da Roça II')).toBe(true);
    expect(isBairro('centro')).toBe(false);
    expect(isBairro('Itauna')).toBe(false);
    expect(isBairro('Copacabana')).toBe(false);
    expect(isBairro('')).toBe(false);
    expect(isBairro(undefined)).toBe(false);
    expect(isBairro(42)).toBe(false);
  });
});

describe('isSaquarema', () => {
  it('aceita Saquarema-RJ em qualquer grafia', () => {
    expect(isSaquarema('Saquarema', 'RJ')).toBe(true);
    expect(isSaquarema('  SAQUAREMA ', ' rj ')).toBe(true);
  });
  it('recusa outra cidade, outro estado e vazio', () => {
    expect(isSaquarema('Araruama', 'RJ')).toBe(false);
    expect(isSaquarema('Saquarema', 'SP')).toBe(false);
    expect(isSaquarema('Saquaremas', 'RJ')).toBe(false);
    expect(isSaquarema('', 'RJ')).toBe(false);
    expect(isSaquarema(null, null)).toBe(false);
  });
});
