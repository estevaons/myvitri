import { Link } from "@/lib/i18n/navigation";
import { LegalPage, Section } from "@/components/home/LegalPage";
import { BRAND, CONTACT_EMAIL, HOST } from "@/lib/brand";

/** Política de Privacidade em português, a versão que vale (veja PrivacyEn). */
const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export function PrivacyPt({ updated }: { updated: string }) {
  return (
    <LegalPage
      title="Política de Privacidade"
      updated={updated}
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
          <strong>Quem cria a conta com e-mail e senha.</strong> Recebemos seu nome e seu e-mail, que usamos também para confirmar a conta e
          enviar o link de senha nova. A senha fica guardada de forma cifrada pelo Supabase, e ninguém do {BRAND} consegue lê-la.
        </p>
        <p>
          <strong>Conteúdo da vitrine.</strong> O nome de exibição, o link escolhido, a foto, os textos, os links das suas redes sociais
          (Instagram, TikTok, YouTube e X), os cupons, os produtos, os links de loja e de afiliado e os outfits (a foto, a legenda e as
          peças marcadas) que você cadastra. Esse conteúdo foi feito para ser público e aparece para qualquer
          pessoa que abrir sua vitrine.
        </p>
        <p>
          <strong>Quem visita uma vitrine.</strong> Contamos visitas e cliques (por exemplo, “cupom copiado” ou “clique para ir à loja”)
          para mostrar métricas a quem é dono da vitrine. Cada registro guarda só o tipo do evento, o item clicado, a data e hora e um
          código anônimo do dia. Esse código é calculado a partir do endereço IP e do navegador, muda todo dia e é diferente em cada
          vitrine. Ele serve para a mesma pessoa abrindo a vitrine várias vezes no mesmo dia contar uma visita só, e não permite
          descobrir o endereço IP nem acompanhar alguém entre dias ou entre vitrines. Nesses registros não guardamos nome, e-mail nem
          endereço IP. Além disso, o site envia ao PostHog (veja o item 6) um registro de cada
          página aberta, com um identificador anônimo guardado no seu navegador. Esse identificador não tem nome nem e-mail, mas o PostHog
          recebe o endereço IP e dados técnicos do navegador junto com esses registros.
        </p>
        <p>
          <strong>Uso do site (PostHog).</strong> Para entender onde as pessoas clicam e como as páginas são usadas, o PostHog também
          registra: cliques em botões e links, com o texto visível do elemento clicado (por exemplo, “Copiar cupom”); cliques, movimentos
          do cursor e até onde a página foi rolada, usados nos mapas de calor; e medidas de desempenho do carregamento das páginas. Não
          gravamos a tela nem vídeos das sessões sem o seu consentimento (veja “Gravação de sessões” abaixo).
        </p>
        <p>
          <strong>Gravação de sessões (somente com consentimento).</strong> Para entender onde as pessoas travam, quem participa do programa de testes
          pode ter a navegação gravada pelo PostHog. A gravação só começa se você marcar, expressamente, a opção de aceitar gravação. Campos
          de digitação ficam mascarados, e o que você digita não aparece na gravação. Textos da tela, como nomes de vitrines e cupons, podem
          aparecer. Quem não consentiu não é gravado, e você pode retirar o consentimento a qualquer momento (veja o item 9).
        </p>
        <p>
          <strong>Estatísticas de uso do site.</strong> Usamos o Vercel Web Analytics e o Vercel Speed Insights para saber quais páginas
          são mais acessadas e se o site carrega rápido. Eles registram, de forma agregada, a página visitada, o site de origem, o país, o
          tipo de dispositivo, o navegador, o sistema operacional e medidas de desempenho da página. Não usam cookies e não identificam
          quem visita: a Vercel diferencia as visitas por um código temporário, descartado a cada dia.
        </p>
        <p>
          <strong>Quem segue vitrines ou comenta.</strong> Os mesmos dados do login. A lista das vitrines que você segue é privada para as outras pessoas, mas, ao seguir uma vitrine, quem é dono dela recebe uma notificação com o seu nome e, se você entrar com o Google, a sua foto de perfil (se você deixar de seguir, a notificação some). Ao comentar, quem é dono da vitrine também é notificado. Comentários
          e respostas são públicos: o texto aparece na vitrine com a data, o seu nome e, se você entrar com o Google, a sua foto de perfil, para qualquer pessoa
          que abrir a página. Você pode apagar seus comentários a qualquer momento, e quem é dono da vitrine também pode apagar os que
          estão nela. Apagar um comentário apaga também as respostas dele.
        </p>
        <p>
          <strong>Respostas do onboarding.</strong> Depois de criar a conta, pedimos algumas informações para entender quem usa o {BRAND}:
          se você é criador de conteúdo ou comprador; em quais redes publica (ou que tipo de produto procura); a faixa de audiência, os
          nichos e como chegou até nós; e se quer receber novidades por e-mail. Você pode pular essa etapa. As respostas ficam no seu
          perfil e são apagadas junto com a conta. Não pedimos CPF, telefone nem dados sensíveis. Se você escrever um texto na opção
          “Outro”, guardamos o texto como você escreveu, por isso não inclua dados pessoais nele.
        </p>
        <p>
          <strong>Origem da primeira visita.</strong> Para saber como as pessoas chegam ao {BRAND}, guardamos num cookie, por 30 dias, de
          onde veio a sua primeira visita: parâmetros de campanha (UTM), a vitrine que indicou o link, o domínio do site de origem e a
          página de entrada. Se você criar a conta, esses dados passam para o seu perfil. Nesse cookie não guardamos o endereço IP nem a
          URL completa de origem.
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
          <li>Guardar as vitrines que você segue e publicar seus comentários com seu nome e foto (execução do contrato).</li>
          <li>Falar com você sobre sua conta, mudanças importantes no serviço ou pedidos que você fizer (legítimo interesse).</li>
          <li>Entender, de forma agregada, como o site é usado e se ele carrega bem, para melhorá-lo (legítimo interesse).</li>
          <li>Entender como as pessoas chegam ao {BRAND} e usam o site, para melhorar o produto (legítimo interesse).</li>
          <li>Entender onde as pessoas travam, por meio de gravações de sessão, somente de quem consentiu (consentimento).</li>
          <li>Enviar novidades por e-mail apenas para quem aceitou receber (consentimento, que pode ser retirado a qualquer momento).</li>
          <li>Manter o site seguro, evitar abusos e cumprir obrigações legais.</li>
        </ul>
        <p>Não vendemos seus dados e não os usamos para publicidade. Quem visita uma vitrine não é identificado por nome ou e-mail.</p>
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
          <li>Cookies temporários que guardam o link escolhido (até 10 minutos, enquanto você entra) e a página para onde voltar (até 1 hora, no caso do link de senha nova).</li>
          <li>Um cookie que lembra o idioma do site que você escolheu por último (até 1 ano).</li>
          <li>
            Registros na sessão do navegador para não contar a mesma visita duas vezes, guardar o rascunho de um comentário e lembrar a
            vitrine que você quis seguir enquanto entra; eles somem quando a aba é fechada.
          </li>
          <li>Um cookie de origem (<code>vitri_ref</code>), que guarda de onde veio a primeira visita e expira em 30 dias (veja o item 2).</li>
          <li>Um identificador anônimo guardado pelo PostHog no armazenamento local do navegador (não é cookie), para reconhecer o navegador entre visitas.</li>
        </ul>
        <p>
          Não usamos cookies de publicidade. As estatísticas da Vercel (item 2) não usam cookies, e o PostHog guarda o identificador no
          armazenamento local do navegador, não em cookie.
        </p>
      </Section>

      <Section title="6. Com quem compartilhamos">
        <p>Compartilhamos dados apenas com empresas que nos ajudam a operar o serviço, e só o necessário para isso:</p>
        <ul>
          <li>
            <strong>Supabase</strong>: banco de dados e autenticação.
          </li>
          <li>
            <strong>Vercel</strong>: hospedagem do site e estatísticas de uso e de desempenho (Web Analytics e Speed Insights).
          </li>
          <li>
            <strong>Google</strong>: login com a conta Google.
          </li>
          <li>
            <strong>Brave Search, Google e o site da loja</strong>: quando você importa um produto por link, abrimos a página da loja e
            podemos consultar o Brave Search (com o endereço ou o nome do produto) e o serviço de ícones do Google (com o domínio da loja)
            para completar a foto e o logo. Nenhum dado pessoal seu é enviado.
          </li>
          <li>
            <strong>PostHog</strong>: medição do uso do site (páginas abertas, cliques, mapas de calor, desempenho, gravações de sessão de quem consentiu, eventos da seção 2 e a identificação de quem entra). Por
            padrão, os dados ficam em servidores nos Estados Unidos.
          </li>
        </ul>
        <p>
          Fotos de produtos e logos de marcas podem ser carregados direto dos sites das lojas ou do serviço de ícones do Google. Ao abrir
          uma vitrine, seu navegador se conecta a esses sites, que recebem dados técnicos como o endereço IP, conforme as políticas deles.
        </p>
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
          Mantemos os dados da sua conta e da sua vitrine enquanto a conta existir. Você pode excluir a conta quando quiser, nas Configurações
          (no menu da sua foto, “Excluir minha conta”): na mesma hora apagamos a conta, a vitrine, os cupons, os produtos, os outfits, as fotos
          enviadas, o rascunho, as métricas, as vitrines que você segue e os comentários que você escreveu, e o link fica livre. Se preferir, peça a exclusão por {mail} e fazemos em até 15 dias. Cópias de segurança do banco
          de dados e registros técnicos dos provedores são apagados automaticamente em prazos curtos. Só guardamos algo depois disso se
          a lei obrigar. Os dados do onboarding saem junto com a conta. Os eventos já enviados ao PostHog não são apagados automaticamente
          com a conta: seguem o prazo de retenção configurado no projeto, inclusive as gravações de sessão.
        </p>
      </Section>

      <Section title="9. Seus direitos">
        <p>Pela LGPD, você pode, a qualquer momento:</p>
        <ul>
          <li>confirmar se tratamos seus dados e pedir acesso a eles;</li>
          <li>corrigir dados incompletos ou desatualizados (a maior parte pode ser editada direto nas Configurações e no editor);</li>
          <li>excluir sua conta e seus dados por conta própria, nas Configurações (no menu da sua foto, “Excluir minha conta”);</li>
          <li>pedir a portabilidade dos dados;</li>
          <li>revisar ou remover as respostas do onboarding e os dados de origem da primeira visita;</li>
          <li>saber com quem compartilhamos seus dados;</li>
          <li>revogar o consentimento, quando ele for a base do tratamento, inclusive para as gravações de sessão.</li>
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
          Para criar uma vitrine, seguir vitrines ou comentar é preciso ter 18 anos ou mais, ou autorização dos pais ou responsáveis. Visitar
          vitrines não exige cadastro.
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
