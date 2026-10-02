/**
 * Máscara de moeda "ao digitar": trata a entrada como centavos (tudo que não é dígito é
 * descartado) e formata em BRL. Ex.: digitar "179003" vira "R$ 1.790,03".
 */
export function maskCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Converte "R$ 1.790,03" de volta pro valor numérico em reais (1790.03). */
export function parseCurrencyToNumber(masked: string): number | null {
  const digits = masked.replace(/\D/g, '');
  if (!digits) return null;
  return parseInt(digits, 10) / 100;
}
