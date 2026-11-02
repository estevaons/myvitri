"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { productHref, withUtm } from "@/lib/vitrine/links";
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
import type { VitrineContent } from "@/lib/vitrine/types";
import { ProductArt } from "./ProductIcon";

/**
 * Vitrine pública com visual fixo, no espírito das lojas de esporte: branco, cinza claro atrás dos produtos,
 * títulos em caixa alta e botões em pílula. A creator só muda o conteúdo e a capa.
 */

/** Grade das fotos do kit conforme o número de itens (1 a 4); com 3, a primeira ocupa a coluna inteira. */
const KIT_GRID = ["grid-cols-1", "grid-cols-2", "grid-cols-2 grid-rows-2", "grid-cols-2 grid-rows-2"];
/** Proporção das fotos do topo (sem capa) conforme quantas são (1 a 3). */
const STRIP_ASPECT = ["aspect-[21/9] @max-2xl:aspect-[4/3]", "aspect-[4/3]", "aspect-square"];
const STRIP_COLS = ["grid-cols-1", "grid-cols-2", "grid-cols-3"];

const pad = "px-5 @3xl:px-12";
const pillDark = "flex min-h-12 items-center justify-center rounded-full border-0 bg-ink px-6 text-[15px] font-medium text-white no-underline";
const pillLight = "flex min-h-12 items-center justify-center rounded-full border border-[#CACACB] bg-white px-6 text-[15px] font-medium text-ink no-underline";

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
    <div aria-hidden="true" className={`${className} flex items-center justify-center bg-soft font-semibold text-ink`}>
      {initials || "?"}
    </div>
  );
}

function BrandLogo({ url, className }: { url: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária
  return url ? <img src={url} alt="" loading="lazy" className={`${className} flex-none rounded-full bg-white object-contain`} /> : null;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="m-0 text-2xl font-medium tracking-[-0.01em]">{children}</h2>;
}

function Chip({ active, children, ...rest }: { active: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`min-h-10 flex-none rounded-full border-0 px-4 text-[15px] font-medium whitespace-nowrap ${active ? "bg-ink text-white" : "bg-soft text-ink hover:bg-line"}`}
    >
      {children}
    </button>
  );
}

