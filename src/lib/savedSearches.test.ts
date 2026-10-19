import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetSavedSearches,
  clearRecentSearches,
  describeSearch,
  normalizeSearch,
  recordRecentSearch,
  removeSavedSearch,
  saveSearch,
  toggleSavedSearch,
} from './savedSearches';

const SAVED = 'es.saved-searches.v1';
const RECENT = 'es.recent-searches.v1';
const stored = (key: string) => (JSON.parse(localStorage.getItem(key) ?? '[]') as { qs: string }[]).map((s) => s.qs);

beforeEach(() => {
  localStorage.clear();
  __resetSavedSearches();
});

describe('normalizeSearch', () => {
  it('mantém só filtros conhecidos, em ordem fixa, sem página', () => {
    expect(normalizeSearch('page=3&q=padaria&foo=1&local=Bacax%C3%A1')).toBe('local=Bacax%C3%A1&q=padaria');
  });
  it('descarta valores inválidos de modelo, contrato e área', () => {
    expect(normalizeSearch('modelo=XXX&contrato=YYY&area=ZZZ&pcd=0')).toBe('');
  });
  it('aceita filtros válidos e corta textos longos', () => {
    expect(normalizeSearch(`modelo=REMOTE&pcd=1&q=${'a'.repeat(300)}`)).toBe(`modelo=REMOTE&pcd=1&q=${'a'.repeat(100)}`);
  });
  it('a mesma busca em ordens diferentes dá a mesma chave', () => {
    expect(normalizeSearch('q=a&local=b')).toBe(normalizeSearch('local=b&q=a'));
  });
  it('aceita URLSearchParams e string vazia', () => {
    expect(normalizeSearch(new URLSearchParams('q=x'))).toBe('q=x');
    expect(normalizeSearch('')).toBe('');
  });
});

describe('describeSearch', () => {
  it('monta um texto legível', () => {
    expect(describeSearch('q=padaria&local=Centro&pcd=1')).toBe('“padaria” · Centro · PcD');
  });
  it('sem filtros', () => {
    expect(describeSearch('')).toBe('Todas as vagas');
  });
});

describe('buscas salvas', () => {
  it('salva, deduplica e coloca a mais recente no topo', () => {
    saveSearch('q=a');
    saveSearch('q=b');
    saveSearch('q=a');
    expect(stored(SAVED)).toEqual(['q=a', 'q=b']);
  });
  it('não guarda busca vazia', () => {
    saveSearch('page=2');
    expect(stored(SAVED)).toEqual([]);
  });
  it('alterna e informa o estado', () => {
    expect(toggleSavedSearch('q=a')).toBe(true);
    expect(toggleSavedSearch('q=a')).toBe(false);
    expect(stored(SAVED)).toEqual([]);
    expect(toggleSavedSearch('')).toBe(false);
  });
  it('remove', () => {
    saveSearch('q=a');
    removeSavedSearch('q=a');
    expect(stored(SAVED)).toEqual([]);
  });
  it('limita a 20', () => {
    for (let i = 0; i < 25; i++) saveSearch(`q=busca${i}`);
    expect(stored(SAVED)).toHaveLength(20);
    expect(stored(SAVED)[0]).toBe('q=busca24');
  });
});

describe('buscas recentes', () => {
  it('guarda no máximo 6 e limpa', () => {
    for (let i = 0; i < 9; i++) recordRecentSearch(`q=r${i}`);
    expect(stored(RECENT)).toHaveLength(6);
    clearRecentSearches();
    expect(stored(RECENT)).toEqual([]);
  });
  it('é independente das salvas', () => {
    recordRecentSearch('q=a');
    expect(stored(SAVED)).toEqual([]);
  });
});

describe('dados do localStorage não confiáveis', () => {
  it('JSON quebrado vira lista vazia', () => {
    localStorage.setItem(SAVED, '{{{');
    __resetSavedSearches();
    saveSearch('q=ok');
    expect(stored(SAVED)).toEqual(['q=ok']);
  });
  it('itens malformados, inválidos e repetidos são ignorados', () => {
    localStorage.setItem(SAVED, JSON.stringify([null, { qs: 1 }, { qs: 'modelo=HACK' }, { qs: 'q=a' }, { qs: 'q=a&page=2' }]));
    __resetSavedSearches();
    saveSearch('q=novo');
    expect(stored(SAVED)).toEqual(['q=novo', 'q=a']);
  });
});
