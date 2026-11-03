import Link from "next/link";
import { CategoryShop } from "@/components/home/CategoryShop";
import { pad, pillDark, pillLight, SectionHead, SiteFooter, SiteHeader } from "@/components/home/chrome";
import { ProductArt, ProductIcon } from "@/components/storefront/ProductIcon";
import { getHomeFeed, type HomeCreator, type HomeFeed } from "@/lib/vitrine/data";
import { couponBadge, couponOff, expiryLabel } from "@/lib/vitrine/pricing";
import type { IconId } from "@/lib/vitrine/types";

/**
 * Home de quem compra: descobrir creators, cupons ativos, achados por categoria e marcas.
 * A página de venda para creators fica em /para-creators.
 */

const EMPTY: HomeFeed = { creators: [], coupons: [], products: [], brands: [], today: "" };
const HERO_ICONS: IconId[] = ["Shoe", "Bikini", "Glasses", "Bottle"];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

function Avatar({ name, url, className }: { name: string; url: string; className: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- avatar vem de URL arbitrária
    return <img src={url} alt="" className={`${className} object-cover`} />;
  }
  return (
    <span aria-hidden="true" className={`${className} flex items-center justify-center bg-white font-semibold text-ink`}>
      {initials(name) || "?"}
    </span>
  );
}

function CreatorCard({ c }: { c: HomeCreator }) {
  return (
    <Link href={`/${c.handle}`} className="group flex min-w-0 flex-col text-ink no-underline">
      <div aria-hidden="true" className="relative aspect-[3/4] overflow-hidden bg-soft">
        {c.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- capa vem de URL arbitrária
          <img src={c.bannerUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid size-full grid-cols-2 grid-rows-2 gap-px bg-white">
            {Array.from({ length: 4 }, (_, i) => c.art[i]).map((p, i) => (
              <div key={p?.id ?? i} className="relative flex items-center justify-center overflow-hidden bg-soft">
                {p && <ProductArt product={p} iconClassName="w-[56%]" strokeWidth={3.6} />}
              </div>
            ))}
          </div>
        )}
        {c.best && <span className="absolute top-3 left-3 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-sale">Até {c.best}</span>}
        <Avatar name={c.creator} url={c.avatarUrl} className="absolute bottom-3 left-3 box-border size-12 rounded-full border-2 border-white text-sm" />
      </div>
      <span className="pt-3 text-[17px] font-medium group-hover:underline group-hover:underline-offset-2">{c.creator}</span>
      <span className="text-[15px] text-mute">
        @{c.handle}
        {c.coupons > 0 && ` · ${c.coupons} ${c.coupons === 1 ? "cupom" : "cupons"}`}
      </span>
    </Link>
  );
}

