import type { Metadata } from "next";
import Link from "next/link";
import { LoginButton } from "@/components/auth/forms";
import { CategoryShop } from "@/components/home/CategoryShop";
import { CreatorCard } from "@/components/home/CreatorCard";
import { CreatorPitch, FAQ } from "@/components/home/CreatorPitch";
import { kicker, pad, pillDark, pillLight, SectionHead, SiteFooter, SiteHeader } from "@/components/home/chrome";
import { LookHero } from "@/components/home/LookHero";
import { BRAND, HOST } from "@/lib/brand";
import { appJsonLd, DESCRIPTION, JsonLd, pageMeta, siteJsonLd } from "@/lib/seo";
import { getHomeFeed, type HomeFeed } from "@/lib/vitrine/data";
import { couponOff, expiryLabel } from "@/lib/vitrine/pricing";

/**
 * Landing: descobrir vitrines, cupons ativos, achados por categoria e marcas e, no fim, o que a
 * vitrine faz para quem divulga (com o FAQ). Quem já entrou não vê esta página: o proxy leva
 * para /inicio. /criar-vitrine é só o formulário de criar a conta.
 */

const TITLE = `${BRAND} | Cupons e achados de quem você segue`;
// título absoluto: na home o nome do site vem primeiro, sem o sufixo do template
export const metadata: Metadata = { ...pageMeta({ title: TITLE, description: DESCRIPTION, path: "/" }), title: { absolute: TITLE } };

const EMPTY: HomeFeed = { creators: [], coupons: [], products: [], brands: [], today: "" };

/** Respiro entre as seções da landing. */
const section = `mx-auto flex max-w-[1440px] scroll-mt-4 flex-col gap-8 pt-24 md:pt-32 ${pad}`;

