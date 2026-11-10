import { getTranslations } from "next-intl/server";
import { bestRank, getTrendingHandles, getVitrinesCatalog, keyOf, type CatalogOption, type CatalogVitrine } from "@/lib/vitrine/catalog/vitrines";
import { hrefWith, limitOf, type TabParams } from "../catalog/params";
import { CatalogEmpty, CatalogFrame, catalogGrid, FilterChips, LoadMore, SortMenu, ToggleChip } from "../catalog/ui";
import { VitrineCard } from "./vitrines/VitrineCard";

/** Ordens na URL (`?sort=`), a primeira é a padrão. Os rótulos ficam em `catalog.vitrines.sorts`. */
const SORTS = ["trending", "recent", "discount", "coupons"] as const;

const FILTER_KEYS = ["category", "brand", "expiring"] as const;

/** O filtro ativo continua na lista mesmo fora das mais frequentes, para dar para tirá-lo. */
const withActive = (options: CatalogOption[], active: string | undefined): CatalogOption[] =>
  !active || options.some(([v]) => v === keyOf(active)) ? options : [...options, [keyOf(active), active]];

const byRecent = (a: CatalogVitrine, b: CatalogVitrine) => b.updatedAt.localeCompare(a.updatedAt);

/**
 * Aba "Vitrines" do /inicio: todas as vitrines com algo ativo (e, como cada conta tem uma só, todas as
 * creators). Filtra, ordena e corta no servidor; o catálogo vem do cache de horas e o ranking do dia,
 * que muda a cada clique, do cache de minutos.
 */
export async function VitrinesTab({ params, favorites = [] }: { params: TabParams; favorites?: string[] }) {
  const sort = SORTS.find((id) => id === params.sort) ?? SORTS[0];
  const [{ vitrines, categories, brands, today }, trending, t, tCount] = await Promise.all([
    getVitrinesCatalog(),
    sort === "trending" ? getTrendingHandles() : [],
    getTranslations("catalog"),
    getTranslations("counts"),
  ]);

  const cat = params.category && keyOf(params.category);
  const brand = params.brand && keyOf(params.brand);
  const filtered = vitrines.filter(
    (v) =>
      (!cat || v.categoryKeys.includes(cat)) &&
      (!brand || v.brandKeys.includes(brand)) &&
      (params.expiring !== "1" || v.expiring !== null),
  );

  // o catálogo já vem do mais recente para o mais antigo; o sort é estável, então o empate fica assim
  const pos = new Map(trending.map((h, i) => [h, i]));
  const sorted =
    sort === "trending"
      ? filtered.toSorted((a, b) => (pos.get(a.card.handle) ?? Infinity) - (pos.get(b.card.handle) ?? Infinity) || byRecent(a, b))
      : sort === "discount"
        ? filtered.toSorted((a, b) => bestRank(b) - bestRank(a) || byRecent(a, b))
        : sort === "coupons"
          ? filtered.toSorted((a, b) => b.card.coupons - a.card.coupons || byRecent(a, b))
          : filtered.toSorted(byRecent);

  const limit = limitOf(params);
  const shown = sorted.slice(0, limit);
  const filtering = FILTER_KEYS.some((k) => params[k]);
  const clearHref = hrefWith(params, Object.fromEntries(FILTER_KEYS.map((k) => [k, null])));

  // o liga/desliga só aparece se houver alguma vitrine para mostrar com ele (ou se já estiver ligado)
  const showExpiring = vitrines.some((v) => v.expiring) || params.expiring;
  const filters = (
    <>
      <FilterChips label={t("filters.category")} param="category" options={withActive(categories, params.category)} params={params} />
      <FilterChips label={t("filters.brand")} param="brand" options={withActive(brands, params.brand)} params={params} />
      {showExpiring && <ToggleChip label={t("filters.expiringCoupon")} param="expiring" params={params} />}
    </>
  );

  return (
    <CatalogFrame
      title={t("vitrines.title")}
      text={t("vitrines.text")}
      filters={filters}
      sort={<SortMenu options={SORTS.map((s) => [s, t(`vitrines.sorts.${s}`)])} params={params} />}
      count={tCount("vitrines", { count: sorted.length })}
      clearHref={filtering ? clearHref : undefined}
    >
      {shown.length > 0 ? (
        <>
          <div className={catalogGrid}>
            {shown.map((v) => (
              <VitrineCard key={v.card.handle} v={v} today={today} favorited={favorites.includes(v.card.handle)} />
            ))}
          </div>
          <LoadMore params={params} shown={shown.length} total={sorted.length} />
        </>
      ) : filtering ? (
        <CatalogEmpty title={t("vitrines.filteredTitle")} text={t("vitrines.filteredText")} clearHref={clearHref} />
      ) : (
        <CatalogEmpty title={t("vitrines.emptyTitle")} text={t("vitrines.emptyText")} />
      )}
    </CatalogFrame>
  );
}
