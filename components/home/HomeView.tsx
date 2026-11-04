import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { LoginButton } from "@/components/auth/forms";
import { HOST } from "@/lib/brand";
import { summarizeVitrine, type HomeCreator, type HomeKit } from "@/lib/vitrine/data";
import type { VitrineContent } from "@/lib/vitrine/types";
import { kicker, pad, pillDark, pillLight, SectionHead, SiteFooter, SiteHeader } from "./chrome";
import { CopyLinkButton } from "./CopyLinkButton";
import { CreatorCard, CreatorCover } from "./CreatorCard";
import { HomeSearch } from "./HomeSearch";
import { KitCard } from "./KitCard";
import { Marquee } from "./Marquee";
import type { TabId, TabParams } from "./catalog/params";
import { TabNav } from "./catalog/ui";
import { KitsTab } from "./tabs/KitsTab";
import { MarcasTab } from "./tabs/MarcasTab";
import { ProdutosTab } from "./tabs/ProdutosTab";
import { VitrinesTab } from "./tabs/VitrinesTab";

/** Espaço entre as seções, o mesmo da landing. */
const section = `mx-auto flex max-w-[1440px] flex-col pt-24 md:pt-32`;

function Stat({ n, one, many }: { n: number; one: string; many: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className={`${kicker} order-2 text-[11px] text-mute`}>{n === 1 ? one : many}</dt>
      <dd className="order-1 m-0 font-display text-[clamp(40px,4.4vw,60px)] leading-[0.95] lining-nums">{n}</dd>
    </div>
  );
}

/**
 * A própria vitrine como uma matéria de revista: a capa à esquerda e, ao lado, o nome, o endereço,
 * os números e o que dá para fazer com ela.
 */
