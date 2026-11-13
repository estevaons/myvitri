import { Bone, LoadingScreen } from "@/components/brand/Skeleton";
import { HomeBar } from "./catalog/ui";
import { pad, SiteHeader } from "./chrome";

/**
 * Tela de espera do /inicio, no formato do HomeView: cabeçalho, o perfil (foto, nome, endereço, números e botões),
 * a barra de busca e abas e uma grade de cards. As abas já são links de verdade (nenhuma marcada, porque a aba atual
 * vem da URL), e o resto são blocos cinza.
 */
export function HomeSkeleton() {
  return (
    <LoadingScreen className="overflow-x-clip bg-white text-ink">
      <SiteHeader links={[]} home="/inicio" action={<Bone className="size-11 rounded-full" />} />

      <section className={`mx-auto flex max-w-[52rem] flex-col items-center gap-5 pt-10 pb-10 md:pt-14 ${pad}`}>
        <Bone className="size-28 rounded-full md:size-34" />
        <Bone className="h-[clamp(38px,4.4vw,56px)] w-[min(20rem,80%)]" />
        <Bone className="h-12 w-full max-w-[34rem]" />
        <Bone className="h-24 w-full" />
        <div className="grid w-full max-w-[34rem] grid-cols-2 gap-2">
          <Bone className="h-12" />
          <Bone className="h-12" />
        </div>
      </section>

      <div className={`mx-auto max-w-[1440px] pt-4 pb-4 md:pt-6 ${pad}`}>
        <Bone className="h-6 w-32 md:h-7" />
      </div>
      <HomeBar search={<Bone className="h-12 w-full" />} />

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-8 pt-8 md:pt-10 ${pad}`}>
        <Bone className="h-[clamp(30px,3.2vw,44px)] w-[min(16rem,70%)]" />
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
