import { BackLink } from "@/components/brand/BackLink";
import { Bone, LoadingScreen } from "@/components/brand/Skeleton";

const pad = "px-5 @3xl:px-12";

/** Tela de espera da vitrine pública, no formato do Storefront: capa, foto, nome, frase e a faixa de cupons. */
export function StorefrontSkeleton() {
  return (
    <LoadingScreen className="@container w-full overflow-hidden bg-white font-sans text-ink">
      <header className={`mx-auto flex max-w-[1440px] items-center justify-between gap-4 border-b border-sand py-3.5 ${pad}`}>
        <BackLink href="/" label="home" labelClass="@max-2xl:hidden" />
        <div className="flex gap-6 @max-2xl:hidden">
          {Array.from({ length: 3 }, (_, i) => (
            <Bone key={i} className="h-3 w-16" />
          ))}
        </div>
      </header>

      <section className={`mx-auto max-w-[1440px] ${pad}`}>
        <Bone className="aspect-[21/9] w-full @max-2xl:aspect-[4/3]" />
        <div className="relative -mt-10 flex flex-col items-center gap-2.5">
          <Bone className="box-border size-20 rounded-full ring-4 ring-white" />
          <Bone className="h-5 w-40" />
          <Bone className="h-3 w-24" />
        </div>
        <div className="mx-auto flex max-w-[880px] flex-col items-center gap-4 pt-7 pb-2 @3xl:pt-8">
          <Bone className="h-[clamp(44px,8cqw,96px)] w-[min(40rem,90%)]" />
          <Bone className="h-4 w-[min(30rem,80%)]" />
          <div className="mt-3 flex gap-2">
            <Bone className="h-12 w-36" />
            <Bone className="h-12 w-32" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] pt-16 @3xl:pt-24">
        <div className={pad}>
          <Bone className="h-10 w-40" />
        </div>
        <div className={`mt-6 flex gap-3 overflow-hidden ${pad}`}>
          {Array.from({ length: 4 }, (_, i) => (
            <Bone key={i} className="min-h-[290px] w-[300px] flex-none @max-md:w-[82%]" />
          ))}
        </div>
      </section>
    </LoadingScreen>
  );
}
