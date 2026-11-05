import { describe, expect, it } from 'vitest';
import { missingSiteInfo, showInfo } from './siteInfo';

describe('missingSiteInfo', () => {
  it('lista os obrigatórios vazios ou só com espaços', () => {
    expect(missingSiteInfo({ controlador: '', cnpj: ' ', emailDpo: 'a@b.com', emailContato: 'c@d.com' })).toEqual(['controlador', 'cnpj']);
  });
  it('vazio quando tudo preenchido', () => {
    expect(missingSiteInfo({ controlador: 'X', cnpj: '1', emailDpo: 'a@b.com', emailContato: 'c@d.com' })).toEqual([]);
  });
});

describe('showInfo', () => {
  it('mostra marcador quando vazio', () => {
    expect(showInfo('  ')).toBe('[a preencher]');
    expect(showInfo('Prefeitura')).toBe('Prefeitura');
  });
});
