import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getVitrinesCatalog } from "@/lib/vitrine/catalog/vitrines";
import { getDailyCreators } from "@/lib/vitrine/data";
import { pillLight } from "../chrome";
import { hrefWith, limitOf, type TabParams } from "../catalog/params";
import { CatalogEmpty, CatalogFrame, catalogGrid, LoadMore } from "../catalog/ui";
import { DailyCreators } from "./vitrines/DailyCreators";
import { VitrineCard } from "./vitrines/VitrineCard";

/**
 * Aba "Favoritas" do /inicio, a padrão da home: a lista é privada e por pessoa; os dados de cada card vêm do catálogo
 * em cache. Vazia (conta nova, ou favoritas sem nada ativo), mostra o aviso e, logo abaixo, as Vitrines do dia como
 * sugestão para começar a favoritar.
 */
export async function FavoritasTab({ params, favorites }: { params: TabParams; favorites: string[] }) {
  const { vitrines, today } = favorites.length ? await getVitrinesCatalog() : { vitrines: [], today: "" };
  const byHandle = new Map(vitrines.map((v) => [v.card.handle, v]));
  const active = favorites.flatMap((h) => byHandle.get(h) ?? []);
  const shown = active.slice(0, limitOf(params));
  const [t, tCount, daily] = await Promise.all([getTranslations("catalog.favorites"), getTranslations("counts"), shown.length ? null : getDailyCreators()]);

  return (
    <>
      <CatalogFrame title={t("title")} count={tCount("vitrines", { count: active.length })}>
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
              <Link href={hrefWith({}, { tab: "storefronts" })} scroll={false} className={pillLight}>
                {t("explore")}
              </Link>
            }
          />
        )}
      </CatalogFrame>
      {daily && <DailyCreators {...daily} favorites={favorites} variant="suggest" />}
    </>
  );
}
