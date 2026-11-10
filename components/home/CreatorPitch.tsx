import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import type { ReactNode } from "react";
import { Link } from "@/lib/i18n/navigation";
import { BRAND, HOST } from "@/lib/brand";
import { kicker, pad, pillDark } from "./chrome";

/**
 * Fim da landing, para quem divulga: o que a vitrine faz, como começar e as perguntas frequentes.
 * Veio de /criar-vitrine, que agora é só o formulário de criar a conta.
 */

/** As peças que a mulher da foto do topo (`/hero/retrato.webp`, recortada em `/hero/retrato-outfit.webp`) está usando: `/hero/<id>.webp` e `pitch.outfitsPieces.<id>`. */
const OUTFIT = ["blazer", "calca", "bolsa"] as const;
/** O resto do que a vitrine faz, sem desenho: os três de cima já mostram como ela é. */
const MORE = ["metrics", "stories", "utm", "dates", "video", "soldOut"] as const;
const STEPS = ["link", "items", "bio"] as const;

/** Respostas curtas e diretas: aparecem na página e vão no FAQPage, que é de onde buscadores e assistentes de IA tiram a resposta. */
const FAQ = ["what", "cost", "link", "manual", "track", "affiliate", "share"] as const;

/** As perguntas e respostas no idioma da página, para os dados estruturados (FAQPage) da landing. */
export async function faqItems(): Promise<[question: string, answer: string][]> {
  const t = await getTranslations("pitch.faq");
  return FAQ.map((k) => [t(`${k}Q`, { brand: BRAND }), t(`${k}A`, { host: HOST })]);
}

function Feature({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <article className="flex min-w-0 flex-col">
      <div aria-hidden="true" className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-cream">
        {children}
      </div>
      <h3 className="m-0 pt-4 font-display text-[24px] leading-[1.1] font-medium">{title}</h3>
      <p className="m-0 pt-1 text-[15px] leading-relaxed text-mute">{text}</p>
    </article>
  );
}

