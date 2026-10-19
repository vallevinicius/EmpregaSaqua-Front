import type { ApplicationStatus } from '@/api/types';

/** Frase curta sobre o que cada etapa significa para quem se candidatou (linha do tempo em "Minhas candidaturas"). */
export function applicationHint(status: ApplicationStatus, knockedOut = false): string {
  switch (status) {
    case 'APPLIED':
      return 'Sua candidatura foi enviada. A empresa ainda não começou a análise.';
    case 'REVIEWING':
      return 'A empresa está analisando o seu currículo.';
    case 'INTERVIEW':
      return 'A empresa quer conversar com você. Fique de olho nas mensagens e no telefone.';
    case 'HIRED':
      return 'Parabéns, você foi contratado!';
    case 'REJECTED':
      return knockedOut
        ? 'Não selecionado na triagem: suas respostas não atenderam aos requisitos da vaga.'
        : 'Não selecionado para esta vaga. Continue buscando, tem mais vagas esperando por você.';
  }
}

/** "Atualizada há 2 dias" só quando a candidatura mudou depois do envio (mais de 1 minuto de diferença). */
export function wasUpdated(createdAt: string, updatedAt: string): boolean {
  const c = new Date(createdAt).getTime();
  const u = new Date(updatedAt).getTime();
  if (Number.isNaN(c) || Number.isNaN(u)) return false;
  return u - c > 60_000;
}
