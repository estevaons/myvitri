import { useTranslations } from "next-intl";
import { Bone, LoadingScreen } from "@/components/brand/Skeleton";
import { TabNav } from "./catalog/ui";
import { kicker, pad, SiteHeader } from "./chrome";

/**
 * Tela de espera do /inicio, no formato do HomeView: cabeçalho, saudação, busca, abas e uma faixa de cards.
 * As abas já são links de verdade (nenhuma marcada, porque a aba atual vem da URL), e o resto são blocos cinza.
 */
export function HomeSkeleton() {
  const t = useTranslations("home");
  return (
    <LoadingScreen className="overflow-x-clip bg-white text-ink">
      <SiteHeader links={[]} home="/inicio" action={<Bone className="size-11 rounded-full" />} />

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-6 pt-8 md:gap-8 md:pt-12 ${pad}`}>
        <div className="flex flex-col gap-3">
          <span className={`${kicker} text-gold`}>{t("kicker")}</span>
          <Bone className="h-[clamp(40px,4.8vw,68px)] w-[min(24rem,80%)]" />
        </div>
        <div className="flex flex-col gap-2">
          <Bone className="h-14 w-full" />
          <Bone className="h-4 w-64 max-w-full" />
        </div>
      </section>

      <div aria-hidden="true" className="h-5 md:h-6" />
      <TabNav />

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-10 pt-10 md:pt-14 ${pad}`}>
        <div className="flex flex-col items-center gap-4">
          <Bone className="h-3 w-28" />
          <Bone className="h-[clamp(40px,5.2vw,68px)] w-[min(28rem,80%)]" />
          <Bone className="h-4 w-[min(30rem,90%)]" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Bone className="aspect-square w-full" />
              <Bone className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </section>
    </LoadingScreen>
  );
}