export function CreatorPitch() {
  const t = useTranslations("pitch");
  const faq = FAQ.map((k) => [t(`faq.${k}Q`, { brand: BRAND }), t(`faq.${k}A`, { host: HOST })]);
  return (
    <div id="para-quem-divulga" className="scroll-mt-4">
      <section className={`mx-auto max-w-[1440px] pt-20 md:pt-28 ${pad}`}>
        {/* abre a parte de quem divulga: entra no lugar do antigo convite "O que é bom merece ser dividido" */}
        <div className="flex flex-col items-center gap-4 bg-sand px-6 py-16 text-center max-md:py-12">
          <span className={`${kicker} text-gold`}>{t("kicker")}</span>
          <h2 className="m-0 max-w-[18ch] font-display text-[clamp(32px,4.4vw,52px)] leading-[1.04] font-normal text-balance">
            {t("title")} <em>{t("titleEm")}</em>
          </h2>
          <p className="m-0 max-w-[32rem] text-[17px] leading-relaxed text-ink/70">{t("text")}</p>
        </div>
      </section>

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-6 pt-20 md:pt-28 ${pad}`}>
        <h2 className="m-0 font-display text-[clamp(32px,4vw,48px)] leading-[1.05] font-normal">{t("madeFor")}</h2>
        <div className="grid gap-x-4 gap-y-10 md:grid-cols-3">
          <Feature title={t("couponsTitle")} text={t("couponsText")}>
            <div className="flex w-[64%] flex-col gap-3 bg-white p-5">
              <span className={`${kicker} text-[11px] text-gold`}>{t("couponsBrand")}</span>
              <span className="font-display text-[44px] leading-[1] font-normal lining-nums">20% OFF</span>
              <span className="flex min-h-10 items-center justify-center border border-dashed border-gold/50 font-mono text-sm font-bold tracking-[0.08em]">
                {t("couponsCode")}
              </span>
            </div>
          </Feature>
          <Feature title={t("productsTitle")} text={t("productsText")}>
            <div className="flex w-[64%] flex-col">
              <div className="relative aspect-[2/1] overflow-hidden bg-white">
                {/* a foto é quadrada e o tênis fica na parte de baixo dela */}
                <Image src="/create_account/tenis.webp" alt="" fill sizes="(min-width: 768px) 300px, 60vw" className="object-cover object-[50%_75%]" />
              </div>
              <span className="pt-2.5 text-center text-sm leading-snug font-medium">{t("productsSample")}</span>
              {/* o link sai como a pessoa colou: é a parte "ref=voce" que paga a comissão */}
              <span className="mt-2.5 truncate border border-dashed border-gold/50 bg-white px-2.5 py-1.5 font-mono text-[11px] text-mute">
                loja.com/tenis?<span className="font-bold text-ink">{t("productsRef")}</span>
              </span>
            </div>
          </Feature>
          <Feature title={t("outfitsTitle")} text={t("outfitsText")}>
            {/* um outfit em miniatura: a foto do topo da página, recortada na mulher, e as peças que ela usa ao lado */}
            <div className="flex w-[78%] items-center gap-3 bg-white p-2.5">
              <div className="relative aspect-[4/5] w-[46%] flex-none overflow-hidden bg-sand">
                {/* recorte da /hero/retrato.webp já em 4:5: ampliar a foto inteira com CSS deixava a versão pequena do next/image embaçada */}
                <Image src="/hero/retrato-outfit.webp" alt="" fill sizes="(min-width: 768px) 180px, 36vw" className="object-cover" />
              </div>
              <ul className="m-0 flex min-w-0 flex-1 list-none flex-col p-0">
                {OUTFIT.map((id) => (
                  <li key={id} className="flex items-center gap-2 border-b border-sand py-1.5 last:border-0">
                    <span className="relative block size-9 flex-none overflow-hidden bg-cream">
                      <Image src={`/hero/${id}.webp`} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                    <span className="min-w-0 truncate text-[12px] leading-snug font-medium">{t(`outfitsPieces.${id}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Feature>
        </div>
      </section>

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-4 pt-12 md:pt-16 ${pad}`}>
        <h2 className="m-0 font-display text-[clamp(28px,3.2vw,40px)] leading-[1.05] font-normal">{t("moreTitle")}</h2>
        <ul className="m-0 grid list-none gap-x-4 p-0 md:grid-cols-3">
          {MORE.map((k) => (
            <li key={k} className="flex flex-col gap-1 border-t border-sand py-5">
              <h3 className="m-0 font-display text-[22px] leading-[1.15] font-medium">{t(`more.${k}Title`)}</h3>
              <p className="m-0 text-[15px] leading-relaxed text-mute">{t(`more.${k}Text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-4 pt-14 md:gap-6 md:pt-20 ${pad}`}>
        <h2 className="m-0 font-display text-[clamp(36px,4.4vw,56px)] leading-[1] font-normal lining-nums">{t("stepsTitle")}</h2>
        <ol className="m-0 grid list-none gap-0 p-0 md:grid-cols-3 md:gap-4">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-4 border-t border-sand py-5 text-[17px] md:flex-col md:items-start md:gap-3">
              <span className="w-10 flex-none font-display text-[40px] leading-none text-gold italic lining-nums">{i + 1}</span>
              {t(`steps.${s}`, { host: HOST })}
            </li>
          ))}
        </ol>
      </section>

      {/* em duas colunas: as perguntas são curtas e, na largura toda, deixavam a metade direita da tela vazia */}
      <section className={`mx-auto grid max-w-[1440px] gap-4 pt-14 md:grid-cols-[1fr_2fr] md:gap-12 md:pt-20 ${pad}`}>
        <h2 className="m-0 font-display text-[clamp(36px,4.4vw,56px)] leading-[1] font-normal text-balance">{t("faqTitle")}</h2>
        <div className="flex flex-col border-b border-sand">
          {faq.map(([q, a]) => (
            <details key={q} className="group border-t border-sand">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden="true" className="flex-none font-display text-[28px] leading-none text-gold transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="m-0 max-w-[44rem] pb-6 text-[16px] leading-relaxed text-mute">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={`mx-auto max-w-[1440px] pt-14 md:pt-20 ${pad}`}>
        <div className="flex flex-col items-center gap-4 bg-sand px-6 py-14 text-center max-md:py-10">
          <h2 className="m-0 font-display text-[clamp(32px,4.4vw,52px)] leading-[1] font-normal">{t("ctaTitle")}</h2>
          <p className="m-0 text-[17px] text-ink/70">{t("ctaText")}</p>
          <Link href="/criar-vitrine" className={`${pillDark} mt-2`}>
            {t("cta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
