import { describe, expect, it } from 'vitest';
import { EVENT_KIND_LABEL, formatEventWhen, fromDatetimeLocal, toDatetimeLocal } from './events';

describe('datetime-local', () => {
  it('ida e volta preserva o instante (no horário local)', () => {
    const local = '2026-12-05T10:30';
    const iso = fromDatetimeLocal(local)!;
    expect(new Date(iso).toISOString()).toBe(iso);
    expect(toDatetimeLocal(iso)).toBe(local);
  });
  it('vazio ou lixo não vira data', () => {
    expect(fromDatetimeLocal('')).toBeNull();
    expect(fromDatetimeLocal('amanhã')).toBeNull();
    expect(toDatetimeLocal(null)).toBe('');
    expect(toDatetimeLocal('lixo')).toBe('');
  });
});

describe('formatEventWhen', () => {
  const at = (h: number, d = 5) => new Date(2026, 11, d, h, 0).toISOString();
  it('sem fim mostra só o início', () => expect(formatEventWhen({ starts_at: at(10), ends_at: null })).toMatch(/10:00$/));
  it('mesmo dia: "às" o horário final', () => expect(formatEventWhen({ starts_at: at(10), ends_at: at(18) })).toMatch(/10:00 às 18:00$/));
  it('dias diferentes: "até" a data final', () => expect(formatEventWhen({ starts_at: at(10), ends_at: at(18, 8) })).toMatch(/até .*18:00$/));
});

describe('EVENT_KIND_LABEL', () => {
  it('cobre os dois tipos do back', () => expect(Object.keys(EVENT_KIND_LABEL).sort()).toEqual(['COURSE', 'FAIR']));
});

import { eventSummary } from './events';

describe('eventSummary', () => {
  it('usa a descrição curta quando existe', () => {
    expect(eventSummary({ short_description: ' Resumo ', description: 'Texto completo bem maior' })).toBe('Resumo');
  });
  it('sem descrição curta, usa a completa se for pequena', () => {
    expect(eventSummary({ short_description: null, description: 'Curta mesmo' })).toBe('Curta mesmo');
    expect(eventSummary({ description: 'Sem o campo' })).toBe('Sem o campo');
  });
  it('sem descrição curta e texto longo: corta em palavra inteira com reticências', () => {
    const out = eventSummary({ short_description: '', description: 'palavra '.repeat(60) });
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(141);
    expect(out).not.toMatch(/palav…$/);
  });
  it('espaços em branco viram um só', () => {
    expect(eventSummary({ description: 'a\n\n b   c' })).toBe('a b c');
  });
});
