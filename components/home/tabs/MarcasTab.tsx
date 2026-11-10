import { getTranslations } from "next-intl/server";
import { Fragment, type CSSProperties } from "react";
import { getCatalogBrands } from "@/lib/vitrine/catalog/brands";
import { hrefWith, limitOf, type TabParams } from "../catalog/params";
import { CatalogEmpty, CatalogFrame, FilterChips, LoadMore, SortMenu, ToggleChip } from "../catalog/ui";
import { BrandCard } from "./marcas/BrandCard";
import { BrandDetail } from "./marcas/BrandDetail";
import { expiringSoon, LETTER_MIN, letterOf, optionsBy, OTHER_LETTER, passes, sortBrands, sortsFor } from "./marcas/query";

// colunas da grade em cada largura: celular, md e lg (o comparativo entra embaixo da linha da marca aberta)
const COLS = [2, 3, 4] as const;
const grid = "grid grid-cols-2 gap-1 md:grid-cols-3 lg:grid-cols-4";

/**
 * Aba "Marcas" do /inicio: o diretório das marcas (com cupom ativo ou produto à venda), com o melhor cupom de cada uma somando
 * todas as vitrines — o que nenhuma vitrine sozinha mostra. `?brand=` abre o comparativo dos cupons dela.
 */
export async function MarcasTab({ params }: { params: TabParams }) {
  const [{ brands: all, categoryLabels, today }, t, tCount] = await Promise.all([getCatalogBrands(), getTranslations("catalog"), getTranslations("counts")]);

  const filtered = sortBrands(
    all.filter((b) => passes(b, params, today)),
    params.sort,
  );
  const limit = limitOf(params);
  const shown = filtered.slice(0, limit);

  // opções de cada filtro tiradas das marcas que os outros filtros deixam, para nenhum chip levar a uma lista vazia
  const catOptions = optionsBy(
    all.filter((b) => passes(b, params, today, "category")).flatMap((b) => b.categories),
    (v) => categoryLabels[v] ?? v,
    params.category,
    12,
  );
  const letterOptions =
    all.length > LETTER_MIN
      ? optionsBy(
          all.filter((b) => passes(b, params, today, "letter")).map((b) => letterOf(b.brand)),
          (v) => (v === OTHER_LETTER ? "#" : v.toUpperCase()),
          params.letter,
        ).sort(([a], [b]) => (a === OTHER_LETTER ? 1 : b === OTHER_LETTER ? -1 : a.localeCompare(b)))
      : [];
  const showSoon = params.expiring === "1" || all.some((b) => passes(b, params, today, "expiring") && expiringSoon(b, today));

  const filters = (catOptions.length > 1 || letterOptions.length > 1 || showSoon) && (
    <>
      <FilterChips label={t("filters.category")} param="category" options={catOptions} params={params} />
      <FilterChips label={t("filters.letter")} param="letter" options={letterOptions} params={params} />
      {showSoon && <ToggleChip label={t("filters.expiringWeek")} param="expiring" params={params} />}
    </>
  );

  // abrir/fechar uma marca mantém o "Ver mais" onde estava
  const keep = { limit: params.limit ?? null };
  const selected = params.brand ? all.find((b) => b.key === params.brand) : undefined;
  const selectedAt = selected ? shown.findIndex((b) => b.key === selected.key) : -1;
  const closeHref = hrefWith(params, { brand: null, ...keep });
  const detail = selected && (
    <BrandDetail
      b={selected}
      closeHref={closeHref}
      categories={selected.categories.map((c) => categoryLabels[c] ?? c)}
      // dentro da grade, logo abaixo da linha da marca em cada largura (via `order`); fora dela (filtrada ou
      // além do "Ver mais"), no topo
      {...(selectedAt >= 0 && {
        className: "my-3 order-(--o2) md:order-(--o3) lg:order-(--o4)",
        style: Object.fromEntries(COLS.map((n) => [`--o${n}`, Math.min(Math.ceil((selectedAt + 1) / n) * n, shown.length) * 2 - 1])) as CSSProperties,
      })}
    />
  );

  const sorts = sortsFor(all, params.sort);
  const filtering = Boolean(params.category || params.expiring || params.letter);
  const clearHref = hrefWith(params, { category: null, expiring: null, letter: null, brand: null });
  return (
    <CatalogFrame
      title={t("brands.title")}
      text={t("brands.text")}
      filters={filters || undefined}
      sort={all.length > 1 && sorts.length > 1 ? <SortMenu options={sorts.map((s) => [s, t(`brands.sorts.${s}`)])} params={params} /> : undefined}
      count={tCount("brands", { count: filtered.length })}
      clearHref={filtering ? clearHref : undefined}
    >
      {selectedAt < 0 && detail}
      {shown.length > 0 ? (
        <>
          <div className={grid}>
            {shown.map((b, i) => (
              <Fragment key={b.key}>
                <div style={{ order: i * 2 }} className="flex min-w-0 [&>a]:w-full">
                  <BrandCard b={b} selected={i === selectedAt} href={i === selectedAt ? closeHref : hrefWith(params, { brand: b.key, ...keep })} />
                </div>
                {i === selectedAt && detail}
              </Fragment>
            ))}
          </div>
          <LoadMore params={params} shown={shown.length} total={filtered.length} />
        </>
      ) : filtering ? (
        <CatalogEmpty title={t("brands.filteredTitle")} text={t("brands.filteredText")} clearHref={clearHref} />
      ) : (
        <CatalogEmpty title={t("brands.emptyTitle")} text={t("brands.emptyText")} />
      )}
    </CatalogFrame>
  );
}
