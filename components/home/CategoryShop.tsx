"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Link } from "@/lib/i18n/navigation";
import { ProductArt } from "@/components/storefront/ProductIcon";
import type { HomeProduct } from "@/lib/vitrine/data";

const PAGE = 8;
/** "Todas as categorias": nenhuma categoria de produto tem nome vazio. */
const ALL = "";

/** Os chips filtram a grade de achados logo abaixo; o título da seção já diz que é por categoria. */
export function CategoryShop({ products }: { products: HomeProduct[] }) {
  const t = useTranslations("categoryShop");
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const [cat, setCat] = useState(ALL);
  const [limit, setLimit] = useState(PAGE);

  const shown = cat === ALL ? products : products.filter((p) => p.category === cat);
  const pick = (c: string) => {
    setCat(c);
    setLimit(PAGE);
  };

  return (
    <>
      {categories.length > 1 && (
        <div role="group" aria-label={t("filter")} className="no-scrollbar -mx-5 flex gap-7 overflow-x-auto border-b border-sand px-5 md:mx-0 md:justify-center md:px-0">
          {[ALL, ...categories].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === cat}
              onClick={() => pick(c)}
              className={`-mb-px min-h-11 flex-none border-0 border-b bg-transparent px-0 text-[12px] font-medium tracking-[0.2em] whitespace-nowrap uppercase ${c === cat ? "border-ink text-ink" : "border-transparent text-mute hover:text-ink"}`}
            >
              {c || t("all")}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-4 md:gap-y-12">
        {shown.slice(0, limit).map((p) => (
          <Link key={`${p.handle}:${p.id}`} href={`/${p.handle}#produtos`} className="flex min-w-0 flex-col text-center text-ink no-underline">
            <div aria-hidden="true" className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-cream">
              <ProductArt product={p} iconClassName="w-[52%]" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5 pt-3 text-[15px] leading-snug max-md:text-sm">
              <span className="font-medium">{p.name}</span>
              <span className="mt-2 text-[13px] text-mute">
                {t.rich("pickedBy", { creator: p.creator, b: (s) => <span className="font-medium text-ink underline underline-offset-2">{s}</span> })}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {shown.length > limit && (
        <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="min-h-12 self-center border border-ink bg-transparent px-7 text-[12px] font-medium tracking-[0.18em] text-ink uppercase hover:bg-ink hover:text-white">
          {t("more")}
        </button>
      )}
    </>
  );
}
