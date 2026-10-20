import { describe, expect, it } from 'vitest';
import { MAX_DRAFT, formatInviteDate, interviewInviteMessage, jobInviteMessage, sanitizeDraft, todayLocal, validateInterview } from './invite';

const ok = { date: '2026-03-10', time: '14:30', place: 'Rua A, 10 - Centro' };

describe('formatInviteDate', () => {
  it('inverte AAAA-MM-DD para DD/MM/AAAA', () => expect(formatInviteDate('2026-03-05')).toBe('05/03/2026'));
  it('formato inválido volta vazio', () => {
    expect(formatInviteDate('05/03/2026')).toBe('');
    expect(formatInviteDate('')).toBe('');
  });
});

describe('validateInterview', () => {
  it('aceita dados corretos, inclusive hoje', () => {
    expect(validateInterview(ok, '2026-03-01')).toBeNull();
    expect(validateInterview(ok, '2026-03-10')).toBeNull();
  });
  it('recusa data vazia, inválida ou no passado', () => {
    expect(validateInterview({ ...ok, date: '' }, '2026-03-01')).toMatch(/data/i);
    expect(validateInterview({ ...ok, date: '2026-13-45' }, '2026-03-01')).toMatch(/data/i);
    expect(validateInterview({ ...ok, date: '2026-02-28' }, '2026-03-01')).toMatch(/passado/);
  });
  it('recusa horário inválido', () => {
    for (const time of ['', '25:00', '14:60', '9:30', '14h30']) expect(validateInterview({ ...ok, time }, '2026-03-01')).toMatch(/horário/i);
  });
  it('recusa local vazio, só espaços ou longo demais', () => {
    expect(validateInterview({ ...ok, place: '   ' }, '2026-03-01')).toMatch(/local/i);
    expect(validateInterview({ ...ok, place: 'x'.repeat(101) }, '2026-03-01')).toMatch(/100/);
  });
  it('recusa observação longa demais', () => {
    expect(validateInterview({ ...ok, note: 'x'.repeat(151) }, '2026-03-01')).toMatch(/150/);
  });
});

describe('interviewInviteMessage', () => {
  it('monta a mensagem com data, hora e local', () => {
    const m = interviewInviteMessage('Atendente', ok);
    expect(m).toContain('vaga "Atendente"');
    expect(m).toContain('10/03/2026 às 14:30');
    expect(m).toContain('Local: Rua A, 10 - Centro.');
    expect(m.endsWith('Pode confirmar por aqui?')).toBe(true);
  });
  it('inclui a observação só quando existe', () => {
    expect(interviewInviteMessage('X', { ...ok, note: 'Leve um documento com foto' })).toContain('Leve um documento com foto');
    expect(interviewInviteMessage('X', { ...ok, note: '   ' }).split('\n')).toHaveLength(4);
  });
  it('colapsa quebras de linha do título e do local e corta textos longos', () => {
    const m = interviewInviteMessage('Vaga\n\nmuito   longa ' + 'a'.repeat(200), { ...ok, place: 'Sala\n3' });
    expect(m).toContain('Local: Sala 3.');
    expect(m.split('\n')[0]!.length).toBeLessThan(200);
  });
  it('cabe no limite de rascunho mesmo no pior caso', () => {
    const m = interviewInviteMessage('t'.repeat(500), { ...ok, place: 'p'.repeat(500), note: 'n'.repeat(500) });
    expect(m.length).toBeLessThanOrEqual(MAX_DRAFT);
  });
});

describe('jobInviteMessage', () => {
  it('traz o título e o link da vaga', () => {
    const m = jobInviteMessage('Padeiro', 'https://site.exemplo/vagas/abc');
    expect(m).toContain('vaga "Padeiro"');
    expect(m).toContain('https://site.exemplo/vagas/abc');
  });
  it('cabe no limite de rascunho', () => {
    expect(jobInviteMessage('t'.repeat(500), 'https://site.exemplo/vagas/' + 'a'.repeat(36)).length).toBeLessThanOrEqual(MAX_DRAFT);
  });
});

describe('todayLocal', () => {
  it('formata no fuso local com zeros à esquerda', () => {
    expect(todayLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('sanitizeDraft', () => {
  it('mantém texto e quebras de linha', () => expect(sanitizeDraft('Oi\nTudo bem?')).toBe('Oi\nTudo bem?'));
  it('remove caracteres de controle', () => expect(sanitizeDraft('a\u0000b\u0007c\u001bd')).toBe('abcd'));
  it('corta no limite e aceita null/undefined', () => {
    expect(sanitizeDraft('x'.repeat(MAX_DRAFT + 50))).toHaveLength(MAX_DRAFT);
    expect(sanitizeDraft(null)).toBe('');
    expect(sanitizeDraft(undefined)).toBe('');
  });
});
