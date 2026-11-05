import { PRODUCT_SORTS, queryProducts } from "@/lib/vitrine/catalog/products";
import { hrefWith, limitOf, type TabParams } from "../catalog/params";
import { CatalogEmpty, CatalogFrame, catalogGrid, countLabel, FilterChips, LoadMore, SortMenu, ToggleChip } from "../catalog/ui";
import { ProductCard } from "./produtos/ProductCard";

const FILTERS = ["cat", "marca", "preco", "cupom", "video"] as const;

/** Aba "Produtos" do /inicio: o catálogo completo das vitrines, com filtros e ordenação na URL. */
export async function ProdutosTab({ params }: { params: TabParams }) {
  const { items, filters } = await queryProducts(params);
  const limit = limitOf(params);
  const shown = items.slice(0, limit);
  const filtered = FILTERS.some((k) => params[k]);
  const clearHref = filtered ? hrefWith(params, Object.fromEntries(FILTERS.map((k) => [k, null]))) : undefined;

  return (
    <CatalogFrame
      title="Produtos"
      text="Tudo o que as vitrines indicam, com o preço já com o cupom."
      filters={
        <>
          <FilterChips label="Categoria" param="cat" options={filters.categories} params={params} />
          <FilterChips label="Marca" param="marca" options={filters.brands} params={params} />
          <FilterChips label="Preço" param="preco" options={filters.prices} params={params} />
          {filters.coupon && <ToggleChip label="Só com cupom" param="cupom" params={params} />}
          {filters.video && <ToggleChip label="Com review em vídeo" param="video" params={params} />}
        </>
      }
      sort={<SortMenu options={PRODUCT_SORTS} params={params} />}
      count={countLabel(items.length, "produto", "produtos")}
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
          title="Nada por aqui"
          text={filtered ? "Nenhum produto com esses filtros. Tire algum para ver mais achados." : "As vitrines ainda não têm produtos à venda. Volte daqui a pouco."}
          clearHref={clearHref}
        />
      )}
    </CatalogFrame>
  );
}
