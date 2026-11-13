import { useTranslations } from "next-intl";
import { BackLink } from "@/components/brand/BackLink";
import { Wordmark } from "@/components/brand/Logo";
import { Bone, LoadingScreen } from "@/components/brand/Skeleton";
import { Link } from "@/lib/i18n/navigation";
import { BRAND } from "@/lib/brand";

/**
 * Tela de espera do editor, no formato dele: as mesmas medidas do cabeçalho, da dica e da moldura da prévia (com as
 * consultas de contêiner da vitrine), então nada pula quando o editor chega. O que é fixo (dica, títulos das seções,
 * barra de endereço) já aparece escrito; só o que vem da vitrine (capa, foto, nome, textos, outfit, produtos) é osso.
 * No topo fica só o menu da conta: o "Publicar" só aparece com alterações.
 */
export function EditorSkeleton() {
  const t = useTranslations("common");
  const te = useTranslations("editor");
  const ts = useTranslations("storefront");
  const sectionTitle = "m-0 font-display text-[clamp(32px,4cqw,44px)] leading-[1.05] font-normal";
  return (
    <LoadingScreen className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="border-b border-[#E0DCD3] bg-white">
        <div className="flex items-center gap-3.5 px-5 py-3 max-sm:gap-2.5 max-sm:px-3">
          <BackLink href="/inicio" label="home" labelClass="max-sm:hidden" divider />
          <Link href="/inicio" aria-label={t("brandHome", { brand: BRAND })} className="flex text-ink no-underline max-sm:hidden">
            <Wordmark label="" className="h-[17px] w-auto" />
          </Link>
          <div className="flex-1" />
          <Bone className="size-11 rounded-full" />
        </div>
      </header>

      <main className="box-border flex flex-1 flex-col items-center gap-4 p-6 max-sm:px-0 max-sm:pt-0 max-sm:pb-6">
        <p className="m-0 w-full max-w-[1100px] text-[13px] leading-snug text-[#5E5A52] max-sm:px-4 max-sm:pt-3">{te("editHint")}</p>
        <div className="w-full max-w-[1100px] flex-none overflow-hidden bg-white sm:rounded-2xl sm:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_20px_50px_rgba(17,17,17,0.12)]">
          <div className="flex items-center justify-center border-b border-[#E8E5DF] bg-[#F7F6F3] px-3.5 py-2.5 max-sm:hidden">
            <span className="flex items-center gap-1.5 rounded-full border border-[#E8E5DF] bg-white px-3.5 py-1.5 text-xs text-[#3A3A3A]">
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              {/* na altura da linha do endereço, para a moldura ter a mesma altura */}
              <span className="flex h-4 items-center">
                <Bone className="h-3 w-44 rounded-full" />
              </span>
            </span>
          </div>

          <div className="@container">
            {/* capa, foto, nome e @, redes e os dois textos do topo */}
            <section className="px-5 pt-5 @3xl:px-12 @3xl:pt-6">
              <Bone className="aspect-[21/9] w-full @max-2xl:aspect-[4/3]" />
              <div className="relative -mt-10 flex flex-col items-center gap-2.5">
                <Bone className="size-20 rounded-full ring-4 ring-white" />
                <div className="flex flex-col items-center gap-2 py-1">
                  <Bone className="h-5 w-44 rounded-full" />
                  <Bone className="h-3 w-32 rounded-full" />
                </div>
                <div className="flex gap-1.5 @2xl:absolute @2xl:top-12 @2xl:right-0">
                  <Bone className="size-6 rounded-full" />
                  <Bone className="size-6 rounded-full" />
                  <Bone className="size-6 rounded-full" />
                </div>
              </div>
              <div className="mx-auto flex max-w-[880px] flex-col items-center px-4 pt-12 pb-12 @3xl:pt-14">
                <div className="flex w-full flex-col items-center gap-[clamp(10px,2cqw,22px)]">
                  <Bone className="h-[clamp(34px,6.4cqw,76px)] w-[82%] rounded-lg" />
                  <Bone className="h-[clamp(34px,6.4cqw,76px)] w-[66%] rounded-lg" />
                </div>
                <div className="mt-7 flex w-full max-w-[576px] flex-col items-center gap-2.5">
                  <Bone className="h-3.5 w-[92%] rounded-full" />
                  <Bone className="h-3.5 w-[58%] rounded-full" />
                </div>
              </div>
            </section>

            {/* um outfit: foto 4:5 de um lado; legenda e peças do outro */}
            <section className="pt-16 @3xl:pt-24">
              <h2 className={`${sectionTitle} px-5 @3xl:px-12`}>{ts("postsTitle")}</h2>
              <div className="mt-6 px-5 @3xl:mt-8 @3xl:px-12">
                <div className="flex flex-col bg-cream @3xl:grid @3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                  <Bone className="aspect-[4/5] w-full" />
                  <div className="flex min-w-0 flex-col gap-7 p-5 pb-6 @3xl:p-12 @6xl:p-16">
                    <div className="flex flex-col gap-3">
                      <Bone className="h-7 w-[85%] rounded-md" />
                      <Bone className="h-7 w-[60%] rounded-md" />
                    </div>
                    <div className="flex flex-col gap-4">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3.5">
                          <Bone className="size-16 flex-none" />
                          <div className="flex flex-1 flex-col gap-2">
                            <Bone className="h-3 w-[70%] rounded-full" />
                            <Bone className="h-3 w-[40%] rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* produtos: a grade da vitrine, foto quadrada e o nome embaixo */}
            <section className="flex flex-col gap-6 px-5 pt-16 pb-10 @3xl:px-12 @3xl:pt-24">
              <h2 className={sectionTitle}>{ts("productsTitle")}</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 @3xl:grid-cols-3 @3xl:gap-x-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`flex flex-col items-center gap-4 ${i === 2 ? "@max-3xl:hidden" : ""}`}>
                    <Bone className="aspect-square w-full" />
                    <Bone className="h-3 w-2/3 rounded-full" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </LoadingScreen>
  );
}
