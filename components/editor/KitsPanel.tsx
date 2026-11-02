"use client";

import { useState } from "react";
import { ProductArt } from "@/components/storefront/ProductIcon";
import { cardColor, tile } from "@/lib/vitrine/look";
import { formatBRL, kitTotals, priceProducts } from "@/lib/vitrine/pricing";
import { KIT_STYLE, type Kit, type VitrineContent } from "@/lib/vitrine/types";
import type { Update } from "./panels";
import { AddButton, ColorPicker, Empty, Field, FormActions, H, Hint, Row, Segmented, TextInput, inputCls, newId, reorder, useDragSort } from "./ui";

const MAX_ITEMS = 4;

export function KitsPanel({ draft, update }: { draft: VitrineContent; update: Update }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sort = useDragSort((from, to) => update((d) => ({ ...d, kits: reorder(d.kits, from, to) })));
  const priced = priceProducts(draft.products, draft.coupons);
  const firstName = draft.name.split(" ")[0] || draft.name;

  const setKit = (id: string, patch: Partial<Kit>) => update((d) => ({ ...d, kits: d.kits.map((k) => (k.id === id ? { ...k, ...patch } : k)) }));
  const setStyle = (k: Kit, patch: Partial<Kit["style"]>) => setKit(k.id, { style: { ...k.style, ...patch } });

  const add = () => {
    const k: Kit = { id: newId(), name: "", description: "", signature: "", productIds: [], style: KIT_STYLE };
    update((d) => ({ ...d, kits: [...d.kits, k] }));
    setOpenId(k.id);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="m-0 text-sm font-bold">Kits montados por você</h2>
      <Hint>Junte até {MAX_ITEMS} produtos num combo. A vitrine soma os preços e mostra quanto a pessoa economiza.</Hint>
      {draft.products.length === 0 ? (
        <Empty>Adicione produtos primeiro para montar um kit.</Empty>
      ) : (
        draft.kits.length === 0 && <Empty>Nenhum kit ainda. Que tal o seu “kit praia” ou “kit treino”?</Empty>
      )}
      {draft.kits.map((k, i) => {
        const totals = kitTotals(k, priced);
        return (
          <Row
            key={k.id}
            pos={i + 1}
            title={k.name || "Novo kit"}
            sub={totals.items.length ? `${totals.items.length} itens · ${formatBRL(totals.final)}` : "Sem produtos"}
            thumb={<span aria-hidden="true" className="size-10 flex-none rounded-[10px]" style={{ background: cardColor(draft.look, k.style.color, 1 + 3 * i) }} />}
            open={openId === k.id}
            onOpen={() => setOpenId(openId === k.id ? null : k.id)}
            sort={sort}
            total={draft.kits.length}
          >
            <Field label="Nome do kit" hint="Vira o título da seção e o botão de escolha quando houver mais de um kit.">
              <TextInput value={k.name} onChange={(name) => setKit(k.id, { name })} maxLength={60} placeholder={`Ex.: Kit praia da ${firstName}`} autoFocus={!k.name} />
            </Field>
            <Field label="Descrição">
              <textarea
                value={k.description}
                onChange={(e) => setKit(k.id, { description: e.target.value })}
                maxLength={240}
                rows={3}
                className={`${inputCls} h-auto resize-y py-2.5 leading-snug`}
              />
            </Field>
            <Field label="Assinatura">
              <TextInput value={k.signature} onChange={(signature) => setKit(k.id, { signature })} maxLength={80} placeholder="Ex.: Uso esse combo todo fim de semana" />
            </Field>
            <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
              <legend className="mb-1.5 text-[13px] font-semibold">
                Produtos ({k.productIds.length}/{MAX_ITEMS})
              </legend>
              {priced.map((p, n) => {
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
                    <span aria-hidden="true" className="relative flex size-9 flex-none items-center justify-center overflow-hidden rounded-lg" style={{ background: tile(draft.look, n) }}>
                      <ProductArt product={p} className="size-full object-contain p-[8%]" iconClassName="w-[70%]" strokeWidth={4} />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium" title={p.name}>{p.name || "Produto sem nome"}</span>
                    {p.price > 0 && <span className="flex-none text-[13px] text-[#5E5A52]">{formatBRL(p.final)}</span>}
                  </label>
                );
              })}
            </fieldset>
            <div className="flex flex-col gap-2.5 border-t border-[#ECE8E1] pt-4">
              <H>Visual do card</H>
              <ColorPicker
                label="Cor do card"
                look={draft.look}
                value={k.style.color}
                autoColor={cardColor(draft.look, "auto", 1 + 3 * i)}
                onChange={(color) => setStyle(k, { color })}
              />
              <Segmented
                label="Arranjo dos produtos"
                options={[
                  ["espalhado", "Espalhados"],
                  ["alinhado", "Alinhados"],
                ]}
                value={k.style.layout}
                onChange={(layout) => setStyle(k, { layout })}
              />
              <Field label="Etiqueta" hint="Deixe vazio para mostrar a quantidade de itens.">
                <TextInput
                  value={k.style.label}
                  onChange={(label) => setStyle(k, { label })}
                  maxLength={30}
                  placeholder={`KIT · ${totals.items.length} ${totals.items.length === 1 ? "ITEM" : "ITENS"}`}
                />
              </Field>
            </div>
            {totals.save > 0 && (
              <Hint>
                Total {formatBRL(totals.final)} · economia de {formatBRL(totals.save)}
              </Hint>
            )}
            <FormActions
              onDone={() => setOpenId(null)}
              onRemove={() => {
                update((d) => ({ ...d, kits: d.kits.filter((x) => x.id !== k.id) }));
                setOpenId(null);
              }}
              removeLabel="Excluir"
            />
          </Row>
        );
      })}
      {draft.products.length > 0 && <AddButton onClick={add}>+ Montar kit</AddButton>}
    </div>
  );
}
