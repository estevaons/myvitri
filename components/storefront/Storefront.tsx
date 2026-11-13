"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Link } from "@/lib/i18n/navigation";
import { BRAND } from "@/lib/brand";
import { BackLink } from "@/components/brand/BackLink";
import { Wordmark } from "@/components/brand/Logo";
import { productHref } from "@/lib/vitrine/links";
import { couponOff } from "@/lib/vitrine/pricing";
import type { CommentList, Viewer } from "@/lib/vitrine/social";
import { SOCIAL_LABELS, socialLinks, type SocialNetwork } from "@/lib/vitrine/socials";
import { postItems, type Post, type Product, type VitrineContent } from "@/lib/vitrine/types";
import { Comments } from "./Comments";
import { CoverLetter } from "@/components/home/CreatorCard";
import { FavoriteButton } from "./FavoriteButton";
import { ProductArt } from "./ProductIcon";

/**
 * Vitrine pública com visual fixo, no espírito das lojas de esporte: branco, cinza claro atrás dos produtos,
 * títulos em caixa alta e botões em pílula. Quem é dono da vitrine só muda o conteúdo e a capa.
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

function openStore(url: string) {
  if (url) window.open(url, "_blank", "noopener,noreferrer");
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

/** Ícones das redes, em traço, no tamanho do texto pequeno. */
const SOCIAL_ICONS: Record<SocialNetwork, ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </>
  ),
  tiktok: <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.7 2.3 4.6 5 5" />,
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="m10 9.5 4.5 2.5-4.5 2.5z" fill="currentColor" />
    </>
  ),
  x: <path d="M4 4l11.7 16H20L8.3 4zM4 20l6.8-6.8M13.2 10.8 20 4" />,
};

/**
 * Redes da creator, discretas: só ícones em cinza, que escurecem no hover. Da largura @2xl para cima ficam logo abaixo
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
        className="-mt-1 flex cursor-pointer items-center gap-0.5 rounded-full border-0 bg-transparent py-0 pr-1 pl-0 text-mute/70 hover:bg-cream hover:text-ink @2xl:absolute @2xl:top-12 @2xl:-right-2 @2xl:mt-0"
      >
        {icons.map((n) => (
          <span key={n} aria-hidden="true" className={`flex size-8 items-center justify-center ${empty ? "opacity-40" : ""}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              {SOCIAL_ICONS[n]}
            </svg>
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
            className="flex size-8 items-center justify-center text-mute/70 transition-colors hover:text-ink"
          >
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              {SOCIAL_ICONS[n]}
            </svg>
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
  cover: () => void;
  avatar: () => void;
  avatarBusy?: boolean;
  /** a frase de destaque e o texto de apoio, editados ali mesmo na vitrine */
  text: (patch: Partial<Pick<VitrineContent, "headline" | "sub">>) => void;
  socials: () => void;
  /** null: adicionar um novo */
  coupon: (id: string | null) => void;
  product: (id: string | null) => void;
  /** os outfits editados no lugar da seção (o editor monta) */
  outfits: ReactNode;
};

function PencilIcon({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
    </svg>
  );
}

/**
 * A capa no modo de edição, toda clicável e sem nada por cima em repouso: no mouse, o hover escurece de leve e mostra
 * a pílula "Trocar capa" no meio; no toque (sem hover), um tracejado claro por dentro da borda avisa que dá para tocar.
 */
function CoverHit({ label, onClick, image }: { label: string; onClick: () => void; image: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="group/cover absolute inset-0 z-20 flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 focus-visible:outline-none"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors duration-200 group-hover/cover:bg-ink/15 group-focus-visible/cover:bg-ink/15" />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-3 hidden rounded-[10px] border border-dashed pointer-coarse:block ${image ? "border-white/70" : "border-ink/20"}`}
      />
      <span
        aria-hidden="true"
        // a pílula só aparece no hover, e branca para ler sobre qualquer capa (e sobre a letra, sem capa)
        className="relative flex h-10 translate-y-1 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-ink opacity-0 shadow-[0_2px_10px_rgba(17,17,17,0.18)] transition duration-200 group-hover/cover:translate-y-0 group-hover/cover:opacity-100 group-focus-visible/cover:translate-y-0 group-focus-visible/cover:opacity-100"
      >
        <CameraIcon size={16} />
        {label}
      </span>
    </button>
  );
}

