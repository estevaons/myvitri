"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BackLink } from "@/components/brand/BackLink";
import { Wordmark } from "@/components/brand/Logo";
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
import type { CommentList, Viewer } from "@/lib/vitrine/social";
import type { VitrineContent } from "@/lib/vitrine/types";
import { Comments } from "./Comments";
import { FavoriteButton } from "./FavoriteButton";
import { ProductArt } from "./ProductIcon";

/**
 * Vitrine pública com visual fixo, no espírito das lojas de esporte: branco, cinza claro atrás dos produtos,
 * títulos em caixa alta e botões em pílula. Quem é dono da vitrine só muda o conteúdo e a capa.
 */

/**
 * Grade das fotos do kit conforme o número de itens (1 a 4). Toda célula é quadrada como a foto de loja;
 * célula de outro formato sobra faixa do cinza em volta, que não bate com o fundo da foto.
 * Com 3, a primeira ocupa 2×2 e as outras duas ficam empilhadas ao lado.
 */
const KIT_GRID = ["grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-2"];
/** Proporção das fotos do topo (sem capa) conforme quantas são (1 a 3). */
const STRIP_ASPECT = ["aspect-[21/9] @max-2xl:aspect-[4/3]", "aspect-[4/3]", "aspect-square"];
const STRIP_COLS = ["grid-cols-1", "grid-cols-2", "grid-cols-3"];

const pad = "px-5 @3xl:px-12";
// botões retos em caixa alta espaçada, os mesmos da home
const pillDark =
  "flex min-h-12 items-center justify-center border-0 bg-ink px-7 text-[12px] font-medium tracking-[0.18em] text-white uppercase no-underline hover:bg-[#2b2925]";
const pillLight =
  "flex min-h-12 items-center justify-center border border-ink bg-transparent px-7 text-[12px] font-medium tracking-[0.18em] text-ink uppercase no-underline hover:bg-ink hover:text-white";

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

/**
 * Quem está vendo, lido no navegador: a página é a mesma para todos (em cache), e esta rota é por pessoa.
 * Fica fora da renderização também porque /{handle} não passa pelo proxy, que é quem renova a sessão.
 * null enquanto carrega.
 */
function useViewer(handle: string, off: boolean) {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  useEffect(() => {
    if (off) return;
    const request = new AbortController();
    fetch(`/api/eu?h=${encodeURIComponent(handle)}`, { signal: request.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Viewer>) : { user: null }))
      .catch(() => ({ user: null }))
      .then((v) => {
        if (!request.signal.aborted) setViewer(v);
      });
    return () => request.abort();
  }, [handle, off]);
  return viewer;
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
    <div aria-hidden="true" className={`${className} flex items-center justify-center bg-cream font-semibold text-ink`}>
      {initials || "?"}
    </div>
  );
}

