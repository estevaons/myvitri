import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { HOST } from "@/lib/brand";
import { summarizeVitrine, type HomeCreator, type HomeKit } from "@/lib/vitrine/data";
import type { VitrineContent } from "@/lib/vitrine/types";
import { kicker, pad, pillDark, pillLight, SectionHead, SiteFooter, SiteHeader } from "./chrome";
import { CopyLinkButton } from "./CopyLinkButton";
import { CreatorCard, CreatorCover } from "./CreatorCard";
import { HomeSearch } from "./HomeSearch";
import { KitCard } from "./KitCard";
import { Marquee } from "./Marquee";

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

/** Home de quem entrou: saudação e busca, a própria vitrine (ou o convite) e os carrosséis. */
export function HomeView({
  name,
  vitrine,
  ranked,
  creators,
  kits,
}: {
  name: string;
  vitrine: VitrineContent | null;
  ranked: boolean;
  creators: HomeCreator[];
  kits: HomeKit[];
}) {
  return (
    <div className="overflow-hidden bg-white text-ink">
      {/* sem links para a landing: com sessão, o proxy traz quem abre / de volta para cá */}
      <SiteHeader
        links={[]}
        action={
          <form action={signOutAction}>
            <button type="submit" className={pillLight}>
              Sair
            </button>
          </form>
        }
      />

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-14 pt-16 md:gap-20 md:pt-28 ${pad}`}>
        <div className="flex flex-col gap-5">
          <span className={`${kicker} text-gold`}>Sua home</span>
          <h1 className="m-0 font-display text-[clamp(48px,6.8vw,100px)] leading-[1] font-normal tracking-[-0.01em]">
            Olá, <em>{name}</em>
          </h1>
          <p className="m-0 max-w-[32rem] text-[17px] leading-relaxed text-mute">
            Encontre os achados de quem você segue: busque por uma pessoa, uma marca ou um produto.
          </p>
        </div>
        <div className="max-w-[60rem]">
          <HomeSearch />
        </div>
      </section>

      {vitrine ? <YourVitrine vitrine={vitrine} /> : <CreateVitrine />}
      {/* métricas dos últimos 7 dias e avisos de cupom (quem tem vitrine) entram aqui */}

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

      <SiteFooter />
    </div>
  );
}
