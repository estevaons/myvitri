import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getVitrinesCatalog } from "@/lib/vitrine/catalog/vitrines";
import { pillLight } from "../chrome";
import { hrefWith, limitOf, type TabParams } from "../catalog/params";
import { CatalogEmpty, CatalogFrame, catalogGrid, LoadMore } from "../catalog/ui";
import { VitrineCard } from "./vitrines/VitrineCard";

/** Aba "Favoritas" do /inicio: a lista é privada e por pessoa; os dados de cada card vêm do catálogo em cache. */
export async function FavoritasTab({ params, favorites }: { params: TabParams; favorites: string[] }) {
  const { vitrines, today } = favorites.length ? await getVitrinesCatalog() : { vitrines: [], today: "" };
  const byHandle = new Map(vitrines.map((v) => [v.card.handle, v]));
  const active = favorites.flatMap((h) => byHandle.get(h) ?? []);
  const shown = active.slice(0, limitOf(params));
  const [t, tCount] = await Promise.all([getTranslations("catalog.favorites"), getTranslations("counts")]);

  return (
    <CatalogFrame title={t("title")} text={t("text")} count={tCount("vitrines", { count: active.length })}>
      {shown.length > 0 ? (
        <>
          <div className={catalogGrid}>
            {shown.map((v) => (
              <VitrineCard key={v.card.handle} v={v} today={today} favorited stay />
            ))}
          </div>
          <LoadMore params={params} shown={shown.length} total={active.length} />
        </>
      ) : (
        <CatalogEmpty
          title={favorites.length ? t("staleTitle") : t("emptyTitle")}
          text={favorites.length ? t("staleText") : t("emptyText")}
          action={
            <Link href={hrefWith({}, { aba: "vitrines" })} scroll={false} className={pillLight}>
              {t("explore")}
            </Link>
          }
        />
      )}
    </CatalogFrame>
  );
}
