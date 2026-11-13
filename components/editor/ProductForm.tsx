"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { importProductAction } from "@/app/actions";
import { withHttps } from "@/lib/vitrine/links";
import { PRODUCT_EXTRA, type Product } from "@/lib/vitrine/types";
import { ImageField } from "./ImageField";
import { Field, Group, Hint, Pill, TextInput, UrlInput, inputCls, newId } from "./ui";

export const newProduct = (patch: Partial<Product> = {}): Product => ({
  id: newId(),
  name: "",
  brand: "",
  category: "",
  price: 0,
  couponId: null,
  url: "",
  imageUrl: "",
  icon: "Bag",
  ...PRODUCT_EXTRA,
  ...patch,
});

/** Produto novo que a pessoa abriu e fechou sem preencher: sai do rascunho. */
export const isBlankProduct = (p: Product) => !p.name.trim() && !p.url.trim() && !p.affiliateUrl && !p.imageUrl;

/**
 * Primeiro passo do produto novo: colar o link e a gente puxa nome, marca e foto (`importProductAction`), ou preencher
 * à mão. Se a busca falhar, o produto entra mesmo assim com o link colado, e `error` explica o que faltou.
 */
export function ProductImport({ onAdd }: { onAdd: (patch: Partial<Product>, error?: string) => void }) {
  const t = useTranslations("editor.products");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importing, start] = useTransition();

  const search = () => {
    // "nike.com.br/tenis" também vale: o campo mostra o link completo que vai ser buscado
    const url = withHttps(link);
    setLink(url);
    if (!/^https?:\/\//i.test(url)) return setError(t("fullLink"));
    setError(null);
    start(async () => {
      const res = await importProductAction(url);
      if (!res.ok) return onAdd({ url }, res.error);
      const { name, brand, imageUrl, available } = res.product;
      // o link fica como foi colado: trocá-lo pelo endereço final da loja poderia perder a comissão do afiliado
      onAdd({ name, brand, imageUrl, url, soldOut: available === false });
    });
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex flex-col gap-2"
      >
        <Field label={t("linkLabel")} hint={t("addHint")}>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={t("linkPlaceholder")}
            inputMode="url"
            data-autofocus
            className={inputCls}
          />
        </Field>
        {error && (
          <span role="alert" className="text-[13px] font-semibold text-[#A3361B]">
            {error}
          </span>
        )}
        <button type="submit" disabled={importing} className="mt-1 min-h-12 cursor-pointer rounded-full border-0 bg-ink px-6 text-sm font-semibold text-white disabled:opacity-60">
          {importing ? t("searching") : t("search")}
        </button>
      </form>
      <div className="flex items-center gap-3 text-xs text-[#8F897E]">
        <span className="h-px flex-1 bg-[#EEEBE5]" />
        {t("or")}
        <span className="h-px flex-1 bg-[#EEEBE5]" />
      </div>
      <button
        type="button"
        onClick={() => onAdd({})}
        className="min-h-12 cursor-pointer rounded-full border border-[#D8D3C9] bg-white px-6 text-sm font-semibold text-ink hover:border-ink"
      >
        {t("manual")}
      </button>
    </>
  );
}

/** Os campos de um produto, dentro da janela de edição. Cada mudança vai direto para o rascunho. */
export function ProductForm({
  product: p,
  categories,
  notice,
  onChange,
}: {
  product: Product;
  /** categorias que a vitrine já usa, para sugerir */
  categories: string[];
  /** aviso de quando a busca pelo link falhou */
  notice?: string;
  onChange: (patch: Partial<Product>) => void;
}) {
  const t = useTranslations("editor.products");
  // o vídeo fica escondido até a pessoa pedir (ou até estar preenchido)
  const [video, setVideo] = useState(false);
  return (
    <>
      {notice && (
        <p role="status" className="m-0 rounded-[12px] bg-[#FFF8E6] px-3.5 py-3 text-[13px] leading-snug text-[#6B4A00]">
          {t("importFailed", { error: notice })}
        </p>
      )}
      <Group title={t("photo")}>
        <ImageField value={p.imageUrl} onChange={(imageUrl) => onChange({ imageUrl })} />
      </Group>

      <Group title={t("product")}>
        <Field label={t("name")}>
          <TextInput value={p.name} onChange={(name) => onChange({ name })} maxLength={80} data-autofocus={!p.name || undefined} />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={t("brand")}>
            <TextInput value={p.brand} onChange={(brand) => onChange({ brand })} maxLength={60} />
          </Field>
          <Field label={t("category")}>
            <TextInput value={p.category} onChange={(category) => onChange({ category })} maxLength={30} list="vitri-categories" placeholder={t("categoryPlaceholder")} />
          </Field>
        </div>
        <datalist id="vitri-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {/* Favorito da creator (aparece também na seção Favoritos, no topo dos produtos da vitrine). O cartão inteiro liga e
            desliga, com o mesmo coração em círculo do card do produto: branco desligado, preto e cheio ligado. */}
        <button
          type="button"
          aria-pressed={p.favorite}
          aria-label={t("favorite")}
          aria-describedby="favorito-dica"
          onClick={() => onChange({ favorite: !p.favorite })}
          className={`group mt-1 flex w-full cursor-pointer items-center gap-3.5 rounded-[14px] border p-3 text-left text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
            p.favorite ? "border-ink bg-white" : "border-[#EEEBE5] bg-[#FAF9F7] hover:border-[#D6D0C5]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex size-10 flex-none items-center justify-center rounded-full shadow-[0_1px_4px_rgba(17,17,17,0.18)] transition-[transform,background-color,color] duration-200 group-hover:scale-105 group-active:scale-95 ${
              p.favorite ? "bg-ink text-white" : "bg-white text-ink"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={p.favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold">{p.favorite ? t("favoriteOn") : t("favoriteOff")}</span>
            <span id="favorito-dica" className="text-[13px] leading-snug text-[#5E5A52]">
              {p.favorite ? t("favoriteOnHint") : t("favoriteHint")}
            </span>
          </span>
        </button>
      </Group>

      {p.soldOut && (
        <Group title={t("onVitrine")}>
          <Pill tone="bad">{t("soldOutStore")}</Pill>
          <Hint>{t("soldOutHint")}</Hint>
        </Group>
      )}

      <Group title={t("links")}>
        <Field label={t("link")} hint={t("linkHint")}>
          {/* produtos antigos podem ter os dois links: vale o de afiliado, e editar deixa só o que foi colado */}
          <UrlInput value={p.affiliateUrl || p.url} onChange={(url) => onChange({ url, affiliateUrl: "" })} />
        </Field>
        {video || p.videoUrl ? (
          <Field label={t("video")} hint={t("videoHint")}>
            <UrlInput value={p.videoUrl} onChange={(videoUrl) => onChange({ videoUrl })} autoFocus={video && !p.videoUrl} />
          </Field>
        ) : (
          <button
            type="button"
            onClick={() => setVideo(true)}
            className="min-h-11 self-start border-0 bg-transparent p-0 text-[13px] font-medium text-[#5E5A52] underline-offset-4 hover:text-ink hover:underline"
          >
            {t("addVideo")}
          </button>
        )}
      </Group>
    </>
  );
}
