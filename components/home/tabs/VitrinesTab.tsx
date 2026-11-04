import { bestRank, getTrendingHandles, getVitrinesCatalog, keyOf, type CatalogOption, type CatalogVitrine } from "@/lib/vitrine/catalog/vitrines";
import { hrefWith, limitOf, type TabParams } from "../catalog/params";
import { CatalogEmpty, CatalogFrame, catalogGrid, countLabel, FilterChips, LoadMore, SortLinks, ToggleChip } from "../catalog/ui";
import { VitrineCard } from "./vitrines/VitrineCard";

/** [valor na URL, rótulo] — a primeira é a padrão. */
const SORTS: [string, string][] = [
  ["alta", "Em alta hoje"],
  ["recentes", "Mais recentes"],
  ["desconto", "Maior desconto"],
  ["cupons", "Mais cupons"],
];

const FILTER_KEYS = ["cat", "marca", "kits", "vencendo"] as const;

/** O filtro ativo continua na lista mesmo fora das mais frequentes, para dar para tirá-lo. */
const withActive = (options: CatalogOption[], active: string | undefined): CatalogOption[] =>
  !active || options.some(([v]) => v === keyOf(active)) ? options : [...options, [keyOf(active), active]];

const byRecent = (a: CatalogVitrine, b: CatalogVitrine) => b.updatedAt.localeCompare(a.updatedAt);

/**
 * Aba "Vitrines" do /inicio: todas as vitrines com algo ativo (e, como cada conta tem uma só, todas as
 * creators). Filtra, ordena e corta no servidor; o catálogo vem do cache de horas e o ranking do dia,
 * que muda a cada clique, do cache de minutos.
 */
export async function VitrinesTab({ params }: { params: TabParams }) {
  const sort = SORTS.find(([id]) => id === params.ordem)?.[0] ?? SORTS[0][0];
  const [{ vitrines, categories, brands }, trending] = await Promise.all([getVitrinesCatalog(), sort === "alta" ? getTrendingHandles() : []]);

  const cat = params.cat && keyOf(params.cat);
  const brand = params.marca && keyOf(params.marca);
  const filtered = vitrines.filter(
    (v) =>
      (!cat || v.categoryKeys.includes(cat)) &&
      (!brand || v.brandKeys.includes(brand)) &&
      (params.kits !== "1" || v.kits > 0) &&
      (params.vencendo !== "1" || v.expiring !== null),
  );

  // o catálogo já vem do mais recente para o mais antigo; o sort é estável, então o empate fica assim
  const pos = new Map(trending.map((h, i) => [h, i]));
  const sorted =
    sort === "alta"
      ? filtered.toSorted((a, b) => (pos.get(a.card.handle) ?? Infinity) - (pos.get(b.card.handle) ?? Infinity) || byRecent(a, b))
      : sort === "desconto"
        ? filtered.toSorted((a, b) => bestRank(b) - bestRank(a) || byRecent(a, b))
        : sort === "cupons"
          ? filtered.toSorted((a, b) => b.card.coupons - a.card.coupons || byRecent(a, b))
          : filtered.toSorted(byRecent);

  const limit = limitOf(params);
  const shown = sorted.slice(0, limit);
  const filtering = FILTER_KEYS.some((k) => params[k]);

  const filters = (
    <>
      <FilterChips label="Categoria" param="cat" options={withActive(categories, params.cat)} params={params} />
      <FilterChips label="Marca" param="marca" options={withActive(brands, params.marca)} params={params} />
      {/* os liga/desliga só aparecem se houver alguma vitrine para mostrar com eles (ou se já estiverem ligados) */}
      {(vitrines.some((v) => v.kits > 0) || params.kits) && <ToggleChip label="Com kits" param="kits" params={params} />}
      {(vitrines.some((v) => v.expiring) || params.vencendo) && <ToggleChip label="Cupom vencendo" param="vencendo" params={params} />}
    </>
  );

  return (
    <CatalogFrame
      title="Vitrines"
      text="Todas as vitrines com cupom ativo ou produto à venda. Filtre pelo que você procura e entre na que tem a sua cara."
      filters={filters}
      sort={<SortLinks options={SORTS} params={params} />}
      count={countLabel(sorted.length, "vitrine", "vitrines")}
    >
      {shown.length > 0 ? (
        <>
          <div className={catalogGrid}>
            {shown.map((v) => (
              <VitrineCard key={v.card.handle} v={v} />
            ))}
          </div>
          <LoadMore params={params} shown={shown.length} total={sorted.length} />
        </>
      ) : filtering ? (
        <CatalogEmpty
          title="Nenhuma vitrine com esses filtros"
          text="Tire um filtro ou escolha outra combinação para ver mais vitrines."
          clearHref={hrefWith(params, Object.fromEntries(FILTER_KEYS.map((k) => [k, null])))}
        />
      ) : (
        <CatalogEmpty title="Nenhuma vitrine por aqui ainda" text="Assim que alguém publicar cupons ou produtos, a vitrine aparece aqui." />
      )}
    </CatalogFrame>
  );
}
