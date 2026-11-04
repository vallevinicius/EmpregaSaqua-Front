import { describe, expect, it } from 'vitest';
import { alertCriteria, hasAlertCriteria } from './alerts';

const base = { keyword: null, address: null, work_model: null, contract_type: null, is_pcd: false } as const;

describe('hasAlertCriteria', () => {
  it('sem nada, vazio ou só espaços = sem critério', () => {
    expect(hasAlertCriteria({})).toBe(false);
    expect(hasAlertCriteria({ ...base })).toBe(false);
    expect(hasAlertCriteria({ keyword: '   ', address: '' })).toBe(false);
  });
  it('qualquer critério já vale, inclusive só PcD', () => {
    expect(hasAlertCriteria({ keyword: 'padeiro' })).toBe(true);
    expect(hasAlertCriteria({ address: 'Bacaxá' })).toBe(true);
    expect(hasAlertCriteria({ work_model: 'REMOTE' })).toBe(true);
    expect(hasAlertCriteria({ contract_type: 'ESTAGIO' })).toBe(true);
    expect(hasAlertCriteria({ is_pcd: true })).toBe(true);
  });
});

describe('alertCriteria', () => {
  it('alerta vazio não lista nada', () => expect(alertCriteria({ ...base })).toEqual([]));
  it('traduz cada critério para texto legível', () => {
    expect(alertCriteria({ keyword: 'padeiro', address: 'Bacaxá', work_model: 'ON_SITE', contract_type: 'ESTAGIO', is_pcd: true })).toEqual([
      'Palavra-chave: padeiro',
      'Bairro: Bacaxá',
      'Presencial',
      'Estágio',
      'Vaga para PcD',
    ]);
  });
  it('valor desconhecido vindo da API aparece cru em vez de sumir', () => {
    expect(alertCriteria({ ...base, work_model: 'NOVO' as never })).toEqual(['NOVO']);
  });
});
