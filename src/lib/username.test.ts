import { describe, expect, it } from 'vitest';
import { suggestUsernameFromEmail } from './username';

const VALID = /^[a-z0-9_.]{3,30}$/;

describe('suggestUsernameFromEmail', () => {
  it('usa a parte antes do @ em minúsculas', () => expect(suggestUsernameFromEmail('Joana.Silva@Exemplo.com')).toBe('joana.silva'));
  it('remove acento e caracteres inválidos', () => expect(suggestUsernameFromEmail('joão+vagas@exemplo.com')).toBe('joaovagas'));
  it('corta em 30 caracteres', () => expect(suggestUsernameFromEmail(`${'a'.repeat(50)}@x.com`)).toHaveLength(30));
  it('curto demais ou vazio = sem sugestão', () => {
    expect(suggestUsernameFromEmail('ab@x.com')).toBe('');
    expect(suggestUsernameFromEmail('')).toBe('');
    expect(suggestUsernameFromEmail('@x.com')).toBe('');
  });
  it('tudo que sugere é aceito pelo schema do cadastro', () => {
    for (const e of ['Maria_Souza@x.com', 'ze.da.silva99@x.com', 'ação@x.com']) {
      const s = suggestUsernameFromEmail(e);
      if (s) expect(s).toMatch(VALID);
    }
  });
});
