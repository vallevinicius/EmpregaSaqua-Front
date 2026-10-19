import { describe, expect, it } from 'vitest';
import type { ApplicationStatus } from '@/api/types';
import { applicationHint, wasUpdated } from './applications';

describe('applicationHint', () => {
  it('tem texto para todas as etapas', () => {
    const all: ApplicationStatus[] = ['APPLIED', 'REVIEWING', 'INTERVIEW', 'HIRED', 'REJECTED'];
    for (const s of all) expect(applicationHint(s).length).toBeGreaterThan(10);
  });
  it('rejeição por triagem explica o motivo; rejeição comum não', () => {
    expect(applicationHint('REJECTED', true)).toMatch(/triagem/);
    expect(applicationHint('REJECTED', false)).not.toMatch(/triagem/);
  });
});

describe('wasUpdated', () => {
  it('false quando atualizada junto com a criação', () => {
    expect(wasUpdated('2026-01-01T10:00:00Z', '2026-01-01T10:00:20Z')).toBe(false);
  });
  it('true quando mudou depois', () => {
    expect(wasUpdated('2026-01-01T10:00:00Z', '2026-01-03T10:00:00Z')).toBe(true);
  });
  it('datas inválidas não quebram', () => {
    expect(wasUpdated('x', 'y')).toBe(false);
  });
});
