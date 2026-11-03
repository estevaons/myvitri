import Link from "next/link";
import { CategoryShop } from "@/components/home/CategoryShop";
import { pad, SectionHead, SiteFooter, SiteHeader } from "@/components/home/chrome";
import { ProductArt, ProductIcon } from "@/components/storefront/ProductIcon";
import { HOST } from "@/lib/brand";
import { getHomeFeed, type HomeCreator, type HomeFeed } from "@/lib/vitrine/data";
import { couponOff, expiryLabel } from "@/lib/vitrine/pricing";
import type { IconId } from "@/lib/vitrine/types";

/**
 * Home de quem compra: descobrir vitrines, cupons ativos, achados por categoria e marcas.
 * A página de venda para quem divulga fica em /criar-vitrine.
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

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function CreatorCard({ c }: { c: HomeCreator }) {
  // Foto de loja é quadrada: o card também é, e cada célula do mosaico fica quadrada como a foto.
  // Célula de outro formato sobra faixa do cinza do card em volta, que não bate com o fundo da foto.
  // Por isso é 2×2 com 4 produtos ou mais; com menos, só o primeiro ocupando o card todo.
  const art = c.art.slice(0, c.art.length >= 4 ? 4 : 1);
  const cover = Boolean(c.bannerUrl || art.length);
  const stats = [c.products > 0 && count(c.products, "produto", "produtos"), c.coupons > 0 && count(c.coupons, "cupom", "cupons")]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link href={`/${c.handle}`} className="group flex min-w-0 flex-col text-ink no-underline">
      <div className="relative aspect-square overflow-hidden bg-soft">
        {c.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- capa vem de URL arbitrária
          <img src={c.bannerUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          art.length > 0 && (
            <div aria-hidden="true" className={`grid size-full gap-px bg-white ${art.length === 4 ? "grid-cols-2 grid-rows-2" : "grid-cols-1"}`}>
              {art.map((p) => (
                <div key={p.id} className="relative flex items-center justify-center overflow-hidden bg-soft">
                  <ProductArt product={p} iconClassName={art.length === 1 ? "w-[50%]" : "w-[56%]"} strokeWidth={3.6} />
                </div>
              ))}
            </div>
          )
        )}
        {/* A pessoa vem na frente, como na capa de uma revista: rosto e nome sobre a imagem; os produtos ficam de fundo. */}
        <div
          className={`absolute inset-x-0 bottom-0 flex flex-col items-start gap-1.5 p-3 md:gap-3 md:p-5 ${cover ? "bg-linear-to-t from-black/75 via-black/35 to-transparent pt-10 text-white md:pt-20" : ""}`}
        >
          <Avatar name={c.creator} url={c.avatarUrl} className="box-border size-9 rounded-full border-2 border-white text-xs md:size-14 md:text-sm" />
          <span className="font-condensed text-[20px] leading-[1.02] font-extrabold break-words uppercase md:text-[clamp(26px,2.4vw,36px)]">{c.creator}</span>
        </div>
      </div>
      {/* no celular o card é estreito: os números descem para a linha de baixo em vez de cortar */}
      <span className="flex min-w-0 flex-col pt-3 text-[14px] text-mute group-hover:text-ink md:flex-row md:text-[15px]">
        <span className="truncate">@{c.handle}</span>
        {stats && (
          <span className="truncate">
            <span className="max-md:hidden">&nbsp;·&nbsp;</span>
            {stats}
          </span>
        )}
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

  return (
    <div className="overflow-hidden bg-white text-ink">
      <SiteHeader
        links={[
          ["#vitrines", "Vitrines"],
          ["#categorias", "Categorias"],
          ["#marcas", "Marcas"],
          ["#cupons", "Cupons"],
          ["/criar-vitrine", "Criar vitrine"],
        ]}
      />

      <section className={`mx-auto grid max-w-[1440px] items-center gap-10 pt-6 md:grid-cols-[1.1fr_1fr] md:gap-12 md:pt-10 ${pad}`}>
        <div className="flex flex-col items-start gap-5">
          <span className="text-[15px] font-medium">Achados de quem usa de verdade</span>
          <h1 className="m-0 font-condensed text-[clamp(52px,8.4vw,120px)] leading-[0.96] font-extrabold tracking-[-0.01em] text-balance uppercase">
            Indicado por gente. Não pelo algoritmo.
          </h1>
          <p className="m-0 max-w-[32rem] text-[17px] leading-relaxed">
            Os produtos que as pessoas que você segue usam de verdade, reunidos na vitrine de cada uma.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {HERO_ICONS.map((icon, i) => {
            const p = hero[i];
            const tile = "relative flex aspect-square items-center justify-center overflow-hidden bg-soft";
            if (!p) {
              return (
                <div key={icon} aria-hidden="true" className={tile}>
                  <ProductIcon icon={icon} className="w-[52%]" />
                </div>
              );
            }
            // cada achado leva aos produtos da vitrine de quem indicou
            return (
              <Link key={p.id} href={`/${p.handle}#produtos`} aria-label={`${p.name}, indicado por ${p.creator}`} className={`${tile} group text-ink no-underline`}>
                <ProductArt product={p} iconClassName="w-[52%]" />
                <span className="absolute bottom-3 left-3 max-w-[calc(100%-24px)] truncate rounded-full bg-white px-3 py-1.5 text-[13px] font-medium group-hover:underline">
                  por {p.creator.split(" ")[0]}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Fecha a primeira tela: o mesmo bloco escuro do convite para criar, aqui falando com quem compra e sem botão. */}
      <section className={`mx-auto max-w-[1440px] pt-24 md:pt-32 ${pad}`}>
        <div className="flex flex-col items-center gap-5 bg-ink px-6 py-20 text-center text-white max-md:py-14">
          <h2 className="m-0 max-w-[14ch] font-condensed text-[clamp(44px,6.4vw,88px)] leading-[1.04] font-extrabold text-balance uppercase">
            Cada vitrine é uma pessoa
          </h2>
          <p className="m-0 max-w-[30rem] text-[17px] leading-relaxed text-white/75">
            Quem você segue mostra o que usa de verdade: o tênis do treino, o protetor da praia, a garrafa que vai para todo lado. Tudo num
            lugar só, para você ver de perto e levar igual.
          </p>
        </div>
      </section>

      {creators.length > 0 && (
        <section id="vitrines" className={`mx-auto flex max-w-[1440px] scroll-mt-4 flex-col gap-8 pt-24 md:pt-32 ${pad}`}>
          <SectionHead kicker="Explore as" title="Vitrines" text="Entre na vitrine de quem você confia e veja tudo o que essa pessoa usa e recomenda." />
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-4">
            {creators.map((c) => (
              <CreatorCard key={c.handle} c={c} />
            ))}
            <Link href="/criar-vitrine" className="group flex min-w-0 flex-col text-ink no-underline">
              <div className="flex aspect-square flex-col justify-between bg-ink p-4 text-white md:p-6">
                <span className="text-[13px] font-medium text-white/70">Você cria conteúdo?</span>
                <span className="font-condensed text-[28px] leading-[0.9] md:text-[clamp(34px,4vw,56px)] font-extrabold uppercase">Sua vitrine aqui</span>
                <span className="flex min-h-10 items-center justify-center rounded-full bg-white px-4 text-[15px] md:min-h-11 font-medium text-ink group-hover:bg-soft">
                  Criar grátis
                </span>
              </div>
              <span className="pt-3 text-[17px] font-medium">Monte a sua em 2 minutos</span>
              <span className="text-[15px] text-mute">{HOST}/seunome</span>
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
                className="box-border flex w-[68%] flex-none snap-start flex-col gap-4 bg-soft p-5 text-ink no-underline hover:bg-line md:min-h-[260px] md:w-auto md:p-6"
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
                  <span className="font-condensed text-[44px] leading-[0.9] font-extrabold uppercase md:text-[56px]">{couponOff(c)}</span>
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
          <Link href="/criar-vitrine" className="mt-2 flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-[15px] font-medium text-ink no-underline hover:bg-soft">
            Criar minha vitrine
          </Link>
        </div>
      </section>

      {products.length > 0 && (
        <section id="categorias" className={`mx-auto flex max-w-[1440px] scroll-mt-4 flex-col gap-8 pt-24 md:pt-32 ${pad}`}>
          <SectionHead kicker="Compre por" title="Categoria" text="Escolha uma categoria e veja o que cada vitrine indica." />
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
                  {b.creators > 1 ? `Em ${b.creators} vitrines` : b.creator}
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