function BrandLogo({ url, className }: { url: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária
  return url ? <img src={url} alt="" loading="lazy" className={`${className} flex-none rounded-full bg-white object-contain`} /> : null;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="m-0 font-display text-[clamp(32px,4cqw,44px)] leading-[1.05] font-normal lining-nums">{children}</h2>;
}

function Chip({ active, children, ...rest }: { active: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`relative min-h-10 flex-none border px-4 text-[12px] font-medium tracking-[0.18em] whitespace-nowrap uppercase ${active ? "border-ink bg-ink text-white" : "border-sand bg-transparent text-ink hover:border-ink"}`}
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
                className="flex size-12 items-center justify-center border border-sand bg-transparent text-ink hover:border-ink"
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

export function Storefront({
  content,
  today,
  preview = false,
  comments,
}: {
  content: VitrineContent;
  today: string;
  preview?: boolean;
  /** Não vem na prévia do editor, que não mostra comentários nem o coração. */
  comments?: CommentList;
}) {
  const viewer = useViewer(content.handle, preview);
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

  // Com mais de um kit, eles se revezam sozinhos até a pessoa escolher um. Pausa com o mouse ou o foco
  // na seção e fora da tela; no editor não roda, para não trocar o kit que está sendo editado.
  const [kitPicked, setKitPicked] = useState(false);
  const [kitHover, setKitHover] = useState(false);
  const [kitFocus, setKitFocus] = useState(false);
  const [kitSeen, setKitSeen] = useState(false);
  const kitRef = useRef<HTMLElement>(null);
  const kitTabs = useRef<HTMLDivElement>(null);
  const kitAuto = !preview && kits.length > 1 && !kitPicked;
  const kitPaused = kitHover || kitFocus || !kitSeen;
  const hasKits = kits.length > 0;
  useEffect(() => {
    const el = kitRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setKitSeen(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [hasKits]);
  // no celular os chips rolam de lado: traz o chip do kit que entrou para a vista
  useEffect(() => {
    if (!kitAuto) return;
    const list = kitTabs.current;
    const chip = list?.children[kitIdx] as HTMLElement | undefined;
    if (list && chip) list.scrollTo({ left: chip.offsetLeft - 20, behavior: "smooth" });
  }, [kitAuto, kitIdx]);

  const [copied, flash] = useFlash();

  // Sem capa, o topo mostra as fotos dos primeiros produtos em estoque.
  const strip = banner ? [] : products.filter((p) => !p.soldOut).slice(0, 3);
  const nav = [
    ["#cupons", "Cupons", coupons.length > 0],
    ["#produtos", "Produtos", products.length > 0],
    ["#kits", "Kits", kits.length > 0],
    ["#comentarios", "Comentários", Boolean(comments)],
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
  // item do kit se compra como na lista de produtos: copia o cupom dele e abre a loja; o clique também conta para o kit
  const kitBuy = (kitId: string, p: PricedProduct) => (
    <BuyButton
      compact
      p={p}
      copied={copied === `p:${p.id}`}
      onClick={() => {
        buy(p);
        send("kit", kitId);
      }}
    />
  );

  return (
    <div className="@container w-full overflow-hidden bg-white font-sans text-ink">
      <header className={`mx-auto flex max-w-[1440px] items-center justify-between gap-4 border-b border-sand py-3.5 ${pad}`}>
        {/* "/" serve aos dois: o proxy leva quem entrou para /inicio e quem não entrou fica na landing.
            Na prévia do editor é só a aparência, para o clique não tirar a pessoa do editor. */}
        <BackLink href={preview ? undefined : "/"} label="Início" labelClass="@max-2xl:hidden" />
        <div className="flex flex-none items-center gap-6">
          <nav aria-label="Seções" className="flex gap-6 @max-2xl:hidden">
            {nav.map(([href, label, on]) =>
              on ? (
                <a key={href} href={href} className="text-[12px] font-medium tracking-[0.22em] text-ink uppercase no-underline hover:text-gold">
                  {label}
                </a>
              ) : null,
            )}
          </nav>
          {!preview && (
            <FavoriteButton
              key={viewer?.user ? `${viewer.user.id}:${viewer.favorited}` : "visitante"}
              variant="header"
              handle={content.handle}
              name={content.name}
              loading={!viewer}
              guest={!viewer?.user}
              favorited={Boolean(viewer?.user && viewer.favorited)}
            />
          )}
        </div>
      </header>

      <section className={`mx-auto max-w-[1440px] ${pad}`}>
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element -- capa vem de URL arbitrária
          <img src={banner} alt="" className="block aspect-[21/9] w-full bg-cream object-cover @max-2xl:aspect-[4/3]" />
        ) : (
          strip.length > 0 && (
            <div aria-hidden="true" className={`grid gap-1 ${STRIP_COLS[strip.length - 1]}`}>
              {strip.map((p) => (
                <div key={p.id} className={`relative flex items-center justify-center overflow-hidden bg-cream ${STRIP_ASPECT[strip.length - 1]}`}>
                  <ProductArt product={p} iconClassName="w-[46%]" />
                </div>
              ))}
            </div>
          )
        )}
        {/* quem indica: a foto fica sobre a borda da capa, quando há capa ou fotos no topo */}
        <div className={`relative flex flex-col items-center gap-2.5 text-center ${banner || strip.length > 0 ? "-mt-10" : "pt-10"}`}>
          <Avatar content={content} className="box-border size-20 flex-none rounded-full text-2xl ring-4 ring-white" />
          <div className="flex max-w-full min-w-0 flex-col leading-tight">
            <span className="font-display text-[22px] leading-tight font-medium break-words">{content.name}</span>
            <span className="text-[13px] break-words text-mute">@{content.handle}</span>
          </div>
        </div>
        <div className="mx-auto flex max-w-[880px] flex-col items-center gap-4 pt-7 pb-2 text-center @3xl:pt-8">
          <h1 className="m-0 font-display text-[clamp(44px,8cqw,96px)] leading-[1] font-normal text-balance">{headline}</h1>
          {content.sub && <p className="m-0 max-w-[36rem] text-[17px] leading-relaxed text-mute">{content.sub}</p>}
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
          {/* no celular o menu de seções some: este link é o caminho até a conversa */}
          {comments && comments.total > 0 && (
            <a href="#comentarios" className="mt-1 text-[14px] text-mute underline underline-offset-4 hover:text-ink">
              {comments.total === 1 ? "1 comentário" : `${comments.total.toLocaleString("pt-BR")} comentários`}
            </a>
          )}
        </div>
      </section>

      {coupons.length > 0 && (
        <section id="cupons" className="mx-auto max-w-[1440px] scroll-mt-4 pt-16 @3xl:pt-24">
          <Carousel title="Cupons" label="Cupons ativos">
            {coupons.map((c) => (
              <article key={c.id} className="box-border flex min-h-[290px] w-[300px] flex-none snap-start flex-col gap-4 border border-sand bg-cream p-6 @max-md:w-[82%]">
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
                  <span className="font-display text-[56px] leading-[1] font-normal lining-nums">{couponOff(c)}</span>
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
                  <span className="flex min-h-12 items-center justify-center border border-dashed border-gold/50 bg-white px-4 text-center font-mono text-[15px] font-bold tracking-[0.08em] break-all">
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
                    className="flex min-h-12 items-center justify-center border-0 bg-ink px-3 text-[11px] font-medium tracking-[0.14em] whitespace-nowrap text-white uppercase hover:bg-[#2b2925]"
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
                  className="box-border h-11 w-full border border-sand bg-white pr-4 pl-11 text-[15px] text-ink outline-none placeholder:text-mute focus:border-ink"
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
                  className="relative flex aspect-square w-full items-center justify-center overflow-hidden border-0 bg-cream p-0"
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
                    p.coupon && <span className="text-[11px] font-medium tracking-[0.18em] text-gold uppercase">Cupom {couponBadge(p.coupon)}</span>
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
        <section
          id="kits"
          ref={kitRef}
          onMouseEnter={() => setKitHover(true)}
          onMouseLeave={() => setKitHover(false)}
          onFocus={() => setKitFocus(true)}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setKitFocus(false)}
          className={`mx-auto flex max-w-[1440px] scroll-mt-4 flex-col gap-6 pt-16 @3xl:pt-24 ${pad}`}
        >
          <SectionTitle>Kits</SectionTitle>
          {kits.length > 1 && (
            <div
              ref={kitTabs}
              role="tablist"
              aria-label="Escolher kit"
              className="no-scrollbar relative -mx-5 flex gap-2 overflow-x-auto px-5 @3xl:mx-0 @3xl:flex-wrap @3xl:px-0"
            >
              {kits.map((k, i) => (
                <Chip
                  key={k.kit.id}
                  role="tab"
                  aria-selected={k === current}
                  active={k === current}
                  onClick={() => {
                    setKitIdx(i);
                    setKitPicked(true);
                  }}
                >
                  {k.kit.name || `Kit ${i + 1}`}
                  {kitAuto && k === current && (
                    // a troca acontece quando a barra enche; com movimento reduzido ela some e os kits não trocam sozinhos
                    <span aria-hidden="true" className="absolute inset-x-4 bottom-1.5 h-0.5 overflow-hidden bg-white/25 motion-reduce:hidden">
                      <span
                        onAnimationEnd={() => setKitIdx((n) => (n + 1) % kits.length)}
                        style={{ animationPlayState: kitPaused ? "paused" : "running" }}
                        className="block h-full origin-left animate-kit-progress bg-white"
                      />
                    </span>
                  )}
                </Chip>
              ))}
            </div>
          )}

          {/* Todos os kits ficam na mesma célula da grade: a área tem sempre a altura do maior, a página não pula na troca
              e o kit que sai se desfaz enquanto o próximo entra deslizando. */}
          <div className="grid">
            {kits.map((k, i) => {
              const on = k === current;
              const side = i < kitIdx ? "-translate-x-4" : "translate-x-4";
              return (
                <div
                  key={k.kit.id}
                  aria-hidden={!on}
                  inert={!on}
                  className={`col-start-1 row-start-1 grid items-start self-start gap-y-5 transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none @3xl:grid-cols-[1.1fr_1fr] @3xl:gap-x-12 @3xl:[grid-template-areas:'head_head'_'photos_body'] @min-[88rem]:grid-rows-[auto_1fr] @min-[88rem]:[grid-template-areas:'photos_head'_'photos_body'] ${on ? "opacity-100" : `pointer-events-none opacity-0 ${side}`}`}
                >
                <div aria-hidden="true" className={`mb-3 grid gap-1 @3xl:mb-0 @3xl:[grid-area:photos] ${KIT_GRID[k.items.length - 1]}`}>
                  {k.items.map((p, i) => (
                    <div
                      key={p.id}
                      className={`relative flex aspect-square items-center justify-center overflow-hidden bg-cream ${k.items.length === 3 && i === 0 ? "col-span-2 row-span-2" : ""}`}
                    >
                      <ProductArt product={p} iconClassName="w-[52%]" />
                    </div>
                  ))}
                </div>

                {/* Ao lado das fotos, a lista estica até o fim delas e o total desce para alinhar com a última foto.
                    Título e texto só cabem ao lado também em tela bem larga; antes disso ficam em cima, na largura toda,
                    senão a coluna estreita quebra os nomes e a lista passa muito do fim das fotos. */}
                <div className="flex min-w-0 flex-col gap-5 @3xl:mb-3 @3xl:[grid-area:head] @min-[88rem]:mb-0">
                  <h3 className="m-0 font-display text-[clamp(36px,5cqw,56px)] leading-[1] font-normal text-balance">
                    {k.kit.name || `Os favoritos de ${firstName}`}
                  </h3>
                  {k.kit.description && <p className="m-0 text-[17px] leading-relaxed">{k.kit.description}</p>}
                  {k.kit.signature && (
                    <p className="m-0 text-[15px] text-mute">
                      “{k.kit.signature}” · {firstName}
                    </p>
                  )}
                </div>

                <div className="flex min-w-0 flex-col gap-5 @3xl:self-stretch @3xl:[grid-area:body]">
                  <ul className="m-0 flex list-none flex-col border-t border-sand p-0">
                    {k.items.map((p) => (
                      <li key={p.id} className="flex items-center gap-4 border-b border-sand py-2.5">
                        {/* com a lista estreita ao lado das fotos, a miniatura repetiria a foto vizinha e espremeria o nome */}
                        <div aria-hidden="true" className="relative flex size-16 flex-none items-center justify-center overflow-hidden bg-cream @3xl:hidden @min-[88rem]:flex">
                          <ProductArt product={p} iconClassName="w-[64%]" strokeWidth={4} />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-[15px] font-medium">{p.name}</span>
                          <span className="text-[13px] text-mute">
                            {p.brand}
                            {p.coupon && (
                              <>
                                {p.brand && " · "}cupom <span className="font-mono font-semibold text-ink">{p.coupon.code}</span>
                              </>
                            )}
                          </span>
                          {/* no celular o botão fica embaixo do nome; no desktop vai para o fim da linha */}
                          <div className="mt-2 @3xl:hidden">{kitBuy(k.kit.id, p)}</div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 self-start text-[15px] @3xl:self-center">
                          <span className="font-medium">{formatBRL(p.final)}</span>
                          {p.final !== p.price && <span className="text-[13px] text-mute line-through">{formatBRL(p.price)}</span>}
                        </div>
                        <div className="hidden flex-none @3xl:block">{kitBuy(k.kit.id, p)}</div>
                      </li>
                    ))}
                  </ul>

                  {/* total numa linha só, como o fechamento de uma nota: preço à direita, na coluna dos preços dos itens */}
                  <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 @3xl:mt-auto">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[15px] text-mute">{k.save > 0 ? "Total do kit com cupom" : "Total do kit"}</span>
                      {k.save > 0 && <span className="text-[15px] font-medium text-gold">Você economiza {formatBRL(k.save)}</span>}
                    </div>
                    <div className="flex items-baseline gap-x-3">
                      {k.save > 0 && <span className="text-[17px] text-mute line-through">{formatBRL(k.total)}</span>}
                      <span className="text-[28px] leading-none font-medium tracking-[-0.01em]">{formatBRL(k.final)}</span>
                    </div>
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {comments && <Comments handle={content.handle} firstName={firstName} comments={comments} viewer={viewer} className={pad} />}

      <section className={`mx-auto max-w-[1440px] pt-20 @3xl:pt-28 ${pad}`}>
        <div className="flex flex-col items-center gap-4 bg-sand px-6 py-16 text-center @max-md:py-12">
          {/* quem chega aqui acabou de ver a vitrine de alguém: o convite parte dela */}
          <span className="text-[12px] font-medium tracking-[0.22em] text-gold uppercase">Para quem cria conteúdo</span>
          <h2 className="m-0 font-display text-[clamp(32px,4.4cqw,52px)] leading-[1.05] font-normal text-balance">
            Gostou desta vitrine? <em>Crie a sua.</em>
          </h2>
          <p className="m-0 max-w-[30rem] text-[17px] leading-relaxed text-ink/70">
            Reúna seus cupons e produtos favoritos num link só para a bio. É grátis e fica pronta em 2 minutos.
          </p>
          <Link href="/criar-vitrine" className={`${pillDark} mt-2`}>
            Criar minha vitrine
          </Link>
        </div>
      </section>

      <footer className={`mx-auto mt-14 flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-t border-sand py-8 text-[13px] text-mute ${pad}`}>
        <Link href="/" aria-label="MyVitri" className="flex items-center text-inherit no-underline">
          <Wordmark className="h-[14px] w-auto text-ink" />
        </Link>
        <span>Preços e cupons podem mudar na loja da marca. Links com identificação desta vitrine.</span>
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

function BuyButton({ p, copied, onClick, compact }: { p: PricedProduct; copied: boolean; onClick: () => void; compact?: boolean }) {
  if (!p.coupon && !p.url && !p.affiliateUrl) return null;
  // compacto: dentro da linha do item no kit, do tamanho do texto em vez da largura do card
  const base = compact
    ? "flex min-h-9 w-fit items-center justify-center gap-2 px-4 text-[11px] font-medium tracking-[0.16em] uppercase"
    : "mt-3 flex min-h-11 items-center justify-center gap-2 px-3 text-[11px] font-medium tracking-[0.16em] uppercase";
  if (p.soldOut) return <span className={`${base} bg-cream text-mute`}>Esgotado na loja</span>;
  return (
    <button
      onClick={onClick}
      className={`${base} border ${copied ? "border-ink bg-ink text-white" : "border-ink bg-white text-ink hover:bg-ink hover:text-white"}`}
    >
      {copied && p.coupon ? (
        <>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-10" />
          </svg>
          <span>Cupom copiado!</span>
        </>
      ) : (
        <span>Ver na loja</span>
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
