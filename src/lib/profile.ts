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

export type ProfileStepKey = 'name' | 'phone' | 'address' | 'bio' | 'skills' | 'experience' | 'education';

function profileChecks(p: ProfileLike | null | undefined): [ProfileStepKey, string, boolean][] {
  return [
    ['name', 'nome completo', !!p?.full_name?.trim()],
    ['phone', 'telefone', !!p?.telefone?.trim()],
    ['address', 'endereço', !!p?.address?.trim()],
    ['bio', 'resumo profissional', !!p?.bio?.trim()],
    ['skills', 'habilidades', (p?.skills?.length ?? 0) > 0],
    ['experience', 'experiência profissional', (p?.experiences?.length ?? 0) > 0],
    ['education', 'formação', (p?.educations?.length ?? 0) > 0],
  ];
}

/** Quanto do currículo está preenchido. Cada item vale o mesmo; serve para a barra de progresso e para orientar a candidatura. */
export function profileCompleteness(p: ProfileLike | null | undefined): Completeness {
  const checks = profileChecks(p);
  const done = checks.filter(([, , ok]) => ok).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter(([, , ok]) => !ok).map(([, label]) => label) };
}

/** O que falta, com a chave de cada item, para a tela levar a pessoa direto ao campo certo. */
export function profileNextSteps(p: ProfileLike | null | undefined): { key: ProfileStepKey; label: string }[] {
  return profileChecks(p).filter(([, , ok]) => !ok).map(([key, label]) => ({ key, label }));
}
