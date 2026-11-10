import { Bone, LoadingScreen } from "@/components/brand/Skeleton";
import { pad, SiteHeader } from "@/components/home/chrome";

/** Tela de espera das métricas, no formato do MetricsView: título, períodos, os quatro números e o gráfico. */
export function MetricsSkeleton() {
  return (
    <LoadingScreen className="overflow-x-clip bg-white text-ink">
      <SiteHeader back="/inicio" home="/inicio" links={[]} action={<Bone className="h-12 w-40 max-md:w-24" />} />

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-10 pt-10 md:gap-14 md:pt-16 ${pad}`}>
        <div className="flex flex-col gap-4">
          <Bone className="h-3 w-44" />
          <Bone className="h-[clamp(48px,6.8vw,100px)] w-[min(32rem,85%)]" />
          <Bone className="h-4 w-[min(34rem,95%)]" />
        </div>
        <div className="flex gap-7 border-b border-sand pb-4 md:gap-10">
          {Array.from({ length: 3 }, (_, i) => (
            <Bone key={i} className="h-3 w-16" />
          ))}
        </div>
      </section>

      <section className={`mx-auto max-w-[1440px] pt-8 md:pt-10 ${pad}`}>
        <div className="grid grid-cols-2 gap-x-6 border-b border-sand md:grid-cols-4 md:gap-x-0">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3 py-6 md:px-8 md:first:pl-0">
              <Bone className="h-3 w-24" />
              <Bone className="h-[clamp(52px,5.6vw,84px)] w-28" />
            </div>
          ))}
        </div>
      </section>

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-8 pt-16 md:pt-24 ${pad}`}>
        <Bone className="h-10 w-[min(26rem,80%)]" />
        <Bone className="h-64 w-full" />
      </section>
    </LoadingScreen>
  );
}
