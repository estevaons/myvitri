import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link, vitrineHref } from "@/lib/i18n/navigation";
import { LoginButton } from "@/components/auth/forms";
import { CategoryShop } from "@/components/home/CategoryShop";
import { CreatorMosaic } from "@/components/home/CreatorMosaic";
import { CreatorPitch, faqItems } from "@/components/home/CreatorPitch";
import { kicker, pad, pillDark, pillLight, SectionHead, SiteFooter, SiteHeader } from "@/components/home/chrome";
import { LookHero } from "@/components/home/LookHero";
import { ScrollHeader } from "@/components/home/ScrollHeader";
import { BRAND } from "@/lib/brand";
import { appJsonLd, JsonLd, pageMeta, siteJsonLd } from "@/lib/seo";
import { getHomeFeed, type HomeFeed } from "@/lib/vitrine/data";
import { couponOff } from "@/lib/vitrine/pricing";

/**
 * Landing: descobrir vitrines, cupons ativos, achados por categoria e marcas e, no fim, o que a
 * vitrine faz para quem divulga (com o FAQ). Quem já entrou não vê esta página: o proxy leva
 * para /inicio. /criar-vitrine é só o formulário de criar a conta.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.site");
  const title = t("title", { brand: BRAND });
  // título absoluto: na home o nome do site vem primeiro, sem o sufixo do template
  return { ...(await pageMeta({ title, description: t("description"), path: "/" })), title: { absolute: title } };
}

const EMPTY: HomeFeed = { creators: [], coupons: [], products: [], brands: [] };

/** Respiro entre as seções da landing. */
const section = `mx-auto flex max-w-[1440px] scroll-mt-4 flex-col gap-8 pt-24 md:pt-32 ${pad}`;

