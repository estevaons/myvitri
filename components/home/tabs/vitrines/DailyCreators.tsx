import { useTranslations } from "next-intl";
import type { HomeCreator } from "@/lib/vitrine/data";
import { Carousel } from "../../Carousel";
import { kicker, pad } from "../../chrome";
import { CreatorCard } from "../../CreatorCard";

/** Trilho do carrossel: a margem da página, e o encaixe dos cards respeitando a mesma margem (o `scroll-px` acompanha o `pad`). */
const track = `${pad} scroll-px-5 md:scroll-px-12`;

/**
 * As "Vitrines do dia" (`getDailyCreators`): as mais clicadas hoje ou, enquanto ninguém clicou, as que acabaram de
 * publicar, com outro título. `band`: a faixa areia com carrossel no topo da aba Vitrines. `suggest`: a grade de
 * sugestões embaixo da aba Favoritas vazia, para a pessoa começar a favoritar.
 */
export function DailyCreators({
  ranked,
  creators,
  favorites,
  variant,
}: {
  ranked: boolean;
  creators: HomeCreator[];
  favorites: string[];
  variant: "band" | "suggest";
}) {
  const t = useTranslations("home.daily");
  if (!creators.length) return null;
  const title = ranked ? t("rankedTitle") : t("newTitle");

  if (variant === "suggest")
    return (
      <section aria-labelledby="sugestoes" className={`mx-auto flex max-w-[1440px] flex-col gap-6 pt-14 md:pt-20 ${pad}`}>
        <div className="flex flex-col gap-2">
          <span className={`${kicker} text-gold`}>{t("suggestKicker")}</span>
          <h2 id="sugestoes" className="m-0 font-display text-[clamp(30px,3.2vw,44px)] leading-[1] font-normal">
            {title}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
          {creators.slice(0, 8).map((c) => (
            <CreatorCard key={c.handle} c={c} favorited={favorites.includes(c.handle)} />
          ))}
        </div>
      </section>
    );

  return (
    <section aria-labelledby="vitrines-do-dia" className="bg-sand pt-8 pb-10 md:pt-12 md:pb-14">
      <div className={`mx-auto flex max-w-[1440px] flex-col gap-2 pb-6 md:pb-8 ${pad}`}>
        <span className={`${kicker} text-gold`}>{ranked ? t("rankedKicker") : t("newKicker")}</span>
        <h2 id="vitrines-do-dia" className="m-0 font-display text-[clamp(32px,3.6vw,52px)] leading-[1] font-normal">
          {title}
        </h2>
        <p className="m-0 text-[15px] text-ink/70">{ranked ? t("rankedText") : t("newText")}</p>
      </div>
      <div className="mx-auto max-w-[1440px]">
        <Carousel label={title} className={track} itemClassName="w-[220px] md:w-[280px]">
          {creators.map((c) => (
            <CreatorCard key={c.handle} c={c} favorited={favorites.includes(c.handle)} framed />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
