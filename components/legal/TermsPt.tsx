import { Link } from "@/lib/i18n/navigation";
import { LegalPage, Section } from "@/components/home/LegalPage";
import { BRAND, CONTACT_EMAIL, HOST } from "@/lib/brand";

/** Termos de Uso em português, a versão que vale (veja TermsEn). */
const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export function TermsPt({ updated }: { updated: string }) {
  return (
    <LegalPage
      title="Termos de Uso"
      updated={updated}
      intro={
        <p className="m-0">
          Estes termos valem para quem usa o {BRAND} ({HOST}), seja para criar uma vitrine ou para visitar uma. Ao usar o site, você
          concorda com eles e com a nossa <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
      }
    >
      <Section title="1. O que é o MyVitri">
        <p>
          O {BRAND} permite que qualquer pessoa monte uma vitrine pública, com um link próprio, reunindo os cupons de desconto, os produtos e
          os outfits que indicam. Quem visita a vitrine pode copiar cupons e seguir para a loja da marca. Hoje o serviço é gratuito; se
          algum recurso passar a ser pago, avisaremos antes.
        </p>
      </Section>

      <Section title="2. Sua conta">
        <ul>
          <li>Para criar uma vitrine, seguir vitrines ou comentar você entra com sua conta Google ou com e-mail e senha e precisa ter 18 anos ou mais, ou autorização dos responsáveis.</li>
          <li>Cada conta tem uma vitrine e um link. Você é responsável por tudo o que acontece na sua conta.</li>
          <li>
            Alguns links são reservados. Podemos recuperar um link que se passe por outra pessoa ou marca, ou que viole direitos de
            terceiros.
          </li>
        </ul>
      </Section>

      <Section title="3. O conteúdo da sua vitrine">
        <ul>
          <li>
            Você é responsável pelos cupons, preços, produtos, textos, imagens e links que publica, e garante que tem o direito de
            divulgá-los. Nas fotos de outfits, publique só imagens suas ou que você tenha autorização para usar, inclusive das pessoas que
            aparecem nelas.
          </li>
          <li>
            Quando a indicação for publicidade (paga, com permuta ou com comissão), siga as regras de identificação de publicidade do
            Código de Defesa do Consumidor e do CONAR.
          </li>
          <li>
            O conteúdo continua sendo seu. Você nos autoriza a guardá-lo, exibi-lo na sua vitrine e em áreas de descoberta do site (como
            a página inicial) e a gerar imagens de divulgação com ele, enquanto a vitrine estiver publicada.
          </li>
        </ul>
      </Section>

      <Section title="4. Comentários">
        <ul>
          <li>Comentários e respostas são públicos e aparecem com o seu nome e, se você entrar com o Google, a sua foto de perfil. Você é responsável pelo que escreve.</li>
          <li>
            Você pode apagar seus comentários quando quiser. Quem é dono da vitrine também pode apagar qualquer comentário dela. Apagar um
            comentário apaga também as respostas dele.
          </li>
        </ul>
      </Section>

      <Section title="5. Cupons, preços e compras">
        <p>
          O {BRAND} não vende produtos e não participa das compras. Cupons, preços e disponibilidade são informados por quem é dono de cada vitrine e
          podem mudar ou deixar de valer na loja da marca a qualquer momento. A compra, o pagamento, a entrega, as trocas e as
          devoluções são de responsabilidade da loja onde você comprar. Confira sempre o preço final antes de pagar.
        </p>
      </Section>

      <Section title="6. Links de afiliado e métricas">
        <p>
          Os links para lojas podem ser links de afiliado de quem é dono da vitrine ou levar parâmetros de campanha (UTM) que identificam a vitrine de
          origem. Quem é dono da vitrine pode receber comissão pelas vendas. Contamos visitas e cliques de forma anônima para mostrar métricas a
          quem é dono da vitrine, como explicado na <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
      </Section>

      <Section title="7. O que não é permitido">
        <ul>
          <li>Publicar conteúdo ilegal, enganoso, ofensivo ou que viole direitos de terceiros, como marcas e direitos autorais.</li>
          <li>Divulgar cupons falsos ou preços que você sabe estarem errados.</li>
          <li>Usar links que levem a golpes, malware ou páginas que tentem coletar dados de forma indevida.</li>
          <li>Se passar por outra pessoa ou marca.</li>
          <li>Tentar acessar contas de outras pessoas, sobrecarregar o site ou coletar dados dele de forma automatizada sem autorização.</li>
        </ul>
      </Section>

      <Section title="8. Suspensão e encerramento">
        <p>
          Você pode deixar de usar o {BRAND} quando quiser e excluir sua conta nas Configurações (no menu da sua foto, “Excluir minha conta”). A exclusão
          apaga na hora a vitrine e todo o seu conteúdo e não pode ser desfeita; o link fica livre para outra pessoa. Também dá para
          pedir a exclusão por {mail}. Podemos remover conteúdo, suspender ou encerrar contas que violem estes termos ou a lei,
          avisando quando possível.
        </p>
      </Section>

      <Section title="9. Responsabilidade">
        <p>
          Trabalhamos para manter o site disponível e funcionando bem, mas ele é oferecido no estado em que se encontra e pode ter
          interrupções. Na medida permitida pela lei, o {BRAND} não responde por cupons, preços ou produtos divulgados nas vitrines,
          nem por compras feitas nas lojas. Nada nestes termos limita direitos que a lei garante ao consumidor.
        </p>
      </Section>

      <Section title="10. Marca">
        <p>O nome {BRAND}, o logotipo e o visual do site pertencem ao {BRAND} e não podem ser usados sem autorização.</p>
      </Section>

      <Section title="11. Mudanças nestes termos">
        <p>
          Podemos atualizar estes termos. A data no topo mostra a versão em vigor e, se a mudança for importante, avisaremos pelo e-mail
          da sua conta antes de ela valer.
        </p>
      </Section>

      <Section title="12. Lei aplicável">
        <p>
          Estes termos seguem as leis do Brasil. Fica eleito o foro do domicílio do usuário quando ele for consumidor, nos termos do
          Código de Defesa do Consumidor.
        </p>
      </Section>

      <Section title="13. Contato">
        <p>Dúvidas sobre estes termos: {mail}.</p>
      </Section>
    </LegalPage>
  );
}
