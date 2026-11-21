"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { productHref } from "@/lib/vitrine/links";
import { couponOff } from "@/lib/vitrine/pricing";
import type { Coupon, Post, Product } from "@/lib/vitrine/types";
import { copyLater, copyNow, openStore } from "./copy";
import { ProductArt } from "./ProductIcon";
import { usePhotoScene } from "./ProductPhoto";

// os mesmos botões retos em caixa alta da vitrine
const pillDark =
  "flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 border-0 bg-ink px-6 text-[12px] font-medium tracking-[0.18em] text-white uppercase no-underline hover:bg-[#2b2925] disabled:cursor-default disabled:opacity-60";
const pillLight =
  "flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 border border-ink bg-transparent px-6 text-[12px] font-medium tracking-[0.18em] text-ink uppercase no-underline hover:bg-ink hover:text-white";

const textButton =
  "min-h-11 cursor-pointer border-0 bg-transparent text-[13px] font-medium text-mute underline underline-offset-4 hover:text-ink";

type Story = { state: "loading" } | { state: "failed" } | { state: "ready"; url: string; file: File };

/** `/@fulana` ou `/en/@fulana`: o caminho da vitrine na barra de endereço, sem a query. */
const vitrineBase = () => window.location.pathname.replace(/\/$/, "");

/** A janela (dialog nativo) com o X no canto, usada pelo produto ampliado e pela imagem de stories do outfit. */
function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const t = useTranslations("storefront.product");
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
    // a rolagem da página fica parada atrás da janela
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = overflow;
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      onClose={onClose}
      // tocar fora da janela (no fundo escuro) fecha
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-auto box-border max-h-[92dvh] w-[calc(100%-32px)] max-w-[920px] overflow-y-auto border-0 bg-white p-0 text-ink backdrop:bg-black/55 max-md:mb-0 max-md:w-full max-md:max-w-full motion-safe:animate-rise-in"
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          aria-label={t("close")}
          className="absolute top-2 right-2 z-10 flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-white/90 text-ink hover:bg-cream"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        {children}
      </div>
    </dialog>
  );
}

/**
 * A imagem de stories pronta para a dona postar: gera na hora em `src` (rota da vitrine), mostra a prévia e oferece
 * compartilhar (ou baixar) a imagem e copiar o `link` que vai na figurinha. `onBack` volta para o que abriu o painel.
 */
function StoryPanel({
  src,
  link,
  fileName,
  alt,
  hint,
  copyLabel,
  backLabel,
  onBack,
}: {
  src: string;
  link: () => string;
  fileName: string;
  alt: string;
  hint: string;
  copyLabel: string;
  backLabel: string;
  onBack: () => void;
}) {
  const t = useTranslations("storefront.product");
  const [story, setStory] = useState<Story>({ state: "loading" });
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    let url = "";
    fetch(src, { signal: request.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: blob.type || "image/png" });
        url = URL.createObjectURL(blob);
        setCanShare(Boolean(navigator.canShare?.({ files: [file] })));
        setStory({ state: "ready", url, file });
      })
      .catch(() => {
        if (!request.signal.aborted) setStory({ state: "failed" });
      });
    // a imagem fica num object URL enquanto o painel está aberto
    return () => {
      request.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [src, fileName, attempt]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(id);
  }, [copied]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
    } catch {
      // sem permissão de área de transferência: o link continua no compartilhar
    }
  };

  const shareImage = async (file: File) => {
    try {
      await navigator.share({ files: [file], url: link() });
    } catch {
      // cancelado pela pessoa ou recusado pelo navegador: nada a fazer
    }
  };

  const download = (url: string, file: File) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.append(a);
    a.click();
    a.remove();
  };

  return (
    <div className="flex flex-col items-center gap-5 px-5 pt-14 pb-6 md:px-10 md:pb-10">
      <div className="flex w-full max-w-[420px] flex-col gap-1.5 text-center">
        <h2 className="m-0 font-display text-[28px] leading-tight font-normal">{t("shareTitle")}</h2>
        <p className="m-0 text-[14px] leading-snug text-mute">{hint}</p>
      </div>
      <div className="relative flex aspect-[9/16] h-[min(56dvh,560px)] items-center justify-center overflow-hidden border border-sand bg-cream">
        {story.state === "ready" ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagem gerada agora, num object URL
          <img src={story.url} alt={alt} className="size-full object-contain" />
        ) : story.state === "loading" ? (
          <span role="status" className="animate-pulse px-6 text-center text-[13px] text-mute">
            {t("generating")}
          </span>
        ) : (
          <span role="alert" className="px-6 text-center text-[14px] text-mute">
            {t("failed")}
          </span>
        )}
      </div>
      <div className="flex w-full max-w-[420px] flex-col gap-2.5">
        {story.state === "ready" && (
          <>
            {canShare ? (
              <button type="button" onClick={() => shareImage(story.file)} className={pillDark}>
                {t("shareImage")}
              </button>
            ) : (
              <button type="button" onClick={() => download(story.url, story.file)} className={pillDark}>
                {t("download")}
              </button>
            )}
            <button type="button" onClick={copyLink} className={pillLight}>
              {copied ? t("linkCopied") : copyLabel}
            </button>
            {canShare && (
              <button type="button" onClick={() => download(story.url, story.file)} className={textButton}>
                {t("download")}
              </button>
            )}
          </>
        )}
        {story.state === "failed" && (
          <button
            type="button"
            onClick={() => {
              setStory({ state: "loading" });
              setAttempt((n) => n + 1);
            }}
            className={pillDark}
          >
            {t("retry")}
          </button>
        )}
        <button type="button" onClick={onBack} className={textButton}>
          {backLabel}
        </button>
      </div>
    </div>
  );
}

