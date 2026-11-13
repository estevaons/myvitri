import { getFormatter, getTranslations } from "next-intl/server";
import { getPostCatalog, queryPosts } from "@/lib/vitrine/catalog/posts";
import { hrefWith, limitOf, type TabParams } from "../catalog/params";
import { CatalogEmpty, CatalogFrame, catalogGrid, FilterChips, LoadMore } from "../catalog/ui";
import { PostCard } from "../PostCard";

const FILTERS = ["category", "creator"] as const;

/**
 * Aba "Outfits" do /inicio (`?tab=outfits`; no código, "posts"): todos os outfits publicados com alguma peça à venda, dos mais recentes para os mais antigos.
 * Os dados vêm de um cache só; filtro e "Ver mais" são feitos aqui, a partir da URL.
 */
export async function PostsTab({ params }: { params: TabParams }) {
  const [{ posts, categories, creators }, t, tCount, format] = await Promise.all([getPostCatalog(), getTranslations("catalog"), getTranslations("counts"), getFormatter()]);
  // a home é montada por requisição (connection() na página), então "agora" é a hora desta visita
  const now = new Date();
  const shown = queryPosts(posts, params);
  const limit = limitOf(params);
  const filtered = FILTERS.some((f) => params[f]);
  const clearHref = hrefWith(params, { category: null, creator: null });

  return (
    <CatalogFrame
      title={t("posts.title")}
      filters={
        <>
          <FilterChips label={t("filters.category")} param="category" options={categories} params={params} />
          <FilterChips label={t("filters.vitrine")} param="creator" options={creators} params={params} />
        </>
      }
      count={tCount("posts", { count: shown.length })}
      clearHref={filtered ? clearHref : undefined}
    >
      {shown.length > 0 ? (
        <>
          <ul className={`m-0 list-none p-0 ${catalogGrid}`}>
            {shown.slice(0, limit).map((p) => (
              <li key={p.id} className="min-w-0">
                <PostCard p={p} when={format.relativeTime(new Date(p.publishedAt), now)} />
              </li>
            ))}
          </ul>
          <LoadMore params={params} shown={Math.min(limit, shown.length)} total={shown.length} />
        </>
      ) : filtered ? (
        <CatalogEmpty title={t("posts.filteredTitle")} text={t("posts.filteredText")} clearHref={clearHref} />
      ) : (
        <CatalogEmpty title={t("posts.emptyTitle")} text={t("posts.emptyText")} />
      )}
    </CatalogFrame>
  );
}
