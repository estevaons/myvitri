"use client";

import { useState, useTransition } from "react";
import { importProductAction, refreshPricesAction } from "@/app/actions";
import { ICON_LABELS, ProductArt, ProductIcon } from "@/components/storefront/ProductIcon";
import { couponOff, formatBRL, priceProducts } from "@/lib/vitrine/pricing";
import { ICONS, PRODUCT_EXTRA, type Coupon, type Product, type VitrineContent } from "@/lib/vitrine/types";
import type { Update } from "./panels";
import { AddButton, Empty, Field, FormActions, Hint, MoneyInput, Row, Switch, TextInput, inputCls, newId, reorder, useDragSort } from "./ui";

/** Quantos links dá para colar de uma vez. */
const BULK_MAX = 20;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function checkedAgo(iso: string | null, today: string) {
  if (!iso) return "nunca conferidos";
  const days = Math.round((Date.parse(today) - Date.parse(iso.slice(0, 10))) / 86_400_000);
  return days < 1 ? "conferidos hoje" : `conferidos há ${plural(days, "dia", "dias")}`;
}

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** Escolhe o cupom da mesma loja (pelo domínio) ou da mesma marca. */
function guessCoupon(coupons: Coupon[], url: string, brand: string) {
  const h = host(url);
  const b = brand.toLowerCase();
  return (
    coupons.find((c) => h && host(c.storeUrl) === h) ??
    coupons.find((c) => b && (c.brand.toLowerCase().includes(b) || b.includes(c.brand.toLowerCase()))) ??
    null
  );
}