/**
 * Camada clicável por cima de uma parte da vitrine no modo de edição: cobre tudo (os botões de dentro não respondem) e
 * mostra o lápis no canto, sempre visível, porque no celular não há hover.
 */
function EditHit({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="group/edit absolute inset-0 z-20 cursor-pointer border-0 bg-transparent p-0 transition-shadow hover:shadow-[inset_0_0_0_2px_var(--color-ink)] focus-visible:shadow-[inset_0_0_0_2px_var(--color-ink)] focus-visible:outline-none"
    >
      <span
        aria-hidden="true"
        className="absolute top-2.5 right-2.5 flex size-9 items-center justify-center rounded-full bg-white text-ink shadow-[0_1px_4px_rgba(17,17,17,0.18)] transition-transform group-hover/edit:scale-105"
      >
        <PencilIcon />
      </span>
    </button>
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
 * da vitrine. Sem botão por cima: no mouse, um fundo leve e o cursor de texto aparecem no hover; no toque (sem hover),
 * um tracejado bem claro fica sempre em volta. Com o cursor dentro, a borda fica cheia e o contador aparece.
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
      // tocar no respiro em volta dos textos também começa a editar, com o cursor no fim da frase
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        const el = headlineRef.current;
        el?.focus();
        el?.setSelectionRange(el.value.length, el.value.length);
      }}
      className="relative flex w-full cursor-text flex-col items-center gap-4 rounded-[12px] px-4 py-5 outline-2 outline-transparent outline-solid transition-[background-color,outline-color] hover:bg-ink/[0.035] has-focus:bg-transparent has-focus:outline-ink"
    >
      {!focused && <span aria-hidden="true" className="pointer-events-none absolute inset-0 hidden rounded-[12px] border border-dashed border-ink/20 pointer-coarse:block" />}
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
const Bar = ({ className }: { className: string }) => <span aria-hidden="true" className={`block flex-none rounded-full bg-ink/[0.08] ${className}`} />;

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
      className="flex min-h-10 flex-none cursor-pointer items-center gap-1.5 rounded-full border border-ink bg-white px-4 text-[12px] font-semibold tracking-[0.12em] text-ink uppercase hover:bg-ink hover:text-white"
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
  const allPosts = useMemo(() => content.posts.map((p) => ({ post: p, items: postItems(p, products) })), [content.posts, products]);
  const posts = useMemo(() => allPosts.filter((p) => p.post.photoUrl && p.items.length > 0), [allPosts]);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  // "" é "todas as categorias": nenhuma categoria de produto tem nome vazio
  const [cat, setCat] = useState("");
  const [query, setQuery] = useState("");
  const q = fold(query.trim());
  const shownProducts = products.filter(
    (p) => (!cat || p.category === cat) && (!q || fold(`${p.name} ${p.brand} ${p.category}`).includes(q)),
  );


  const [copied, flash] = useFlash();
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
  const linkProps = (p: Product, postId?: string) => ({
    href: p.soldOut ? "" : productHref(p),
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
        {edit && <CoverHit label={banner ? te("cover") : te("addCover")} onClick={edit.cover} image={Boolean(banner)} />}
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
            <OutfitCarousel outfits={posts} firstName={firstName} link={linkProps} />
          </section>
        )
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
          {products.length > 0 && shownProducts.length === 0 && <p className="m-0 text-[17px] text-mute">{t("noResults", { query: query.trim() })}</p>}

          <div className="grid grid-cols-2 gap-x-3 gap-y-10 @3xl:grid-cols-3 @3xl:gap-x-4 @3xl:gap-y-12">
            {shownProducts.map((p) => (
              <article key={p.id} className="relative flex min-w-0 flex-col items-center text-center">
                {edit && <EditHit label={te("product", { name: p.name || te("newProduct") })} onClick={() => edit.product(p.id)} />}
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
            sub={edit && coupons.length === 0 ? <p className={`m-0 mt-4 max-w-[36rem] text-[15px] leading-snug text-mute ${pad}`}>{te("emptyCoupons")}</p> : undefined}
          >
            {coupons.map((c) => (
              <article key={c.id} className="relative box-border flex min-h-[290px] w-[300px] flex-none snap-start flex-col gap-4 border border-sand bg-cream p-6 @max-md:w-[82%]">
                {edit && <EditHit label={te("coupon", { name: c.brand || c.code || te("newCoupon") })} onClick={() => edit.coupon(c.id)} />}
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
    </div>
  );
}

/** Tempo de cada outfit na tela antes de passar sozinho para o próximo. */
const OUTFIT_MS = 6000;

type Outfit = { post: Post; items: Product[] };
type LinkFor = (p: Product, postId: string) => { href: string; onOpen: (e: MouseEvent) => void };

/**
 * Outfits (no código, posts): um por vez, na largura toda da seção, sem o próximo cortado na borda. A troca é um
 * crossfade com a foto aproximando devagar, e passa sozinha a cada `OUTFIT_MS`, com a barra de progresso mostrando
 * quanto falta. Para quando o mouse está em cima, quando algo dentro tem o foco, com o botão de pausa e para quem
 * pede menos movimento (aí também não há animação). No celular, arrastar para o lado troca de outfit.
 */
function OutfitCarousel({ outfits, firstName, link }: { outfits: Outfit[]; firstName: string; link: LinkFor }) {
  const t = useTranslations("storefront");
  const tCommon = useTranslations("common");
  const total = outfits.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const current = Math.min(index, total - 1);
  const running = total > 1 && !paused && !hovering && !focused && !reduced;
  const go = (to: number) => setIndex(((to % total) + total) % total);

  // o tempo recomeça a cada troca (manual ou automática) e quando a pausa termina
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % total), OUTFIT_MS);
    return () => clearTimeout(id);
  }, [running, current, total]);

  const arrow = "flex size-12 items-center justify-center border border-sand bg-transparent text-ink hover:border-ink";

  return (
    <>
      <div className={`flex items-center justify-between gap-4 ${pad}`}>
        <SectionTitle>{t("postsTitle")}</SectionTitle>
        {total > 1 && (
          <div className="flex gap-3">
            {/* sem a troca automática (menos movimento), não há o que pausar */}
            {!reduced && (
              <button type="button" aria-label={paused ? t("outfitsPlay") : t("outfitsPause")} onClick={() => setPaused(!paused)} className={`${arrow} @max-2xl:size-10`}>
                {paused ? (
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 4.5v15l13-7.5z" />
                </svg>
              ) : (
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              )}
              </button>
            )}
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
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          if (start === null) return;
          const dx = e.changedTouches[0].clientX - start;
          if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
        }}
        className={`mt-6 @3xl:mt-8 ${pad}`}
      >
        {/* os slides ficam empilhados na mesma célula: a altura é a do maior, e a troca não mexe no resto da página */}
        <div aria-live={running ? "off" : "polite"} className="grid">
          {outfits.map(({ post, items }, i) => (
            <OutfitSlide
              key={post.id}
              post={post}
              items={items}
              active={i === current}
              n={i + 1}
              total={total}
              alt={t("postAlt", { name: firstName })}
              link={(p) => link(p, post.id)}
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
  active,
  n,
  total,
  alt,
  link,
}: {
  post: Post;
  items: Product[];
  active: boolean;
  n: number;
  total: number;
  alt: string;
  link: (p: Product) => { href: string; onOpen: (e: MouseEvent) => void };
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
      <div className="relative aspect-[4/5] overflow-hidden bg-sand">
        {/* eslint-disable-next-line @next/next/no-img-element -- foto enviada pela creator para o bucket */}
        <img
          src={post.photoUrl}
          alt={alt}
          loading={n === 1 ? "eager" : "lazy"}
          className={`absolute inset-0 size-full object-cover ease-out motion-reduce:transition-none ${active ? "scale-100 transition-transform duration-[7000ms]" : "scale-[1.08] transition-none"}`}
        />
      </div>
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
        {total > 1 && (
          <span aria-hidden="true" className="font-display text-[clamp(28px,3.4cqw,52px)] leading-none lining-nums text-ink/80 @max-3xl:hidden">
            {two(n)}
            <span className="text-ink/30"> / {two(total)}</span>
          </span>
        )}
      </div>
    </article>
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
