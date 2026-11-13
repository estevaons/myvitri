import { getTranslations } from "next-intl/server";
import { queryProducts } from "@/lib/vitrine/catalog/products";
import { hrefWith, limitOf, type TabParams } from "../catalog/params";
import { CatalogEmpty, CatalogFrame, catalogGrid, FilterChips, LoadMore, ToggleChip } from "../catalog/ui";
import { ProductCard } from "./produtos/ProductCard";

const FILTERS = ["category", "brand", "video"] as const;

/** Aba "Produtos" do /inicio: o catálogo completo das vitrines, com filtros na URL. */
export async function ProdutosTab({ params }: { params: TabParams }) {
  const [{ items, filters }, t, tCount] = await Promise.all([queryProducts(params), getTranslations("catalog"), getTranslations("counts")]);
  const limit = limitOf(params);
  const shown = items.slice(0, limit);
  const filtered = FILTERS.some((k) => params[k]);
  const clearHref = filtered ? hrefWith(params, Object.fromEntries(FILTERS.map((k) => [k, null]))) : undefined;

  return (
    <CatalogFrame
      title={t("products.title")}
      filters={
        <>
          <FilterChips label={t("filters.category")} param="category" options={filters.categories} params={params} />
          <FilterChips label={t("filters.brand")} param="brand" options={filters.brands} params={params} />
          {filters.video && <ToggleChip label={t("filters.withVideo")} param="video" params={params} />}
        </>
      }
      count={tCount("products", { count: items.length })}
      clearHref={clearHref}
    >
      {shown.length > 0 ? (
        <>
          <div className={catalogGrid}>
            {shown.map((p) => (
              <ProductCard key={`${p.handle}:${p.id}`} p={p} />
            ))}
          </div>
          <LoadMore params={params} shown={shown.length} total={items.length} />
        </>
      ) : (
        <CatalogEmpty
          title={t("products.emptyTitle")}
          text={filtered ? t("products.filteredText") : t("products.emptyText")}
          clearHref={clearHref}
        />
      )}
    </CatalogFrame>
  );
}
