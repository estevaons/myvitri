import { getTranslations } from "next-intl/server";
import { getKitCatalog, queryKits } from "@/lib/vitrine/catalog/kits";
import { hrefWith, limitOf, type TabParams } from "../catalog/params";
import { CatalogEmpty, CatalogFrame, catalogGrid, FilterChips, LoadMore } from "../catalog/ui";
import { KitCatalogCard } from "./kits/KitCatalogCard";

const FILTERS = ["category", "creator"] as const;

/**
 * Aba "Kits" do /inicio: todos os kits publicados com algum produto à venda, dos mais recentes para os mais antigos.
 * Os dados vêm de um cache só; filtro e "Ver mais" são feitos aqui, a partir da URL.
 */
export async function KitsTab({ params }: { params: TabParams }) {
  const [{ kits, categories, creators }, t, tCount] = await Promise.all([getKitCatalog(), getTranslations("catalog"), getTranslations("counts")]);
  const shown = queryKits(kits, params);
  const limit = limitOf(params);
  const filtered = FILTERS.some((f) => params[f]);
  const clearHref = hrefWith(params, { category: null, creator: null });

  return (
    <CatalogFrame
      title={t("kits.title")}
      text={t("kits.text")}
      filters={
        <>
          <FilterChips label={t("filters.category")} param="category" options={categories} params={params} />
          <FilterChips label={t("filters.vitrine")} param="creator" options={creators} params={params} />
        </>
      }
      count={tCount("kits", { count: shown.length })}
      clearHref={filtered ? clearHref : undefined}
    >
      {shown.length > 0 ? (
        <>
          <ul className={`m-0 list-none p-0 ${catalogGrid}`}>
            {shown.slice(0, limit).map((k) => (
              <li key={k.id} className="min-w-0">
                <KitCatalogCard k={k} />
              </li>
            ))}
          </ul>
          <LoadMore params={params} shown={Math.min(limit, shown.length)} total={shown.length} />
        </>
      ) : filtered ? (
        <CatalogEmpty title={t("kits.filteredTitle")} text={t("kits.filteredText")} clearHref={clearHref} />
      ) : (
        <CatalogEmpty title={t("kits.emptyTitle")} text={t("kits.emptyText")} />
      )}
    </CatalogFrame>
  );
}
