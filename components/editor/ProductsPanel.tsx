"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { importProductAction } from "@/app/actions";
import { ProductArt } from "@/components/storefront/ProductIcon";
import { PRODUCT_EXTRA, type Product, type VitrineContent } from "@/lib/vitrine/types";
import { ImageField } from "./ImageField";
import type { Update } from "./panels";
import { AddButton, Empty, Field, FormActions, H, Hint, Pill, Row, TextInput, inputCls, newId, reorder, useDragSort } from "./ui";

/** Bloco do formulário do produto: título pequeno e os campos logo abaixo. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-[#F1EEE8] pb-4 last-of-type:border-0 last-of-type:pb-0">
      <h3 className="m-0 text-[11px] font-semibold tracking-[0.08em] text-[#8F897E] uppercase">{title}</h3>
      {children}
    </section>
  );
}

export function ProductsPanel({ draft, update }: { draft: VitrineContent; update: Update }) {
  const t = useTranslations("editor.products");
  const [openId, setOpenId] = useState<string | null>(null);
  // o vídeo fica escondido até a pessoa pedir (ou até estar preenchido)
  const [moreId, setMoreId] = useState<string | null>(null);
  const sort = useDragSort((from, to) => update((d) => ({ ...d, products: reorder(d.products, from, to) })));
  const [link, setLink] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, startImport] = useTransition();

  const products = draft.products;
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const setProduct = (id: string, patch: Partial<Product>) =>
    update((d) => ({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const insert = (patch: Partial<Product>) => {
    const p: Product = {
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
    };
    update((d) => ({ ...d, products: [...d.products, p] }));
    setOpenId(p.id);
    return p;
  };

  const fromImport = (res: Awaited<ReturnType<typeof importProductAction>>, url: string): Partial<Product> => {
    if (!res.ok) return { url };
    const { name, brand, imageUrl, available } = res.product;
    // o link fica como foi colado: trocá-lo pelo endereço final da loja poderia perder a comissão do afiliado
    return { name, brand, imageUrl, url, soldOut: available === false };
  };

  const importLink = () => {
    const url = link.trim();
    if (!/^https?:\/\//i.test(url)) {
      setImportError(t("fullLink"));
      return;
    }
    setImportError(null);
    startImport(async () => {
      const res = await importProductAction(url);
      if (!res.ok) setImportError(res.error);
      insert(fromImport(res, url));
      setLink("");
    });
  };

  const remove = (id: string) => {
    update((d) => ({
      ...d,
      products: d.products.filter((p) => p.id !== id),
      kits: d.kits.map((k) => ({ ...k, productIds: k.productIds.filter((pid) => pid !== id) })),
    }));
    setOpenId(null);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <H>{t("order")}</H>
      <span className="-mt-1 text-[13px] text-[#5E5A52]">{t("orderHint")}</span>
      {products.length === 0 && <Empty>{t("empty")}</Empty>}
      {products.map((p, i) => (
        <Row
          key={p.id}
          pos={i + 1}
          title={p.name || t("new")}
          sub={[p.soldOut ? t("soldOut") : "", p.brand].filter(Boolean).join(" · ")}
          thumb={
            <span aria-hidden="true" className="relative flex size-10 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-cream">
              <ProductArt product={p} iconClassName="w-[78%]" strokeWidth={4} />
            </span>
          }
          open={openId === p.id}
          onOpen={() => setOpenId(openId === p.id ? null : p.id)}
          sort={sort}
          total={products.length}
        >
          <Group title={t("photo")}>
            <ImageField value={p.imageUrl} onChange={(imageUrl) => setProduct(p.id, { imageUrl })} />
          </Group>

          <Group title={t("product")}>
            <Field label={t("name")}>
              <TextInput value={p.name} onChange={(name) => setProduct(p.id, { name })} maxLength={80} autoFocus={!p.name} />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label={t("brand")}>
                <TextInput value={p.brand} onChange={(brand) => setProduct(p.id, { brand })} maxLength={60} />
              </Field>
              <Field label={t("category")}>
                <TextInput value={p.category} onChange={(category) => setProduct(p.id, { category })} maxLength={30} list="vitri-categories" placeholder={t("categoryPlaceholder")} />
              </Field>
            </div>
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
              <TextInput value={p.affiliateUrl || p.url} onChange={(url) => setProduct(p.id, { url, affiliateUrl: "" })} placeholder="https://…" inputMode="url" />
            </Field>
            {moreId === p.id || p.videoUrl ? (
              <Field label={t("video")} hint={t("videoHint")}>
                <TextInput value={p.videoUrl} onChange={(videoUrl) => setProduct(p.id, { videoUrl })} placeholder="https://…" inputMode="url" />
              </Field>
            ) : (
              <button
                type="button"
                onClick={() => setMoreId(p.id)}
                className="min-h-8 self-start border-0 bg-transparent p-0 text-[13px] font-medium text-[#5E5A52] underline-offset-4 hover:text-ink hover:underline"
              >
                {t("addVideo")}
              </button>
            )}
          </Group>
          <FormActions onDone={() => setOpenId(null)} onRemove={() => remove(p.id)} removeLabel={t("remove")} />
        </Row>
      ))}
      <datalist id="vitri-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          importLink();
        }}
        className="mt-1 flex flex-col gap-2 rounded-[12px] border-[1.5px] border-dashed border-[#DDD8CF] p-3"
      >
        <span className="text-sm font-semibold text-[#3A3A3A]">{t("addByLink")}</span>
        <div className="flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={t("linkPlaceholder")}
            inputMode="url"
            aria-label={t("linkLabel")}
            className={`${inputCls} min-w-0 flex-1`}
          />
          <button type="submit" disabled={importing} className="min-h-11 flex-none rounded-[10px] border-0 bg-ink px-4 text-sm font-semibold text-white">
            {importing ? t("searching") : t("search")}
          </button>
        </div>
        <Hint>{t("addHint")}</Hint>
        {importError && <span className="text-[13px] font-semibold text-[#A3361B]">{importError}</span>}
      </form>
      <AddButton onClick={() => insert({})}>{t("manual")}</AddButton>
    </div>
  );
}
