import { Fragment, type CSSProperties } from "react";
import { getCatalogBrands } from "@/lib/vitrine/catalog/brands";
import { hrefWith, limitOf, type TabParams } from "../catalog/params";
import { CatalogEmpty, CatalogFrame, countLabel, FilterChips, LoadMore, SortLinks, ToggleChip } from "../catalog/ui";
import { BrandCard } from "./marcas/BrandCard";
import { BrandDetail } from "./marcas/BrandDetail";
import { expiringSoon, LETTER_MIN, letterOf, optionsBy, OTHER_LETTER, passes, SORTS, sortBrands } from "./marcas/query";

// colunas da grade em cada largura: celular, md e lg (o comparativo entra embaixo da linha da marca aberta)
const COLS = [2, 3, 4] as const;
const grid = "grid grid-cols-2 gap-1 md:grid-cols-3 lg:grid-cols-4";

/**
 * Aba "Marcas" do /inicio: o diretório das marcas com cupom ativo, com o melhor cupom de cada uma somando
 * todas as vitrines — o que nenhuma vitrine sozinha mostra. `?marca=` abre o comparativo dos cupons dela.
 */
export async function MarcasTab({ params }: { params: TabParams }) {
  const { brands: all, categoryLabels, today } = await getCatalogBrands();

  const filtered = sortBrands(
    all.filter((b) => passes(b, params, today)),
    params.ordem,
  );
  const limit = limitOf(params);
  const shown = filtered.slice(0, limit);

  // opções de cada filtro tiradas das marcas que os outros filtros deixam, para nenhum chip levar a uma lista vazia
  const catOptions = optionsBy(
    all.filter((b) => passes(b, params, today, "cat")).flatMap((b) => b.categories),
    (v) => categoryLabels[v] ?? v,
    params.cat,
    12,
  );
  const letterOptions =
    all.length > LETTER_MIN
      ? optionsBy(
          all.filter((b) => passes(b, params, today, "letra")).map((b) => letterOf(b.brand)),
          (v) => (v === OTHER_LETTER ? "#" : v.toUpperCase()),
          params.letra,
        ).sort(([a], [b]) => (a === OTHER_LETTER ? 1 : b === OTHER_LETTER ? -1 : a.localeCompare(b)))
      : [];
  const showSoon = params.vencendo === "1" || all.some((b) => passes(b, params, today, "vencendo") && expiringSoon(b, today));

  const filters = (catOptions.length > 1 || letterOptions.length > 1 || showSoon) && (
    <>
      {showSoon && <ToggleChip label="Vencendo esta semana" param="vencendo" params={params} />}
      <FilterChips label="Categoria" param="cat" options={catOptions} params={params} />
      <FilterChips label="Letra" param="letra" options={letterOptions} params={params} />
    </>
  );

  // abrir/fechar uma marca mantém o "Ver mais" onde estava
  const keep = { limite: params.limite ?? null };
  const selected = params.marca ? all.find((b) => b.key === params.marca) : undefined;
  const selectedAt = selected ? shown.findIndex((b) => b.key === selected.key) : -1;
  const closeHref = hrefWith(params, { marca: null, ...keep });
  const detail = selected && (
    <BrandDetail
      b={selected}
      today={today}
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

  const filtering = Boolean(params.cat || params.vencendo || params.letra);
  return (
    <CatalogFrame
      title="Marcas"
      text="O melhor cupom de cada marca, somando todas as vitrines. Abra uma marca para comparar os cupons lado a lado."
      filters={filters || undefined}
      sort={all.length > 1 ? <SortLinks options={SORTS} params={params} /> : undefined}
      count={countLabel(filtered.length, "marca", "marcas")}
    >
      {selectedAt < 0 && detail}
      {shown.length > 0 ? (
        <>
          <div className={grid}>
            {shown.map((b, i) => (
              <Fragment key={b.key}>
                <div style={{ order: i * 2 }} className="flex min-w-0 [&>a]:w-full">
                  <BrandCard b={b} today={today} selected={i === selectedAt} href={i === selectedAt ? closeHref : hrefWith(params, { marca: b.key, ...keep })} />
                </div>
                {i === selectedAt && detail}
              </Fragment>
            ))}
          </div>
          <LoadMore params={params} shown={shown.length} total={filtered.length} />
        </>
      ) : filtering ? (
        <CatalogEmpty
          title="Nenhuma marca com esses filtros"
          text="Tire um filtro para ver mais marcas com cupom ativo."
          clearHref={hrefWith(params, { cat: null, vencendo: null, letra: null, marca: null })}
        />
      ) : (
        <CatalogEmpty title="Nenhum cupom ativo agora" text="Quando as creators publicarem cupons nas vitrines, as marcas aparecem aqui." />
      )}
    </CatalogFrame>
  );
}
