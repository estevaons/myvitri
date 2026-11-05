import Link from "next/link";
import { getVitrinesCatalog } from "@/lib/vitrine/catalog/vitrines";
import { pillLight } from "../chrome";
import { hrefWith, limitOf, type TabParams } from "../catalog/params";
import { CatalogEmpty, CatalogFrame, catalogGrid, countLabel, LoadMore } from "../catalog/ui";
import { VitrineCard } from "./vitrines/VitrineCard";

const TITLE = "Favoritas";
const TEXT = "As vitrines que você guardou, da última para a primeira. Aparecem as que têm cupom ativo ou produto à venda.";

/** Aba "Favoritas" do /inicio: a lista é privada e por pessoa; os dados de cada card vêm do catálogo em cache. */
export async function FavoritasTab({ params, favorites }: { params: TabParams; favorites: string[] }) {
  const { vitrines } = favorites.length ? await getVitrinesCatalog() : { vitrines: [] };
  const byHandle = new Map(vitrines.map((v) => [v.card.handle, v]));
  const active = favorites.flatMap((h) => byHandle.get(h) ?? []);
  const shown = active.slice(0, limitOf(params));

  return (
    <CatalogFrame title={TITLE} text={TEXT} count={countLabel(active.length, "vitrine", "vitrines")}>
      {shown.length > 0 ? (
        <>
          <div className={catalogGrid}>
            {shown.map((v) => (
              <VitrineCard key={v.card.handle} v={v} favorited stay />
            ))}
          </div>
          <LoadMore params={params} shown={shown.length} total={active.length} />
        </>
      ) : (
        <CatalogEmpty
          title={favorites.length ? "Suas favoritas estão sem novidade agora" : "Nenhuma vitrine favorita ainda"}
          text={
            favorites.length
              ? "Elas voltam a aparecer aqui quando tiverem cupom ativo ou produto à venda."
              : "Toque no coração de uma vitrine para encontrar ela aqui depois."
          }
          action={
            <Link href={hrefWith({}, { aba: "vitrines" })} scroll={false} className={pillLight}>
              Explorar vitrines
            </Link>
          }
        />
      )}
    </CatalogFrame>
  );
}
