import { useTranslations } from "next-intl";
import { BackLink } from "@/components/brand/BackLink";
import { Wordmark } from "@/components/brand/Logo";
import { Bone, LoadingScreen } from "@/components/brand/Skeleton";
import { Link } from "@/lib/i18n/navigation";
import { BRAND } from "@/lib/brand";

/** Tela de espera do editor, no formato dele: barra do topo, painel com as abas à esquerda e a prévia à direita. */
export function EditorSkeleton() {
  const t = useTranslations("common");
  return (
    <LoadingScreen className="flex min-h-dvh flex-col bg-paper text-ink lg:h-dvh">
      <header className="border-b border-[#E0DCD3] bg-white">
        <div className="flex flex-wrap items-center gap-3.5 px-5 py-3">
          <BackLink href="/inicio" label="home" divider />
          <Link href="/inicio" aria-label={t("brandHome", { brand: BRAND })} className="flex text-ink no-underline">
            <Wordmark label="" className="h-[17px] w-auto" />
          </Link>
          <div className="flex-1" />
          <Bone className="h-11 w-56 rounded-xl max-sm:hidden" />
          <Bone className="h-11 w-36 rounded-full" />
          <Bone className="size-11 rounded-full" />
        </div>
      </header>

      <div className="flex flex-1 flex-wrap items-stretch lg:min-h-0 lg:flex-nowrap">
        <aside className="flex max-w-full min-w-0 flex-[1_1_400px] flex-col border-r border-[#EEEBE5] bg-white lg:max-w-[440px]">
          <div className="grid grid-cols-5 gap-1 border-b border-[#EEEBE5] px-3 py-2.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Bone key={i} className="h-[52px] rounded-[10px]" />
            ))}
          </div>
          <div className="flex flex-col gap-3 px-5 pt-6 pb-10">
            <Bone className="h-4 w-40" />
            <Bone className="h-3 w-64 max-w-full" />
            {Array.from({ length: 4 }, (_, i) => (
              <Bone key={i} className="h-16 w-full rounded-[12px]" />
            ))}
          </div>
        </aside>

        <main className="box-border flex min-w-0 flex-[999_1_560px] flex-col items-center p-6 max-sm:p-3">
          <div className="w-full max-w-[1100px] overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_20px_50px_rgba(17,17,17,0.12)]">
            <div className="flex justify-center border-b border-[#E8E5DF] bg-[#F7F6F3] px-3.5 py-2.5">
              <Bone className="h-7 w-48 rounded-full" />
            </div>
            <div className="flex flex-col items-center gap-4 p-6">
              <Bone className="aspect-[21/9] w-full" />
              <Bone className="-mt-14 size-20 rounded-full ring-4 ring-white" />
              <Bone className="h-12 w-3/4" />
              <Bone className="h-4 w-1/2" />
            </div>
          </div>
        </main>
      </div>
    </LoadingScreen>
  );
}