/** O celular com o "+": o ícone dos botões que criam imagem de stories. */
export const storyIcon = (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="2" width="12" height="20" rx="2.5" />
    <path d="M12 8v6M9 11h6" />
  </svg>
);

/**
 * Um cupom da vitrine dentro do produto ampliado: o desconto, a condição, o código e o botão que copia o código e já
 * abre o produto (`href`, o link de afiliado ou da loja) no mesmo toque. Produto sem link (esgotado) abre a loja do
 * cupom. Se a cópia na hora falhar, tenta de novo e, sem conseguir, deixa o código selecionado para copiar à mão; o
 * produto vira um link à parte, porque abrir depois de esperar seria bloqueado como pop-up.
 */
function ProductCoupon({ coupon: c, href, onGo, onCopy }: { coupon: Coupon; href: string; onGo: () => void; onCopy: () => void }) {
  const t = useTranslations("storefront");
  const tp = useTranslations("storefront.product");
  const code = useRef<HTMLSpanElement>(null);
  // null: ainda não copiou; true: copiou; false: não deu, a pessoa copia à mão
  const [copied, setCopied] = useState<boolean | null>(null);
  // a cópia que precisou da segunda tentativa: o produto vira um link à parte
  const [late, setLate] = useState(false);
  const target = href || c.storeUrl;

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(null), 2500);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = () => {
    onCopy();
    if (copyNow(c.code)) {
      setCopied(true);
      if (target) {
        if (href) onGo();
        openStore(target);
      }
      return;
    }
    void copyLater(c.code).then((ok) => {
      setLate(true);
      setCopied(ok);
      if (!ok && code.current) window.getSelection()?.selectAllChildren(code.current);
    });
  };

  return (
    <div className="flex flex-col gap-3 border border-sand bg-cream p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-[30px] leading-none font-normal lining-nums">{couponOff(c)}</span>
        <span className="truncate text-[13px] font-medium text-mute">{c.brand}</span>
      </div>
      {c.condition && <p className="m-0 text-[14px] leading-snug text-mute">{c.condition}</p>}
      <span
        ref={code}
        className="flex min-h-11 items-center justify-center border border-dashed border-gold/50 bg-white px-4 text-center font-mono text-[15px] font-bold tracking-[0.08em] break-all select-all"
      >
        {c.code}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={href ? tp("copyAndGoLabel", { code: c.code }) : c.storeUrl ? t("copyAndOpenLabel", { code: c.code, brand: c.brand }) : t("copyLabel", { code: c.code })}
        className={pillDark}
      >
        {copied ? t("copied") : copied === false ? t("copyManually") : href ? tp("copyAndGo") : c.storeUrl ? t("copyAndOpen") : t("copyCode")}
      </button>
      {late && target && (
        <a href={target} target="_blank" rel="sponsored noopener noreferrer" onClick={href ? onGo : undefined} className={pillLight}>
          {href ? tp("goToProduct") : t("goToStore")}
        </a>
      )}
    </div>
  );
}

/**
 * Produto ampliado, com a foto grande, marca, nome e categoria. O visitante que toca num produto vai direto para a
 * loja; esta janela abre quando alguém chega pelo link da figurinha dos stories (`?p=<id>`), com o botão da loja, e
 * quando a dona toca num produto da própria vitrine: para ela, no lugar da loja, o botão que cria a imagem de stories
 * do produto (rota /@fulana/story/<id>), que dá para compartilhar ou baixar, junto com o link que abre o produto na vitrine,
 * e o link para a página do produto. Embaixo, os cupons da vitrine para a marca do produto (`coupons`), cada um com o
 * botão que copia o código e abre o produto.
 */
