import { getKitCatalog, queryKits } from "@/lib/vitrine/catalog/kits";
import { hrefWith, limitOf, type TabParams } from "../catalog/params";
import { CatalogEmpty, CatalogFrame, catalogGrid, countLabel, FilterChips, LoadMore } from "../catalog/ui";
import { KitCatalogCard } from "./kits/KitCatalogCard";

const FILTERS = ["cat", "creator"] as const;

/**
 * Aba "Kits" do /inicio: todos os kits publicados com algum produto à venda, dos mais recentes para os mais antigos.
 * Os dados vêm de um cache só; filtro e "Ver mais" são feitos aqui, a partir da URL.
 */
export async function KitsTab({ params }: { params: TabParams }) {
  const { kits, categories, creators } = await getKitCatalog();
  const shown = queryKits(kits, params);
  const limit = limitOf(params);
  const filtered = FILTERS.some((f) => params[f]);
  const clearHref = hrefWith(params, { cat: null, creator: null });

  return (
    <CatalogFrame
      title="Kits"
      text="Combinações montadas por quem indica."
      filters={
        <>
          <FilterChips label="Categoria" param="cat" options={categories} params={params} />
          <FilterChips label="Vitrine" param="creator" options={creators} params={params} />
        </>
      }
      count={countLabel(shown.length, "kit", "kits")}
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
        <CatalogEmpty
          title="Nenhum kit com esses filtros"
          text="Tire um filtro para ver mais combinações."
          clearHref={clearHref}
        />
      ) : (
        <CatalogEmpty title="Ainda não há kits" text="Quando alguém publicar um kit, ele aparece aqui." />
      )}
    </CatalogFrame>
  );
}
