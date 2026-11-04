import { describe, expect, it } from 'vitest';
import { JUSTIFICATION_MAX, JUSTIFICATION_MIN, REPORT_REASONS, REPORT_REASON_LABEL, validateJustification } from './reports';

describe('validateJustification', () => {
  it('vazia ou só espaços = obrigatória', () => {
    expect(validateJustification('')).toMatch(/Explique/);
    expect(validateJustification('     ')).toMatch(/Explique/);
  });
  it('curta demais, contando sem espaços nas pontas', () => {
    expect(validateJustification('golpe')).toMatch(/mínimo/);
    expect(validateJustification(`   ${'x'.repeat(JUSTIFICATION_MIN - 1)}   `)).toMatch(/mínimo/);
  });
  it('limites exatos passam', () => {
    expect(validateJustification('x'.repeat(JUSTIFICATION_MIN))).toBeNull();
    expect(validateJustification('x'.repeat(JUSTIFICATION_MAX))).toBeNull();
  });
  it('longa demais é recusada', () => expect(validateJustification('x'.repeat(JUSTIFICATION_MAX + 1))).toMatch(/Máximo/));
});

describe('REPORT_REASONS', () => {
  it('valores únicos, batem com o enum do back e todos têm rótulo', () => {
    expect(REPORT_REASONS.map((r) => r.value).sort()).toEqual(['DISCRIMINATION', 'FAKE_JOB', 'OTHER', 'SCAM', 'WRONG_INFO']);
    for (const r of REPORT_REASONS) expect(REPORT_REASON_LABEL[r.value]).toBe(r.label);
  });
});
