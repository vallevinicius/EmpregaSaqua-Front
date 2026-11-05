/**
 * Dados institucionais exibidos nas páginas legais. PREENCHA antes do lançamento
 * (`npm run check:launch` falha enquanto houver campo vazio). Nada aqui é segredo.
 */
export const SITE_INFO = {
  /** Nome oficial do órgão/entidade responsável (controlador dos dados), ex.: "Prefeitura Municipal de Saquarema". */
  controlador: '',
  /** CNPJ do controlador. */
  cnpj: '',
  /** E-mail do encarregado de dados (DPO) para pedidos da LGPD. */
  emailDpo: '',
  /** E-mail geral de contato/suporte. */
  emailContato: '',
  /** Endereço e horário de atendimento (opcional, mas recomendado). */
  endereco: '',
  /** Data da última revisão dos textos legais (AAAA-MM-DD). Atualize a cada mudança. */
  atualizadoEm: '2026-11-04',
} as const;

export type SiteInfoKey = keyof typeof SITE_INFO;

/** Campos obrigatórios ainda vazios (usado pelo check de lançamento e para sinalizar na página). */
export function missingSiteInfo(info: Record<string, string> = SITE_INFO): string[] {
  const required: SiteInfoKey[] = ['controlador', 'cnpj', 'emailDpo', 'emailContato'];
  return required.filter((k) => !info[k]?.trim());
}

/** Valor para exibição: vazio vira marcador visível (nunca esconde que falta preencher). */
export function showInfo(value: string): string {
  return value.trim() || '[a preencher]';
}
