import { describe, expect, it } from 'vitest';
import { RENEW_DAYS, expiryState, renewedExpiry } from './jobExpiry';

const NOW = new Date(2026, 5, 10, 12, 0, 0).getTime();
const inDays = (n: number) => new Date(NOW + n * 86_400_000).toISOString();

describe('expiryState', () => {
  it('sem prazo ou prazo inválido = none', () => {
    expect(expiryState(null, NOW).state).toBe('none');
    expect(expiryState(undefined, NOW).state).toBe('none');
    expect(expiryState('lixo', NOW).state).toBe('none');
  });
  it('prazo no passado = expired', () => {
    expect(expiryState(inDays(-1), NOW)).toEqual({ state: 'expired', daysLeft: 0 });
  });
  it('até 7 dias = soon, com os dias que faltam', () => {
    expect(expiryState(inDays(3), NOW)).toEqual({ state: 'soon', daysLeft: 3 });
    expect(expiryState(inDays(7), NOW).state).toBe('soon');
  });
  it('mais de 7 dias = ok', () => {
    expect(expiryState(inDays(8), NOW).state).toBe('ok');
    expect(expiryState(inDays(60), NOW).state).toBe('ok');
  });
});

describe('renewedExpiry', () => {
  it('é no fim do dia, 30 dias à frente, no horário local', () => {
    const d = new Date(renewedExpiry(new Date(2026, 0, 10, 8, 15)));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(9);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(RENEW_DAYS).toBe(30);
  });
  it('atravessa virada de ano', () => {
    const d = new Date(renewedExpiry(new Date(2026, 11, 20)));
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(19);
  });
  it('é sempre no futuro', () => {
    expect(new Date(renewedExpiry()).getTime()).toBeGreaterThan(Date.now());
  });
});
