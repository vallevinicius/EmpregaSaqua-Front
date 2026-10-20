import { describe, expect, it } from 'vitest';
import { chatLink, parseChatDraft, parseChatTarget } from './chatLink';

const EMP = '2d19c71e-cd1f-43d7-bd6e-8d879913659c';
const CAND = '0458e26f-20e8-4f1e-b1ad-b61b7ce17747';
const JOB = '17703e51-ca17-4363-8dda-54b0e4db942b';

const params = (link: string) => new URLSearchParams(link.split('?')[1]);

describe('chatLink', () => {
  it('sem rascunho mantém o link de sempre', () => {
    expect(chatLink({ employerId: EMP, candidateId: CAND })).toBe(`/mensagens?empresa=${EMP}&candidato=${CAND}`);
  });
  it('inclui a vaga quando existe', () => {
    expect(params(chatLink({ employerId: EMP, candidateId: CAND, jobId: JOB })).get('vaga')).toBe(JOB);
  });
  it('rascunho vai codificado e volta igual (acentos, quebra de linha, &)', () => {
    const draft = 'Olá! Vaga "Padeiro" & mais\nAbraço';
    expect(parseChatDraft(params(chatLink({ employerId: EMP, candidateId: CAND }, draft)))).toBe(draft);
  });
  it('rascunho vazio ou só de controle não entra na URL', () => {
    expect(chatLink({ employerId: EMP, candidateId: CAND }, '')).not.toContain('rascunho');
    expect(chatLink({ employerId: EMP, candidateId: CAND }, '\u0000\u0007')).not.toContain('rascunho');
  });
  it('o alvo continua sendo validado como UUID mesmo com rascunho', () => {
    const sp = new URLSearchParams({ empresa: 'x', candidato: CAND, rascunho: 'oi' });
    expect(parseChatTarget(sp)).toBeNull();
    expect(parseChatTarget(params(chatLink({ employerId: EMP, candidateId: CAND }, 'oi')))).toEqual({ jobId: undefined, employerId: EMP, candidateId: CAND });
  });
});

describe('parseChatDraft (entrada não confiável da URL)', () => {
  it('sem parâmetro = vazio', () => expect(parseChatDraft(new URLSearchParams())).toBe(''));
  it('remove caracteres de controle e limita o tamanho', () => {
    expect(parseChatDraft(new URLSearchParams({ rascunho: 'a\u0000b\u001bc' }))).toBe('abc');
    expect(parseChatDraft(new URLSearchParams({ rascunho: 'x'.repeat(5000) }))).toHaveLength(500);
  });
  it('mantém marcação como texto puro (quem exibe é o React, que escapa)', () => {
    expect(parseChatDraft(new URLSearchParams({ rascunho: '<img src=x onerror=alert(1)>' }))).toBe('<img src=x onerror=alert(1)>');
  });
});
