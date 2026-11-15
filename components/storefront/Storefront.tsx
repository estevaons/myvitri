"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Link } from "@/lib/i18n/navigation";
import { BRAND } from "@/lib/brand";
import { BackLink } from "@/components/brand/BackLink";
import { Wordmark } from "@/components/brand/Logo";
import { productHref, safeUrl } from "@/lib/vitrine/links";
import { couponOff } from "@/lib/vitrine/pricing";
import type { CommentList, Viewer } from "@/lib/vitrine/social";
import { SOCIAL_LABELS, socialLinks, type SocialNetwork } from "@/lib/vitrine/socials";
import { postItems, type Post, type PostMedia, type Product, type VitrineContent } from "@/lib/vitrine/types";
import { parseVideo, VIDEO_LABELS, videoEmbedUrl } from "@/lib/vitrine/video";
import { Comments } from "./Comments";
import { CoverLetter } from "@/components/home/CreatorCard";
import { FavoriteButton } from "./FavoriteButton";
import { ProductArt } from "./ProductIcon";
import { OutfitStoryModal, ProductModal, storyIcon } from "./ProductModal";
import { useDragReorder } from "./useDragReorder";

/**
 * Vitrine pública com visual fixo, no espírito das lojas de esporte: branco, cinza claro atrás dos produtos,
 * títulos em caixa alta e botões de cantos retos (como o "Ver vitrine" do editor). Quem é dono da vitrine só muda o conteúdo e a capa.
 */

const pad = "px-5 @3xl:px-12";
// botões retos em caixa alta espaçada, os mesmos da home
const pillDark =
  "flex min-h-12 items-center justify-center border-0 bg-ink px-7 text-[12px] font-medium tracking-[0.18em] text-white uppercase no-underline hover:bg-[#2b2925]";
const pillLight =
  "flex min-h-12 items-center justify-center border border-ink bg-transparent px-7 text-[12px] font-medium tracking-[0.18em] text-ink uppercase no-underline hover:bg-ink hover:text-white";

/**
 * Copia na hora, ainda dentro do clique, e diz se deu certo. Usa o caminho antigo (textarea + execCommand) porque
 * ele responde sem esperar: assim a loja pode abrir no mesmo clique, e o Safari não a trata como pop-up.
 * É também o que costuma funcionar nos navegadores internos do Instagram e do TikTok.
 */
function copyNow(text: string): boolean {
  const before = document.activeElement as HTMLElement | null;
  const area = document.createElement("textarea");
  try {
    area.value = text;
    area.readOnly = true; // não abre o teclado no celular
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    document.body.append(area);
    area.select();
    area.setSelectionRange(0, text.length); // iOS ignora o select() sozinho
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    before?.focus({ preventScroll: true });
  }
}