export default async function Home() {
  const feed = await getHomeFeed().catch((e) => {
    // sem banco a home ainda abre, só sem as seções com dados
    console.error("getHomeFeed", e);
    return EMPTY;
  });
  const { creators, coupons, products, brands, today } = feed;
  const hero = products.slice(0, 4);
  const best = Math.max(0, ...coupons.filter((c) => c.kind === "percent").map((c) => c.value));

  return (
    <div className="overflow-hidden bg-white text-ink">
      <div className="bg-soft px-5 py-2.5 text-center text-[13px] leading-snug">
        <span className="font-medium">{best ? `Até ${best}% OFF com os cupons de quem você segue.` : "Cupons de desconto de quem você segue."}</span>{" "}
        <Link href={coupons.length ? "#cupons" : "/marinacosta"} className="font-medium text-inherit underline underline-offset-2">
          {coupons.length ? "Ver cupons ativos" : "Ver uma vitrine"}
        </Link>
      </div>

      <SiteHeader
        links={[
          ["#creators", "Creators"],
          ["#categorias", "Categorias"],
          ["/para-creators", "Para creators"],
        ]}
      />

      <section className={`mx-auto grid max-w-[1440px] items-center gap-10 pt-6 md:grid-cols-[1.1fr_1fr] md:gap-12 md:pt-10 ${pad}`}>
        <div className="flex flex-col items-start gap-5">
          <span className="text-[15px] font-medium">Achados de quem usa de verdade</span>
          <h1 className="m-0 font-condensed text-[clamp(52px,8.4vw,120px)] leading-[0.96] font-extrabold tracking-[-0.01em] text-balance uppercase">
            Indicado por gente. Não pelo algoritmo.
          </h1>
          <p className="m-0 max-w-[32rem] text-[17px] leading-relaxed">
            Os produtos favoritos de quem você segue, com o preço já calculado com o cupom.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={creators.length ? "#creators" : "/marinacosta"} className={pillDark}>
              Explorar vitrines
            </Link>
            <Link href="/para-creators" className={`${pillLight} min-h-12`}>
              Sou creator
            </Link>
          </div>
        </div>
        <div aria-hidden="true" className="grid grid-cols-2 gap-1">
          {HERO_ICONS.map((icon, i) => {
            const p = hero[i];
            return (
              <div key={p?.id ?? icon} className="relative flex aspect-square items-center justify-center overflow-hidden bg-soft">
                {p ? <ProductArt product={p} iconClassName="w-[52%]" /> : <ProductIcon icon={icon} className="w-[52%]" />}
                {p?.coupon && (
                  <span className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-sale">
                    {couponBadge(p.coupon)} com {p.creator.split(" ")[0]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {creators.length > 0 && (
        <section id="creators" className={`mx-auto flex max-w-[1440px] scroll-mt-4 flex-col gap-8 pt-24 md:pt-32 ${pad}`}>
          <SectionHead kicker="Compre por" title="Creators" text="Entre na vitrine de quem você confia e veja tudo o que essa pessoa usa, com os cupons de cada marca." />
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-4">
            {creators.map((c) => (
              <CreatorCard key={c.handle} c={c} />
            ))}
            <Link href="/para-creators" className="group flex min-w-0 flex-col text-ink no-underline">
              <div className="flex aspect-[3/4] flex-col justify-between bg-ink p-5 text-white md:p-6">
                <span className="text-[13px] font-medium text-white/70">Você cria conteúdo?</span>
                <span className="font-condensed text-[clamp(34px,4vw,56px)] leading-[0.9] font-extrabold uppercase">Sua vitrine aqui</span>
                <span className="flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-[15px] font-medium text-ink group-hover:bg-soft">
                  Criar grátis
                </span>
              </div>
              <span className="pt-3 text-[17px] font-medium">Monte a sua em 2 minutos</span>
              <span className="text-[15px] text-mute">vitri.me/seunome</span>
            </Link>
          </div>
        </section>
      )}

      {coupons.length > 0 && (
        <section id="cupons" className={`mx-auto flex max-w-[1440px] scroll-mt-4 flex-col gap-8 pt-24 md:pt-32 ${pad}`}>
          <SectionHead kicker="Compre com" title="Cupons ativos" text="Os descontos que estão valendo agora. Abra a vitrine para copiar o código." />
          <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:px-0">
            {coupons.map((c) => (
              <Link
                key={`${c.handle}:${c.id}`}
                href={`/${c.handle}#cupons`}
                className="box-border flex min-h-[260px] w-[78%] flex-none snap-start flex-col gap-4 bg-soft p-6 text-ink no-underline hover:bg-line md:w-auto"
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    {c.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária
                      <img src={c.logoUrl} alt="" loading="lazy" className="size-8 flex-none rounded-full bg-white object-contain" />
                    )}
                    <span className="truncate text-[15px] font-medium">{c.brand}</span>
                  </span>
                  <span className="flex-none text-[13px] text-mute">{expiryLabel(c, today)}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="font-condensed text-[56px] leading-[0.9] font-extrabold uppercase">{couponOff(c)}</span>
                  {c.condition && <span className="text-[15px] leading-snug text-mute">{c.condition}</span>}
                </div>
                <span className="mt-auto flex items-center justify-between gap-3 border-t border-[#DADADA] pt-4 text-[13px]">
                  <span className="truncate">
                    com <span className="font-medium">{c.creator}</span>
                  </span>
                  <span className="flex-none font-medium underline underline-offset-2">Pegar cupom</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={`mx-auto max-w-[1440px] pt-24 md:pt-32 ${pad}`}>
        <div className="flex flex-col items-center gap-5 bg-ink px-6 py-20 text-center text-white max-md:py-14">
          <h2 className="m-0 max-w-[14ch] font-condensed text-[clamp(44px,6.4vw,88px)] leading-[0.88] font-extrabold text-balance uppercase">
            O que é bom merece ser dividido
          </h2>
          <p className="m-0 max-w-[30rem] text-[17px] leading-relaxed text-white/75">
            Junte seus cupons e produtos favoritos num link só e pare de responder “qual é o cupom?” no direct.
          </p>
          <Link href="/para-creators" className="mt-2 flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-[15px] font-medium text-ink no-underline hover:bg-soft">
            Criar minha vitrine
          </Link>
        </div>
      </section>

      {products.length > 0 && (
        <section id="categorias" className={`mx-auto flex max-w-[1440px] scroll-mt-4 flex-col gap-8 pt-24 md:pt-32 ${pad}`}>
          <SectionHead kicker="Compre por" title="Categoria" text="Escolha uma categoria e veja os achados de cada vitrine, com o desconto já no preço." />
          <CategoryShop products={products} />
        </section>
      )}

      {brands.length > 0 && (
        <section id="marcas" className={`mx-auto flex max-w-[1440px] scroll-mt-4 flex-col gap-8 pt-24 md:pt-32 ${pad}`}>
          <SectionHead kicker="Compre por" title="Marca" text="As marcas mais indicadas e o melhor cupom de cada uma." />
          <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
            {brands.map((b) => (
              <Link key={b.brand} href={`/${b.handle}#cupons`} className="group flex aspect-[4/3] flex-col justify-between bg-soft p-4 text-ink no-underline hover:bg-line md:p-6">
                <span className="text-[13px] text-mute">
                  {b.creators > 1 ? `${b.creators} creators indicam` : b.creator}
                </span>
                <span className="flex min-w-0 items-center gap-3">
                  {b.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária
                    <img src={b.logoUrl} alt="" loading="lazy" className="size-10 flex-none rounded-full bg-white object-contain" />
                  )}
                  <span className="font-condensed text-[clamp(24px,2.6vw,36px)] leading-[0.95] font-extrabold uppercase">{b.brand}</span>
                </span>
                <span className="text-[15px] font-medium text-sale">Até {couponOff(b.best)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
