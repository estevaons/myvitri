"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { productHref, withUtm } from "@/lib/vitrine/links";
import { cardColor, couponColor, inkOn, lookVars, tile } from "@/lib/vitrine/look";
import {
  couponBadge,
  couponOff,
  expiryLabel,
  formatBRL,
  isActive,
  kitTotals,
  priceProducts,
  type PricedProduct,
} from "@/lib/vitrine/pricing";
import { KIT_STYLE, type IconId, type VitrineContent } from "@/lib/vitrine/types";
import { CouponDeck } from "./CouponDeck";
import { ProductArt } from "./ProductIcon";

/** Fotos do pôster do kit, conforme o número de itens (1 a 4): [esquerda, topo, largura, altura] em % e giro em graus. */
type Slot = [number, number, number, number, number];
/** Meio tíquete com os recortes do picote em x ("100%" à direita, "0" à esquerda): furos de verdade, que mostram o fundo atrás. */
const notched = (x: string) =>
  `radial-gradient(circle at ${x} 0, transparent 9px, #fff 9.5px) top / 100% 51% no-repeat, radial-gradient(circle at ${x} 100%, transparent 9px, #fff 9.5px) bottom / 100% 51% no-repeat`;
const slotStyle = ([left, top, width, height, rot]: Slot) => ({ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`, transform: `rotate(${rot}deg)` });
const KIT_COLLAGE: Record<"espalhado" | "alinhado", Slot[][]> = {
  espalhado: [
    [[14, 2, 72, 92, -3]],
    [[0, 4, 58, 70, -5], [42, 26, 58, 70, 4]],
    [[0, 8, 56, 64, -5], [50, 0, 48, 48, 4], [44, 50, 52, 48, -3]],
    [[0, 2, 50, 48, -4], [50, 6, 48, 46, 3], [4, 52, 46, 46, 3], [52, 54, 46, 44, -3]],
  ],
  alinhado: [
    [[14, 2, 72, 92, 0]],
    [[0, 14, 48.5, 72, 0], [51.5, 14, 48.5, 72, 0]],
    [[0, 0, 48.5, 100, 0], [51.5, 0, 48.5, 48.5, 0], [51.5, 51.5, 48.5, 48.5, 0]],
    [[0, 0, 48.5, 48.5, 0], [51.5, 0, 48.5, 48.5, 0], [0, 51.5, 48.5, 48.5, 0], [51.5, 51.5, 48.5, 48.5, 0]],
  ],
};
const HERO_FALLBACK: IconId[] = ["Bikini", "Glasses", "Bottle"];
/** Arranjo das fotos do topo conforme quantos produtos há (1 a 3), sempre nos ~72% de cima. */
const HERO_LAYOUTS = [
  ["left-[12%] top-[2%] w-[72%] h-[70%] rotate-[-3deg]"],
  ["left-0 top-[4%] w-[56%] h-[60%] rotate-[-5deg]", "right-0 top-[14%] w-1/2 h-[56%] rotate-[4deg]"],
  ["left-0 top-[6%] w-[54%] h-[56%] rotate-[-6deg]", "right-0 top-0 w-1/2 h-[46%] rotate-[5deg]", "right-[4%] top-[40%] w-1/2 h-[32%] rotate-[-3deg]"],
];
/** Posição vertical de cada cupom na pilha do topo, conforme quantos são (1 a 3). */
const STACK_TOPS = [["30%"], ["14%", "48%"], ["4%", "34%", "64%"]];

function copyText(text: string) {
  try {
    navigator.clipboard?.writeText(text).catch(() => {});
  } catch {
    // clipboard indisponível (http, iframe sem permissão): o código continua visível
  }
}

function openStore(url: string) {
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

/** Métrica anônima da vitrine pública; nunca bloqueia nem falha visivelmente. */
function track(handle: string, kind: "view" | "buy" | "copy" | "kit" | "video", item?: string) {
  try {
    const body = JSON.stringify({ h: handle, k: kind, i: item });
    if (!navigator.sendBeacon?.("/api/t", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/t", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    // sem rede ou API: a métrica se perde, a compra segue
  }
}

/** Sem acento e minúsculo, para a busca achar "tenis" em "Tênis". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Estado "copiado" que volta ao normal sozinho. */
function useFlash(ms = 2500) {
  const [key, setKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = (k: string) => {
    setKey(k);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setKey(null), ms);
  };
  return [key, flash] as const;
}

/** Destaca o trecho entre *asteriscos*; sem asteriscos, as duas últimas palavras. */
function Headline({ text }: { text: string }) {
  const m = text.match(/^(.*?)\*(.+?)\*(.*)$/);
  const words = text.trim().split(/\s+/);
  const n = words.length > 3 ? 2 : 0;
  const [before, mark, after] = m
    ? [m[1], m[2], m[3]]
    : [words.slice(0, words.length - n).join(" ") + (n ? " " : ""), words.slice(words.length - n).join(" "), ""];
  // Texto em camada própria (relative): com a entrelinha apertada, o fundo do
  // destaque na linha de baixo não cobre as letras da linha de cima.
  return (
    <>
      {before && <span className="relative">{before}</span>}
      {mark && (
        <span className="rounded-[0.12em] bg-(--v-accent) px-[0.12em] text-(--v-accent-ink) [box-decoration-break:clone]">
          <span className="relative">{mark}</span>
        </span>
      )}
      {after && <span className="relative">{after}</span>}
    </>
  );
}

function Avatar({ content, className }: { content: VitrineContent; className: string }) {
  const initials = content.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (content.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- avatar vem de URL arbitrária
    return <img src={content.avatarUrl} alt="" className={`${className} object-cover`} />;
  }
  return (
    <div aria-hidden="true" className={`${className} flex items-center justify-center bg-[#FFD84D] font-extrabold text-[#111111]`}>
      {initials || "?"}
    </div>
  );
}

function BrandLogo({ url, className }: { url: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária
  return url ? <img src={url} alt="" loading="lazy" className={`${className} flex-none rounded-full bg-white object-contain`} /> : null;
}

function Eyebrow({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <span className={`text-sm font-bold tracking-[0.12em] uppercase ${dark ? "opacity-70" : "text-(--v-muted)"}`}>{children}</span>
  );
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="font-display m-0 text-[clamp(32px,5cqw,64px)] leading-none font-extrabold tracking-[-0.04em]">{children}</h2>;
}

function Pill({ active, children, ...rest }: { active: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`min-h-11 rounded-full border-2 px-5 text-[15px] ${
        active ? "border-(--v-ink) bg-(--v-ink) font-bold text-(--v-bg)" : "border-(--v-line) bg-transparent font-semibold text-(--v-ink)"
      }`}
    >
      {children}
    </button>
  );
}

export function Storefront({ content, today, preview = false }: { content: VitrineContent; today: string; preview?: boolean }) {
  const { look, show } = content;
  const firstName = content.name.split(" ")[0] || content.name;

  const coupons = useMemo(() => content.coupons.filter((c) => isActive(c, today)), [content.coupons, today]);
  // esgotados vão para o fim da lista
  const products = useMemo(
    () => priceProducts(content.products, coupons).sort((a, b) => Number(a.soldOut) - Number(b.soldOut)),
    [content.products, coupons],
  );
  const tileOf = useMemo(() => new Map(content.products.map((p, i) => [p.id, tile(look, i)])), [content.products, look]);
  const kits = useMemo(
    () => content.kits.map((k) => ({ kit: k, ...kitTotals(k, products) })).filter((k) => k.items.length > 0),
    [content.kits, products],
  );

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const [cat, setCat] = useState("Todos");
  const [query, setQuery] = useState("");
  const q = fold(query.trim());
  const shownProducts = products.filter(
    (p) => (cat === "Todos" || p.category === cat) && (!q || fold(`${p.name} ${p.brand} ${p.category}`).includes(q)),
  );

  const [kitIdx, setKitIdx] = useState(0);
  const current = kits[Math.min(kitIdx, kits.length - 1)];
  const kitStyle = current?.kit.style ?? KIT_STYLE;
  const kitSlots = current ? KIT_COLLAGE[kitStyle.layout][current.items.length - 1] : [];
  const kitBg = cardColor(look, kitStyle.color, 1 + 3 * kits.indexOf(current));
  const kitInk = inkOn(kitBg);

  const [copied, flash] = useFlash();

  const showProducts = show.products && products.length > 0;
  const showCoupons = show.coupons && coupons.length > 0;
  // O criador escolhe o destaque do topo; sem produtos (só cupom de marca), os cupons assumem.
  const couponsHero = coupons.length > 0 && (look.hero === "cupons" || products.length === 0);
  const heroCoupons = coupons.slice(0, 3);
  // Só os produtos cadastrados; os desenhos de exemplo aparecem apenas em vitrine sem nenhum produto.
  const inStock = products.filter((p) => !p.soldOut);
  const heroItems = products.length ? (inStock.length ? inStock : products).slice(0, 3) : HERO_FALLBACK.map((icon) => ({ imageUrl: "", icon, name: "" }));
  const ticker = coupons.map((c) => `${c.brand.split(" ")[0].toUpperCase()} ${couponOff(c)}`);

  const send = (kind: Parameters<typeof track>[1], item?: string) => {
    if (!preview) track(content.handle, kind, item);
  };

  // uma visita por aba, para recarregar a página não inflar o número
  useEffect(() => {
    if (preview) return;
    const key = `vitri:visto:${content.handle}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage bloqueado: conta a visita mesmo assim
    }
    track(content.handle, "view");
  }, [preview, content.handle]);

  const buy = (p: PricedProduct) => {
    if (p.soldOut) return;
    if (p.coupon) copyText(p.coupon.code);
    flash(`p:${p.id}`);
    send("buy", p.id);
    if (!preview) openStore(productHref(p, content));
  };

  return (
    <div style={lookVars(look)} className="@container w-full overflow-hidden bg-(--v-bg) font-sans text-(--v-ink)">
      <header className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className="font-display flex items-baseline text-[28px] font-extrabold tracking-[-0.04em] text-inherit no-underline">
          vitri<span className="text-coral">.</span>
        </Link>
      </header>

      {look.bannerUrl && (
        <div className="mx-auto max-w-[1280px] px-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- capa vem de URL arbitrária */}
          <img src={look.bannerUrl} alt="" className="block aspect-[4/1] w-full rounded-(--v-r-xl) object-cover @max-md:aspect-[5/2]" />
        </div>
      )}

      <section className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-12 px-6 pt-8 pb-16">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-6">
          <h1 className="font-display m-0 text-[clamp(44px,8cqw,104px)] leading-[0.92] font-extrabold tracking-[-0.045em]">
            <Headline text={content.headline || `A vitrine de ${firstName}`} />
          </h1>
          {content.sub && <p className="m-0 max-w-[34rem] text-[19px] leading-normal text-(--v-muted)">{content.sub}</p>}
        </div>

        <div className="relative h-[560px] max-w-[580px] min-w-0 flex-[1_1_440px] @max-xl:h-[400px]">
          {couponsHero ? (
            // Os próprios cupons empilhados no lugar das fotos.
            heroCoupons.map((c, i) => (
              <div
                key={c.id}
                aria-hidden="true"
                className="absolute flex w-[88%] items-stretch overflow-hidden rounded-(--v-r-lg) shadow-[0_18px_40px_rgba(17,17,17,0.18)]"
                style={{
                  background: couponColor(look, c, i),
                  color: inkOn(couponColor(look, c, i)),
                  top: STACK_TOPS[heroCoupons.length - 1][i],
                  left: ["0%", "12%", "4%"][i],
                  transform: `rotate(${["-5deg", "4deg", "-2deg"][i]})`,
                }}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1 px-6 py-5 @max-md:px-4 @max-md:py-4">
                  <span className="flex min-w-0 items-center gap-2">
                    <BrandLogo url={c.logoUrl} className="size-7" />
                    <span className="truncate text-[15px] font-bold">{c.brand}</span>
                  </span>
                  <span className="font-display text-[56px] leading-none font-extrabold tracking-[-0.04em] @max-xl:text-[40px]">{couponOff(c)}</span>
                  {c.condition && <span className="truncate text-sm opacity-85">{c.condition}</span>}
                </div>
                <div className="flex w-[34%] max-w-[150px] flex-none items-center justify-center border-l-2 border-dashed border-current/40 px-3">
                  <span className="text-center font-mono text-base font-extrabold tracking-[0.06em] break-all @max-md:text-sm">{c.code}</span>
                </div>
              </div>
            ))
          ) : (
            <>
            {/* As fotos ficam nos ~72% de cima e a pilha de cupons numa faixa própria embaixo, para não cobrir produto. */}
            {heroItems.map((item, i) => (
              <div
                key={i}
                aria-hidden="true"
                className={`absolute flex items-center justify-center overflow-hidden rounded-(--v-r-xl) ${HERO_LAYOUTS[heroItems.length - 1][i]}`}
                style={{ background: tile(look, [0, 1, 3][i]) }}
              >
                <ProductArt product={item} iconClassName="w-[62%]" />
              </div>
            ))}
            {coupons.length > 0 && <CouponDeck coupons={coupons} look={look} className="absolute bottom-0 left-[4%] w-[320px] max-w-[84%]" />}
            </>
          )}
        </div>
      </section>

      {show.ticker && ticker.length > 0 && (
        <div className="overflow-hidden border-y-2 border-(--v-ink) bg-(--v-accent) py-[18px] text-(--v-accent-ink)">
          <div className="vitri-tick font-display flex w-max gap-10 text-[26px] font-extrabold tracking-[-0.02em] whitespace-nowrap">
            {[0, 1].flatMap((copy) =>
              // repete a lista até preencher telas largas, duplicada para o loop contínuo
              Array.from({ length: Math.max(1, Math.ceil(6 / ticker.length)) }, () => ticker)
                .flat()
                .flatMap((label, i) => [
                  <span key={`${copy}-${i}`} aria-hidden={copy === 1 || undefined}>
                    {label}
                  </span>,
                  <span key={`${copy}-${i}-s`} aria-hidden="true">
                    ✶
                  </span>,
                ]),
            )}
          </div>
        </div>
      )}

      {showProducts && (
        <section id="produtos" className="mx-auto flex max-w-[1280px] scroll-mt-4 flex-col gap-8 px-6 pt-[88px] pb-24 @max-md:pt-14 @max-md:pb-16">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="flex flex-col gap-2">
              <Eyebrow>Favoritos da semana</Eyebrow>
              <H2>Em alta na minha vitrine</H2>
            </div>
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {["Todos", ...categories].map((c) => (
                  <Pill key={c} active={c === cat} aria-pressed={c === cat} onClick={() => setCat(c)}>
                    {c}
                  </Pill>
                ))}
              </div>
            )}
          </div>

          {products.length > 8 && (
            <div className="relative max-w-[420px]">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-(--v-muted)">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar produto ou marca"
                aria-label="Buscar produto ou marca"
                className="box-border h-12 w-full rounded-full border-2 border-(--v-line) bg-transparent pr-4 pl-11 text-[15px] text-(--v-ink) outline-none placeholder:text-(--v-muted) focus:border-(--v-ink)"
              />
            </div>
          )}
          {shownProducts.length === 0 && <p className="m-0 text-[17px] text-(--v-muted)">Nada encontrado para “{query.trim()}”.</p>}

          {look.layout === "grade" ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 @2xl:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] @2xl:gap-x-5">
              {shownProducts.map((p) => (
                <article key={p.id} className="flex min-w-0 flex-col gap-3.5">
                  <div
                    className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-(--v-r-lg)"
                    style={{ background: tileOf.get(p.id) }}
                  >
                    <ProductArt
                      product={p}
                      className={p.soldOut ? "size-full object-contain p-[6%] opacity-50 grayscale" : undefined}
                      iconClassName={`w-[58%] ${p.soldOut ? "opacity-40" : ""}`}
                    />
                    {p.soldOut && (
                      <span className="absolute top-4 right-4 rounded-full bg-white px-3 py-[7px] text-[13px] font-extrabold text-[#111111] shadow-[0_0_0_2px_#111111] @max-2xl:top-2.5 @max-2xl:right-2.5 @max-2xl:text-[11px]">
                        Esgotado
                      </span>
                    )}
                    {p.coupon && (
                      <span className="absolute top-4 left-4 rounded-full bg-[#111111] px-3 py-[7px] text-[15px] font-extrabold text-white @max-2xl:top-2.5 @max-2xl:left-2.5 @max-2xl:text-xs">
                        {couponBadge(p.coupon)}
                      </span>
                    )}
                    {p.coupon && (
                      <span className="absolute bottom-4 left-4 max-w-[calc(100%-32px)] truncate rounded-[10px] border-2 border-dashed border-[#111111] bg-white px-2.5 py-[5px] font-mono text-[13px] font-bold tracking-[0.06em] text-[#111111] @max-2xl:bottom-2.5 @max-2xl:left-2.5 @max-2xl:text-[11px]">
                        {p.coupon.code}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 px-1">
                    {p.brand && <span className="truncate text-[13px] font-bold tracking-[0.08em] text-(--v-muted) uppercase @max-2xl:text-[11px]">{p.brand}</span>}
                    <h3 className="m-0 text-lg font-semibold @max-2xl:text-[15px] @max-2xl:leading-tight">{p.name}</h3>
                    {p.price > 0 && (
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
                        <span className="font-display text-[26px] font-extrabold tracking-[-0.03em] @max-2xl:text-xl">{formatBRL(p.final)}</span>
                        {p.final !== p.price && <span className="text-[15px] text-(--v-muted) line-through @max-2xl:text-xs">{formatBRL(p.price)}</span>}
                      </div>
                    )}
                    {p.videoUrl && <ReviewLink href={p.videoUrl} onClick={() => send("video", p.id)} />}
                  </div>
                  <BuyButton p={p} copied={copied === `p:${p.id}`} onClick={() => buy(p)} className="mt-auto min-h-[52px] rounded-(--v-r-md) text-[15px] @max-2xl:min-h-11 @max-2xl:text-[13px]" />
                </article>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-3">
              {shownProducts.map((p) => (
                <article key={p.id} className="flex items-center gap-3.5 rounded-(--v-r-lg) bg-(--v-surface) p-2.5">
                  <div
                    className="relative flex size-[92px] flex-none items-center justify-center overflow-hidden rounded-(--v-r-md)"
                    style={{ background: tileOf.get(p.id) }}
                  >
                    <ProductArt
                      product={p}
                      className={p.soldOut ? "size-full object-contain p-[6%] opacity-50 grayscale" : undefined}
                      iconClassName={`w-[64%] ${p.soldOut ? "opacity-40" : ""}`}
                      strokeWidth={3.4}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {p.brand && <span className="truncate text-[11px] font-bold tracking-[0.08em] text-(--v-muted) uppercase">{p.brand}</span>}
                    <h3 className="m-0 truncate text-[15px] font-semibold">{p.name}</h3>
                    {p.price > 0 && (
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-xl font-extrabold">{formatBRL(p.final)}</span>
                        {p.final !== p.price && <span className="text-xs text-(--v-muted) line-through">{formatBRL(p.price)}</span>}
                      </div>
                    )}
                    {p.videoUrl && <ReviewLink href={p.videoUrl} onClick={() => send("video", p.id)} />}
                  </div>
                  <BuyButton
                    p={p}
                    compact
                    copied={copied === `p:${p.id}`}
                    onClick={() => buy(p)}
                    className="min-h-11 flex-none rounded-(--v-r-md) px-3.5 text-[13px]"
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {showCoupons && (
        <section id="cupons" className="scroll-mt-4 bg-(--v-ink) text-(--v-bg)">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-6 py-24 @max-md:py-16">
            <div className="flex flex-col gap-2">
              <Eyebrow dark>Meus cupons ativos</Eyebrow>
              <H2>Copie e use em qualquer produto da loja</H2>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-5">
              {coupons.map((c, i) => (
                <article
                  key={c.id}
                  className="flex min-h-[180px] overflow-hidden rounded-(--v-r-lg)"
                  style={{ background: couponColor(look, c, i), color: inkOn(couponColor(look, c, i)) }}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-6 py-[22px]">
                    <div className="flex min-w-0 items-center gap-2">
                      <BrandLogo url={c.logoUrl} className="size-8" />
                      {c.storeUrl ? (
                        <a href={withUtm(c.storeUrl, content)} target="_blank" rel="noopener noreferrer" className="truncate text-[15px] font-bold text-inherit">
                          {c.brand}
                        </a>
                      ) : (
                        <span className="truncate text-[15px] font-bold">{c.brand}</span>
                      )}
                    </div>
                    <span className="font-display text-5xl leading-none font-extrabold tracking-[-0.04em] @max-md:text-[40px]">{couponOff(c)}</span>
                    {c.condition && <span className="text-sm opacity-85">{c.condition}</span>}
                    {c.howTo && (
                      <details className="text-sm">
                        <summary className="cursor-pointer py-1 font-bold underline underline-offset-2">Como usar</summary>
                        <ol className="m-0 mt-1 flex list-decimal flex-col gap-1 pl-5 leading-snug">
                          {c.howTo
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line, j) => (
                              <li key={j}>{line}</li>
                            ))}
                        </ol>
                      </details>
                    )}
                    <span className="mt-auto self-start rounded-full bg-white/70 px-2.5 py-[5px] text-xs font-bold text-[#111111]">{expiryLabel(c, today)}</span>
                  </div>
                  <div className="relative box-border flex w-[140px] flex-none flex-col items-center justify-center gap-3 border-l-2 border-dashed border-current/40 p-4">
                    <span aria-hidden="true" className="absolute -top-3.5 -left-3.5 size-[26px] rounded-full bg-(--v-ink)" />
                    <span aria-hidden="true" className="absolute -bottom-3.5 -left-3.5 size-[26px] rounded-full bg-(--v-ink)" />
                    <span className="text-center font-mono text-sm font-extrabold tracking-[0.04em] break-all">{c.code}</span>
                    <button
                      onClick={() => {
                        copyText(c.code);
                        flash(`c:${c.id}`);
                        send("copy", c.id);
                        if (!preview) openStore(withUtm(c.storeUrl, content));
                      }}
                      aria-label={c.storeUrl ? `Copiar cupom ${c.code} e abrir a loja ${c.brand}` : `Copiar cupom ${c.code}`}
                      className="min-h-11 w-full rounded-(--v-r-md) border-0 px-2 py-2 text-sm leading-tight font-bold"
                      style={inkOn(couponColor(look, c, i)) === "#FFFFFF" ? { background: "#FFFFFF", color: "#111111" } : { background: "#111111", color: "#FFFFFF" }}
                    >
                      {copied === `c:${c.id}` ? "Copiado!" : c.storeUrl ? "Copiar e ir para a loja" : "Copiar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {show.kits && current && (
        <section id="kits" className="mx-auto flex max-w-[1280px] flex-wrap items-stretch gap-12 px-6 py-24 @max-md:py-16">
          {/* Pôster do kit no formato de post (4:5), feito para print e repost: nome, fotos em colagem e um tíquete com o total. */}
          <div
            aria-hidden="true"
            className="relative box-border flex aspect-[4/5] min-w-0 flex-[1_1_480px] flex-col gap-4 self-center overflow-hidden rounded-(--v-r-xl) p-7 @max-md:gap-3 @max-md:p-5"
            style={{ background: kitBg, color: kitInk }}
          >
            {/* luz suave atrás das fotos, para a colagem não ficar chapada no fundo */}
            <div className="pointer-events-none absolute top-[58%] left-1/2 size-[70%] -translate-1/2 rounded-full bg-white opacity-25 blur-3xl" />
            <div className="relative flex flex-col gap-2.5 @max-md:gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full px-3 py-1.5 text-xs font-extrabold tracking-[0.08em] @max-md:text-[10px]" style={{ background: kitInk, color: kitBg }}>
                  {kitStyle.label || `KIT · ${current.items.length} ${current.items.length === 1 ? "ITEM" : "ITENS"}`}
                </span>
                <span className="truncate text-[13px] font-bold opacity-70 @max-md:text-[11px]">vitri.me/{content.handle}</span>
              </div>
              {current.kit.name && (
                <span className="line-clamp-2 font-display text-[44px] leading-[0.95] font-extrabold tracking-[-0.035em] text-balance @max-md:text-[26px]">
                  {current.kit.name}
                </span>
              )}
            </div>
            <div className="relative mb-3 min-h-0 flex-1 @max-md:mb-2">
              {current.items.map((p, i) => (
                <div
                  key={p.id}
                  className="absolute box-border rounded-[22px] bg-white p-2 shadow-[0_18px_40px_rgba(17,17,17,0.16)] @max-md:rounded-2xl @max-md:p-1.5"
                  style={slotStyle(kitSlots[i])}
                >
                  <div className="relative flex size-full items-center justify-center overflow-hidden rounded-2xl @max-md:rounded-xl" style={{ background: tileOf.get(p.id) }}>
                    <ProductArt product={p} framed={false} iconClassName="w-[60%]" strokeWidth={2.8} />
                  </div>
                </div>
              ))}
              {/* etiquetas numa camada acima de todas as fotos, para nenhuma ficar escondida atrás da vizinha */}
              {current.items.map(
                (p, i) =>
                  p.final > 0 && (
                    <div key={p.id} className="absolute z-[5]" style={slotStyle(kitSlots[i])}>
                      <span className="absolute -bottom-3 left-4 rounded-full bg-[#111111] px-3 py-1.5 font-display text-[15px] leading-none font-extrabold tracking-[-0.01em] whitespace-nowrap text-white shadow-[0_6px_14px_rgba(17,17,17,0.2)] @max-md:left-2.5 @max-md:px-2 @max-md:py-1 @max-md:text-[11px]">
                        {formatBRL(p.final)}
                      </span>
                    </div>
                  ),
              )}
            </div>
            {/* tíquete do total, com picote como os cupons; a sombra é drop-shadow para respeitar os recortes */}
            <div className="relative flex items-stretch text-[#111111] [filter:drop-shadow(0_12px_22px_rgba(17,17,17,0.13))]">
              <div
                className={`relative flex min-w-0 flex-1 items-center gap-2.5 p-3 @max-md:gap-2 @max-md:p-2.5 ${current.final > 0 ? "rounded-l-[20px] @max-md:rounded-l-2xl" : "rounded-[20px] bg-white @max-md:rounded-2xl"}`}
                style={current.final > 0 ? { background: notched("100%") } : undefined}
              >
                <Avatar content={content} className="box-border size-11 flex-none rounded-full text-[13px] @max-md:size-8 @max-md:text-[11px]" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-extrabold @max-md:text-xs">{content.name}</span>
                  <span className="line-clamp-2 text-[13px] leading-snug text-[#5E5A52] @max-md:line-clamp-1 @max-md:text-[11px]">
                    {current.kit.signature || `Os favoritos de ${firstName}`}
                  </span>
                </div>
                {current.final > 0 && <span className="absolute top-3.5 right-0 bottom-3.5 border-r-2 border-dashed border-[#E5E0D8]" />}
              </div>
              {current.final > 0 && (
                <div
                  className="flex flex-none flex-col items-end justify-center rounded-r-[20px] px-4 py-2 @max-md:rounded-r-2xl @max-md:px-3"
                  style={{ background: notched("0") }}
                >
                  <span className="text-[11px] font-semibold text-[#5E5A52] @max-md:text-[10px]">{current.save > 0 ? "tudo com cupom" : "total do kit"}</span>
                  <span className="font-display text-[30px] leading-none font-extrabold tracking-[-0.03em] @max-md:text-xl">{formatBRL(current.final)}</span>
                  {current.save > 0 && <span className="mt-1 text-xs font-bold @max-md:text-[10px]">economize {formatBRL(current.save)}</span>}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-[1_1_440px] flex-col justify-center gap-5">
            <Eyebrow>Kits montados por mim</Eyebrow>
            {kits.length > 1 && (
              <div role="tablist" aria-label="Escolher kit" className="flex flex-wrap gap-2">
                {kits.map((k, i) => (
                  <Pill key={k.kit.id} role="tab" aria-selected={k === current} active={k === current} onClick={() => setKitIdx(i)}>
                    {k.kit.name || `Kit ${i + 1}`}
                  </Pill>
                ))}
              </div>
            )}
            <H2>{current.kit.name || `Os favoritos de ${firstName}`}</H2>
            {current.kit.description && <p className="m-0 text-[17px] leading-normal text-(--v-muted)">{current.kit.description}</p>}

            <ul className="m-0 flex list-none flex-col p-0">
              {current.items.map((p) => (
                <li key={p.id} className="flex items-center gap-3.5 border-b border-(--v-line) py-3">
                  <div aria-hidden="true" className="relative flex size-14 flex-none items-center justify-center overflow-hidden rounded-[14px]" style={{ background: tileOf.get(p.id) }}>
                    <ProductArt product={p} iconClassName="w-[68%]" strokeWidth={4} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    {p.url || p.affiliateUrl ? (
                      <a href={productHref(p, content)} target="_blank" rel="noopener noreferrer" className="text-base font-semibold text-inherit">
                        {p.name}
                      </a>
                    ) : (
                      <span className="text-base font-semibold">{p.name}</span>
                    )}
                    <span className="text-[13px] text-(--v-muted)">
                      {p.brand}
                      {p.coupon && (
                        <>
                          {p.brand && " · "}cupom <span className="font-mono font-bold text-(--v-ink)">{p.coupon.code}</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[17px] font-bold">{formatBRL(p.final)}</span>
                    {p.final !== p.price && <span className="text-[13px] text-(--v-muted) line-through">{formatBRL(p.price)}</span>}
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-4 rounded-[24px] bg-(--v-surface) p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-semibold text-(--v-muted)">Total do kit com cupom</span>
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-display text-[44px] leading-none font-extrabold tracking-[-0.03em]">{formatBRL(current.final)}</span>
                    {current.save > 0 && <span className="text-[17px] text-(--v-muted) line-through">{formatBRL(current.total)}</span>}
                  </div>
                </div>
              </div>
              {current.codes.length > 0 && (
                <button
                  onClick={() => {
                    copyText(current.codes.join(" "));
                    flash(`k:${current.kit.id}`);
                    send("kit", current.kit.id);
                  }}
                  className="min-h-14 rounded-(--v-r-md) border-0 bg-(--v-ink) text-base font-bold text-(--v-bg)"
                >
                  {copied === `k:${current.kit.id}`
                    ? current.codes.length === 1
                      ? `${current.codes[0]} copiado! Agora é só abrir os itens`
                      : `${current.codes.length} cupons copiados! Agora é só abrir os itens`
                    : current.codes.length === 1
                      ? `Copiar ${current.codes[0]} e montar o kit`
                      : `Copiar os ${current.codes.length} cupons do kit`}
                </button>
              )}
              <ol className="m-0 grid list-none grid-cols-3 gap-2.5 p-0">
                {["Copie o cupom aqui", "Abra cada item na loja", "Cole no checkout e pronto"].map((step, i) => (
                  <li key={step} className="flex flex-col gap-1.5 text-[13px] leading-snug text-(--v-muted)">
                    <span className="flex size-[26px] items-center justify-center rounded-full bg-(--v-ink) text-xs font-extrabold text-(--v-bg)">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {show.cta && (
        <section className="px-6 pb-24">
          <div className="mx-auto box-border flex max-w-[1232px] flex-col items-center gap-6 rounded-(--v-r-xl) bg-(--v-accent) px-10 py-[72px] text-center text-(--v-accent-ink) @max-md:px-6 @max-md:py-12">
            <h2 className="font-display m-0 max-w-[52rem] text-[clamp(30px,4.6cqw,60px)] leading-none font-extrabold tracking-[-0.04em]">
              Você também cria conteúdo? Monte sua vitrine de cupons em 2 minutos.
            </h2>
            <Link href="/" className="flex min-h-14 items-center rounded-full bg-[#111111] px-8 text-base font-bold text-white no-underline">
              Criar minha vitrine grátis
            </Link>
          </div>
        </section>
      )}

      <footer className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-3 px-6 pb-10 text-[13px] text-(--v-muted)">
        <span>vitri.me/{content.handle}</span>
        <span>Preços e cupons podem mudar na loja da marca. Links com identificação da creator.</span>
      </footer>
    </div>
  );
}

function BuyButton({
  p,
  copied,
  compact,
  onClick,
  className,
}: {
  p: PricedProduct;
  copied: boolean;
  compact?: boolean;
  onClick: () => void;
  className: string;
}) {
  if (!p.coupon && !p.url && !p.affiliateUrl) return null;
  if (p.soldOut) {
    return (
      <span className={`flex items-center justify-center bg-(--v-surface) font-bold text-(--v-muted) ${className}`}>Esgotado na loja</span>
    );
  }
  const idle = p.coupon ? (compact ? `Pegar ${couponBadge(p.coupon)}` : "Comprar com cupom") : "Ver na loja";
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 border-0 bg-(--v-ink) font-bold text-(--v-bg) ${className}`}>
      {copied && p.coupon ? (
        <>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-10" />
          </svg>
          <span>Cupom copiado!</span>
        </>
      ) : (
        <span>{idle}</span>
      )}
    </button>
  );
}

function ReviewLink({ href, onClick }: { href: string; onClick: () => void }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="mt-1 flex min-h-8 items-center gap-1.5 self-start text-[13px] font-bold text-inherit underline underline-offset-2"
    >
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 4.5v15l13-7.5z" />
      </svg>
      Ver meu review
    </a>
  );
}
