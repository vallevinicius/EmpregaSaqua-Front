import type { ContractType, WorkModel } from '@/api/types';

/** Modelos de vaga para publicar em minutos. Respeitam os limites do back (150/3000 caracteres, até 20 itens). Endereço e contato ficam com a empresa. */
export interface JobTemplate {
  name: string;
  title: string;
  description: string;
  work_schedule: string;
  work_model: WorkModel;
  contract_type: ContractType;
  mandatory_qualifications: string[];
  differential_qualifications: string[];
  benefits: string[];
}

const BENEFITS_BASE = ['Vale-transporte', 'Vale-refeição'];

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    name: 'Atendente de loja',
    title: 'Atendente de loja',
    description:
      'Atender clientes com atenção e educação, organizar a loja e os produtos, operar o caixa e apoiar a equipe no dia a dia.\n\nTreinamento no início. Buscamos pessoa comunicativa, pontual e com vontade de crescer.',
    work_schedule: 'Escala 6x1, 8h às 17h',
    work_model: 'ON_SITE',
    contract_type: 'TEMPO_DETERMINADO',
    mandatory_qualifications: ['Ensino médio completo', 'Boa comunicação', 'Disponibilidade aos sábados'],
    differential_qualifications: ['Experiência com vendas', 'Morar em Saquarema'],
    benefits: BENEFITS_BASE,
  },
  {
    name: 'Auxiliar administrativo',
    title: 'Auxiliar administrativo',
    description:
      'Apoiar as rotinas administrativas: atendimento telefônico e por WhatsApp, organização de documentos, lançamentos em planilhas e apoio à equipe.\n\nBuscamos pessoa organizada, atenta a detalhes e com facilidade com o computador.',
    work_schedule: 'Segunda a sexta, 8h às 17h',
    work_model: 'ON_SITE',
    contract_type: 'TEMPO_DETERMINADO',
    mandatory_qualifications: ['Ensino médio completo', 'Conhecimento básico de Excel', 'Organização'],
    differential_qualifications: ['Experiência em escritório'],
    benefits: BENEFITS_BASE,
  },
  {
    name: 'Cozinheiro(a)',
    title: 'Cozinheiro(a)',
    description:
      'Preparar as refeições do cardápio, manter a cozinha organizada e higienizada e controlar o estoque de ingredientes junto à equipe.\n\nBuscamos pessoa com experiência em cozinha e comprometimento com a qualidade.',
    work_schedule: 'Escala 6x1, turnos de 8h',
    work_model: 'ON_SITE',
    contract_type: 'TEMPO_DETERMINADO',
    mandatory_qualifications: ['Experiência em cozinha', 'Conhecimento de boas práticas de higiene'],
    differential_qualifications: ['Curso de manipulação de alimentos'],
    benefits: [...BENEFITS_BASE, 'Alimentação no local'],
  },
  {
    name: 'Recepcionista',
    title: 'Recepcionista',
    description:
      'Receber e orientar clientes e hóspedes, atender telefone e mensagens, fazer reservas e manter o balcão organizado.\n\nBuscamos pessoa simpática, comunicativa e com boa apresentação.',
    work_schedule: 'Escala 12x36',
    work_model: 'ON_SITE',
    contract_type: 'TEMPO_DETERMINADO',
    mandatory_qualifications: ['Ensino médio completo', 'Boa comunicação', 'Noções de informática'],
    differential_qualifications: ['Inglês básico', 'Experiência em hotelaria ou pousada'],
    benefits: BENEFITS_BASE,
  },
  {
    name: 'Vendedor(a)',
    title: 'Vendedor(a)',
    description:
      'Atender e prospectar clientes, apresentar os produtos, negociar e fechar vendas, mantendo bom relacionamento no pós-venda.\n\nBuscamos pessoa comunicativa e com foco em resultado.',
    work_schedule: 'Segunda a sábado, 9h às 18h',
    work_model: 'ON_SITE',
    contract_type: 'TEMPO_DETERMINADO',
    mandatory_qualifications: ['Ensino médio completo', 'Experiência com vendas'],
    differential_qualifications: ['CNH categoria B'],
    benefits: [...BENEFITS_BASE, 'Comissão por vendas'],
  },
  {
    name: 'Jovem Aprendiz',
    title: 'Jovem Aprendiz',
    description:
      'Programa de aprendizagem para quem está começando: acompanhar as rotinas da empresa, aprender com a equipe e desenvolver a primeira experiência profissional.\n\nNão precisa de experiência anterior.',
    work_schedule: '4h por dia, com dias de curso',
    work_model: 'ON_SITE',
    contract_type: 'JOVEM_APRENDIZ',
    mandatory_qualifications: ['Ter entre 14 e 24 anos', 'Estar cursando ou ter concluído o ensino médio'],
    differential_qualifications: [],
    benefits: ['Vale-transporte'],
  },
];
