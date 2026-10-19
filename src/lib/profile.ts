/** Aceita o perfil do back e também os valores do formulário (o que já foi digitado conta). */
export interface ProfileLike {
  full_name?: string | null;
  telefone?: string | null;
  address?: string | null;
  bio?: string | null;
  skills?: readonly unknown[] | null;
  experiences?: readonly unknown[] | null;
  educations?: readonly unknown[] | null;
}

export interface Completeness {
  percent: number;
  /** Itens que ainda faltam, na ordem em que vale a pena preencher. */
  missing: string[];
}

/** Quanto do currículo está preenchido. Cada item vale o mesmo; serve para a barra de progresso e para orientar a candidatura. */
export function profileCompleteness(p: ProfileLike | null | undefined): Completeness {
  const checks: [string, boolean][] = [
    ['nome completo', !!p?.full_name?.trim()],
    ['telefone', !!p?.telefone?.trim()],
    ['endereço', !!p?.address?.trim()],
    ['resumo profissional', !!p?.bio?.trim()],
    ['habilidades', (p?.skills?.length ?? 0) > 0],
    ['experiência profissional', (p?.experiences?.length ?? 0) > 0],
    ['formação', (p?.educations?.length ?? 0) > 0],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter(([, ok]) => !ok).map(([label]) => label) };
}