function YourVitrine({ vitrine }: { vitrine: VitrineContent }) {
  const card = summarizeVitrine(vitrine);
  return (
    <section aria-labelledby="sua-vitrine" className={`${section} ${pad}`}>
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-16 lg:gap-24">
        <Link href={`/${vitrine.handle}`} target="_blank" rel="noopener" aria-label={`Abrir a vitrine ${vitrine.name}`} className="group block">
          <CreatorCover c={card} caption={false} />
        </Link>
        <div className="flex min-w-0 flex-col items-start gap-8">
          <div className="flex min-w-0 flex-col gap-4">
            <span className={`${kicker} text-gold`}>Sua vitrine</span>
            <h2 id="sua-vitrine" className="m-0 font-display text-[clamp(44px,5.6vw,84px)] leading-[1] font-normal break-words text-balance">
              {vitrine.name}
            </h2>
            <span className="text-[16px] text-mute">
              {HOST}/<em className="font-display text-[1.3em] leading-none text-ink">{vitrine.handle}</em>
            </span>
          </div>
          <dl className="m-0 grid w-full grid-cols-3 gap-6 border-y border-sand py-6">
            <Stat n={card.products} one="Produto" many="Produtos" />
            <Stat n={card.coupons} one="Cupom ativo" many="Cupons ativos" />
            <Stat n={vitrine.kits.length} one="Kit" many="Kits" />
          </dl>
          <div className="flex flex-wrap gap-2">
            <Link href="/editor" className={pillDark}>
              Editar vitrine
            </Link>
            <a href={`/${vitrine.handle}`} target="_blank" rel="noopener" className={pillLight}>
              Ver vitrine
            </a>
            <CopyLinkButton handle={vitrine.handle} />
            <Link href="/metricas" className={pillLight}>
              Ver métricas
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Quem ainda não tem vitrine: o mesmo bloco areia da landing, com o convite. */
function CreateVitrine() {
  return (
    <section className={`${section} ${pad}`}>
      <div className="flex flex-col items-center gap-5 bg-sand px-6 py-20 text-center max-md:py-14">
        <span className={`${kicker} text-gold`}>Você cria conteúdo?</span>
        <h2 className="m-0 max-w-[16ch] font-display text-[clamp(40px,5.6vw,76px)] leading-[1.04] font-normal text-balance">
          Monte sua vitrine <em>também</em>
        </h2>
        <p className="m-0 max-w-[30rem] text-[17px] leading-relaxed text-ink/70">
          Junte num link só os cupons e produtos que você usa e indica. É grátis e fica pronta em 2 minutos.
        </p>
        <Link href="/criar-vitrine" className={`${pillDark} mt-2`}>
          Criar minha vitrine
        </Link>
        <span className="text-[15px] text-mute">{HOST}/seunome</span>
      </div>
    </section>
  );
}

/** "Para você": a própria vitrine (ou o convite) e os carrosséis. */
export type ForYou = { vitrine: VitrineContent | null; ranked: boolean; creators: HomeCreator[]; kits: HomeKit[] };

/**
 * Home de quem entrou: saudação e busca, as abas e o conteúdo da aba atual. `forYou` só vem
 * carregado na aba "Para você"; as outras buscam os próprios dados a partir dos filtros da URL.
 */
export function HomeView({
  name,
  tab,
  params,
  forYou,
  loginError = false,
}: {
  /** null: quem ainda não entrou (visitante, vindo do "Explorar vitrines" da landing) */
  name: string | null;
  tab: TabId;
  params: TabParams;
  forYou: ForYou | null;
  /** a volta do Google falhou (?erro=login) */
  loginError?: boolean;
}) {
  const guest = name === null;
  return (
    // clip, e não hidden: hidden faz desta div a área de rolagem e as abas param de ficar presas no topo
    <div className="overflow-x-clip bg-white text-ink">
      {/* sem links para a landing: com sessão, o proxy traz quem abre / de volta para cá */}
      <SiteHeader
        links={[]}
        action={
          guest ? (
            // o mesmo par da landing; no celular os dois encolhem para caber ao lado da marca
            <div className="flex items-center gap-3 md:gap-2">
              <LoginButton className={`${kicker} whitespace-nowrap text-ink hover:text-gold max-md:text-[11px] max-md:tracking-[0.12em] md:px-2`} />
              <Link href="/criar-vitrine" className={`${pillDark} whitespace-nowrap max-md:min-h-10 max-md:px-3.5 max-md:text-[11px] max-md:tracking-[0.12em]`}>
                Criar conta
              </Link>
            </div>
          ) : (
            <form action={signOutAction}>
              <button type="submit" className={pillLight}>
                Sair
              </button>
            </form>
          )
        }
      />

      {loginError && (
        <div role="alert" className={`mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 bg-cream py-3 text-[15px] ${pad}`}>
          <span>O login com o Google não foi concluído.</span>
          <LoginButton className={`${kicker} text-[11px] text-ink underline underline-offset-4 hover:text-gold`}>Tentar de novo</LoginButton>
        </div>
      )}

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-14 pt-16 md:gap-20 md:pt-28 ${pad}`}>
        <div className="flex flex-col gap-5">
          <span className={`${kicker} text-gold`}>{guest ? "Explorar" : "Sua home"}</span>
          <h1 className="m-0 font-display text-[clamp(48px,6.8vw,100px)] leading-[1] font-normal tracking-[-0.01em]">
            {guest ? (
              <>
                Achados de <em>quem você segue</em>
              </>
            ) : (
              <>
                Olá, <em>{name}</em>
              </>
            )}
          </h1>
          <p className="m-0 max-w-[32rem] text-[17px] leading-relaxed text-mute">
            {guest
              ? "Vitrines, produtos, kits e os cupons de cada marca, reunidos num lugar só. Busque por uma pessoa, uma marca ou um produto."
              : "Encontre os achados de quem você segue: busque por uma pessoa, uma marca ou um produto."}
          </p>
        </div>
        <div className="max-w-[60rem]">
          <HomeSearch />
        </div>
      </section>

      {/* espaço antes das abas como irmão, não em volta: o sticky só prende dentro do próprio pai */}
      <div aria-hidden="true" className="h-16 md:h-24" />
      <TabNav current={tab} />

      {tab === "para-voce" && forYou && <ForYouTab {...forYou} />}
      {tab === "vitrines" && <VitrinesTab params={params} guest={guest} />}
      {tab === "produtos" && <ProdutosTab params={params} guest={guest} />}
      {tab === "kits" && <KitsTab params={params} guest={guest} />}
      {tab === "marcas" && <MarcasTab params={params} guest={guest} />}

      <SiteFooter />
    </div>
  );
}

function ForYouTab({ vitrine, ranked, creators, kits }: ForYou) {
  return (
    <>
      {vitrine ? <YourVitrine vitrine={vitrine} /> : <CreateVitrine />}

      {creators.length > 0 && (
        <section className={`${section} gap-10`}>
          <div className={pad}>
            <SectionHead
              kicker={ranked ? "Em alta hoje" : "Acabaram de publicar"}
              title={ranked ? "Creators do dia" : "Vitrines novas"}
              text={ranked ? "As vitrines que mais receberam cliques hoje." : "As últimas vitrines a entrar no ar."}
            />
          </div>
          <Marquee label={ranked ? "Creators do dia" : "Vitrines novas"} className={pad} itemClassName="w-[220px] md:w-[300px]">
            {creators.map((c) => (
              <CreatorCard key={c.handle} c={c} />
            ))}
          </Marquee>
        </section>
      )}

      {kits.length > 0 && (
        <section className={`${section} gap-10`}>
          <div className={pad}>
            <SectionHead kicker="Acabaram de sair" title="Últimos kits" text="Combinações montadas por quem indica, com o preço já com o cupom." />
          </div>
          <Marquee label="Últimos kits" className={pad} itemClassName="w-[220px] md:w-[300px]">
            {kits.map((k) => (
              <KitCard key={k.id} k={k} />
            ))}
          </Marquee>
        </section>
      )}
    </>
  );
}