export default async function Home() {
  const [t, tCount, faq] = await Promise.all([getTranslations("landing"), getTranslations("counts"), faqItems()]);
  const feed = await getHomeFeed().catch((e) => {
    // sem banco a home ainda abre, só sem as seções com dados
    console.error("getHomeFeed", e);
    return EMPTY;
  });
  const { creators, coupons, products, brands } = feed;

  return (
    <div className="overflow-hidden bg-white text-ink">
      <JsonLd data={await siteJsonLd()} />
      {/* o FAQ de quem divulga fica no fim desta página: os dados estruturados vêm junto */}
      <JsonLd data={await appJsonLd(faq)} />
      <ScrollHeader>
        <SiteHeader
          links={[
            // na ordem em que as seções aparecem na página
            ["vitrines", t("nav.vitrines")],
            ["cupons", t("nav.coupons")],
            ["categorias", t("nav.categories")],
            ["marcas", t("nav.brands")],
          ]}
          action={
            // no celular os dois encolhem (espaçamento das letras menor) para caber ao lado da marca; o Entrar ganha a altura
            // do botão vizinho como área de toque, e o padding lateral dele faz o respiro entre os dois
            <div className="flex items-center gap-1 md:gap-2">
              <LoginButton className={`${kicker} flex min-h-10 items-center whitespace-nowrap px-2 text-ink hover:text-gold max-md:text-[11px] max-md:tracking-[0.12em]`} />
              <Link
                href="/criar-vitrine"
                className={`${pillDark} whitespace-nowrap transition-[min-height] duration-200 ease-out group-data-[compact]/header:min-h-10 motion-reduce:transition-none max-md:min-h-10 max-md:px-3.5 max-md:text-[11px] max-md:tracking-[0.12em]`}
              >
                {t("signUp")}
              </Link>
            </div>
          }
        />
      </ScrollHeader>

      <section>
        {/* A foto ocupa o hero de ponta a ponta. A altura desconta o header, para o hero fechar a primeira tela.
            O teto acompanha a largura (56vw): numa tela larga a foto cresce junto, e com a altura presa ela só cortaria mais, deixando a pessoa enorme e sem a bolsa.
            Em janela estreita e alta o teto de 860px deixa a seção seguinte aparecer, em vez de esticar a foto. */}
        <div className="relative mx-auto max-w-[2560px] overflow-hidden lg:h-[clamp(480px,calc(100svh-81px),max(860px,56vw))]">
          <div className={`relative z-10 mx-auto flex h-full max-w-[1440px] flex-col items-start justify-center gap-4 py-8 md:py-10 lg:py-6 ${pad}`}>
            {/* sobre a parede da foto o dourado perde contraste: do lg em diante o texto é todo preto */}
            <span className={`${kicker} text-gold lg:text-ink`}>{t("heroKicker")}</span>
            {/* Uma frase por linha, na parede, à esquerda da pessoa na foto. Acima de 1440px a coluna do texto anda para a direita mais rápido que a pessoa,
                então a fonte diminui com a largura até 56px (em 2560px, onde a foto para de crescer): sem isso o título encosta no ombro em janela baixa, em que ele fica na altura do blazer. A altura também limita, para caber em tela baixa. */}
            <h1 className="m-0 font-display text-[clamp(38px,10.8vw,76px)] leading-[0.98] font-normal tracking-[-0.01em] lg:text-[clamp(40px,min(4.6vw,10svh,max(56px,90px_-_1.34vw)),66px)]">
              <span className="block">{t("heroTitle")}</span> <em className="block font-normal">{t("heroTitleEm")}</em>
            </h1>
            <p className="m-0 max-w-[32rem] text-[17px] leading-relaxed text-mute lg:max-w-[20rem] lg:text-ink xl:max-w-[24rem]">
              {t("heroText")}
            </p>
            {/* botões mais estreitos em duas situações: no celular, para caberem lado a lado; no lg ainda estreito, para o segundo não encostar na pessoa da foto */}
            <div className="mt-1 flex w-full flex-wrap gap-2">
              <Link href="/criar-vitrine" className={`${pillDark} whitespace-nowrap max-sm:flex-1 max-sm:px-3 max-sm:tracking-[0.12em] lg:max-xl:px-4`}>
                {t("createVitrine")}
              </Link>
              {creators.length > 0 && (
                <a href="#vitrines" className={`${pillLight} whitespace-nowrap max-sm:flex-1 max-sm:px-3 max-sm:tracking-[0.12em] lg:bg-white/60 lg:max-xl:px-4`}>
                  {t("explore")}
                </a>
              )}
            </div>
          </div>
          <LookHero />
        </div>
      </section>

      {creators.length > 0 && (
        <section id="vitrines" className={section}>
          <SectionHead kicker={t("vitrines.kicker")} title={t("vitrines.title")} text={t("vitrines.text")} />
          <CreatorMosaic creators={creators} />
        </section>
      )}

      {coupons.length > 0 && (
        <section id="cupons" className={section}>
          <SectionHead kicker={t("coupons.kicker")} title={t("coupons.title")} text={t("coupons.text")} />
          <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:px-0">
            {coupons.map((c) => (
              <Link
                key={`${c.handle}:${c.id}`}
                href={vitrineHref(c.handle, "cupons")}
                className="box-border flex w-[68%] flex-none snap-start flex-col gap-4 border border-sand bg-cream p-5 text-ink no-underline hover:border-gold md:min-h-[260px] md:w-auto md:p-6"
              >
                <span className="flex max-w-full min-w-0 items-center gap-2">
                  {c.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária
                    <img src={c.logoUrl} alt="" loading="lazy" className="size-8 flex-none rounded-full bg-white object-contain" />
                  )}
                  <span className="truncate text-[15px] font-medium">{c.brand}</span>
                </span>
                <div className="flex flex-col gap-1.5">
                  <span className="font-display text-[46px] leading-[0.95] font-normal lining-nums md:text-[58px]">{couponOff(c)}</span>
                  {c.condition && <span className="text-[15px] leading-snug text-mute">{c.condition}</span>}
                </div>
                {/* no celular o card é estreito: o nome de quem divulga vai numa linha e o "pegar cupom" embaixo, em vez de virar "com ..." */}
                <span className="mt-auto flex items-center justify-between gap-3 border-t border-sand pt-4 text-[13px] max-md:flex-col max-md:items-start max-md:gap-2">
                  <span className="max-w-full truncate">
                    {t.rich("coupons.with", { creator: c.creator, b: (s) => <span className="font-medium">{s}</span> })}
                  </span>
                  <span className={`flex-none ${kicker} text-[11px] text-gold`}>{t("coupons.get")}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section id="categorias" className={section}>
          <SectionHead kicker={t("categories.kicker")} title={t("categories.title")} text={t("categories.text")} />
          <CategoryShop products={products} />
        </section>
      )}

      {brands.length > 0 && (
        <section id="marcas" className={section}>
          <SectionHead kicker={t("brands.kicker")} title={t("brands.title")} text={t("brands.text")} />
          <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
            {brands.map((b) => (
              <Link key={b.brand} href={vitrineHref(b.handle, b.best ? "cupons" : "produtos")} className="group flex aspect-[4/3] flex-col justify-between bg-cream p-4 text-ink no-underline hover:bg-sand md:p-6">
                <span className="text-[13px] text-mute">
                  {b.creators > 1 ? t("brands.inVitrines", { count: b.creators }) : b.creator}
                </span>
                <span className="flex min-w-0 items-center gap-3">
                  {b.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária
                    <img src={b.logoUrl} alt="" loading="lazy" className="size-10 flex-none rounded-full bg-white object-contain" />
                  )}
                  <span className="font-display text-[clamp(26px,2.6vw,38px)] leading-[1] font-normal">{b.brand}</span>
                </span>
                <span className={`${kicker} text-[11px] ${b.best ? "text-gold" : "text-mute"}`}>
                  {b.best ? t("brands.upTo", { off: couponOff(b.best) }) : tCount("products", { count: b.products })}
                </span>
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
