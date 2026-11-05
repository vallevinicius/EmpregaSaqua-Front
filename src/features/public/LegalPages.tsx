import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/ui';
import { SITE_INFO, showInfo } from '@/lib/siteInfo';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-lg font-bold">{title}</h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-fg/90">{children}</div>
    </section>
  );
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={title} description={`Última atualização: ${SITE_INFO.atualizadoEm.split('-').reverse().join('/')}`} />
      {children}
      <p className="mt-10 text-sm text-muted">
        Dúvidas? Fale com a gente em <a className="underline" href={`mailto:${SITE_INFO.emailContato}`}>{showInfo(SITE_INFO.emailContato)}</a> ou veja a{' '}
        <Link className="underline" to="/ajuda">central de ajuda</Link>.
      </p>
    </div>
  );
}

/** Termos de uso. Texto-base para revisão jurídica antes do lançamento. */
export function TermsPage() {
  useDocumentTitle('Termos de uso');
  return (
    <Shell title="Termos de uso">
      <Section title="1. O que é o EmpregaSaquá">
        <p>
          O EmpregaSaquá é um portal gratuito que aproxima moradores e empresas de Saquarema-RJ. Ele é mantido por {showInfo(SITE_INFO.controlador)} (CNPJ {showInfo(SITE_INFO.cnpj)}).
          O portal apenas divulga vagas e conecta as partes: <strong>não somos empregadores, não intermediamos pagamentos e não garantimos contratação</strong>.
        </p>
      </Section>
      <Section title="2. Quem pode usar">
        <p>
          O uso é voltado a moradores e a empresas de Saquarema-RJ. No cadastro pedimos o CEP e, para empresas, um CNPJ válido; cadastros de outras cidades são recusados.
          Você declara que as informações fornecidas são verdadeiras e é responsável por manter sua senha em segredo.
        </p>
      </Section>
      <Section title="3. Regras para candidatos">
        <p>Mantenha seus dados atualizados e candidate-se apenas a vagas que realmente lhe interessam. É proibido se passar por outra pessoa ou enviar conteúdo ofensivo ou ilegal.</p>
      </Section>
      <Section title="4. Regras para empresas">
        <p>
          Empresas passam por aprovação antes de publicar. Cada vaga também passa por moderação. É proibido anunciar vagas falsas, que cobrem qualquer valor do candidato, que discriminem ou que
          peçam dados desnecessários. Os dados de candidatos só podem ser usados para processos seletivos.
        </p>
      </Section>
      <Section title="5. Denúncias e moderação">
        <p>
          Usuários logados podem denunciar vagas e empresas, sempre com justificativa. A administração analisa cada denúncia e pode remover vagas, suspender empresas ou encerrar contas que violem estes termos,
          sem aviso prévio em casos graves.
        </p>
      </Section>
      <Section title="6. Conteúdo e responsabilidade">
        <p>
          Cada usuário responde pelo que publica. Não nos responsabilizamos por acordos feitos entre candidatos e empresas, nem por indisponibilidades temporárias do serviço. Podemos alterar estes termos;
          mudanças relevantes serão avisadas no portal.
        </p>
      </Section>
      <Section title="7. Privacidade">
        <p>
          O tratamento de dados pessoais está descrito na <Link className="underline" to="/privacidade">Política de privacidade</Link>.
        </p>
      </Section>
    </Shell>
  );
}

/** Política de privacidade (LGPD). Texto-base para revisão jurídica antes do lançamento. */
export function PrivacyPage() {
  useDocumentTitle('Política de privacidade');
  return (
    <Shell title="Política de privacidade">
      <Section title="1. Quem é o responsável">
        <p>
          O controlador dos dados é {showInfo(SITE_INFO.controlador)} (CNPJ {showInfo(SITE_INFO.cnpj)}). O encarregado pelo tratamento de dados (DPO) pode ser contatado em{' '}
          <a className="underline" href={`mailto:${SITE_INFO.emailDpo}`}>{showInfo(SITE_INFO.emailDpo)}</a>.
        </p>
      </Section>
      <Section title="2. Quais dados coletamos">
        <ul className="list-disc pl-5">
          <li><strong>Cadastro:</strong> e-mail, nome de usuário, senha (guardada apenas criptografada), CEP e, conforme o perfil, nome, CPF, data de nascimento, telefone, bairro e endereço.</li>
          <li><strong>Candidatos:</strong> currículo (experiências, formação, idiomas, habilidades), foto e respostas a perguntas das vagas.</li>
          <li><strong>Empresas:</strong> nome fantasia, CNPJ, endereço, telefone, logotipo e vagas publicadas.</li>
          <li><strong>Uso:</strong> mensagens do chat, candidaturas, denúncias, registros de acesso e de ações (endereço IP e data) para segurança.</li>
        </ul>
      </Section>
      <Section title="3. Para que usamos (e a base legal)">
        <p>
          Usamos os dados para criar sua conta, mostrar vagas, processar candidaturas, permitir contato entre candidato e empresa, moderar o portal, prevenir fraudes e gerar indicadores agregados do mercado de
          trabalho local para a gestão pública. As bases legais são a execução do serviço que você solicitou, o cumprimento de obrigações legais, o legítimo interesse (segurança e prevenção a fraudes) e a
          execução de políticas públicas. Indicadores divulgados nunca identificam pessoas.
        </p>
      </Section>
      <Section title="4. Com quem compartilhamos">
        <p>
          Ao se candidatar, a empresa da vaga vê seu currículo e suas respostas. Empresas aprovadas também podem buscar currículos de candidatos que estejam abertos a oportunidades. Usamos prestadores
          de infraestrutura (hospedagem, envio de e-mail e consulta de CEP) apenas para operar o serviço. Não vendemos dados.
        </p>
      </Section>
      <Section title="5. Por quanto tempo guardamos">
        <p>
          Enquanto sua conta existir. Você pode excluí-la a qualquer momento em seu perfil: confirmamos por e-mail e removemos seus dados, candidaturas, mensagens e alertas. Registros de segurança podem ser
          mantidos pelo prazo exigido em lei.
        </p>
      </Section>
      <Section title="6. Seus direitos (LGPD, art. 18)">
        <p>
          Você pode confirmar o tratamento, acessar, corrigir, anonimizar, portar ou eliminar seus dados, e revogar consentimentos. Parte disso você faz direto no seu perfil; para o restante, escreva ao
          encarregado pelo e-mail acima. Respondemos em até 15 dias.
        </p>
      </Section>
      <Section title="7. Cookies e armazenamento local">
        <p>
          Não usamos cookies de publicidade ou rastreamento. Guardamos no seu navegador apenas o necessário para manter você conectado durante a sessão e rascunhos do currículo, que ficam só no seu aparelho.
        </p>
      </Section>
      <Section title="8. Segurança">
        <p>Usamos conexão criptografada, senhas protegidas, controle de acesso por perfil e registros de auditoria. Nenhum sistema é 100% imune; em caso de incidente relevante, avisaremos os afetados e a ANPD.</p>
      </Section>
    </Shell>
  );
}
