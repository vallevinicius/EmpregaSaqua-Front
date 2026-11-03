import { normalizeText } from '@/lib/recommend';

/**
 * Bairros de Saquarema (lista oficial da prefeitura, sem separar por distrito).
 * O back valida contra a MESMA lista em src/common/locality/saquarema.ts — ao mudar uma, mude a outra.
 */
export const BAIRROS_SAQUAREMA = [
  'Água Branca', 'Alvorada', 'Areal', 'Asfalto Velho', 'Aterrado', 'Bacaxá', 'Barra Nova', 'Barreira', 'Basileia',
  'Bicuíba', 'Bonsucesso', 'Boqueirão', 'Caixa D’Água', 'Centro', 'Comum', 'Condado de Bacaxá', 'Coqueiral',
  'Engenho Grande', 'Fátima', 'Gravatá', 'Guarani', 'Ipitangas', 'Itaúna', 'Jaconé', 'Jardim', 'Leigos', 'Madressilva',
  'Mombaça', 'Morro dos Pregos', 'Parque Marina', 'Porto da Roça I', 'Porto da Roça II', 'Porto Novo', 'Raia',
  'Retiro', 'Rio da Areia', 'Rio Seco', 'Sampaio Correia', 'São Geraldo', 'Serra de Mato Grosso', 'Tinguí',
  'Verde Vale', 'Vilatur', 'Área Rural de Bacaxá', 'Área Rural de Sampaio Correia', 'Área Rural de Saquarema',
] as const;

export type Bairro = (typeof BAIRROS_SAQUAREMA)[number];

/** Atalhos da página inicial: os bairros mais procurados. */
export const BAIRROS_DESTAQUE: readonly Bairro[] = ['Centro', 'Bacaxá', 'Itaúna', 'Jaconé', 'Vilatur', 'Porto da Roça I'];

export function isBairro(value: unknown): value is Bairro {
  return typeof value === 'string' && (BAIRROS_SAQUAREMA as readonly string[]).includes(value);
}

/** O site atende só Saquarema-RJ. Compara sem acento/caixa e exige o estado RJ. */
export function isSaquarema(city: string | null | undefined, state: string | null | undefined): boolean {
  return normalizeText(city) === 'saquarema' && (state ?? '').trim().toUpperCase() === 'RJ';
}
