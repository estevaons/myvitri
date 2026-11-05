import { getKitCatalog, KIT_SORTS, priceOptions, queryKits } from "@/lib/vitrine/catalog/kits";
import { hrefWith, limitOf, type TabParams } from "../catalog/params";
import { CatalogEmpty, CatalogFrame, catalogGrid, countLabel, FilterChips, LoadMore, SortMenu } from "../catalog/ui";
import { KitCatalogCard } from "./kits/KitCatalogCard";

const FILTERS = ["preco", "cat", "creator"] as const;

/**
 * Aba "Kits" do /inicio: todos os kits publicados com algum produto à venda, com o total já com cupom.
 * Os dados vêm de um cache só; filtro, ordem e "Ver mais" são feitos aqui, a partir da URL.
 */
export async function KitsTab({ params }: { params: TabParams }) {
  const { kits, categories, creators } = await getKitCatalog();
  const shown = queryKits(kits, params);
  const limit = limitOf(params);
  const filtered = FILTERS.some((f) => params[f]);
  const ordem = KIT_SORTS.some(([id]) => id === params.ordem) ? params.ordem : KIT_SORTS[0][0];
  const clearHref = hrefWith(params, { preco: null, cat: null, creator: null });

  return (
    <CatalogFrame
      title="Kits"
      text="Combinações montadas por quem indica, com o total já com o cupom."
      filters={
        <>
          <FilterChips label="Preço" param="preco" options={priceOptions(kits)} params={params} />
          <FilterChips label="Categoria" param="cat" options={categories} params={params} />
          <FilterChips label="Vitrine" param="creator" options={creators} params={params} />
        </>
      }
      sort={<SortMenu options={KIT_SORTS.map(([id, label]) => [id, label])} params={{ ...params, ordem }} />}
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
          text="Tire um filtro ou troque a faixa de preço para ver mais combinações."
          clearHref={clearHref}
        />
      ) : (
        <CatalogEmpty title="Ainda não há kits" text="Quando alguém publicar um kit, ele aparece aqui com o total já com o cupom." />
      )}
    </CatalogFrame>
  );
}