export function ProductsPanel({ draft, update, today }: { draft: VitrineContent; update: Update; today: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sort = useDragSort((from, to) => update((d) => ({ ...d, products: reorder(d.products, from, to) })));
  const [link, setLink] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [importing, startImport] = useTransition();
  const [bulk, setBulk] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();

  const products = draft.products;
  const priced = priceProducts(products, draft.coupons);
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  // o preço mais desatualizado manda; um produto nunca conferido conta como "nunca"
  const checks = products.filter((p) => p.url).map((p) => p.priceCheckedAt);
  const oldestCheck = checks.includes(null) ? null : (checks as string[]).sort()[0];

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

  const fromImport = (res: Awaited<ReturnType<typeof importProductAction>>, url: string, coupons: Coupon[]): Partial<Product> => {
    if (!res.ok) return { url };
    const { name, brand, imageUrl, price, available } = res.product;
    return {
      name,
      brand,
      imageUrl,
      price: price ?? 0,
      url: res.product.url,
      soldOut: available === false,
      priceCheckedAt: price ? new Date().toISOString() : null,
      couponId: guessCoupon(coupons, res.product.url, brand)?.id ?? null,
    };
  };

  /** Vários links, um por linha: importa um de cada vez e adiciona tudo de uma vez no fim. */
  const importMany = () => {
    const urls = [...new Set(link.split(/\s+/).filter((u) => /^https?:\/\//i.test(u)))].slice(0, BULK_MAX);
    if (!urls.length) {
      setImportError("Cole um link por linha, cada um começando com https://");
      return;
    }
    setImportError(null);
    setImportNote(null);
    startImport(async () => {
      const added: Product[] = [];
      let failed = 0;
      for (const [i, url] of urls.entries()) {
        setProgress(`Buscando ${i + 1} de ${urls.length}…`);
        const res = await importProductAction(url);
        if (!res.ok) failed++;
        const patch = fromImport(res, url, draft.coupons);
        added.push({ id: newId(), name: "", brand: "", category: "", price: 0, couponId: null, url: "", imageUrl: "", icon: "Bag", ...PRODUCT_EXTRA, ...patch });
      }
      update((d) => ({ ...d, products: [...d.products, ...added] }));
      setProgress(null);
      setLink("");
      const missing = added.filter((p) => !p.name || !p.price).length;
      setImportNote(
        [
          `${plural(added.length, "produto adicionado", "produtos adicionados")}.`,
          missing ? `${plural(missing, "precisa", "precisam")} de nome ou preço à mão.` : "",
          failed ? `${plural(failed, "link não abriu", "links não abriram")}.` : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
    });
  };

  /** Confere de novo preço e estoque de todos os produtos com link. */
  const refreshPrices = () => {
    setRefreshNote(null);
    startRefresh(async () => {
      const res = await refreshPricesAction(products.filter((p) => p.url).map((p) => ({ id: p.id, url: p.url })));
      if (!res.ok) {
        setRefreshNote(res.error);
        return;
      }
      const byId = new Map(res.results.map((r) => [r.id, r]));
      const now = new Date().toISOString();
      let changed = 0;
      let soldOut = 0;
      let failed = 0;
      for (const p of products) {
        const r = byId.get(p.id);
        if (!r) continue;
        if (r.price === null && r.available === null) failed++;
        if (r.price !== null && r.price !== p.price) changed++;
        if (r.available === false && !p.soldOut) soldOut++;
      }
      update((d) => ({
        ...d,
        products: d.products.map((p) => {
          const r = byId.get(p.id);
          if (!r || (r.price === null && r.available === null)) return p;
          return { ...p, price: r.price ?? p.price, soldOut: r.available === null ? p.soldOut : !r.available, priceCheckedAt: now };
        }),
      }));
      setRefreshNote(
        [
          changed ? `${plural(changed, "preço mudou", "preços mudaram")}.` : "Nenhum preço mudou.",
          soldOut ? `${plural(soldOut, "produto esgotou", "produtos esgotaram")}.` : "",
          failed ? `${plural(failed, "loja não respondeu", "lojas não responderam")}; confira à mão.` : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
    });
  };

  const importLink = () => {
    const url = link.trim();
    if (!/^https?:\/\//i.test(url)) {
      setImportError("Cole o link completo do produto, começando com https://");
      return;
    }
    setImportError(null);
    setImportNote(null);
    startImport(async () => {
      const res = await importProductAction(url);
      if (!res.ok) setImportError(res.error);
      else if (!res.product.price) setImportNote("Não achamos o preço desse produto. Preencha à mão.");
      insert(fromImport(res, url, draft.coupons));
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
      <h2 className="m-0 text-sm font-bold">Ordem dos produtos</h2>
      <span className="-mt-1 text-[13px] text-[#5E5A52]">O primeiro aparece no topo da vitrine.</span>
      {products.some((p) => p.url) && (
        <div className="flex flex-col gap-1.5 rounded-[14px] bg-[#F7F6F3] p-3">
          <div className="flex items-center gap-3">
            <span className="flex-1 text-[13px] text-[#5E5A52]">
              Preços {checkedAgo(oldestCheck, today)}
            </span>
            <button
              type="button"
              onClick={refreshPrices}
              disabled={refreshing}
              className="min-h-10 flex-none rounded-xl border-[1.5px] border-[#D6D0C5] bg-white px-3.5 text-[13px] font-bold"
            >
              {refreshing ? "Conferindo…" : "Conferir na loja"}
            </button>
          </div>
          {refreshNote && (
            <span role="status" className="text-[13px] font-semibold text-[#3A3A3A]">
              {refreshNote}
            </span>
          )}
        </div>
      )}
      {products.length === 0 && <Empty>Cole o link de um produto que você indica e a gente puxa nome, foto e preço.</Empty>}
      {priced.map((p, i) => (
        <Row
          key={p.id}
          pos={i + 1}
          title={p.name || "Novo produto"}
          sub={[p.soldOut ? "Esgotado" : "", p.price ? formatBRL(p.final) : "", p.coupon?.code].filter(Boolean).join(" · ")}
          thumb={
            <span aria-hidden="true" className="relative flex size-10 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-soft">
              <ProductArt product={p} iconClassName="w-[78%]" strokeWidth={4} />
            </span>
          }
          open={openId === p.id}
          onOpen={() => setOpenId(openId === p.id ? null : p.id)}
          sort={sort}
          total={products.length}
        >
          <Field label="Nome do produto">
            <TextInput value={p.name} onChange={(name) => setProduct(p.id, { name })} maxLength={80} autoFocus={!p.name} />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Marca">
              <TextInput value={p.brand} onChange={(brand) => setProduct(p.id, { brand })} maxLength={60} />
            </Field>
            <Field label="Categoria">
              <TextInput value={p.category} onChange={(category) => setProduct(p.id, { category })} maxLength={30} list="vitri-categories" placeholder="Ex.: Praia" />
            </Field>
          </div>
          <Field label="Preço cheio" hint={p.coupon && p.price ? `Com o cupom: ${formatBRL(p.final)}` : undefined}>
            <MoneyInput key={p.id} cents={p.price} onChange={(price) => setProduct(p.id, { price })} />
          </Field>
          <Field label="Cupom">
            <select value={p.couponId ?? ""} onChange={(e) => setProduct(p.id, { couponId: e.target.value || null })} className={inputCls}>
              <option value="">Sem cupom</option>
              {draft.coupons.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand || "Cupom sem marca"} — {c.code || "sem código"} ({couponOff(c)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Link do produto">
            <TextInput value={p.url} onChange={(url) => setProduct(p.id, { url })} placeholder="https://…" inputMode="url" />
          </Field>
          <Field label="Link de afiliado (opcional)" hint="Se você ganha comissão por um link próprio, o botão de compra leva para ele.">
            <TextInput value={p.affiliateUrl} onChange={(affiliateUrl) => setProduct(p.id, { affiliateUrl })} placeholder="https://…" inputMode="url" />
          </Field>
          <Field label="Review em vídeo (opcional)" hint="Link do seu Reels, TikTok ou YouTube sobre o produto.">
            <TextInput value={p.videoUrl} onChange={(videoUrl) => setProduct(p.id, { videoUrl })} placeholder="https://…" inputMode="url" />
          </Field>
          <div className="flex items-center gap-3">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[13px] font-semibold">Esgotado</span>
              <Hint>Continua na vitrine, sem botão de compra e no fim da lista.</Hint>
            </div>
            <Switch on={p.soldOut} label="Produto esgotado" onToggle={() => setProduct(p.id, { soldOut: !p.soldOut })} />
          </div>
          <Field label="Foto (link da imagem)" hint="Sem foto, usamos uma ilustração.">
            <TextInput value={p.imageUrl} onChange={(imageUrl) => setProduct(p.id, { imageUrl })} placeholder="https://…" inputMode="url" />
          </Field>
          {!p.imageUrl && (
            <div className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Ilustração
              <div className="grid grid-cols-8 gap-1">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    title={ICON_LABELS[icon]}
                    aria-label={ICON_LABELS[icon]}
                    aria-pressed={p.icon === icon}
                    onClick={() => setProduct(p.id, { icon })}
                    className={`flex aspect-square items-center justify-center rounded-[10px] border-2 bg-soft p-0.5 ${p.icon === icon ? "border-ink" : "border-transparent"}`}
                  >
                    <ProductIcon icon={icon} strokeWidth={5} className="w-full" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <FormActions onDone={() => setOpenId(null)} onRemove={() => remove(p.id)} removeLabel="Remover" />
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
          if (bulk) importMany();
          else importLink();
        }}
        className="mt-1 flex flex-col gap-2 rounded-[14px] border-2 border-dashed border-[#CFCAC0] p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-[#3A3A3A]">{bulk ? "+ Vários links" : "+ Adicionar pelo link"}</span>
          <button
            type="button"
            onClick={() => setBulk(!bulk)}
            disabled={importing}
            className="min-h-8 border-0 bg-transparent px-1 text-[13px] font-semibold whitespace-nowrap text-[#5E5A52] underline underline-offset-2"
          >
            {bulk ? "Só um link" : "Vários de uma vez"}
          </button>
        </div>
        {bulk ? (
          <>
            <textarea
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={"https://loja.com/produto-1\nhttps://loja.com/produto-2"}
              aria-label="Links dos produtos, um por linha"
              rows={5}
              className={`${inputCls} h-auto resize-y py-2.5 leading-snug`}
            />
            <button type="submit" disabled={importing} className="min-h-[46px] rounded-xl border-0 bg-ink px-4 text-sm font-bold text-white">
              {progress ?? "Buscar todos"}
            </button>
            <Hint>Um link por linha, até {BULK_MAX} de cada vez.</Hint>
          </>
        ) : (
          <div className="flex gap-2">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://loja.com/produto"
              inputMode="url"
              aria-label="Link do produto"
              className={`${inputCls} min-w-0 flex-1`}
            />
            <button type="submit" disabled={importing} className="min-h-[46px] flex-none rounded-xl border-0 bg-ink px-4 text-sm font-bold text-white">
              {importing ? "Buscando…" : "Buscar"}
            </button>
          </div>
        )}
        {importError && <span className="text-[13px] font-semibold text-[#A3361B]">{importError}</span>}
        {importNote && <span className="text-[13px] font-semibold text-[#8A5A00]">{importNote}</span>}
      </form>
      <AddButton onClick={() => insert({})}>Adicionar manualmente</AddButton>
    </div>
  );
}