function Chevron({ left }: { left?: boolean }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={left ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

/** Faixa que rola de lado, com título e setas (as setas somem quando tudo cabe na tela). */
function Carousel({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const sync = () => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };
  // a cada render (o conteúdo pode ter mudado) e quando a largura muda
  useEffect(sync);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const go = (dir: 1 | -1) => {
    const el = trackRef.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <>
      <div className={`flex items-center justify-between gap-4 ${pad}`}>
        <SectionTitle>{title}</SectionTitle>
        {!(atStart && atEnd) && (
          <div className="flex gap-3 @max-2xl:hidden">
            {([-1, 1] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                aria-label={dir < 0 ? "Anterior" : "Próximo"}
                disabled={dir < 0 ? atStart : atEnd}
                onClick={() => go(dir)}
                className="flex size-12 items-center justify-center rounded-full border-0 bg-soft text-ink hover:bg-line"
              >
                <Chevron left={dir < 0} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        ref={trackRef}
        onScroll={sync}
        role="region"
        aria-label={label}
        className={`no-scrollbar mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 @3xl:scroll-px-12 ${pad}`}
      >
        {children}
      </div>
    </>
  );
}

export function Storefront({ content, today, preview = false }: { content: VitrineContent; today: string; preview?: boolean }) {
  const firstName = content.name.split(" ")[0] || content.name;
  const headline = content.headline.replace(/\*/g, "").trim() || `A vitrine de ${firstName}`;
  const banner = content.look.bannerUrl;

  const coupons = useMemo(() => content.coupons.filter((c) => isActive(c, today)), [content.coupons, today]);
  // esgotados vão para o fim da lista
  const products = useMemo(
    () => priceProducts(content.products, coupons).sort((a, b) => Number(a.soldOut) - Number(b.soldOut)),
    [content.products, coupons],
  );
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

  const [copied, flash] = useFlash();

  // Sem capa, o topo mostra as fotos dos primeiros produtos em estoque.
  const strip = banner ? [] : products.filter((p) => !p.soldOut).slice(0, 3);
  const bestPercent = Math.max(0, ...coupons.filter((c) => c.kind === "percent").map((c) => c.value));
  const nav = [
    ["#cupons", "Cupons", coupons.length > 0],
    ["#produtos", "Produtos", products.length > 0],
    ["#kits", "Kits", kits.length > 0],
  ] as const;

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
    <div className="@container w-full overflow-hidden bg-white font-sans text-ink">
      {coupons.length > 0 && (
        <div className="bg-soft px-5 py-2.5 text-center text-[13px] leading-snug">
          <span className="font-medium">{bestPercent ? `Até ${bestPercent}% OFF com os cupons de ${firstName}` : `Cupons de desconto de ${firstName}`}</span>{" "}
          <a href="#cupons" className="font-medium text-inherit underline underline-offset-2">
            Ver cupons
          </a>
        </div>
      )}

      <header className={`mx-auto flex max-w-[1440px] items-center justify-between gap-4 py-3.5 ${pad}`}>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar content={content} className="box-border size-10 flex-none rounded-full text-sm" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[15px] font-semibold">{content.name}</span>
            <span className="truncate text-[13px] text-mute">@{content.handle}</span>
          </div>
        </div>
        <nav aria-label="Seções" className="flex gap-6 @max-2xl:hidden">
          {nav.map(([href, label, on]) =>
            on ? (
              <a key={href} href={href} className="text-[15px] font-medium text-ink no-underline hover:text-mute">
                {label}
              </a>
            ) : null,
          )}
        </nav>
      </header>

      <section className={`mx-auto max-w-[1440px] ${pad}`}>
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element -- capa vem de URL arbitrária
          <img src={banner} alt="" className="block aspect-[21/9] w-full bg-soft object-cover @max-2xl:aspect-[4/3]" />
        ) : (
          strip.length > 0 && (
            <div aria-hidden="true" className={`grid gap-1 ${STRIP_COLS[strip.length - 1]}`}>
              {strip.map((p) => (
                <div key={p.id} className={`relative flex items-center justify-center overflow-hidden bg-soft ${STRIP_ASPECT[strip.length - 1]}`}>
                  <ProductArt product={p} iconClassName="w-[46%]" />
                </div>
              ))}
            </div>
          )
        )}
        <div className="mx-auto flex max-w-[880px] flex-col items-center gap-4 pt-10 pb-2 text-center @3xl:pt-12">
          <h1 className="m-0 font-condensed text-[clamp(44px,8cqw,96px)] leading-[0.9] font-extrabold tracking-[-0.01em] text-balance uppercase">{headline}</h1>
          {content.sub && <p className="m-0 max-w-[36rem] text-[17px] leading-relaxed">{content.sub}</p>}
          {(products.length > 0 || coupons.length > 0) && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {products.length > 0 && (
                <a href="#produtos" className={pillDark}>
                  Ver produtos
                </a>
              )}
              {coupons.length > 0 && (
                <a href="#cupons" className={products.length > 0 ? pillLight : pillDark}>
                  Ver cupons
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {coupons.length > 0 && (
        <section id="cupons" className="mx-auto max-w-[1440px] scroll-mt-4 pt-16 @3xl:pt-24">
          <Carousel title="Cupons" label="Cupons ativos">
            {coupons.map((c) => (
              <article key={c.id} className="box-border flex min-h-[290px] w-[300px] flex-none snap-start flex-col gap-4 bg-soft p-6 @max-md:w-[82%]">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <BrandLogo url={c.logoUrl} className="size-8" />
                    {c.storeUrl ? (
                      <a href={withUtm(c.storeUrl, content)} target="_blank" rel="noopener noreferrer" className="truncate text-[15px] font-medium text-inherit">
                        {c.brand}
                      </a>
                    ) : (
                      <span className="truncate text-[15px] font-medium">{c.brand}</span>
                    )}
                  </div>
                  <span className="flex-none text-[13px] text-mute">{expiryLabel(c, today)}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="font-condensed text-[56px] leading-[0.9] font-extrabold uppercase">{couponOff(c)}</span>
                  {c.condition && <span className="text-[15px] leading-snug text-mute">{c.condition}</span>}
                  {c.howTo && (
                    <details className="text-sm">
                      <summary className="cursor-pointer py-1 font-medium underline underline-offset-2">Como usar</summary>
                      <ol className="m-0 mt-1 flex list-decimal flex-col gap-1 pl-5 leading-snug text-mute">
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
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <span className="flex min-h-12 items-center justify-center rounded-full border border-dashed border-[#CACACB] bg-white px-4 text-center font-mono text-[15px] font-bold tracking-[0.08em] break-all">
                    {c.code}
                  </span>
                  <button
                    onClick={() => {
                      copyText(c.code);
                      flash(`c:${c.id}`);
                      send("copy", c.id);
                      if (!preview) openStore(withUtm(c.storeUrl, content));
                    }}
                    aria-label={c.storeUrl ? `Copiar cupom ${c.code} e abrir a loja ${c.brand}` : `Copiar cupom ${c.code}`}
                    className={pillDark}
                  >
                    {copied === `c:${c.id}` ? "Copiado!" : c.storeUrl ? "Copiar e ir para a loja" : "Copiar código"}
                  </button>
                </div>
              </article>
            ))}
          </Carousel>
        </section>
      )}

      {products.length > 0 && (
        <section id="produtos" className={`mx-auto flex max-w-[1440px] scroll-mt-4 flex-col gap-6 pt-16 @3xl:pt-24 ${pad}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SectionTitle>
              Produtos <span className="text-mute">({products.length})</span>
            </SectionTitle>
            {products.length > 8 && (
              <div className="relative w-full max-w-[320px]">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar"
                  aria-label="Buscar produto ou marca"
                  className="box-border h-11 w-full rounded-full border-0 bg-soft pr-4 pl-11 text-[15px] text-ink outline-none placeholder:text-mute focus:bg-line"
                />
              </div>
            )}
          </div>

          {categories.length > 1 && (
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 @3xl:mx-0 @3xl:flex-wrap @3xl:px-0">
              {["Todos", ...categories].map((c) => (
                <Chip key={c} active={c === cat} aria-pressed={c === cat} onClick={() => setCat(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          )}
          {shownProducts.length === 0 && <p className="m-0 text-[17px] text-mute">Nada encontrado para “{query.trim()}”.</p>}

          <div className="grid grid-cols-2 gap-x-3 gap-y-10 @3xl:grid-cols-3 @3xl:gap-x-4 @3xl:gap-y-12">
            {shownProducts.map((p) => (
              <article key={p.id} className="flex min-w-0 flex-col">
                {/* a foto também leva à compra; o botão de baixo é o caminho acessível */}
                <Tile
                  onClick={!p.soldOut && (p.coupon || p.url || p.affiliateUrl) ? () => buy(p) : undefined}
                  className="relative flex aspect-square w-full items-center justify-center overflow-hidden border-0 bg-soft p-0"
                >
                  <ProductArt
                    product={p}
                    className={p.soldOut ? "size-full object-contain opacity-50 mix-blend-multiply grayscale" : undefined}
                    iconClassName={`w-[52%] ${p.soldOut ? "opacity-40" : ""}`}
                  />
                </Tile>
                {/* flex-1: os botões da mesma linha ficam alinhados mesmo com nomes de tamanhos diferentes */}
                <div className="flex flex-1 flex-col gap-0.5 pt-3 text-[15px] leading-snug @max-2xl:text-sm">
                  {p.soldOut ? (
                    <span className="font-medium text-mute">Esgotado</span>
                  ) : (
                    p.coupon && <span className="font-medium text-sale">Cupom {couponBadge(p.coupon)}</span>
                  )}
                  <h3 className="m-0 text-[length:inherit] font-medium">{p.name}</h3>
                  {p.brand && <span className="text-mute">{p.brand}</span>}
                  {p.price > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{formatBRL(p.final)}</span>
                      {p.final !== p.price && <span className="text-mute line-through">{formatBRL(p.price)}</span>}
                    </div>
                  )}
                  {p.videoUrl && <ReviewLink href={p.videoUrl} onClick={() => send("video", p.id)} />}
                </div>
                <BuyButton p={p} copied={copied === `p:${p.id}`} onClick={() => buy(p)} />
              </article>
            ))}
          </div>
        </section>
      )}

      {current && (
        <section id="kits" className={`mx-auto flex max-w-[1440px] scroll-mt-4 flex-col gap-6 pt-16 @3xl:pt-24 ${pad}`}>
          <SectionTitle>Kits</SectionTitle>
          {kits.length > 1 && (
            <div role="tablist" aria-label="Escolher kit" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 @3xl:mx-0 @3xl:flex-wrap @3xl:px-0">
              {kits.map((k, i) => (
                <Chip key={k.kit.id} role="tab" aria-selected={k === current} active={k === current} onClick={() => setKitIdx(i)}>
                  {k.kit.name || `Kit ${i + 1}`}
                </Chip>
              ))}
            </div>
          )}

          <div className="grid items-start gap-8 @3xl:grid-cols-[1.1fr_1fr] @3xl:gap-12">
            <div aria-hidden="true" className={`grid aspect-[4/5] gap-1 ${KIT_GRID[current.items.length - 1]}`}>
              {current.items.map((p, i) => (
                <div
                  key={p.id}
                  className={`relative flex min-h-0 items-center justify-center overflow-hidden bg-soft ${current.items.length === 3 && i === 0 ? "row-span-2" : ""}`}
                >
                  <ProductArt product={p} iconClassName="w-[52%]" />
                </div>
              ))}
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <h3 className="m-0 font-condensed text-[clamp(36px,5cqw,56px)] leading-[0.92] font-extrabold text-balance uppercase">
                {current.kit.name || `Os favoritos de ${firstName}`}
              </h3>
              {current.kit.description && <p className="m-0 text-[17px] leading-relaxed">{current.kit.description}</p>}
              {current.kit.signature && (
                <p className="m-0 text-[15px] text-mute">
                  “{current.kit.signature}” · {firstName}
                </p>
              )}

              <ul className="m-0 flex list-none flex-col border-t border-line p-0">
                {current.items.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 border-b border-line py-3">
                    <div aria-hidden="true" className="relative flex size-16 flex-none items-center justify-center overflow-hidden bg-soft">
                      <ProductArt product={p} iconClassName="w-[64%]" strokeWidth={4} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {p.url || p.affiliateUrl ? (
                        <a href={productHref(p, content)} target="_blank" rel="noopener noreferrer" className="text-[15px] font-medium text-inherit no-underline hover:underline">
                          {p.name}
                        </a>
                      ) : (
                        <span className="text-[15px] font-medium">{p.name}</span>
                      )}
                      <span className="text-[13px] text-mute">
                        {p.brand}
                        {p.coupon && (
                          <>
                            {p.brand && " · "}cupom <span className="font-mono font-semibold text-ink">{p.coupon.code}</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 text-[15px]">
                      <span className="font-medium">{formatBRL(p.final)}</span>
                      {p.final !== p.price && <span className="text-[13px] text-mute line-through">{formatBRL(p.price)}</span>}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-1">
                <span className="text-[15px] text-mute">{current.save > 0 ? "Total do kit com cupom" : "Total do kit"}</span>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-[28px] font-medium tracking-[-0.01em]">{formatBRL(current.final)}</span>
                  {current.save > 0 && <span className="text-[17px] text-mute line-through">{formatBRL(current.total)}</span>}
                </div>
                {current.save > 0 && <span className="text-[15px] font-medium text-sale">Você economiza {formatBRL(current.save)}</span>}
              </div>

              {current.codes.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      copyText(current.codes.join(" "));
                      flash(`k:${current.kit.id}`);
                      send("kit", current.kit.id);
                    }}
                    className={`${pillDark} min-h-14 text-base`}
                  >
                    {copied === `k:${current.kit.id}`
                      ? current.codes.length === 1
                        ? `${current.codes[0]} copiado! Agora é só abrir os itens`
                        : `${current.codes.length} cupons copiados! Agora é só abrir os itens`
                      : current.codes.length === 1
                        ? `Copiar ${current.codes[0]} e montar o kit`
                        : `Copiar os ${current.codes.length} cupons do kit`}
                  </button>
                  <ol className="m-0 grid list-none grid-cols-3 gap-3 p-0">
                    {["Copie o cupom aqui", "Abra cada item na loja", "Cole no checkout e pronto"].map((step, i) => (
                      <li key={step} className="flex flex-col gap-1.5 text-[13px] leading-snug text-mute">
                        <span className="flex size-6 items-center justify-center rounded-full bg-soft text-xs font-semibold text-ink">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <section className={`mx-auto max-w-[1440px] pt-20 @3xl:pt-28 ${pad}`}>
        <div className="flex flex-col items-center gap-4 bg-soft px-6 py-16 text-center @max-md:py-12">
          <h2 className="m-0 font-condensed text-[clamp(32px,4.4cqw,52px)] leading-[0.92] font-extrabold uppercase">Você também cria conteúdo?</h2>
          <p className="m-0 text-[17px]">Monte sua vitrine de cupons em 2 minutos.</p>
          <Link href="/" className={`${pillDark} mt-2`}>
            Criar minha vitrine grátis
          </Link>
        </div>
      </section>

      <footer className={`mx-auto mt-14 flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-t border-line py-8 text-[13px] text-mute ${pad}`}>
        <Link href="/" className="flex items-baseline gap-1.5 text-inherit no-underline">
          Feito com
          <span className="font-display text-lg font-extrabold tracking-[-0.04em] text-ink">
            vitri<span className="text-coral">.</span>
          </span>
        </Link>
        <span>Preços e cupons podem mudar na loja da marca. Links com identificação da creator.</span>
      </footer>
    </div>
  );
}

function Tile({ onClick, className, children }: { onClick?: () => void; className: string; children: ReactNode }) {
  return onClick ? (
    <button type="button" tabIndex={-1} aria-hidden="true" onClick={onClick} className={className}>
      {children}
    </button>
  ) : (
    <div aria-hidden="true" className={className}>
      {children}
    </div>
  );
}

function BuyButton({ p, copied, onClick }: { p: PricedProduct; copied: boolean; onClick: () => void }) {
  if (!p.coupon && !p.url && !p.affiliateUrl) return null;
  const base = "mt-3 flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium @max-2xl:text-[13px]";
  if (p.soldOut) return <span className={`${base} bg-soft text-mute`}>Esgotado na loja</span>;
  return (
    <button
      onClick={onClick}
      className={`${base} border ${copied ? "border-ink bg-ink text-white" : "border-[#CACACB] bg-white text-ink hover:border-ink"}`}
    >
      {copied && p.coupon ? (
        <>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-10" />
          </svg>
          <span>Cupom copiado!</span>
        </>
      ) : (
        <span>{p.coupon ? "Comprar com cupom" : "Ver na loja"}</span>
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
      className="mt-1 flex min-h-8 items-center gap-1.5 self-start text-[13px] font-medium text-inherit underline underline-offset-2"
    >
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 4.5v15l13-7.5z" />
      </svg>
      Ver meu review
    </a>
  );
}
