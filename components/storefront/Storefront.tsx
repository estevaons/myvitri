"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link } from "@/lib/i18n/navigation";
import { BRAND } from "@/lib/brand";
import { BackLink } from "@/components/brand/BackLink";
import { Wordmark } from "@/components/brand/Logo";
import { productHref, withUtm } from "@/lib/vitrine/links";
import { couponOff, isActive } from "@/lib/vitrine/pricing";
import type { CommentList, Viewer } from "@/lib/vitrine/social";
import { kitItems, type Product, type VitrineContent } from "@/lib/vitrine/types";
import { Comments } from "./Comments";
import { CoverLetter } from "@/components/home/CreatorCard";
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
    return <img src={content.avatarUrl} alt="" referrerPolicy="no-referrer" className={`${className} object-cover`} />;
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
  const t = useTranslations("common");
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
                aria-label={t(dir < 0 ? "previous" : "next")}
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
  favorites = null,
}: {
  content: VitrineContent;
  today: string;
  preview?: boolean;
  /** Não vem na prévia do editor, que não mostra comentários nem o coração. */
  comments?: CommentList;
  /** Quantas pessoas favoritaram; null: não deu para contar. */
  favorites?: number | null;
}) {
  const t = useTranslations("storefront");
  const format = useFormatter();
  const viewer = useViewer(content.handle, preview);
  const firstName = content.name.split(" ")[0] || content.name;
  const headline = content.headline.replace(/\*/g, "").trim() || t("defaultHeadline", { name: firstName });
  const banner = content.look.bannerUrl;

  const coupons = useMemo(() => content.coupons.filter((c) => isActive(c, today)), [content.coupons, today]);
  // esgotados vão para o fim da lista
  const products = useMemo(() => [...content.products].sort((a, b) => Number(a.soldOut) - Number(b.soldOut)), [content.products]);
  const kits = useMemo(
    () => content.kits.map((k) => ({ kit: k, items: kitItems(k, products) })).filter((k) => k.items.length > 0),
    [content.kits, products],
  );

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  // "" é "todas as categorias": nenhuma categoria de produto tem nome vazio
  const [cat, setCat] = useState("");
  const [query, setQuery] = useState("");
  const q = fold(query.trim());
  const shownProducts = products.filter(
    (p) => (!cat || p.category === cat) && (!q || fold(`${p.name} ${p.brand} ${p.category}`).includes(q)),
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

  const nav = [
    ["#cupons", t("nav.coupons"), coupons.length > 0],
    ["#produtos", t("nav.products"), products.length > 0],
    ["#kits", t("nav.kits"), kits.length > 0],
    ["#comentarios", t("nav.comments"), Boolean(comments)],
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

  /** Liga o produto ao link dele: o de afiliado ou, sem ele, o da loja. Esgotado ou sem link não é clicável. */
  const linkProps = (p: Product, kitId?: string) => ({
    href: p.soldOut ? "" : productHref(p),
    onOpen: (e: MouseEvent) => {
      // na prévia do editor o clique não tira a pessoa da página
      if (preview) e.preventDefault();
      send("buy", p.id);
      if (kitId) send("kit", kitId);
    },
  });

  return (
    <div className="@container w-full overflow-hidden bg-white font-sans text-ink">
      <header className={`mx-auto flex max-w-[1440px] items-center justify-between gap-4 border-b border-sand py-3.5 ${pad}`}>
        {/* "/" serve aos dois: o proxy leva quem entrou para /inicio e quem não entrou fica na landing.
            Na prévia do editor é só a aparência, para o clique não tirar a pessoa do editor. */}
        <BackLink href={preview ? undefined : "/"} label="home" labelClass="@max-2xl:hidden" />
        <nav aria-label={t("nav.label")} className="flex flex-none gap-6 @max-2xl:hidden">
          {nav.map(([href, label, on]) =>
            on ? (
              <a key={href} href={href} className="text-[12px] font-medium tracking-[0.22em] text-ink uppercase no-underline hover:text-gold">
                {label}
              </a>
            ) : null,
          )}
        </nav>
      </header>

      <section className={`mx-auto max-w-[1440px] ${pad}`}>
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element -- capa vem de URL arbitrária
          <img src={banner} alt="" className="block aspect-[21/9] w-full bg-cream object-cover @max-2xl:aspect-[4/3]" />
        ) : (
          <div className="relative aspect-[21/9] w-full @max-2xl:aspect-[4/3]">
            <CoverLetter name={content.name} />
          </div>
        )}
        {/* quem indica: a foto fica sobre a borda da capa */}
        <div className="relative -mt-10 flex flex-col items-center gap-2.5 text-center">
          <Avatar content={content} className="box-border size-20 flex-none rounded-full text-2xl ring-4 ring-white" />
          <div className="flex max-w-full min-w-0 flex-col leading-tight">
            <span className="font-display text-[22px] leading-tight font-medium break-words">{content.name}</span>
            <span className="text-[13px] break-words text-mute">@{content.handle}</span>
          </div>
          {/* favoritar fica junto de quem indica, não no cabeçalho; na prévia do editor não aparece */}
          {!preview && (
            <div className="pt-1.5">
              <FavoriteButton
                key={viewer?.user ? `${viewer.user.id}:${viewer.favorited}` : "visitante"}
                variant="profile"
                handle={content.handle}
                name={content.name}
                loading={!viewer}
                guest={!viewer?.user}
                favorited={Boolean(viewer?.user && viewer.favorited)}
                count={favorites}
              />
            </div>
          )}
        </div>
        <div className="mx-auto flex max-w-[880px] flex-col items-center gap-4 pt-7 pb-2 text-center @3xl:pt-8">
          <h1 className="m-0 font-display text-[clamp(44px,8cqw,96px)] leading-[1] font-normal text-balance">{headline}</h1>
          {content.sub && <p className="m-0 max-w-[36rem] text-[17px] leading-relaxed text-mute">{content.sub}</p>}
          {(products.length > 0 || coupons.length > 0) && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {products.length > 0 && (
                <a href="#produtos" className={pillDark}>
                  {t("seeProducts")}
                </a>
              )}
              {coupons.length > 0 && (
                <a href="#cupons" className={products.length > 0 ? pillLight : pillDark}>
                  {t("seeCoupons")}
                </a>
              )}
            </div>
          )}
          {/* no celular o menu de seções some: este link é o caminho até a conversa */}
          {comments && comments.total > 0 && (
            <a href="#comentarios" className="mt-1 text-[14px] text-mute underline underline-offset-4 hover:text-ink">
              {t("commentCount", { count: comments.total })}
            </a>
          )}
        </div>
      </section>

      {coupons.length > 0 && (
        <section id="cupons" className="mx-auto max-w-[1440px] scroll-mt-4 pt-16 @3xl:pt-24">
          <Carousel title={t("couponsTitle")} label={t("couponsLabel")}>
            {coupons.map((c) => (
              <article key={c.id} className="box-border flex min-h-[290px] w-[300px] flex-none snap-start flex-col gap-4 border border-sand bg-cream p-6 @max-md:w-[82%]">
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
                <div className="flex flex-col gap-1.5">
                  <span className="font-display text-[56px] leading-[1] font-normal lining-nums">{couponOff(c)}</span>
                  {c.condition && <span className="text-[15px] leading-snug text-mute">{c.condition}</span>}
                  {c.howTo && (
                    <details className="text-sm">
                      <summary className="cursor-pointer py-1 font-medium underline underline-offset-2">{t("howTo")}</summary>
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
                    aria-label={c.storeUrl ? t("copyAndOpenLabel", { code: c.code, brand: c.brand }) : t("copyLabel", { code: c.code })}
                    className="flex min-h-12 items-center justify-center border-0 bg-ink px-3 text-[11px] font-medium tracking-[0.14em] whitespace-nowrap text-white uppercase hover:bg-[#2b2925]"
                  >
                    {copied === `c:${c.id}` ? t("copied") : c.storeUrl ? t("copyAndOpen") : t("copyCode")}
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
              {t("productsTitle")} <span className="text-mute">({format.number(products.length)})</span>
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
                  placeholder={t("search")}
                  aria-label={t("searchLabel")}
                  className="box-border h-11 w-full border border-sand bg-white pr-4 pl-11 text-[15px] text-ink outline-none placeholder:text-mute focus:border-ink"
                />
              </div>
            )}
          </div>

          {categories.length > 1 && (
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 @3xl:mx-0 @3xl:flex-wrap @3xl:px-0">
              {["", ...categories].map((c) => (
                <Chip key={c} active={c === cat} aria-pressed={c === cat} onClick={() => setCat(c)}>
                  {c || t("all")}
                </Chip>
              ))}
            </div>
          )}
          {shownProducts.length === 0 && <p className="m-0 text-[17px] text-mute">{t("noResults", { query: query.trim() })}</p>}

          <div className="grid grid-cols-2 gap-x-3 gap-y-10 @3xl:grid-cols-3 @3xl:gap-x-4 @3xl:gap-y-12">
            {shownProducts.map((p) => (
              <article key={p.id} className="flex min-w-0 flex-col items-center text-center">
                <ProductLink {...linkProps(p)} className="flex w-full min-w-0 flex-col text-ink no-underline">
                  <div aria-hidden="true" className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-cream">
                    <ProductArt
                      product={p}
                      className={p.soldOut ? "size-full object-contain opacity-50 mix-blend-multiply grayscale" : undefined}
                      iconClassName={`w-[52%] ${p.soldOut ? "opacity-40" : ""}`}
                    />
                  </div>
                  <h3 className="m-0 pt-3 text-[15px] leading-snug font-medium underline-offset-2 [a:hover_&]:underline @max-2xl:text-sm">{p.name}</h3>
                </ProductLink>
                {p.soldOut && <span className="pt-0.5 text-[13px] text-mute">{t("soldOut")}</span>}
                {p.videoUrl && <ReviewLink href={p.videoUrl} onClick={() => send("video", p.id)} />}
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
          <SectionTitle>{t("kitsTitle")}</SectionTitle>
          {kits.length > 1 && (
            <div
              ref={kitTabs}
              role="tablist"
              aria-label={t("pickKit")}
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
                  {k.kit.name || t("kitN", { n: i + 1 })}
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

                {/* Título e texto só cabem ao lado das fotos em tela bem larga; antes disso ficam em cima, na largura toda,
                    senão a coluna estreita quebra os nomes e a lista passa muito do fim das fotos. */}
                <div className="flex min-w-0 flex-col gap-5 @3xl:mb-3 @3xl:[grid-area:head] @min-[88rem]:mb-0">
                  <h3 className="m-0 font-display text-[clamp(36px,5cqw,56px)] leading-[1] font-normal text-balance">
                    {k.kit.name || t("kitFallback", { name: firstName })}
                  </h3>
                  {k.kit.description && <p className="m-0 text-[17px] leading-relaxed">{k.kit.description}</p>}
                  {k.kit.signature && (
                    <p className="m-0 text-[15px] text-mute">
                      “{k.kit.signature}” · {firstName}
                    </p>
                  )}
                </div>

                <ul className="m-0 flex min-w-0 list-none flex-col border-t border-sand p-0 @3xl:[grid-area:body]">
                  {k.items.map((p) => (
                    <li key={p.id} className="border-b border-sand">
                      {/* cada item leva ao link dele, como na lista de produtos; o clique também conta para o kit */}
                      <ProductLink {...linkProps(p, k.kit.id)} className="flex items-center gap-4 py-2.5 text-ink no-underline">
                        {/* com a lista estreita ao lado das fotos, a miniatura repetiria a foto vizinha e espremeria o nome */}
                        <div aria-hidden="true" className="relative flex size-16 flex-none items-center justify-center overflow-hidden bg-cream @3xl:hidden @min-[88rem]:flex">
                          <ProductArt product={p} iconClassName="w-[64%]" strokeWidth={4} />
                        </div>
                        <span className="min-w-0 flex-1 text-[15px] font-medium underline-offset-2 [a:hover_&]:underline">{p.name}</span>
                        {p.soldOut && <span className="flex-none text-[13px] text-mute">{t("soldOut")}</span>}
                      </ProductLink>
                    </li>
                  ))}
                </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {comments && <Comments handle={content.handle} firstName={firstName} comments={comments} viewer={viewer} className={pad} />}

      {!preview && viewer?.user === null && (
        <section className={`mx-auto max-w-[1440px] pt-20 @3xl:pt-28 ${pad}`}>
          <div className="flex flex-col items-center gap-4 bg-sand px-6 py-16 text-center @max-md:py-12">
            {/* quem chega aqui acabou de ver a vitrine de alguém: o convite parte dela */}
            <span className="text-[12px] font-medium tracking-[0.22em] text-gold uppercase">{t("cta.kicker")}</span>
            <h2 className="m-0 font-display text-[clamp(32px,4.4cqw,52px)] leading-[1.05] font-normal text-balance">
              {t("cta.title")} <em>{t("cta.titleEm")}</em>
            </h2>
            <p className="m-0 max-w-[30rem] text-[17px] leading-relaxed text-ink/70">{t("cta.text")}</p>
            <Link href="/criar-vitrine" className={`${pillDark} mt-2`}>
              {t("cta.button")}
            </Link>
          </div>
        </section>
      )}

      <footer className={`mx-auto mt-14 flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-t border-sand py-8 text-[13px] text-mute ${pad}`}>
        <Link href="/" aria-label={BRAND} className="flex items-center text-inherit no-underline">
          <Wordmark className="h-[14px] w-auto text-ink" />
        </Link>
        <span>{t("footer")}</span>
      </footer>
    </div>
  );
}

/** O produto vira um link quando há para onde ir; sem link (ou esgotado), é só a foto e o nome. */
function ProductLink({ href, onOpen, className, children }: { href: string; onOpen: (e: MouseEvent) => void; className: string; children: ReactNode }) {
  if (!href) return <div className={className}>{children}</div>;
  return (
    <a href={href} target="_blank" rel="sponsored noopener noreferrer" onClick={onOpen} className={className}>
      {children}
    </a>
  );
}

function ReviewLink({ href, onClick }: { href: string; onClick: () => void }) {
  const t = useTranslations("storefront");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="mt-1 flex min-h-8 items-center gap-1.5 text-[13px] font-medium text-inherit underline underline-offset-2"
    >
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 4.5v15l13-7.5z" />
      </svg>
      {t("review")}
    </a>
  );
}