export default async function Home() {
  const feed = await getHomeFeed().catch((e) => {
    // sem banco a home ainda abre, só sem as seções com dados
    console.error("getHomeFeed", e);
    return EMPTY;
  });
  const { creators, coupons, products, brands, today } = feed;

  return (
    <div className="overflow-hidden bg-white text-ink">
      <JsonLd data={siteJsonLd} />
      {/* o FAQ de quem divulga fica no fim desta página: os dados estruturados vêm junto */}
      <JsonLd data={appJsonLd(FAQ)} />
      <SiteHeader
        links={[
          // na ordem em que as seções aparecem na página
          ["#vitrines", "Vitrines"],
          ["#cupons", "Cupons"],
          ["#categorias", "Categorias"],
          ["#marcas", "Marcas"],
        ]}
        action={
          // no celular os dois encolhem (espaçamento das letras menor) para caber ao lado da marca
          <div className="flex items-center gap-3 md:gap-2">
            <LoginButton className={`${kicker} whitespace-nowrap text-ink hover:text-gold max-md:text-[11px] max-md:tracking-[0.12em] md:px-2`} />
            <Link href="/criar-vitrine" className={`${pillDark} whitespace-nowrap max-md:min-h-10 max-md:px-3.5 max-md:text-[11px] max-md:tracking-[0.12em]`}>
              Criar conta
            </Link>
          </div>
        }
      />

      <section>
        {/* A foto ocupa o hero de ponta a ponta. A altura desconta o header, para o hero fechar a primeira tela.
            O teto acompanha a largura (56vw): numa tela larga a foto cresce junto, e com a altura presa ela só cortaria mais, deixando a pessoa enorme e sem a bolsa.
            Em janela estreita e alta o teto de 860px deixa a seção seguinte aparecer, em vez de esticar a foto. */}
        <div className="relative mx-auto max-w-[2560px] overflow-hidden lg:h-[clamp(480px,calc(100svh-81px),max(860px,56vw))]">
          <div className={`relative z-10 mx-auto flex h-full max-w-[1440px] flex-col items-start justify-center gap-4 py-8 md:py-10 lg:py-6 ${pad}`}>
            {/* sobre a parede da foto o dourado perde contraste: do lg em diante o texto é todo preto */}
            <span className={`${kicker} text-gold lg:text-ink`}>Achados de quem usa de verdade</span>
            {/* no lg a largura em em quebra cada frase em duas linhas, à esquerda da pessoa na foto; a altura também limita a fonte, para caber em tela baixa */}
            <h1 className="m-0 font-display text-[clamp(44px,12vw,76px)] leading-[0.98] font-normal tracking-[-0.01em] lg:max-w-[5.6em] lg:text-[clamp(52px,min(6.4vw,10svh),96px)]">
              Indicado por gente. <em className="font-normal lg:block">Não pelo algoritmo.</em>
            </h1>
            <p className="m-0 max-w-[32rem] text-[17px] leading-relaxed text-mute lg:max-w-[20rem] lg:text-ink xl:max-w-[24rem]">
              {/* "vitri" em serifa itálica: o nome da marca escondido na palavra */}
              Veja o que quem você segue usa de verdade, reunido na{" "}
              <span className="whitespace-nowrap">
                <em className="font-display text-[1.34em] leading-none text-gold lg:text-ink">vitri</em>ne
              </span>{" "}
              de cada um.
            </p>
            {/* botões mais estreitos em duas situações: no celular, para caberem lado a lado; no lg ainda estreito, para o segundo não encostar na pessoa da foto */}
            <div className="mt-1 flex w-full flex-wrap gap-2">
              <Link href="/criar-vitrine" className={`${pillDark} whitespace-nowrap max-sm:flex-1 max-sm:px-3 max-sm:tracking-[0.12em] lg:max-xl:px-4`}>
                Criar vitrine
              </Link>
              {creators.length > 0 && (
                <a href="#vitrines" className={`${pillLight} whitespace-nowrap max-sm:flex-1 max-sm:px-3 max-sm:tracking-[0.12em] lg:bg-white/60 lg:max-xl:px-4`}>
                  Explorar vitrines
                </a>
              )}
            </div>
          </div>
          <LookHero />
        </div>
      </section>

      {creators.length > 0 && (
        <section id="vitrines" className={section}>
          <SectionHead kicker="Explore as" title="Vitrines" text="Entre na vitrine de quem você confia e veja tudo o que essa pessoa usa e recomenda." />
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-4">
            {creators.map((c) => (
              <CreatorCard key={c.handle} c={c} />
            ))}
            <Link href="/criar-vitrine" className="group flex min-w-0 flex-col text-ink no-underline">
              {/* em telas menores o card é estreito: título sem o "aqui" e tamanhos menores, para caber no quadrado */}
              <div className="flex aspect-square flex-col justify-between bg-sand p-4 xl:p-6">
                <span className={`${kicker} text-[11px] text-gold`}>Você cria conteúdo?</span>
                <span className="font-display text-[30px] leading-[1] font-normal md:max-lg:text-[26px] xl:text-[clamp(36px,4vw,56px)]">
                  Sua vitrine<span className="max-xl:hidden"> <em>aqui</em></span>
                </span>
                <span className={`flex min-h-10 items-center justify-center bg-ink px-4 ${kicker} text-[11px] text-white group-hover:bg-[#2b2925] xl:min-h-11`}>
                  Criar grátis
                </span>
              </div>
              <span className="pt-3 text-[16px]">Monte a sua em 2 minutos</span>
              <span className="text-[15px] text-mute">{HOST}/seunome</span>
            </Link>
          </div>
        </section>
      )}

      {coupons.length > 0 && (
        <section id="cupons" className={section}>
          <SectionHead kicker="Compre com" title="Cupons ativos" text="Os descontos que estão valendo agora. Abra a vitrine para copiar o código." />
          <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:px-0">
            {coupons.map((c) => (
              <Link
                key={`${c.handle}:${c.id}`}
                href={`/${c.handle}#cupons`}
                className="box-border flex w-[68%] flex-none snap-start flex-col gap-4 border border-sand bg-cream p-5 text-ink no-underline hover:border-gold md:min-h-[260px] md:w-auto md:p-6"
              >
                <div className="flex min-w-0 flex-col items-start gap-1 md:flex-row md:items-center md:justify-between md:gap-3">
                  <span className="flex max-w-full min-w-0 items-center gap-2">
                    {c.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária
                      <img src={c.logoUrl} alt="" loading="lazy" className="size-8 flex-none rounded-full bg-white object-contain" />
                    )}
                    <span className="truncate text-[15px] font-medium">{c.brand}</span>
                  </span>
                  <span className="flex-none text-[13px] text-mute">{expiryLabel(c, today)}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="font-display text-[46px] leading-[0.95] font-normal lining-nums md:text-[58px]">{couponOff(c)}</span>
                  {c.condition && <span className="text-[15px] leading-snug text-mute">{c.condition}</span>}
                </div>
                <span className="mt-auto flex items-center justify-between gap-3 border-t border-sand pt-4 text-[13px]">
                  <span className="truncate">
                    com <span className="font-medium">{c.creator}</span>
                  </span>
                  <span className={`flex-none ${kicker} text-[11px] text-gold`}>Pegar cupom</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section id="categorias" className={section}>
          <SectionHead kicker="Compre por" title="Categoria" text="Escolha uma categoria e veja o que cada vitrine indica." />
          <CategoryShop products={products} />
        </section>
      )}

      {brands.length > 0 && (
        <section id="marcas" className={section}>
          <SectionHead kicker="Compre por" title="Marca" text="As marcas mais indicadas e o melhor cupom de cada uma." />
          <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
            {brands.map((b) => (
              <Link key={b.brand} href={`/${b.handle}#cupons`} className="group flex aspect-[4/3] flex-col justify-between bg-cream p-4 text-ink no-underline hover:bg-sand md:p-6">
                <span className="text-[13px] text-mute">
                  {b.creators > 1 ? `Em ${b.creators} vitrines` : b.creator}
                </span>
                <span className="flex min-w-0 items-center gap-3">
                  {b.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária
                    <img src={b.logoUrl} alt="" loading="lazy" className="size-10 flex-none rounded-full bg-white object-contain" />
                  )}
                  <span className="font-display text-[clamp(26px,2.6vw,38px)] leading-[1] font-normal">{b.brand}</span>
                </span>
                <span className={`${kicker} text-[11px] text-gold`}>Até {couponOff(b.best)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <CreatorPitch />

      <SiteFooter />
    </div>
  );
}
