import { getTranslations } from "next-intl/server";
import { VitrineCard } from "@/components/home/tabs/vitrines/VitrineCard";
import { getRecommendedVitrines, type CatalogVitrine } from "@/lib/vitrine/catalog/vitrines";

/**
 * "Você também pode gostar": as vitrines recomendadas no fim de cada vitrine (`getRecommendedVitrines`), para a
 * visita não terminar ali. Componente do servidor, que a página passa ao `Storefront` dentro de um `Suspense`
 * próprio: a vitrine não espera por ele. Sem recomendação (ou com erro), não aparece.
 * Os cards vêm sem o botão de seguir: a página é a mesma para todo mundo e o servidor não sabe quem está vendo.
 * O `data-ph-capture-attribute-section` marca os cliques daqui no autocapture do PostHog.
 */
export async function RecommendedVitrines({ handle }: { handle: string }) {
  const vitrines = await getRecommendedVitrines(handle).catch((e): CatalogVitrine[] => {
    console.error("getRecommendedVitrines", e);
    return [];
  });
  if (!vitrines.length) return null;
  const t = await getTranslations("storefront.recommended");
  return (
    <section
      aria-labelledby="recomendadas"
      data-ph-capture-attribute-section="recomendadas"
      className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 pt-16 @3xl:gap-8 @3xl:px-12 @3xl:pt-24"
    >
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-medium tracking-[0.22em] text-gold uppercase">{t("kicker")}</span>
        <h2 id="recomendadas" className="m-0 font-display text-[clamp(32px,4cqw,44px)] leading-[1.05] font-normal">
          {t("title")}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 @3xl:grid-cols-4 @3xl:gap-x-5">
        {vitrines.map((v) => (
          <VitrineCard key={v.card.handle} v={v} follow={false} />
        ))}
      </div>
    </section>
  );
}