/** Segunda tentativa, pela API moderna. Só responde depois do clique, então quem chama não abre a loja. */
async function copyLater(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** O React bloqueia `javascript:` no href, mas não no window.open: só abre http(s). */
function openStore(url: string) {
  const safe = safeUrl(url);
  if (safe) window.open(safe, "_blank", "noopener,noreferrer");
}

/** Métrica anônima da vitrine pública; nunca bloqueia nem falha visivelmente. */
function track(handle: string, kind: "view" | "buy" | "copy" | "video" | "post", item?: string) {
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
  const [flashed, setFlashed] = useState<{ key: string; n: number } | null>(null);
  // a volta é agendada por um Effect, não no clique: com `cacheComponents` a página sai de cena escondida (React
  // <Activity>), a limpeza cancela o timer e o aviso ficaria preso; ao voltar, o Effect roda de novo e agenda a volta.
  // `n` recomeça a contagem a cada toque, mesmo no mesmo item.
  useEffect(() => {
    if (!flashed) return;
    const id = setTimeout(() => setFlashed(null), ms);
    return () => clearTimeout(id);
  }, [flashed, ms]);
  const flash = (key: string) => setFlashed((f) => ({ key, n: (f?.n ?? 0) + 1 }));
  return [flashed?.key ?? null, flash] as const;
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

/**
 * Os logos das redes com o desenho oficial (traçados do Simple Icons, CC0). Parados ficam na cor do texto (tinta), no
 * tom sóbrio da vitrine; no hover (ou foco) do link em volta (`group`) a versão colorida da marca aparece por cima, sem
 * mexer no tamanho: o Instagram no degradê amarelo-rosa-roxo, o TikTok com as sombras ciano e vermelha e o YouTube
 * vermelho com o play branco. O degradê leva um id único por ícone (`useId`), para duas vitrines na mesma página não
 * dividirem a mesma definição.
 */
const SOCIAL_PATHS: Record<SocialNetwork, string> = {
  instagram: "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077",
  tiktok: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
};

function SocialIcon({ network, size = 19 }: { network: SocialNetwork; size?: number }) {
  const id = useId();
  const d = SOCIAL_PATHS[network];
  // o TikTok encolhe um pouco para as sombras deslocadas da versão colorida caberem no quadro
  const fit = network === "tiktok" ? "translate(1.2 1.2) scale(0.9)" : undefined;
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" className="block overflow-visible">
      <g transform={fit}>
        {/* a versão em tinta; no YouTube o play é um furo, que a cor do fundo preenche */}
        <path d={d} fill="currentColor" />
        <g className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          {network === "instagram" && (
            <>
              <defs>
                <radialGradient id={id} cx="0.3" cy="1.07" r="1.5">
                  <stop offset="0" stopColor="#fdf497" />
                  <stop offset="0.05" stopColor="#fdf497" />
                  <stop offset="0.45" stopColor="#fd5949" />
                  <stop offset="0.6" stopColor="#d6249f" />
                  <stop offset="0.9" stopColor="#285aeb" />
                </radialGradient>
              </defs>
              <path d={d} fill={`url(#${id})`} />
            </>
          )}
          {network === "tiktok" && (
            // o logo três vezes: ciano e vermelho deslocados atrás do preto, como no app
            <>
              <path d={d} fill="#25f4ee" transform="translate(-0.9 -0.7)" />
              <path d={d} fill="#fe2c55" transform="translate(0.9 0.7)" />
              <path d={d} fill="#111" />
            </>
          )}
          {network === "youtube" && (
            <>
              <path d="M9.545 15.568V8.432L15.818 12z" fill="#fff" />
              <path d={d} fill="#ff0000" />
            </>
          )}
        </g>
      </g>
    </svg>
  );
}

/**
 * Redes da creator: só os logos, em tinta, que ganham a cor da rede no hover (`SocialIcon`). Da largura @2xl para cima ficam logo abaixo
 * da capa, alinhados à direita dela (o bloco de quem indica começa 40px acima do fim da capa, por isso o `top-12`); no
 * celular não há espaço ao lado da foto e eles ficam centralizados embaixo do @. Nada aparece sem rede válida.
 */
function SocialLinks({ socials, name, onEdit }: { socials: VitrineContent["socials"]; name: string; onEdit?: () => void }) {
  const t = useTranslations("storefront");
  const te = useTranslations("editor.edit");
  const links = socialLinks(socials);
  // no modo de edição os ícones viram um botão só, com o lápis ao lado (o lápis por cima cobriria ícones tão pequenos);
  // sem nenhuma rede, o botão fica no mesmo lugar, com os ícones apagados e o "+"
  if (onEdit) {
    const empty = links.length === 0;
    const icons: SocialNetwork[] = empty ? ["instagram", "tiktok"] : links.map(([n]) => n);
    return (
      <button
        type="button"
        onClick={onEdit}
        aria-label={te(empty ? "addSocials" : "socials")}
        title={te(empty ? "addSocials" : "socials")}
        className="group -mt-1 flex cursor-pointer items-center gap-0.5 border-0 bg-transparent py-0 pr-1 pl-0 text-ink hover:bg-cream @2xl:absolute @2xl:top-12 @2xl:-right-2 @2xl:mt-0"
      >
        {icons.map((n) => (
          <span key={n} aria-hidden="true" className={`flex size-8 items-center justify-center ${empty ? "opacity-30" : ""}`}>
            <SocialIcon network={n} />
          </span>
        ))}
        <span aria-hidden="true" className="ml-0.5 flex size-7 items-center justify-center rounded-full bg-white text-ink shadow-[0_1px_4px_rgba(17,17,17,0.18)]">
          {empty ? <PlusIcon size={13} /> : <PencilIcon size={13} />}
        </span>
      </button>
    );
  }
  if (!links.length) return null;
  return (
    <ul className="m-0 -mt-1 flex list-none items-center gap-0.5 p-0 @2xl:absolute @2xl:top-12 @2xl:-right-2 @2xl:mt-0">
      {links.map(([n, url]) => (
        <li key={n}>
          <a
            href={url}
            target="_blank"
            rel="me noopener noreferrer"
            aria-label={t("socialLink", { name, network: SOCIAL_LABELS[n] })}
            title={SOCIAL_LABELS[n]}
            className="group flex size-8 items-center justify-center text-ink"
          >
            <SocialIcon network={n} />
          </a>
        </li>
      ))}
    </ul>
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
function Carousel({ title, label, action, sub, children }: { title: string; label: string; action?: ReactNode; sub?: ReactNode; children: ReactNode }) {
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
        {action && <div className="ml-auto">{action}</div>}
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
      {sub}
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

/**
 * Modo de edição, só no editor: cada parte da vitrine vira um botão que abre a edição dela (capa, foto, redes, cada
 * cupom e produto), a frase e o texto de apoio viram campos, os outfits são editados no lugar da seção, e produtos e
 * cupons ganham o esqueleto "+" para adicionar, mesmo vazios. Sem `edit`, nada muda.
 */
export type StorefrontEdit = {
  /** trocar (ou pôr) a capa: abre o seletor de arquivo */
  cover: () => void;
  /** tirar a capa (o X ao lado do lápis, só com capa) */
  removeCover: () => void;
  coverBusy?: boolean;
  avatar: () => void;
  avatarBusy?: boolean;
  /** a frase de destaque e o texto de apoio, editados ali mesmo na vitrine */
  text: (patch: Partial<Pick<VitrineContent, "headline" | "sub">>) => void;
  socials: () => void;
  /** null: adicionar um novo */
  coupon: (id: string | null) => void;
  product: (id: string | null) => void;
  /** marca ou desmarca o produto como favorito da creator (seção Favoritos), sem abrir a janela */
  favorite: (id: string, on: boolean) => void;
  /** arrastando o card na vitrine: `from` vai para o lugar de `to` */
  reorder: (key: "products" | "coupons", from: string, to: string) => void;
  /** os outfits editados no lugar da seção (o editor monta) */
  outfits: ReactNode;
};

function HeartIcon({ size = 16, on }: { size?: number; on: boolean }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function PencilIcon({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
    </svg>
  );
}

/**
 * O selo de lápis do modo de edição: um círculo branco com o lápis, sempre visível (no celular não há hover), que marca o
 * que dá para editar. Só ilustra (`pointer-events-none`): o clique vai para o que está embaixo. Quem usa posiciona.
 */
export function PencilBadge({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none flex size-9 flex-none items-center justify-center rounded-full bg-white text-ink shadow-[0_1px_4px_rgba(17,17,17,0.18)] transition-[transform,opacity] ${className}`}
    >
      <PencilIcon />
    </span>
  );
}

/**
 * A capa no modo de edição, toda clicável (abre o seletor de arquivo), com o lápis no canto: no mouse, o hover escurece de leve e mostra o botão
 * "Trocar capa" no meio; no toque (sem hover), um tracejado claro por dentro da borda avisa que dá para tocar.
 */
function CoverHit({ label, onClick, image, busy = false }: { label: string; onClick: () => void; image: boolean; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      className={`group/cover absolute inset-0 z-20 flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 focus-visible:outline-none disabled:cursor-progress ${busy ? "animate-pulse bg-white/30" : ""}`}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors duration-200 group-hover/cover:bg-ink/15 group-focus-visible/cover:bg-ink/15" />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-3 hidden border border-dashed pointer-coarse:block ${image ? "border-white/70" : "border-ink/20"}`}
      />
      <span
        aria-hidden="true"
        // o botão só aparece no hover, e branco para ler sobre qualquer capa (e sobre a letra, sem capa)
        className="relative flex h-10 translate-y-1 items-center gap-2 bg-white px-4 text-[13px] font-semibold text-ink opacity-0 shadow-[0_2px_10px_rgba(17,17,17,0.18)] transition duration-200 group-hover/cover:translate-y-0 group-hover/cover:opacity-100 group-focus-visible/cover:translate-y-0 group-focus-visible/cover:opacity-100"
      >
        <CameraIcon size={16} />
        {label}
      </span>
      <PencilBadge className="absolute top-3 right-3 group-hover/cover:scale-105" />
    </button>
  );
}

/**
 * Camada clicável por cima de uma parte da vitrine no modo de edição: cobre tudo (os botões de dentro não respondem) e
 * mostra o lápis no canto, sempre visível, porque no celular não há hover. Nos cards de produto o lápis sai
 * (`pencil={false}`): o canto é do coração de favorito, e o contorno no hover já mostra que o card abre a edição.
 */
function EditHit({ label, onClick, pencil = true, ...rest }: { label: string; onClick: () => void; pencil?: boolean } & ComponentProps<"button">) {
  return (
    <button
      {...rest}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="group/edit absolute inset-0 z-20 cursor-pointer border-0 bg-transparent p-0 transition-shadow hover:shadow-[inset_0_0_0_2px_var(--color-ink)] focus-visible:shadow-[inset_0_0_0_2px_var(--color-ink)] focus-visible:outline-none"
    >
      {pencil && <PencilBadge className="absolute top-2.5 right-2.5 group-hover/edit:scale-105" />}
    </button>
  );
}

/** No editor, como mudar a ordem dos cards: arrastar com o mouse, segurar e arrastar no toque. */
function ReorderHint({ className }: { className: string }) {
  const te = useTranslations("editor.edit");
  return (
    <p className={`m-0 text-[13px] leading-snug text-mute ${className}`}>
      <span className="pointer-coarse:hidden">{te("reorderHint")}</span>
      <span className="hidden pointer-coarse:inline">{te("reorderHintTouch")}</span>
    </p>
  );
}

const CameraIcon = ({ size = 22 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

const PlusIcon = ({ size = 22 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/**
 * Texto editado no próprio lugar, no modo de edição: um textarea com a mesma letra do texto da vitrine, que cresce com o
 * texto. Tocar já põe o cursor ali; Enter e Esc encerram (os dois textos são de uma linha só, quebrada pela largura).
 */
export function InlineText({
  value,
  onChange,
  maxLength,
  placeholder,
  label,
  className,
  onFocus,
  onBlur,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  placeholder: string;
  label: string;
  className: string;
  onFocus?: () => void;
  onBlur?: () => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const own = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? own;
  // a altura acompanha o texto e a largura (o field-sizing do CSS ainda não chega a todo navegador)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    // a fonte da vitrine pode chegar depois da primeira medida, e com ela a altura muda
    document.fonts?.addEventListener("loadingdone", fit);
    return () => {
      ro.disconnect();
      document.fonts?.removeEventListener("loadingdone", fit);
    };
  }, [ref, value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\s*\n\s*/g, " "))}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label={label}
      // sem o sublinhado vermelho por cima da vitrine
      spellCheck={false}
      // alinhamento e respiro ficam com quem usa
      className={`m-0 block w-full resize-none overflow-hidden border-0 bg-transparent text-inherit outline-none placeholder:text-ink/30 ${className}`}
    />
  );
}

/**
 * A frase de destaque e o texto de apoio no modo de edição: os dois já são campos, no mesmo lugar e com a mesma letra
 * da vitrine. O lápis fica no canto enquanto nenhum dos dois está com o cursor; no mouse, um fundo leve e o cursor de
 * texto aparecem no hover; no toque (sem hover), um tracejado bem claro fica em volta. Com o cursor dentro, a borda fica
 * cheia, o lápis some e o contador aparece.
 */
function InlineTexts({
  content,
  placeholder,
  onChange,
}: {
  content: VitrineContent;
  placeholder: string;
  onChange: (patch: Partial<Pick<VitrineContent, "headline" | "sub">>) => void;
}) {
  const te = useTranslations("editor.edit");
  const tp = useTranslations("editor.profile");
  const [focused, setFocused] = useState<"headline" | "sub" | null>(null);
  const headlineRef = useRef<HTMLTextAreaElement>(null);
  const count = focused === "headline" ? [content.headline.length, 90] : focused === "sub" ? [content.sub.length, 240] : null;
  return (
    <div
      // tocar no respiro em volta dos textos (ou no lápis) também começa a editar, com o cursor no fim da frase
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget && !(e.target as Element).closest("[data-pencil]")) return;
        e.preventDefault();
        const el = headlineRef.current;
        el?.focus();
        el?.setSelectionRange(el.value.length, el.value.length);
      }}
      className="relative flex w-full cursor-text flex-col items-center gap-4 px-4 py-5 outline-2 outline-transparent outline-solid transition-[background-color,outline-color] hover:bg-ink/[0.035] has-focus:bg-transparent has-focus:outline-ink"
    >
      {!focused && <span aria-hidden="true" className="pointer-events-none absolute inset-0 hidden border border-dashed border-ink/20 pointer-coarse:block" />}
      {/* o lápis fica meio para fora do bloco: o span em volta recebe o toque, para ele também começar a edição */}
      {!focused && (
        <span data-pencil className="absolute -top-3 -right-3">
          <PencilBadge />
        </span>
      )}
      <InlineText
        inputRef={headlineRef}
        value={content.headline}
        onChange={(headline) => onChange({ headline })}
        maxLength={90}
        placeholder={placeholder}
        label={tp("headline")}
        onFocus={() => setFocused("headline")}
        onBlur={() => setFocused(null)}
        // font-display! porque o globals.css faz os campos herdarem a fonte, fora das camadas do Tailwind
        className="p-0 text-center font-display! text-[clamp(44px,8cqw,96px)] leading-[1] font-normal text-balance"
      />
      <InlineText
        value={content.sub}
        onChange={(sub) => onChange({ sub })}
        maxLength={240}
        placeholder={te("addSub")}
        label={tp("sub")}
        onFocus={() => setFocused("sub")}
        onBlur={() => setFocused(null)}
        className="max-w-[36rem] p-0 text-center text-[17px] leading-relaxed text-mute"
      />
      {count && (
        <span aria-live="polite" className="absolute right-3 bottom-1.5 text-[12px] text-mute tabular-nums">
          {count[0]}/{count[1]}
        </span>
      )}
    </div>
  );
}

/*
 * Esqueletos do modo de edição: com a seção vazia, ela já aparece no formato final (a grade de produtos; o cupom), em
 * traço claro, e a creator vai preenchendo. O tracejado marca o que é clicável.
 */

/** Uma linha de texto ainda por escrever. */
const Bar = ({ className }: { className: string }) => <span aria-hidden="true" className={`block flex-none bg-ink/[0.08] ${className}`} />;

/** Tracejado por cima do esqueleto clicável; escurece no hover. */
const Dashed = ({ className = "inset-0" }: { className?: string }) => (
  <span aria-hidden="true" className={`pointer-events-none absolute border-2 border-dashed border-ink/20 transition-colors group-hover/ghost:border-ink/60 ${className}`} />
);

/** Um produto por preencher, no lugar dele na grade: a foto quadrada e o nome embaixo. Sem `onClick`, só ilustra. */
function ProductGhost({ onClick, className = "" }: { onClick?: () => void; className?: string }) {
  const te = useTranslations("editor.edit");
  const art = onClick ? (
    <>
      <Dashed />
      <span className="flex size-12 items-center justify-center rounded-full bg-ink text-white transition-transform group-hover/ghost:scale-105">
        <PlusIcon />
      </span>
      <span className="text-[12px] font-semibold tracking-[0.12em] uppercase">{te("addProduct")}</span>
    </>
  ) : (
    // a etiqueta de preço, apagada
    <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-ink/15">
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
  const inner = (
    <>
      <span className="relative flex aspect-square w-full flex-col items-center justify-center gap-3 bg-cream p-4 text-center">{art}</span>
      <Bar className="mt-4 h-3 w-2/3" />
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={`group/ghost flex min-w-0 cursor-pointer flex-col items-center border-0 bg-transparent p-0 text-ink ${className}`}>
      {inner}
    </button>
  ) : (
    <div aria-hidden="true" className={`flex min-w-0 flex-col items-center ${className}`}>
      {inner}
    </div>
  );
}

/** Um cupom por preencher, no formato do cupom da vitrine (marca, desconto, código e o botão). Sem `onClick`, só ilustra. */
function CouponGhost({ onClick }: { onClick?: () => void }) {
  const te = useTranslations("editor.edit");
  const cls = "relative box-border flex min-h-[290px] w-[300px] flex-none snap-start flex-col gap-4 bg-cream p-6 text-left text-ink @max-md:w-[82%]";
  const inner = (
    <>
      <Dashed />
      <span className="flex items-center gap-2">
        <span className="size-8 flex-none rounded-full bg-ink/[0.08]" />
        <Bar className="h-3.5 w-24" />
      </span>
      <span className="flex flex-col gap-3">
        <span className="font-display text-[56px] leading-[1] font-normal lining-nums text-ink/[0.13]">{te("ghostOff")}</span>
        <Bar className="h-3 w-3/4" />
      </span>
      <span className="mt-auto flex flex-col gap-2">
        <span className="flex min-h-12 items-center justify-center border border-dashed border-gold/50 bg-white px-4 font-mono text-[15px] font-bold tracking-[0.08em] text-ink/20">
          {te("ghostCode")}
        </span>
        {onClick ? (
          <span className="flex min-h-12 items-center justify-center gap-2 bg-ink px-3 text-[11px] font-semibold tracking-[0.14em] text-white uppercase transition-opacity group-hover/ghost:opacity-90">
            <PlusIcon size={14} />
            {te("addCoupon")}
          </span>
        ) : (
          <span className="min-h-12 bg-ink/[0.08]" />
        )}
      </span>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={`group/ghost cursor-pointer border-0 ${cls}`}>
      {inner}
    </button>
  ) : (
    <div aria-hidden="true" className={`opacity-40 ${cls}`}>
      {inner}
    </div>
  );
}

/** Botão pequeno "+ Adicionar" ao lado do título da seção, no modo de edição (o card "+" fica no fim da lista). */
function AddPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 flex-none cursor-pointer items-center gap-1.5 border border-ink bg-white px-4 text-[12px] font-semibold tracking-[0.12em] text-ink uppercase hover:bg-ink hover:text-white"
    >
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {label}
    </button>
  );
}

export function Storefront({
  content,
  preview: previewProp = false,
  edit,
  comments,
  favorites = null,
}: {
  content: VitrineContent;
  preview?: boolean;
  /** modo de edição do editor (veja `StorefrontEdit`); implica `preview` */
  edit?: StorefrontEdit;
  /** Não vem na prévia do editor, que não mostra comentários nem o coração. */
  comments?: CommentList;
  /** Quantas pessoas favoritaram; null: não deu para contar. */
  favorites?: number | null;
}) {
  const t = useTranslations("storefront");
  const te = useTranslations("editor.edit");
  const format = useFormatter();
  const preview = previewProp || Boolean(edit);
  const viewer = useViewer(content.handle, preview);
  const firstName = content.name.split(" ")[0] || content.name;
  const headline = content.headline.replace(/\*/g, "").trim() || t("defaultHeadline", { name: firstName });
  const banner = content.look.bannerUrl;

  // no modo de edição aparecem todos, inclusive vencidos e agendados, para dar para corrigir
  const coupons = content.coupons;
  // esgotados vão para o fim da lista
  const products = useMemo(() => [...content.products].sort((a, b) => Number(a.soldOut) - Number(b.soldOut)), [content.products]);
  // post sem foto ou sem nenhum produto que ainda exista não aparece (no modo de edição aparece, para completar)
  // favoritos da creator (esgotados ficam só na lista de produtos), na ordem dos produtos
  const favoriteProducts = useMemo(() => products.filter((p) => p.favorite && !p.soldOut), [products]);
  // vídeo sem capa fica fora da galeria (não tem o que mostrar antes do play)
  const allPosts = useMemo(
    () => content.posts.map((p) => ({ post: p, items: postItems(p, products), media: p.media.filter((m) => m.photoUrl) })),
    [content.posts, products],
  );
  const posts = useMemo(() => allPosts.filter((p) => p.media.length > 0 && p.items.length > 0), [allPosts]);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  // "" é "todas as categorias": nenhuma categoria de produto tem nome vazio
  const [cat, setCat] = useState("");
  const [query, setQuery] = useState("");
  const q = fold(query.trim());
  const shownProducts = products.filter(
    (p) => (!cat || p.category === cat) && (!q || fold(`${p.name} ${p.brand} ${p.category}`).includes(q)),
  );


  const [copied, flash] = useFlash();

  // no editor, produtos e cupons mudam de ordem arrastando o card ali mesmo
  const dragProducts = useDragReorder(shownProducts.map((p) => p.id), (from, to) => edit?.reorder("products", from, to), !!edit);
  const dragCoupons = useDragReorder(coupons.map((c) => c.id), (from, to) => edit?.reorder("coupons", from, to), !!edit);
  const dragged = "z-40 scale-[1.03] bg-white shadow-[0_18px_40px_rgba(17,17,17,0.2)]";

  // produto ampliado aberto (e o outfit de onde veio, para a métrica do post)
  const [viewing, setViewing] = useState<{ product: Product; postId?: string } | null>(null);
  // outfit cuja imagem de stories a dona está criando
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  // ?p=<id>: o link da figurinha dos stories abre a vitrine já com o produto ampliado
  useEffect(() => {
    if (preview) return;
    const id = new URLSearchParams(window.location.search).get("p");
    const product = id ? content.products.find((x) => x.id === id) : undefined;
    if (!product) return;
    const timer = setTimeout(() => setViewing({ product }));
    return () => clearTimeout(timer);
  }, [preview, content.products]);
  // cupons em que a cópia na hora falhou: true se a segunda tentativa copiou, false se o visitante copia à mão
  const [fallback, setFallback] = useState<Record<string, boolean>>({});

  const copyCoupon = (c: (typeof coupons)[number], code: Element | null) => {
    send("copy", c.id);
    if (copyNow(c.code)) {
      flash(`c:${c.id}`);
      if (!preview) openStore(c.storeUrl);
      return;
    }
    // não diz "Copiado" sem ter copiado: tenta de novo e, se falhar, deixa o código selecionado para copiar à mão;
    // a loja vira um botão próprio, porque abrir depois de esperar seria bloqueado como pop-up
    void copyLater(c.code).then((ok) => {
      setFallback((prev) => ({ ...prev, [c.id]: ok }));
      if (ok) flash(`c:${c.id}`);
      else if (code) window.getSelection()?.selectAllChildren(code);
    });
  };

  // os outfits vêm primeiro: a vitrine é de quem usa as peças
  const nav = [
    ["#outfits", t("nav.posts"), posts.length > 0],
    ["#produtos", t("nav.products"), products.length > 0],
    ["#cupons", t("nav.coupons"), coupons.length > 0],
    ["#comentarios", t("nav.comments"), Boolean(comments)],
  ] as const;

  // os dois primeiros atalhos do topo, na ordem das seções: outfits, produtos, cupons
  const ctas = (
    [
      ["#outfits", t("seeOutfits"), posts.length > 0],
      ["#produtos", t("seeProducts"), products.length > 0],
      ["#cupons", t("seeCoupons"), coupons.length > 0],
    ] as const
  )
    .filter(([, , on]) => on)
    .slice(0, 2);

  const send = (kind: Parameters<typeof track>[1], item?: string) => {
    if (!preview) track(content.handle, kind, item);
  };

  // uma visita por aba, para recarregar a página não inflar o número (e o /api/t ainda conta uma por pessoa por dia).
  // Espera o /api/eu: a dona abrindo a própria vitrine não conta como visita.
  const owner = Boolean(viewer?.user && viewer.owner);
  useEffect(() => {
    if (preview || !viewer || owner) return;
    const key = `vitri:visto:${content.handle}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage bloqueado: conta a visita mesmo assim
    }
    track(content.handle, "view");
  }, [preview, content.handle, viewer, owner]);

  /** Liga o produto ao link dele: o de afiliado ou, sem ele, o da loja. Esgotado ou sem link não é clicável. */
  const linkProps = (p: Product, postId?: string) => ({
    href: p.soldOut ? "" : productHref(p),
    // o visitante vai direto para a loja (um clique só). Só a dona, na própria vitrine, abre o produto ampliado,
    // que é de onde sai a imagem de stories dele.
    onView: preview || !owner ? undefined : () => setViewing({ product: p, postId }),
    onOpen: (e: MouseEvent) => {
      // na prévia do editor o clique não tira a pessoa da página
      if (preview) e.preventDefault();
      send("buy", p.id);
      // o clique também conta para o post de onde veio
      if (postId) send("post", postId);
    },
  });

  return (
    <div className="@container w-full overflow-hidden bg-white font-sans text-ink">
      {/* no modo de edição o editor tem o próprio cabeçalho */}
      {!edit && (
      <header className={`mx-auto flex max-w-[1440px] items-center justify-between gap-4 border-b border-sand py-3.5 ${pad}`}>
        {/* "/" serve aos dois: o proxy leva quem entrou para /inicio e quem não entrou fica na landing.
            Na prévia do editor é só a aparência, para o clique não tirar a pessoa do editor. */}
        <BackLink href={preview ? undefined : "/"} label="home" labelClass="@max-2xl:hidden" />
        {/* min-h-10: a linha já nasce com a altura do "Editar vitrine", que só chega depois do /api/eu, para o cabeçalho não crescer e empurrar a página */}
        <div className="flex min-h-10 flex-none items-center gap-8">
          <nav aria-label={t("nav.label")} className="flex flex-none gap-6 @max-2xl:hidden">
            {nav.map(([href, label, on]) =>
              on ? (
                <a key={href} href={href} className="text-[12px] font-medium tracking-[0.22em] text-ink uppercase no-underline hover:text-gold">
                  {label}
                </a>
              ) : null,
            )}
          </nav>
          {/* a dona vê o atalho para o editor (quem é dona vem de /api/eu: a página em si é a mesma para todos) */}
          {!preview && viewer?.user && viewer.owner && (
            <Link
              href="/editor"
              className="flex min-h-10 flex-none items-center gap-2 border border-ink px-4 text-[12px] font-medium tracking-[0.18em] text-ink uppercase no-underline hover:bg-ink hover:text-white"
            >
              <PencilIcon size={14} />
              {t("editVitrine")}
            </Link>
          )}
        </div>
      </header>
      )}

      <section className={`mx-auto max-w-[1440px] ${pad} ${edit ? "pt-5 @3xl:pt-6" : ""}`}>
        <div className="relative">
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element -- capa vem de URL arbitrária
          <img src={banner} alt="" fetchPriority="high" className="block aspect-[21/9] w-full bg-cream object-cover @max-2xl:aspect-[4/3]" />
        ) : (
          <div className="relative aspect-[21/9] w-full @max-2xl:aspect-[4/3]">
            <CoverLetter name={content.name} />
          </div>
        )}
        {edit && <CoverHit label={banner ? te("cover") : te("addCover")} onClick={edit.cover} image={Boolean(banner)} busy={edit.coverBusy} />}
        {edit && banner && !edit.coverBusy && (
          // ao lado do lápis (que fica em top-3 right-3, size-9): um botão à parte, porque a capa inteira já é um botão
          <button
            type="button"
            onClick={edit.removeCover}
            aria-label={te("removeCover")}
            title={te("removeCover")}
            className="absolute top-3 right-14 z-30 flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-white p-0 text-ink shadow-[0_1px_4px_rgba(17,17,17,0.18)] transition-[transform,color] hover:scale-105 hover:text-[#A3361B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
        </div>
        {/* quem indica: a foto fica sobre a borda da capa */}
        <div className="relative -mt-10 flex flex-col items-center gap-2.5 text-center">
          {edit ? (
            <button
              type="button"
              onClick={edit.avatar}
              disabled={edit.avatarBusy}
              aria-label={te("avatar")}
              title={te("avatar")}
              className={`group/avatar relative z-20 cursor-pointer rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${edit.avatarBusy ? "animate-pulse" : ""}`}
            >
              <Avatar content={content} className="box-border size-20 flex-none rounded-full text-2xl ring-4 ring-white" />
              {/* o selo de câmera: diz que a foto é clicável, sem cobrir o rosto */}
              <span aria-hidden="true" className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border-2 border-white bg-ink text-white transition-transform group-hover/avatar:scale-110">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </span>
            </button>
          ) : (
            <Avatar content={content} className="box-border size-20 flex-none rounded-full text-2xl ring-4 ring-white" />
          )}
          <div className="flex max-w-full min-w-0 flex-col leading-tight">
            <span className="font-display text-[22px] leading-tight font-medium break-words">{content.name}</span>
            <span className="text-[13px] break-words text-mute">@{content.handle}</span>
          </div>
          <SocialLinks socials={content.socials} name={content.name} onEdit={edit?.socials} />
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
          {edit ? (
            <InlineTexts content={content} placeholder={t("defaultHeadline", { name: firstName })} onChange={edit.text} />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <h1 className="m-0 font-display text-[clamp(44px,8cqw,96px)] leading-[1] font-normal text-balance">{headline}</h1>
              {content.sub && <p className="m-0 max-w-[36rem] text-[17px] leading-relaxed text-mute">{content.sub}</p>}
            </div>
          )}
          {ctas.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {ctas.map(([href, label], i) => (
                <a key={href} href={href} className={i === 0 ? pillDark : pillLight}>
                  {label}
                </a>
              ))}
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

      {edit ? (
        <section id="outfits" className="mx-auto max-w-[1440px] scroll-mt-4 pt-16 @3xl:pt-24">
          {/* os outfits se configuram ali mesmo (o editor manda o OutfitsEditor): postar o look é o principal da vitrine */}
          <div className={pad}>
            <SectionTitle>{t("postsTitle")}</SectionTitle>
          </div>
          <div className={`mt-6 @3xl:mt-8 ${pad}`}>{edit.outfits}</div>
        </section>
      ) : (
        posts.length > 0 && (
          <section id="outfits" className="mx-auto max-w-[1440px] scroll-mt-4 pt-16 @3xl:pt-24">
            <OutfitCarousel
              outfits={posts}
              firstName={firstName}
              link={linkProps}
              onPlay={(postId) => send("video", postId)}
              onStory={preview || !owner ? undefined : setSharingPost}
            />
          </section>
        )
      )}

      {favoriteProducts.length > 0 && (
        <section id="favoritos" className="mx-auto max-w-[1440px] scroll-mt-4 pt-16 @3xl:pt-24">
          <Carousel title={t("favoritesTitle", { name: firstName })} label={t("favoritesLabel", { name: firstName })}>
            {favoriteProducts.map((p) => (
              <article key={p.id} className="relative flex w-[260px] flex-none snap-start flex-col items-center text-center @max-md:w-[62%]">
                {edit && <EditHit label={te("product", { name: p.name || te("newProduct") })} onClick={() => edit.product(p.id)} pencil={false} />}
                <ProductLink {...linkProps(p)} className="flex w-full min-w-0 flex-col text-ink no-underline">
                  <div aria-hidden="true" className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-cream">
                    <ProductArt product={p} iconClassName="w-[52%]" />
                  </div>
                  <h3 className="m-0 pt-3 text-[15px] leading-snug font-medium underline-offset-2 [a:hover_&]:underline @max-2xl:text-sm">{p.name}</h3>
                </ProductLink>
                {p.brand && <span className="pt-0.5 text-[13px] text-mute">{p.brand}</span>}
              </article>
            ))}
          </Carousel>
        </section>
      )}

      {(products.length > 0 || edit) && (
        <section id="produtos" className={`mx-auto flex max-w-[1440px] scroll-mt-4 flex-col gap-6 pt-16 @3xl:pt-24 ${pad}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SectionTitle>
              {t("productsTitle")} {products.length > 0 && <span className="text-mute">({format.number(products.length)})</span>}
            </SectionTitle>
            {edit && products.length > 0 && <AddPill label={te("add")} onClick={() => edit.product(null)} />}
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
          {edit && products.length === 0 && <p className="m-0 -mt-2 max-w-[36rem] text-[15px] leading-snug text-mute">{te("emptyProducts")}</p>}
          {edit && shownProducts.length > 1 && <ReorderHint className="-mt-3" />}
          {products.length > 0 && shownProducts.length === 0 && <p className="m-0 text-[17px] text-mute">{t("noResults", { query: query.trim() })}</p>}

          <div className="grid grid-cols-2 gap-x-3 gap-y-10 @3xl:grid-cols-3 @3xl:gap-x-4 @3xl:gap-y-12">
            {shownProducts.map((p) => (
              <article
                key={p.id}
                data-reorder-id={edit ? p.id : undefined}
                className={`relative flex min-w-0 flex-col items-center text-center ${edit ? "select-none [-webkit-touch-callout:none]" : ""} ${dragProducts.dragging === p.id ? dragged : ""}`}
              >
                {edit && <EditHit label={te("product", { name: p.name || te("newProduct") })} onClick={() => edit.product(p.id)} pencil={false} {...dragProducts.handle(p.id)} />}
                {/* no editor, o coração marca e desmarca o favorito ali mesmo; na vitrine é só o selo */}
                {edit ? (
                  <button
                    type="button"
                    onClick={() => edit.favorite(p.id, !p.favorite)}
                    aria-pressed={p.favorite}
                    aria-label={te(p.favorite ? "favoriteOn" : "favoriteOff", { name: p.name || te("newProduct") })}
                    title={te(p.favorite ? "favoriteOn" : "favoriteOff", { name: p.name || te("newProduct") })}
                    className={`absolute top-2.5 right-2.5 z-30 flex size-9 cursor-pointer items-center justify-center rounded-full border-0 shadow-[0_1px_4px_rgba(17,17,17,0.18)] transition-transform hover:scale-105 ${p.favorite ? "bg-ink text-white" : "bg-white text-ink"}`}
                  >
                    <HeartIcon on={p.favorite} />
                  </button>
                ) : (
                  p.favorite && (
                    <span title={t("favoriteBadge", { name: firstName })} className="pointer-events-none absolute top-2.5 right-2.5 z-10 flex size-8 items-center justify-center rounded-full bg-white text-ink shadow-sm">
                      <HeartIcon on size={15} />
                      <span className="sr-only">{t("favoriteBadge", { name: firstName })}</span>
                    </span>
                  )
                )}
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
              </article>
            ))}
            {edit && <ProductGhost onClick={() => edit.product(null)} />}
            {/* vazia, a grade já mostra o lugar dos próximos */}
            {edit && products.length === 0 && (
              <>
                <ProductGhost className="opacity-60" />
                <ProductGhost className="opacity-35 @max-3xl:hidden" />
              </>
            )}
          </div>
        </section>
      )}

      {(coupons.length > 0 || edit) && (
        <section id="cupons" className="mx-auto max-w-[1440px] scroll-mt-4 pt-16 @3xl:pt-24">
          <Carousel
            title={t("couponsTitle")}
            label={t("couponsLabel")}
            action={edit && coupons.length > 0 ? <AddPill label={te("add")} onClick={() => edit.coupon(null)} /> : undefined}
            sub={
              edit && coupons.length === 0 ? (
                <p className={`m-0 mt-4 max-w-[36rem] text-[15px] leading-snug text-mute ${pad}`}>{te("emptyCoupons")}</p>
              ) : edit && coupons.length > 1 ? (
                <ReorderHint className={`mt-2 ${pad}`} />
              ) : undefined
            }
          >
            {coupons.map((c) => (
              <article
                key={c.id}
                data-reorder-id={edit ? c.id : undefined}
                className={`relative box-border flex min-h-[290px] w-[300px] flex-none snap-start flex-col gap-4 border border-sand bg-cream p-6 @max-md:w-[82%] ${edit ? "select-none [-webkit-touch-callout:none]" : ""} ${dragCoupons.dragging === c.id ? dragged : ""}`}
              >
                {edit && <EditHit label={te("coupon", { name: c.brand || c.code || te("newCoupon") })} onClick={() => edit.coupon(c.id)} {...dragCoupons.handle(c.id)} />}
                <div className="flex min-w-0 items-center gap-2">
                  <BrandLogo url={c.logoUrl} className="size-8" />
                  {c.storeUrl ? (
                    <a href={c.storeUrl} target="_blank" rel="noopener noreferrer" className="truncate text-[15px] font-medium text-inherit">
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
                  <span className="flex min-h-12 items-center justify-center border border-dashed border-gold/50 bg-white px-4 text-center font-mono text-[15px] font-bold tracking-[0.08em] break-all select-all">
                    {c.code}
                  </span>
                  <button
                    onClick={(e) => copyCoupon(c, e.currentTarget.previousElementSibling)}
                    aria-label={c.storeUrl ? t("copyAndOpenLabel", { code: c.code, brand: c.brand }) : t("copyLabel", { code: c.code })}
                    className="flex min-h-12 items-center justify-center border-0 bg-ink px-3 text-[11px] font-medium tracking-[0.14em] whitespace-nowrap text-white uppercase hover:bg-[#2b2925]"
                  >
                    {copied === `c:${c.id}`
                      ? t("copied")
                      : fallback[c.id] === false
                        ? t("copyManually")
                        : c.storeUrl && fallback[c.id] === undefined
                          ? t("copyAndOpen")
                          : t("copyCode")}
                  </button>
                  {c.storeUrl && fallback[c.id] !== undefined && !preview && (
                    <a
                      href={c.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-12 items-center justify-center border border-ink px-3 text-[11px] font-medium tracking-[0.14em] whitespace-nowrap text-ink uppercase no-underline hover:bg-ink hover:text-white"
                    >
                      {t("goToStore")}
                    </a>
                  )}
                </div>
              </article>
            ))}
            {edit && <CouponGhost onClick={() => edit.coupon(null)} />}
            {edit && coupons.length === 0 && <CouponGhost />}
          </Carousel>
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

      {viewing && (
        <ProductModal
          key={viewing.product.id}
          product={viewing.product}
          owner={Boolean(viewer?.user && viewer.owner)}
          onBuy={() => {
            send("buy", viewing.product.id);
            // o clique também conta para o post de onde veio
            if (viewing.postId) send("post", viewing.postId);
          }}
          onClose={() => setViewing(null)}
        />
      )}
      {sharingPost && <OutfitStoryModal key={sharingPost.id} post={sharingPost} name={firstName} onClose={() => setSharingPost(null)} />}
    </div>
  );
}

/** Tempo de cada outfit de uma mídia só na tela antes de passar sozinho para o próximo. */
const OUTFIT_MS = 6000;
/** Tempo de cada foto ou vídeo na galeria de um outfit com várias mídias: o outfit dura isso vezes o número delas. */
const MEDIA_MS = 5000;
/** Quanto o dedo anda de lado (px) para o toque contar como deslize. */
const SWIPE_MIN = 40;
/** quanto o outfit fica na tela na troca automática */
const outfitMs = (o: Outfit | undefined) => ((o?.media.length ?? 1) > 1 ? o!.media.length * MEDIA_MS : OUTFIT_MS);

type Outfit = { post: Post; items: Product[]; media: PostMedia[] };
type ProductLinkProps = { href: string; onOpen: (e: MouseEvent) => void; onView?: () => void };
type LinkFor = (p: Product, postId: string) => ProductLinkProps;

/**
 * Outfits (no código, posts): um por vez, na largura toda da seção, sem o próximo cortado na borda. A troca é um
 * crossfade com a foto aproximando devagar, e passa sozinha: outfit de uma mídia a cada `OUTFIT_MS`; com várias, a
 * galeria passa as mídias a cada `MEDIA_MS` e, depois da última, vem o próximo outfit (sendo o único, volta à primeira
 * mídia). A barra de progresso mostra quanto falta. Para quando o mouse está em cima, quando algo dentro tem o foco e
 * para quem pede menos movimento (aí também não há animação); não há botão de pausa. No celular, arrastar para o lado troca de outfit.
 */
function OutfitCarousel({
  outfits,
  firstName,
  link,
  onPlay,
  onStory,
}: {
  outfits: Outfit[];
  firstName: string;
  link: LinkFor;
  onPlay: (postId: string) => void;
  /** só para a dona: abre a imagem de stories do outfit */
  onStory?: (post: Post) => void;
}) {
  const t = useTranslations("storefront");
  const tCommon = useTranslations("common");
  const total = outfits.length;
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  // o vídeo (id da mídia) que está tocando: a troca automática para, e trocar de outfit fecha o player
  const [playing, setPlaying] = useState<string | null>(null);
  // a visitante passou as fotos de um outfit: a troca automática para até ela mudar de outfit
  const [browsing, setBrowsing] = useState(false);

  // ?o=<id>: o link da figurinha do story do outfit abre a vitrine já nele
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("o");
    const at = id ? outfits.findIndex((o) => o.post.id === id) : -1;
    if (at < 0) return;
    const timer = setTimeout(() => {
      setIndex(at);
      document.getElementById("outfits")?.scrollIntoView();
    });
    return () => clearTimeout(timer);
  }, [outfits]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const current = Math.min(index, total - 1);
  // a troca automática: de mídia em mídia dentro do outfit e de outfit em outfit
  const auto = !hovering && !focused && !reduced && !playing && !browsing;
  const running = total > 1 && auto;
  // há o que passar sozinho: mais de um outfit ou um outfit com várias mídias
  const moves = total > 1 || outfits.some((o) => o.media.length > 1);
  const steps = outfits[current]?.media.length ?? 1;
  const go = (to: number) => {
    setPlaying(null);
    setBrowsing(false);
    setIndex(((to % total) + total) % total);
  };

  // o tempo recomeça a cada troca (manual ou automática) e quando a pausa termina. Outfit com várias mídias não usa
  // este relógio: a galeria passa as mídias e, depois da última, chama `onEnd`
  useEffect(() => {
    if (!running || steps > 1) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % total), OUTFIT_MS);
    return () => clearTimeout(id);
  }, [running, current, total, steps]);

  const arrow = "flex size-12 items-center justify-center border border-sand bg-transparent text-ink hover:border-ink";

  return (
    <>
      <div className={`flex items-center justify-between gap-4 ${pad}`}>
        <SectionTitle>{t("postsTitle")}</SectionTitle>
        {total > 1 && (
          <div className="flex gap-3">
            <button type="button" aria-label={tCommon("previous")} onClick={() => go(current - 1)} className={`${arrow} @max-2xl:hidden`}>
              <Chevron left />
            </button>
            <button type="button" aria-label={tCommon("next")} onClick={() => go(current + 1)} className={`${arrow} @max-2xl:hidden`}>
              <Chevron />
            </button>
          </div>
        )}
      </div>

      <div
        role="region"
        aria-roledescription={tCommon("carousel")}
        aria-label={t("postsLabel", { name: firstName })}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start || total < 2) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          // só o gesto de lado troca de outfit: rolar a página na diagonal, lendo as peças, não
          if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) >= Math.abs(dy) * 1.5) go(current + (dx < 0 ? 1 : -1));
        }}
        className={`mt-6 @3xl:mt-8 ${pad}`}
      >
        {/* os slides ficam empilhados na mesma célula: a altura é a do maior, e a troca não mexe no resto da página */}
        <div aria-live={moves && auto ? "off" : "polite"} className="grid">
          {outfits.map(({ post, items, media }, i) => (
            <OutfitSlide
              key={post.id}
              post={post}
              items={items}
              media={media}
              active={i === current}
              n={i + 1}
              total={total}
              alt={t("postAlt", { name: firstName })}
              link={(p) => link(p, post.id)}
              playing={playing}
              onPlay={(mediaId) => {
                setPlaying(mediaId);
                if (mediaId) onPlay(post.id);
              }}
              onBrowse={() => setBrowsing(true)}
              autoplay={auto && i === current}
              loop={total === 1}
              onEnd={() => setIndex((x) => (x + 1) % total)}
              onStory={onStory && (() => onStory(post))}
            />
          ))}
        </div>

        {total > 1 && (
          <div className="mt-4 flex gap-2 @3xl:mt-5">
            {outfits.map(({ post }, i) => (
              <button
                key={post.id}
                type="button"
                aria-label={t("outfitGo", { n: i + 1, total })}
                aria-current={i === current ? "true" : undefined}
                onClick={() => go(i)}
                className="group/bar flex h-6 flex-1 items-center border-0 bg-transparent p-0"
              >
                <span className="relative block h-[3px] w-full overflow-hidden bg-sand group-hover/bar:bg-ink/25">
                  {/* a barra do outfit atual enche no ritmo da troca (parada, fica cheia); as anteriores ficam cheias */}
                  <span
                    key={i === current ? `${current}-${running}` : "idle"}
                    style={i === current && running ? { animationDuration: `${outfitMs(outfits[i])}ms` } : undefined}
                    className={`absolute inset-y-0 left-0 w-full origin-left bg-ink ${i > current ? "scale-x-0" : i === current && running ? "animate-outfit-progress" : ""}`}
                  />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Um outfit: a foto da creator usando o conjunto, inteira no recorte 4:5, e ao lado (embaixo, no celular) as peças,
 * cada uma levando ao link dela, e o número do outfit. Os inativos ficam na mesma célula, transparentes e fora do foco.
 */
function OutfitSlide({
  post,
  items,
  media,
  active,
  n,
  total,
  alt,
  link,
  playing,
  onPlay,
  onBrowse,
  autoplay,
  loop,
  onEnd,
  onStory,
}: {
  post: Post;
  items: Product[];
  /** as fotos e vídeos com capa, na ordem da galeria */
  media: PostMedia[];
  active: boolean;
  n: number;
  total: number;
  alt: string;
  link: (p: Product) => ProductLinkProps;
  /** o vídeo tocando no carrossel (id da mídia) */
  playing: string | null;
  onPlay: (mediaId: string | null) => void;
  onBrowse: () => void;
  /** a galeria passa sozinha (outfit atual e troca automática ligada) */
  autoplay: boolean;
  /** depois da última mídia, volta à primeira (é o único outfit) em vez de chamar `onEnd` */
  loop: boolean;
  onEnd: () => void;
  onStory?: () => void;
}) {
  const t = useTranslations("storefront");
  const two = (x: number) => String(x).padStart(2, "0");
  return (
    <article
      aria-roledescription="slide"
      aria-label={`${n} / ${total}`}
      aria-hidden={!active}
      inert={!active}
      className={`col-start-1 row-start-1 flex flex-col bg-cream transition-opacity duration-700 ease-out motion-reduce:transition-none @3xl:grid @3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] ${
        active ? "z-10 opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <OutfitGallery media={media} active={active} eager={n === 1} alt={alt} playing={playing} onPlay={onPlay} onBrowse={onBrowse} autoplay={autoplay} loop={loop} onEnd={onEnd} />
      <div className="flex min-w-0 flex-col gap-6 p-5 @3xl:justify-between @3xl:p-12 @6xl:p-16">
        <div className="flex flex-col gap-4">
          {/* a legenda da creator: a voz dela sobre o look, antes das peças */}
          {post.caption.trim() && (
            <p
              className={`m-0 font-display text-[clamp(24px,2.6cqw,36px)] leading-[1.15] font-normal break-words whitespace-pre-line transition-all duration-700 motion-reduce:transition-none ${active ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
            >
              {post.caption.trim()}
            </p>
          )}
          <span
            className={`text-[12px] font-medium tracking-[0.22em] text-gold uppercase transition-all delay-150 duration-700 motion-reduce:transition-none ${active ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
          >
            {t("outfitPieces", { count: items.length })}
          </span>
          <ul className="m-0 flex list-none flex-col p-0">
            {items.map((p, i) => (
              <li
                key={p.id}
                style={{ transitionDelay: active ? `${250 + i * 90}ms` : "0ms" }}
                className={`border-b border-ink/10 transition-all duration-700 ease-out last:border-0 motion-reduce:transition-none ${active ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
              >
                <ProductLink {...link(p)} className="group/piece flex items-center gap-4 py-3 text-ink no-underline @3xl:py-4">
                  <div aria-hidden="true" className="relative flex size-16 flex-none items-center justify-center overflow-hidden bg-white @3xl:size-20">
                    <ProductArt product={p} iconClassName="w-[64%]" strokeWidth={4} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {p.brand && <span className="text-[11px] font-medium tracking-[0.18em] text-mute uppercase">{p.brand}</span>}
                    <span className="text-[15px] leading-snug font-medium underline-offset-2 group-hover/piece:underline @3xl:text-[17px]">{p.name}</span>
                    {p.soldOut && <span className="text-[13px] text-mute">{t("soldOut")}</span>}
                  </div>
                  {!p.soldOut && (
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-mute transition-transform group-hover/piece:translate-x-0.5 group-hover/piece:text-ink">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                </ProductLink>
              </li>
            ))}
          </ul>
        </div>
        {/* no rodapé do painel: o número do outfit e, para a dona, o botão da imagem de stories do look */}
        {(total > 1 || onStory) && (
          <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-end @3xl:justify-between">
            {total > 1 && (
              <span aria-hidden="true" className="font-display text-[clamp(28px,3.4cqw,52px)] leading-none lining-nums text-ink/80 @max-3xl:hidden">
                {two(n)}
                <span className="text-ink/30"> / {two(total)}</span>
              </span>
            )}
            {onStory && (
              <button
                type="button"
                onClick={onStory}
                className="flex min-h-12 cursor-pointer items-center justify-center gap-2 border border-ink bg-transparent px-6 text-[12px] font-medium tracking-[0.18em] text-ink uppercase hover:bg-ink hover:text-white"
              >
                {storyIcon}
                {t("product.outfitShare")}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/** Altura do cabeçalho do player do Instagram (`/embed/`), em px: fixa, não muda com a largura. */
const IG_EMBED_HEADER = 54;

/** O play redondo e o rótulo "Assistir · Rede" sobre a capa de um vídeo. */
function PlayMark({ label, raised }: { label: string; raised: boolean }) {
  return (
    <>
      <span aria-hidden="true" className={`flex size-20 items-center justify-center rounded-full bg-white/90 pl-1.5 text-ink shadow-[0_8px_28px_rgba(17,17,17,0.28)] backdrop-blur-sm transition-transform group-hover/play:scale-105 @max-3xl:size-16`}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 4.5v15l13-7.5z" />
        </svg>
      </span>
      <span className={`absolute left-5 text-[12px] font-semibold tracking-[0.18em] text-white uppercase [text-shadow:0_1px_8px_rgba(0,0,0,0.4)] ${raised ? "bottom-10" : "bottom-5"}`}>{label}</span>
    </>
  );
}

/**
 * O player do Instagram, por baixo da capa até o vídeo começar. O player é o cabeçalho (perfil e "View profile") e,
 * abaixo dele, o vídeo num quadro 4:5 do tamanho do nosso: o cabeçalho sobe para fora do quadro e o vídeo encaixa
 * alinhado ao painel das peças, com o play dele no centro, debaixo do nosso.
 */
function InstagramFrame({ mediaId, src, title, focusable }: { mediaId: string; src: string; title: string; focusable: boolean }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <iframe
      data-media={mediaId}
      src={src}
      title={title}
      tabIndex={focusable ? undefined : -1}
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      scrolling="no"
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={() => setLoaded(true)}
      style={{ top: -IG_EMBED_HEADER, height: `calc(100% + ${IG_EMBED_HEADER}px)` }}
      className={`absolute inset-x-0 w-full border-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}

/**
 * As fotos e vídeos de um outfit no recorte 4:5, uma por vez, como um post de rede social: uma faixa que rola de lado
 * e encaixa em cada mídia (scroll-snap), com setas nas laterais (no computador) e pontos embaixo. No celular a foto
 * acompanha o dedo, e a rolagem é a do navegador, então funciona também sobre o player do Instagram (o gesto passa do
 * iframe para a faixa). Deslizar além da primeira ou da última passa para o outfit vizinho (o toque sobe para o
 * carrossel). Vídeo mostra a capa com o play; tocar abre o player oficial da rede ali mesmo, ao lado das peças.
 */
function OutfitGallery({
  media,
  active,
  eager,
  alt,
  playing,
  onPlay,
  onBrowse,
  autoplay,
  loop,
  onEnd,
}: {
  media: PostMedia[];
  active: boolean;
  eager: boolean;
  alt: string;
  playing: string | null;
  onPlay: (mediaId: string | null) => void;
  onBrowse: () => void;
  autoplay: boolean;
  loop: boolean;
  onEnd: () => void;
}) {
  const t = useTranslations("storefront");
  const [at, setAt] = useState(0);
  // a cada vez que a visitante sai de um vídeo do Instagram tocando, o player dele é recriado: é o jeito de parar o som
  const [stops, setStops] = useState<Record<string, number>>({});
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  // a mídia para onde a faixa está rolando sozinha (seta, ponto, troca automática); null = quem rola é a visitante
  const target = useRef<number | null>(null);
  // onde o toque começou e em que mídia: decide se o deslize fica na galeria ou troca de outfit
  const touch = useRef<{ x: number; y: number; at: number } | null>(null);
  const latest = useRef({ onPlay, playing, onEnd });
  useEffect(() => {
    latest.current = { onPlay, playing, onEnd };
  });
  // O player do Instagram fica por baixo da capa, que é só enfeite (ele não aceita autoplay: com um play nosso que
  // abrisse o player, a visitante tocaria duas vezes). O toque nele não chega à página; o que chega é o foco indo para
  // o iframe, e é isso que conta o play (métrica), tira o enfeite e segura o carrossel de outfits. Rolar a faixa por
  // cima dele não dá foco: só o toque parado.
  useEffect(() => {
    const onBlur = () =>
      setTimeout(() => {
        const el = document.activeElement;
        const id = el instanceof HTMLIFrameElement && root.current?.contains(el) ? el.dataset.media : undefined;
        if (id && latest.current.playing !== id) latest.current.onPlay(id);
      });
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);
  const total = media.length;
  const current = Math.min(at, total - 1);

  /** Rola a faixa até a mídia `to`; a troca de `at` vem do `onScroll`, quando ela passa da metade. */
  const glide = useCallback((to: number, smooth = true) => {
    const el = track.current;
    if (!el) return;
    const left = to * el.clientWidth;
    if (Math.abs(el.scrollLeft - left) < 1) {
      target.current = null;
      return;
    }
    target.current = to;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left, behavior: smooth && !reduce ? "smooth" : "auto" });
  }, []);

  // a largura mudou (girar o celular, redimensionar a janela): a faixa volta para a mesma mídia, sem animação
  const shown = useRef(current);
  useEffect(() => {
    shown.current = current;
  }, [current]);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      el.scrollTo({ left: shown.current * width, behavior: "auto" });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // sair de um vídeo tocando: o do Instagram é recriado (para o som); os outros voltam à capa
  const stopVideo = () => {
    const id = latest.current.playing;
    if (!id) return;
    setStops((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }));
    latest.current.onPlay(null);
  };

  const onScroll = () => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const i = Math.min(total - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)));
    const manual = target.current === null;
    if (target.current === i) target.current = null;
    if (i === current) return;
    setAt(i);
    // a visitante passou a foto com o dedo (ou o trackpad): a troca automática para e o vídeo que tocava sai
    if (manual) {
      onBrowse();
      stopVideo();
    }
  };

  // a troca automática das mídias: a próxima a cada MEDIA_MS; depois da última, a primeira (único outfit) ou o próximo
  // outfit. O tempo recomeça a cada troca e quando a pausa termina.
  useEffect(() => {
    if (!autoplay || total < 2) return;
    const id = setTimeout(() => {
      if (current < total - 1) glide(current + 1);
      else if (loop) glide(0);
      else latest.current.onEnd();
    }, MEDIA_MS);
    return () => clearTimeout(id);
  }, [autoplay, current, total, loop, glide]);

  // o outfit saiu da tela: depois do fade, volta à primeira mídia, para recomeçar dela quando voltar
  useEffect(() => {
    if (active) return;
    const id = setTimeout(() => {
      glide(0, false);
      setAt(0);
    }, 800);
    return () => clearTimeout(id);
  }, [active, glide]);

  const show = (to: number) => {
    onBrowse();
    stopVideo();
    glide(to);
  };
  const arrow =
    "absolute top-1/2 z-10 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-white/90 p-0 text-ink shadow-[0_2px_10px_rgba(17,17,17,0.18)] transition-opacity hover:bg-white @max-2xl:hidden";

  return (
    <div
      ref={root}
      className={`group/gallery relative aspect-[4/5] overflow-clip ${playing && media.some((m) => m.id === playing) ? "bg-ink" : "bg-sand"}`}
      // tocar ou rolar com o mouse interrompe a rolagem automática: o que vier daí é da visitante
      onPointerDown={() => (target.current = null)}
      onWheel={() => (target.current = null)}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, at: current })}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) <= SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        // a faixa tinha para onde rolar: o deslize foi dela, não troca o outfit
        if (dx < 0 ? start.at < total - 1 : start.at > 0) e.stopPropagation();
      }}
    >
      <div
        ref={track}
        onScroll={onScroll}
        className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {media.map((m, i) => {
          const on = i === current;
          const video = m.videoUrl ? parseVideo(m.videoUrl) : null;
          const instagram = video?.network === "instagram";
          return (
            <div key={m.id} aria-hidden={!on} className="relative h-full w-full flex-none snap-center snap-always overflow-clip">
              {video && !instagram && playing === m.id && on ? (
                // o player oficial da rede, ali mesmo: a visitante assiste sem sair da vitrine, com as peças ao lado
                <iframe
                  src={videoEmbedUrl(video)}
                  title={t("videoTitle", { network: VIDEO_LABELS[video.network] })}
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="absolute inset-0 size-full border-0"
                />
              ) : (
                <>
                  {video && instagram && active && (Math.abs(i - current) <= 1 || playing === m.id) && (
                    <>
                      {/* fica por baixo da capa e já carrega quando a mídia é a vizinha: ao chegar nela, nada pisca */}
                      <InstagramFrame
                        key={`${m.id}:${stops[m.id] ?? 0}`}
                        mediaId={m.id}
                        src={videoEmbedUrl(video)}
                        title={t("videoTitle", { network: VIDEO_LABELS[video.network] })}
                        focusable={on}
                      />
                      {/* faixas nas bordas (o fundo preto do player): ali o toque é da página, e o deslize até o
                          outfit vizinho funciona também a partir de um vídeo do Instagram */}
                      {total > 1 && (
                        <>
                          <span aria-hidden="true" className="absolute inset-y-12 left-0 w-8" />
                          <span aria-hidden="true" className="absolute inset-y-12 right-0 w-8" />
                        </>
                      )}
                    </>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element -- foto enviada pela creator para o bucket */}
                  <img
                    src={m.photoUrl}
                    alt={alt}
                    draggable={false}
                    loading={eager && i === 0 ? "eager" : "lazy"}
                    className={`absolute inset-0 size-full object-cover ease-out select-none motion-reduce:transition-none ${active && on ? "scale-100 transition-[scale,opacity] duration-[7000ms,300ms]" : "scale-[1.08] transition-[scale] delay-1000 duration-0"} ${instagram ? "pointer-events-none" : ""} ${instagram && playing === m.id ? "opacity-0" : ""}`}
                  />
                  {video && instagram && playing !== m.id && (
                    // a capa, o nosso play e o rótulo cobrem o player do Instagram inteiro (o play dele cresce com o quadro e
                    // escaparia de um círculo nosso); são só enfeite: o toque atravessa e cai no play dele, bem no centro
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-ink/35 via-transparent to-transparent">
                      <PlayMark label={t("videoBadge", { network: VIDEO_LABELS[video.network] })} raised={total > 1} />
                    </span>
                  )}
                  {video && !instagram && (
                    <button
                      type="button"
                      tabIndex={on ? undefined : -1}
                      onClick={() => onPlay(m.id)}
                      aria-label={t("videoPlay", { network: VIDEO_LABELS[video.network] })}
                      className="group/play absolute inset-0 flex cursor-pointer items-center justify-center border-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent p-0"
                    >
                      <PlayMark label={t("videoBadge", { network: VIDEO_LABELS[video.network] })} raised={total > 1} />
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {total > 1 && (
        <>
          <button type="button" aria-label={t("mediaPrev")} disabled={current === 0} onClick={() => show(current - 1)} className={`${arrow} left-4 opacity-0 group-hover/gallery:opacity-100 focus-visible:opacity-100 disabled:hidden`}>
            <Chevron left />
          </button>
          <button type="button" aria-label={t("mediaNext")} disabled={current === total - 1} onClick={() => show(current + 1)} className={`${arrow} right-4 opacity-0 group-hover/gallery:opacity-100 focus-visible:opacity-100 disabled:hidden`}>
            <Chevron />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                aria-label={t("mediaGo", { n: i + 1, total })}
                aria-current={i === current ? "true" : undefined}
                onClick={() => show(i)}
                className="pointer-events-auto flex h-5 cursor-pointer items-center border-0 bg-transparent p-0"
              >
                <span className={`block h-1.5 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.35)] transition-all ${i === current ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** O produto vira um link quando há para onde ir; sem link (ou esgotado), é só a foto e o nome. */
function ProductLink({ href, onOpen, onView, className, children }: ProductLinkProps & { className: string; children: ReactNode }) {
  // a dona na própria vitrine: botão que abre o produto ampliado (inclusive esgotado, que não tem link)
  if (onView)
    return (
      <button type="button" onClick={onView} className={`${className} cursor-pointer border-0 bg-transparent p-0 font-[inherit] [text-align:inherit]`}>
        {children}
      </button>
    );
  if (!href) return <div className={className}>{children}</div>;
  return (
    <a href={href} target="_blank" rel="sponsored noopener noreferrer" onClick={onOpen} className={className}>
      {children}
    </a>
  );
}

