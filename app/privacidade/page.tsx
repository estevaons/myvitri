import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/home/LegalPage";
import { BRAND, CONTACT_EMAIL, HOST } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: `Como o ${BRAND} coleta, usa e protege seus dados.`,
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export default function Privacidade() {
  return (
    <LegalPage
      title="Política de Privacidade"
      updated="2 de novembro de 2026"
      intro={
        <p className="m-0">
          O {BRAND} ({HOST}) é uma plataforma em que qualquer pessoa monta uma vitrine pública com os cupons de desconto e os produtos que
          indicam. Esta política explica quais dados coletamos, por que, com quem compartilhamos e como você controla seus dados, de
          acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).
        </p>
      }
    >
      <Section title="1. Quem é o responsável">
        <p>
          O {BRAND} é o controlador dos dados tratados neste site. Para qualquer assunto sobre seus dados, inclusive para falar com o
          encarregado (DPO), escreva para {mail}.
        </p>
      </Section>

      <Section title="2. Dados que coletamos">
        <p>
          <strong>Quem cria uma vitrine (login com o Google).</strong> Ao entrar com sua conta Google, recebemos apenas seu nome, seu
          endereço de e-mail e sua foto de perfil (permissões <em>openid</em>, <em>email</em> e <em>profile</em>). Não acessamos seu
          Gmail, seus contatos, seu Google Drive nem qualquer outro dado da sua conta Google.
        </p>
        <p>
          <strong>Conteúdo da vitrine.</strong> O nome de exibição, o link escolhido, a foto, os textos, os cupons, os produtos, os
          links de loja e de afiliado e os kits que você cadastra. Esse conteúdo foi feito para ser público e aparece para qualquer
          pessoa que abrir sua vitrine.
        </p>
        <p>
          <strong>Quem visita uma vitrine.</strong> Contamos visitas e cliques (por exemplo, “cupom copiado” ou “clique para ir à loja”)
          para mostrar métricas a quem é dono da vitrine. Cada registro guarda só o tipo do evento, o item clicado e a data e hora. Não guardamos nome,
          e-mail, endereço IP nem qualquer identificador pessoal junto com esses eventos.
        </p>
        <p>
          <strong>Registros técnicos.</strong> Nossos provedores de hospedagem podem registrar, por pouco tempo, dados como endereço IP,
          navegador e páginas acessadas, para segurança e para corrigir erros.
        </p>
      </Section>

      <Section title="3. Como usamos os dados">
        <ul>
          <li>Criar e manter sua conta, identificar você no login e proteger o acesso ao editor (execução do contrato).</li>
          <li>Preencher a foto da sua vitrine com a foto do Google, que você pode trocar ou remover a qualquer momento.</li>
          <li>Publicar sua vitrine e mostrar a você as métricas de visitas e cliques (execução do contrato).</li>
          <li>Falar com você sobre sua conta, mudanças importantes no serviço ou pedidos que você fizer (legítimo interesse).</li>
          <li>Manter o site seguro, evitar abusos e cumprir obrigações legais.</li>
        </ul>
        <p>Não vendemos seus dados, não os usamos para publicidade e não traçamos perfis de quem visita as vitrines.</p>
      </Section>

      <Section title="4. Dados recebidos do Google">
        <p>
          O uso e a transferência, para qualquer outro aplicativo, de informações recebidas das APIs do Google seguem a{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            Política de Dados do Usuário dos Serviços de API do Google
          </a>
          , incluindo os requisitos de Uso Limitado. Usamos nome, e-mail e foto apenas para as finalidades descritas acima. Esses dados
          não são vendidos, não são usados para publicidade, não são lidos por pessoas (exceto com sua autorização, por segurança ou
          por obrigação legal) e não são usados para treinar modelos de inteligência artificial.
        </p>
      </Section>

      <Section title="5. Cookies e armazenamento no navegador">
        <ul>
          <li>Cookies de sessão, necessários para manter você conectado ao editor.</li>
          <li>Um cookie temporário (até 10 minutos) que guarda o link escolhido enquanto você faz o login com o Google.</li>
          <li>Um registro na sessão do navegador para não contar a mesma visita duas vezes; ele some quando a aba é fechada.</li>
        </ul>
        <p>Não usamos cookies de publicidade nem ferramentas de rastreamento de terceiros.</p>
      </Section>

      <Section title="6. Com quem compartilhamos">
        <p>Compartilhamos dados apenas com empresas que nos ajudam a operar o serviço, e só o necessário para isso:</p>
        <ul>
          <li>
            <strong>Supabase</strong>: banco de dados e autenticação.
          </li>
          <li>
            <strong>Vercel</strong>: hospedagem do site.
          </li>
          <li>
            <strong>Google</strong>: login com a conta Google.
          </li>
          <li>
            <strong>Brave Search</strong>: quando você importa um produto por link, podemos consultar o endereço ou o nome do produto
            para completar foto e preço. Nenhum dado pessoal seu é enviado.
          </li>
        </ul>
        <p>
          Os links para as lojas podem levar parâmetros de campanha (UTM) que identificam a vitrine de origem, nunca o visitante.
          Também podemos compartilhar dados quando a lei ou uma ordem judicial exigir.
        </p>
      </Section>

      <Section title="7. Transferência internacional">
        <p>
          Alguns provedores guardam dados em servidores fora do Brasil, como nos Estados Unidos. Nesses casos, usamos empresas que
          oferecem garantias de proteção compatíveis com a LGPD.
        </p>
      </Section>

      <Section title="8. Por quanto tempo guardamos">
        <p>
          Mantemos os dados da sua conta e da sua vitrine enquanto a conta existir. Você pode excluir a conta quando quiser, no editor
          (aba Perfil, “Excluir conta”): na mesma hora apagamos a conta, a vitrine, os cupons, os produtos, os kits, o rascunho e as
          métricas, e o link fica livre. Se preferir, peça a exclusão por {mail} e fazemos em até 15 dias. Cópias de segurança do banco
          de dados e registros técnicos dos provedores são apagados automaticamente em prazos curtos. Só guardamos algo depois disso se
          a lei obrigar.
        </p>
      </Section>

      <Section title="9. Seus direitos">
        <p>Pela LGPD, você pode, a qualquer momento:</p>
        <ul>
          <li>confirmar se tratamos seus dados e pedir acesso a eles;</li>
          <li>corrigir dados incompletos ou desatualizados (a maior parte pode ser editada direto no editor);</li>
          <li>excluir sua conta e seus dados por conta própria, no editor (aba Perfil, “Excluir conta”);</li>
          <li>pedir a portabilidade dos dados;</li>
          <li>saber com quem compartilhamos seus dados;</li>
          <li>revogar o consentimento, quando ele for a base do tratamento.</li>
        </ul>
        <p>
          Para os demais pedidos, escreva para {mail} a partir do e-mail da sua conta. Respondemos em até 15 dias. Você também pode remover o acesso do{" "}
          {BRAND} à sua conta Google em{" "}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
            myaccount.google.com/permissions
          </a>{" "}
          e, se achar necessário, falar com a Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </Section>

      <Section title="10. Segurança">
        <p>
          Todo o tráfego usa conexão criptografada (HTTPS). No banco de dados, regras de acesso garantem que só você consegue alterar
          sua vitrine e ver suas métricas. Nenhum sistema é totalmente imune a falhas; se acontecer um incidente que afete seus dados,
          avisaremos você e a ANPD como a lei determina.
        </p>
      </Section>

      <Section title="11. Menores de idade">
        <p>
          Para criar uma vitrine é preciso ter 18 anos ou mais, ou autorização dos pais ou responsáveis. Visitar vitrines não exige
          cadastro.
        </p>
      </Section>

      <Section title="12. Mudanças nesta política">
        <p>
          Podemos atualizar esta política. A data no topo mostra a versão em vigor e, se a mudança for importante, avisaremos pelo
          e-mail da sua conta. Veja também os <Link href="/termos">Termos de Uso</Link>.
        </p>
      </Section>

      <Section title="13. Contato">
        <p>Dúvidas, pedidos ou reclamações sobre privacidade: {mail}.</p>
      </Section>
    </LegalPage>
  );
}
