"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductArt } from "@/components/storefront/ProductIcon";
import type { HomeProduct } from "@/lib/vitrine/data";
import { couponBadge, formatBRL } from "@/lib/vitrine/pricing";

const PAGE = 8;
const ALL = "Todos";

/** Categorias em destaque viram atalhos; o filtro escolhido (nelas ou nos chips) vale para a grade de achados logo abaixo. */
export function CategoryShop({ products }: { products: HomeProduct[] }) {
  const categories = useMemo(() => {
    const first = new Map<string, HomeProduct>();
    for (const p of products) if (p.category && !first.has(p.category)) first.set(p.category, p);
    return [...first];
  }, [products]);
  const [cat, setCat] = useState(ALL);
  const [limit, setLimit] = useState(PAGE);

  const shown = cat === ALL ? products : products.filter((p) => p.category === cat);
  // destaques em linhas cheias de 4 no computador; os chips abaixo têm todas
  const tiles = categories.length < 4 ? categories : categories.slice(0, categories.length >= 8 ? 8 : 4);
  const pick = (c: string) => {
    setCat(c === cat ? ALL : c);
    setLimit(PAGE);
  };

  return (
    <>
      {tiles.length > 0 && (
        <div role="group" aria-label="Categorias em destaque" className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:px-0">
          {tiles.map(([c, p]) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === cat}
              onClick={() => pick(c)}
              className="group flex w-[42%] flex-none flex-col items-start border-0 bg-transparent p-0 text-left text-ink md:w-auto"
            >
              <span
                aria-hidden="true"
                className={`relative flex aspect-square w-full items-center justify-center overflow-hidden bg-soft ${c === cat ? "outline-2 -outline-offset-2 outline-ink" : ""}`}
              >
                <ProductArt product={p} iconClassName="w-[46%] transition-transform duration-300 group-hover:scale-105" />
              </span>
              <span className="pt-3 text-[13px] text-mute">Achados de</span>
              <span className="font-condensed text-[clamp(28px,3vw,40px)] leading-[0.95] font-extrabold uppercase group-hover:underline group-hover:underline-offset-4">{c}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 pt-4">
        <h3 className="m-0 text-2xl font-medium tracking-[-0.01em]">{cat === ALL ? "Achados com desconto" : `Achados de ${cat}`}</h3>
        {categories.length > 1 && (
          <div role="group" aria-label="Filtrar por categoria" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
            {[ALL, ...categories.map(([c]) => c)].map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={c === cat}
                onClick={() => pick(c)}
                className={`min-h-10 flex-none rounded-full border-0 px-4 text-[15px] font-medium whitespace-nowrap ${c === cat ? "bg-ink text-white" : "bg-soft text-ink hover:bg-line"}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-4 md:gap-y-12">
        {shown.slice(0, limit).map((p) => (
          <Link key={`${p.handle}:${p.id}`} href={`/${p.handle}#produtos`} className="flex min-w-0 flex-col text-ink no-underline">
            <div aria-hidden="true" className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-soft">
              <ProductArt product={p} iconClassName="w-[52%]" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5 pt-3 text-[15px] leading-snug max-md:text-sm">
              {p.coupon && <span className="font-medium text-sale">Cupom {couponBadge(p.coupon)}</span>}
              <span className="font-medium">{p.name}</span>
              {p.brand && <span className="text-mute">{p.brand}</span>}
              {p.price > 0 && (
                <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{formatBRL(p.final)}</span>
                  {p.final !== p.price && <span className="text-mute line-through">{formatBRL(p.price)}</span>}
                </span>
              )}
              <span className="mt-2 text-[13px] text-mute">
                Indicado por <span className="font-medium text-ink underline underline-offset-2">{p.creator}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>

      {shown.length > limit && (
        <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="min-h-12 self-center rounded-full border border-[#CACACB] bg-white px-6 text-[15px] font-medium text-ink hover:border-ink">
          Ver mais achados
        </button>
      )}
    </>
  );
}