export function ProductModal({
  product: p,
  coupons,
  owner,
  onBuy,
  onCopy,
  onClose,
}: {
  product: Product;
  /** os cupons da vitrine que valem para este produto (os da marca dele) */
  coupons: Coupon[];
  /** quem vê é a dona da vitrine: o botão principal cria a imagem de stories, e a página do produto vem logo abaixo */
  owner: boolean;
  /** ida para a loja pelo produto: conta a métrica de compra */
  onBuy: () => void;
  /** cópia de um cupom: conta a métrica de cupom copiado */
  onCopy: (couponId: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("storefront.product");
  const tCat = useTranslations("productCategories");
  const [sharing, setSharing] = useState(false);
  const href = p.soldOut ? "" : productHref(p);
  const scene = usePhotoScene(p.imageUrl);

  return (
    <Sheet label={p.name} onClose={onClose}>
      {sharing ? (
        <StoryPanel
          src={`${vitrineBase()}/story/${p.id}`}
          link={() => `${window.location.origin}${vitrineBase()}?p=${p.id}`}
          fileName={`myvitri-${p.id.slice(0, 8)}.png`}
          alt={t("imageAlt", { name: p.name })}
          hint={t("shareHint")}
          copyLabel={t("copyLink")}
          backLabel={t("back")}
          onBack={() => setSharing(false)}
        />
      ) : (
        <div className="grid md:grid-cols-2">
          {scene ? (
            // Foto de cenário (um look): de ponta a ponta, na proporção dela, sem a moldura creme. A altura tem teto (no
            // celular, para o nome e o botão de compra aparecerem sem rolar); passando dele, as pontas da foto ficam de fora.
            // Fundo branco: se a foto couber inteira, o multiply sobre branco não muda as cores.
            <div className="relative w-full self-start overflow-hidden bg-white max-md:max-h-[60dvh] md:max-h-[84dvh]" style={{ aspectRatio: scene.ratio }}>
              <ProductArt product={p} photoClassName={p.soldOut ? "opacity-50 grayscale" : undefined} />
            </div>
          ) : (
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-cream">
              <ProductArt
                product={p}
                // foto de loja: a peça respira dentro do quadrado creme em vez de encostar nas bordas
                className={`box-border size-full object-contain p-4 mix-blend-multiply md:p-12 ${p.soldOut ? "opacity-50 grayscale" : ""}`}
                iconClassName={`w-[46%] ${p.soldOut ? "opacity-40" : ""}`}
              />
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-5 p-6 md:justify-center md:p-10">
            <div className="flex flex-col gap-2">
              {p.brand && <span className="text-[12px] font-medium tracking-[0.22em] text-mute uppercase">{p.brand}</span>}
              <h2 className="m-0 font-display text-[clamp(28px,4vw,40px)] leading-[1.08] font-normal break-words">{p.name}</h2>
              {p.category && <span className="text-[14px] text-mute">{t("category", { category: tCat(p.category) })}</span>}
            </div>
            {p.soldOut && <p className="m-0 text-[15px] text-mute">{t("soldOutText")}</p>}
            <div className="flex flex-col gap-2.5">
              {owner ? (
                // a dona não compra o próprio produto: para ela a janela serve para a imagem de stories, e o link leva à
                // página do produto (para conferir, ou ir com o cupom copiado por um dos cupons abaixo)
                <>
                  <button type="button" onClick={() => setSharing(true)} className={pillDark}>
                    {storyIcon}
                    {t("share")}
                  </button>
                  {href && (
                    <a href={href} target="_blank" rel="sponsored noopener noreferrer" onClick={onBuy} className={pillLight}>
                      {t("goToProduct")}
                    </a>
                  )}
                </>
              ) : (
                href && (
                  <a href={href} target="_blank" rel="sponsored noopener noreferrer" onClick={onBuy} className={pillDark}>
                    {t("buy")}
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17 17 7M8 7h9v9" />
                    </svg>
                  </a>
                )
              )}
            </div>
            {coupons.length > 0 && (
              <section aria-label={t("coupons")} className="flex flex-col gap-2.5">
                <h3 className="m-0 text-[12px] font-medium tracking-[0.22em] text-mute uppercase">{t("coupons")}</h3>
                {coupons.map((c) => (
                  <ProductCoupon key={c.id} coupon={c} href={href} onGo={onBuy} onCopy={() => onCopy(c.id)} />
                ))}
              </section>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

/**
 * Imagem de stories de um outfit inteiro (rota /@fulana/story/outfit/<id do post>), aberta pela dona no botão do
 * outfit: já começa gerando, e o link da figurinha (`?o=<id>`) abre a vitrine nesse outfit.
 */
export function OutfitStoryModal({ post, name, onClose }: { post: Post; name: string; onClose: () => void }) {
  const t = useTranslations("storefront.product");
  return (
    <Sheet label={t("shareTitle")} onClose={onClose}>
      <StoryPanel
        src={`${vitrineBase()}/story/outfit/${post.id}`}
        link={() => `${window.location.origin}${vitrineBase()}?o=${post.id}`}
        fileName={`myvitri-look-${post.id.slice(0, 8)}.png`}
        alt={t("outfitImageAlt", { name })}
        hint={t("outfitShareHint")}
        copyLabel={t("outfitCopyLink")}
        backLabel={t("close")}
        onBack={onClose}
      />
    </Sheet>
  );
}
