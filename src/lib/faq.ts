import { normalizeText } from './recommend';

export type FaqAudience = 'all' | 'candidate' | 'company';

export interface FaqItem {
  id: string;
  audience: FaqAudience;
  question: string;
  answer: string;
  /** Rota interna que resolve a dúvida (vira um link no fim da resposta). */
  link?: { to: string; label: string };
}

export const FAQ: FaqItem[] = [
  { id: 'gratis', audience: 'all', question: 'O EmpregaSaquá é gratuito?', answer: 'Sim. O portal é um serviço da Prefeitura para aproximar empresas e moradores de Saquarema. Não cobramos nada de candidatos nem de empresas.' },
  { id: 'so-saquarema', audience: 'all', question: 'Moro em outra cidade. Posso me cadastrar?', answer: 'Não. O portal é exclusivo para moradores e empresas de Saquarema-RJ. Na hora do cadastro conferimos o CEP informado.' },
  { id: 'cadastro', audience: 'all', question: 'Como crio minha conta?', answer: 'Clique em "Cadastre-se", escolha se você quer trabalhar ou contratar e preencha os campos obrigatórios. Os demais dados você completa depois, no seu perfil.', link: { to: '/cadastro', label: 'Ir para o cadastro' } },
  { id: 'confirmar-email', audience: 'all', question: 'Não recebi o e-mail de confirmação. E agora?', answer: 'Confira a caixa de spam e lixo eletrônico. Se não estiver lá, tente entrar na sua conta: na tela de entrada aparece a opção "Reenviar e-mail de confirmação".' },
  { id: 'senha', audience: 'all', question: 'Esqueci minha senha.', answer: 'Use a opção de recuperar a senha: enviamos um link para o seu e-mail para você criar uma nova.', link: { to: '/esqueci-minha-senha', label: 'Recuperar senha' } },
  { id: 'curriculo', audience: 'candidate', question: 'Como monto meu currículo?', answer: 'Em "Meu currículo" você preenche seus dados, experiências e formação. Também dá para gerar um currículo em PDF para imprimir ou enviar.', link: { to: '/curriculo', label: 'Montar currículo' } },
  { id: 'candidatar', audience: 'candidate', question: 'Como me candidato a uma vaga?', answer: 'Abra a vaga e clique em "Candidatar-se". Algumas vagas têm perguntas rápidas da empresa. Quanto mais completo o seu currículo, melhor.' },
  { id: 'acompanhar', audience: 'candidate', question: 'Como acompanho minhas candidaturas?', answer: 'Em "Minhas candidaturas" você vê a etapa de cada uma. Também avisamos por e-mail sempre que a empresa muda a situação (em análise, entrevista, contratado ou não selecionado).', link: { to: '/candidato/candidaturas', label: 'Ver candidaturas' } },
  { id: 'alertas', audience: 'candidate', question: 'Como recebo aviso de vagas novas?', answer: 'Faça uma busca (por exemplo, pelo seu bairro) e clique em "Avise-me de vagas assim". Você recebe um e-mail quando surgir uma vaga parecida e gerencia tudo em "Alertas".', link: { to: '/candidato/alertas', label: 'Meus alertas' } },
  { id: 'mensagens', audience: 'candidate', question: 'Posso falar com a empresa?', answer: 'Sim, pelas "Mensagens". Convites de entrevista e conversas com empresas ficam todos lá.', link: { to: '/mensagens', label: 'Abrir mensagens' } },
  { id: 'cnpj', audience: 'company', question: 'Preciso de CNPJ para anunciar vagas?', answer: 'Sim. O CNPJ é obrigatório e precisa ser válido. A empresa também precisa ser de Saquarema.' },
  { id: 'aprovacao', audience: 'company', question: 'Por que minha vaga não apareceu logo?', answer: 'As vagas passam por uma verificação antes de ir ao ar. Assim que aprovada, ela aparece na busca e os candidatos com alerta são avisados por e-mail.', link: { to: '/empresa/vagas', label: 'Minhas vagas' } },
  { id: 'bairro', audience: 'company', question: 'Para que serve o bairro da vaga?', answer: 'Quem procura emprego filtra por bairro para achar trabalho perto de casa. Escolha o bairro onde a pessoa vai trabalhar.' },
  { id: 'prazo', audience: 'company', question: 'Como renovo uma vaga que está acabando?', answer: 'Na lista de vagas da empresa aparece o selo de prazo. Há a opção "Renovar prazo", que estende a vaga por mais 30 dias.', link: { to: '/empresa/vagas', label: 'Minhas vagas' } },
  { id: 'talentos', audience: 'company', question: 'Como encontro candidatos sem esperar que se inscrevam?', answer: 'Em "Buscar talentos" você procura currículos de candidatos, salva os melhores no banco de talentos e convida para uma vaga ou entrevista.', link: { to: '/empresa/talentos', label: 'Buscar talentos' } },
];

/** Perguntas do público escolhido (as gerais sempre entram) que casam com a busca, ignorando acento e maiúscula. */
export function filterFaq(items: FaqItem[], audience: FaqAudience, query: string): FaqItem[] {
  const q = normalizeText(query).trim();
  return items.filter((i) => {
    if (audience !== 'all' && i.audience !== 'all' && i.audience !== audience) return false;
    if (!q) return true;
    return normalizeText(`${i.question} ${i.answer}`).includes(q);
  });
}
