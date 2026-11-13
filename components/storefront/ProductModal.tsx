"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { productHref } from "@/lib/vitrine/links";
import type { Product } from "@/lib/vitrine/types";
import { ProductArt } from "./ProductIcon";

// os mesmos botões retos em caixa alta da vitrine
const pillDark =
  "flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 border-0 bg-ink px-6 text-[12px] font-medium tracking-[0.18em] text-white uppercase no-underline hover:bg-[#2b2925] disabled:cursor-default disabled:opacity-60";
const pillLight =
  "flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 border border-ink bg-transparent px-6 text-[12px] font-medium tracking-[0.18em] text-ink uppercase no-underline hover:bg-ink hover:text-white";

type Story = { state: "loading" } | { state: "failed" } | { state: "ready"; url: string; file: File };

/** `/@fulana` ou `/en/@fulana`: o caminho da vitrine na barra de endereço, sem a query. */
const vitrineBase = () => window.location.pathname.replace(/\/$/, "");

/**
 * Produto ampliado: ao tocar num produto da vitrine pública abre esta janela (no lugar de ir direto para a loja), com a
 * foto grande, marca, nome, categoria, review e o botão da loja. Para a dona, dela sai também a imagem de stories do
 * produto (rota /@fulana/story/<id>), que dá para compartilhar ou baixar, junto com o link que abre o produto na vitrine.
 */
export function ProductModal({
  product: p,
  owner,
  onBuy,
  onVideo,
  onClose,
}: {
  product: Product;
  /** quem vê é a dona da vitrine: só ela vê o botão de criar a imagem de stories */
  owner: boolean;
  /** clique no botão da loja: conta a métrica de compra */
  onBuy: () => void;
  onVideo: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("storefront.product");
  const ts = useTranslations("storefront");
  const dialog = useRef<HTMLDialogElement>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const href = p.soldOut ? "" : productHref(p);

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

  // a imagem fica num object URL enquanto a janela está aberta
  useEffect(() => {
    if (story?.state !== "ready") return;
    const url = story.url;
    return () => URL.revokeObjectURL(url);
  }, [story]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(id);
  }, [copied]);

  const makeStory = async () => {
    setStory({ state: "loading" });
    try {
      const res = await fetch(`${vitrineBase()}/story/${p.id}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const file = new File([blob], `myvitri-${p.id.slice(0, 8)}.png`, { type: blob.type || "image/png" });
      setCanShare(Boolean(navigator.canShare?.({ files: [file] })));
      setStory({ state: "ready", url: URL.createObjectURL(blob), file });
    } catch {
      setStory({ state: "failed" });
    }
  };

  const productLink = () => `${window.location.origin}${vitrineBase()}?p=${p.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(productLink());
      setCopied(true);
    } catch {
      // sem permissão de área de transferência: o link continua no compartilhar
    }
  };

  const shareImage = async (file: File) => {
    try {
      await navigator.share({ files: [file], url: productLink() });
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
    <dialog
      ref={dialog}
      aria-label={p.name}
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

        {story ? (
          <div className="flex flex-col items-center gap-5 px-5 pt-14 pb-6 md:px-10 md:pb-10">
            <div className="flex w-full max-w-[420px] flex-col gap-1.5 text-center">
              <h2 className="m-0 font-display text-[28px] leading-tight font-normal">{t("shareTitle")}</h2>
              <p className="m-0 text-[14px] leading-snug text-mute">{t("shareHint")}</p>
            </div>
            <div className="relative flex aspect-[9/16] h-[min(56dvh,560px)] items-center justify-center overflow-hidden border border-sand bg-cream">
              {story.state === "ready" ? (
                // eslint-disable-next-line @next/next/no-img-element -- imagem gerada agora, num object URL
                <img src={story.url} alt={t("imageAlt", { name: p.name })} className="size-full object-contain" />
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
                    {copied ? t("linkCopied") : t("copyLink")}
                  </button>
                  {canShare && (
                    <button
                      type="button"
                      onClick={() => download(story.url, story.file)}
                      className="min-h-11 cursor-pointer border-0 bg-transparent text-[13px] font-medium text-mute underline underline-offset-4 hover:text-ink"
                    >
                      {t("download")}
                    </button>
                  )}
                </>
              )}
              {story.state === "failed" && (
                <button type="button" onClick={makeStory} className={pillDark}>
                  {t("retry")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setStory(null)}
                className="min-h-11 cursor-pointer border-0 bg-transparent text-[13px] font-medium text-mute underline underline-offset-4 hover:text-ink"
              >
                {t("back")}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2">
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-cream">
              <ProductArt
                product={p}
                // margem em volta da foto: a peça respira dentro do quadrado creme em vez de encostar nas bordas
                className={`box-border size-full object-contain p-8 mix-blend-multiply md:p-12 ${p.soldOut ? "opacity-50 grayscale" : ""}`}
                iconClassName={`w-[46%] ${p.soldOut ? "opacity-40" : ""}`}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-5 p-6 md:justify-center md:p-10">
              <div className="flex flex-col gap-2">
                {p.brand && <span className="text-[12px] font-medium tracking-[0.22em] text-mute uppercase">{p.brand}</span>}
                <h2 className="m-0 font-display text-[clamp(28px,4vw,40px)] leading-[1.08] font-normal break-words">{p.name}</h2>
                {p.category && <span className="text-[14px] text-mute">{t("category", { category: p.category })}</span>}
              </div>
              {p.soldOut && <p className="m-0 text-[15px] text-mute">{t("soldOutText")}</p>}
              <div className="flex flex-col gap-2.5">
                {href && (
                  <a href={href} target="_blank" rel="sponsored noopener noreferrer" onClick={onBuy} className={pillDark}>
                    {t("buy")}
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17 17 7M8 7h9v9" />
                    </svg>
                  </a>
                )}
                {p.videoUrl && (
                  <a href={p.videoUrl} target="_blank" rel="noopener noreferrer" onClick={onVideo} className={pillLight}>
                    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 4.5v15l13-7.5z" />
                    </svg>
                    {ts("review")}
                  </a>
                )}
                {owner && (
                  <button type="button" onClick={makeStory} className={pillLight}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="2" width="12" height="20" rx="2.5" />
                      <path d="M12 8v6M9 11h6" />
                    </svg>
                    {t("share")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
