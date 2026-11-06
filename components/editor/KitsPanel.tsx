"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ProductArt } from "@/components/storefront/ProductIcon";
import { kitItems, type Kit, type Product, type VitrineContent } from "@/lib/vitrine/types";
import type { Update } from "./panels";
import { AddButton, Empty, Field, FormActions, H, Hint, Row, TextInput, inputCls, labelCls, newId, reorder, useDragSort } from "./ui";

const MAX_ITEMS = 4;

/** Miniatura do kit na lista: a foto do primeiro produto sobre o cinza da vitrine. */
function KitThumb({ items }: { items: Product[] }) {
  return (
    <span aria-hidden="true" className="relative flex size-10 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-cream">
      {items[0] && <ProductArt product={items[0]} iconClassName="w-[78%]" strokeWidth={4} />}
    </span>
  );
}

export function KitsPanel({ draft, update }: { draft: VitrineContent; update: Update }) {
  const t = useTranslations("editor.kits");
  const [openId, setOpenId] = useState<string | null>(null);
  const sort = useDragSort((from, to) => update((d) => ({ ...d, kits: reorder(d.kits, from, to) })));
  const firstName = draft.name.split(" ")[0] || draft.name;

  const setKit = (id: string, patch: Partial<Kit>) => update((d) => ({ ...d, kits: d.kits.map((k) => (k.id === id ? { ...k, ...patch } : k)) }));

  const add = () => {
    const k: Kit = { id: newId(), name: "", description: "", signature: "", productIds: [] };
    update((d) => ({ ...d, kits: [...d.kits, k] }));
    setOpenId(k.id);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <H>{t("title")}</H>
      <Hint>{t("hint", { max: MAX_ITEMS })}</Hint>
      {draft.products.length === 0 ? <Empty>{t("needProducts")}</Empty> : draft.kits.length === 0 && <Empty>{t("empty")}</Empty>}
      {draft.kits.map((k, i) => {
        const items = kitItems(k, draft.products);
        return (
          <Row
            key={k.id}
            pos={i + 1}
            title={k.name || t("new")}
            sub={items.length ? t("items", { count: items.length }) : t("noProducts")}
            thumb={<KitThumb items={items} />}
            open={openId === k.id}
            onOpen={() => setOpenId(openId === k.id ? null : k.id)}
            sort={sort}
            total={draft.kits.length}
          >
            <Field label={t("name")} hint={t("nameHint")}>
              <TextInput value={k.name} onChange={(name) => setKit(k.id, { name })} maxLength={60} placeholder={t("namePlaceholder", { name: firstName })} autoFocus={!k.name} />
            </Field>
            <Field label={t("description")}>
              <textarea
                value={k.description}
                onChange={(e) => setKit(k.id, { description: e.target.value })}
                maxLength={240}
                rows={3}
                className={`${inputCls} h-auto resize-y py-2.5 leading-snug`}
              />
            </Field>
            <Field label={t("signature")}>
              <TextInput value={k.signature} onChange={(signature) => setKit(k.id, { signature })} maxLength={80} placeholder={t("signaturePlaceholder")} />
            </Field>
            <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
              <legend className={`mb-1.5 ${labelCls}`}>
                {t("products", { n: k.productIds.length, max: MAX_ITEMS })}
              </legend>
              {draft.products.map((p) => {
                const checked = k.productIds.includes(p.id);
                const full = !checked && k.productIds.length >= MAX_ITEMS;
                return (
                  <label key={p.id} className={`flex min-h-11 items-center gap-2.5 rounded-[10px] px-2 text-sm ${full ? "opacity-40" : "cursor-pointer hover:bg-[#F7F6F3]"}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={full}
                      onChange={() =>
                        setKit(k.id, { productIds: checked ? k.productIds.filter((id) => id !== p.id) : [...k.productIds, p.id] })
                      }
                      className="size-[18px] flex-none accent-ink"
                    />
                    <span aria-hidden="true" className="relative flex size-9 flex-none items-center justify-center overflow-hidden rounded-lg bg-cream">
                      <ProductArt product={p} iconClassName="w-[70%]" strokeWidth={4} />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium" title={p.name}>{p.name || t("unnamed")}</span>
                  </label>
                );
              })}
            </fieldset>
            <FormActions
              onDone={() => setOpenId(null)}
              onRemove={() => {
                update((d) => ({ ...d, kits: d.kits.filter((x) => x.id !== k.id) }));
                setOpenId(null);
              }}
              removeLabel={t("remove")}
            />
          </Row>
        );
      })}
      {draft.products.length > 0 && <AddButton onClick={add}>{t("add")}</AddButton>}
    </div>
  );
}
