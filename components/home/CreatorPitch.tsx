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

/** As peças que a mulher de `/hero/retrato-outfit.webp` (recorte de `/hero/retrato.webp`, a antiga foto do topo) está usando: `/hero/<id>.webp` e `pitch.outfitsPieces.<id>`. */
const OUTFIT = ["blazer", "calca", "bolsa"] as const;
/** O resto do que a vitrine faz, só com um ícone: os três de cima já mostram como ela é. */
const MORE = ["metrics", "video"] as const;
const STEPS = ["link", "items", "bio"] as const;

const ICON_PROPS = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const MORE_ICON: Record<(typeof MORE)[number], ReactNode> = {
  // barras subindo: as métricas
  metrics: (
    <svg {...ICON_PROPS}>
      <path d="M4 20h16M7 16v-4M12 16V8M17 16V5" />
    </svg>
  ),
  // tela com o play: o vídeo
  video: (
    <svg {...ICON_PROPS}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m10 9.5 4.5 2.5-4.5 2.5z" />
    </svg>
  ),
};

/** Respostas curtas e diretas: aparecem na página e vão no FAQPage, que é de onde buscadores e assistentes de IA tiram a resposta. */
const FAQ = ["what", "cost", "link", "manual", "affiliate", "share"] as const;

/** As perguntas e respostas no idioma da página, para os dados estruturados (FAQPage) da landing. */
export async function faqItems(): Promise<[question: string, answer: string][]> {
  const t = await getTranslations("pitch.faq");
  return FAQ.map((k) => [t(`${k}Q`, { brand: BRAND }), t(`${k}A`, { host: HOST })]);
}

/** Botão claro, para as faixas de foto escura: o `pillDark` some sobre elas. */
const pillWhite =
  "flex min-h-13 items-center justify-center bg-white px-9 text-[12px] font-medium tracking-[0.18em] text-ink uppercase no-underline hover:bg-cream";

/**
 * Faixa de chamada de ponta a ponta (até 2560px, como a foto do hero): foto de fundo com um véu marrom-escuro por cima,
 * para o texto branco ler bem sobre as fotos claras, e o conteúdo centrado. `position` ajusta o recorte da foto.
 */
function PhotoBand({ src, position, children }: { src: string; position: string; children: ReactNode }) {
  return (
    <section className="relative mx-auto mt-20 max-w-[2560px] overflow-hidden md:mt-28">
      <Image src={src} alt="" fill quality={85} sizes="(min-width: 2560px) 2560px, 100vw" className={`object-cover ${position}`} />
      <div aria-hidden="true" className="absolute inset-0 bg-[#1f1a14]/55" />
      <div className={`relative flex min-h-[clamp(440px,40vw,760px)] flex-col items-center justify-center gap-5 py-20 text-center text-white ${pad}`}>
        {children}
      </div>
    </section>
  );
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
      {/* abre a parte de quem divulga: faixa de foto de ponta a ponta, no lugar do antigo convite "O que é bom merece ser dividido" */}
      {/* foto: Alyssa Strohmann, Unsplash License (unsplash.com/photos/TS--uNw-JqE) */}
      <PhotoBand src="/cta/arara.webp" position="object-[50%_40%]">
        <span className={`${kicker} text-white/80`}>{t("kicker")}</span>
        <h2 className="m-0 max-w-[18ch] font-display text-[clamp(40px,5vw,76px)] leading-[1.02] font-normal text-balance">
          {t("title")} <em>{t("titleEm")}</em>
        </h2>
        <p className="m-0 max-w-[34rem] text-[18px] leading-relaxed text-white/85">{t("text")}</p>
        {/* cada chamada da landing tem o seu texto; esta abre a parte de quem divulga */}
        <Link href="/criar-vitrine" className={`${pillWhite} mt-3`}>
          {t("introCta")}
        </Link>
      </PhotoBand>

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
                {/* recorte da /hero/retrato.webp (antiga foto do topo, hoje só a origem deste recorte) já em 4:5: ampliar a foto inteira com CSS deixava a versão pequena do next/image embaçada */}
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

      {/* o título na primeira coluna e os dois itens nas outras duas: alinhados aos três cards de cima, sem buraco no fim da linha */}
      <section className={`mx-auto grid max-w-[1440px] gap-x-4 pt-16 md:grid-cols-3 md:pt-24 ${pad}`}>
        <h2 className="m-0 pb-4 font-display text-[clamp(28px,3.2vw,40px)] leading-[1.05] font-normal md:border-t md:border-sand md:pt-5 md:pb-0">
          {t("moreTitle")}
        </h2>
        <ul className="m-0 grid list-none gap-x-4 p-0 md:col-span-2 md:grid-cols-2">
          {MORE.map((k) => (
            <li key={k} className="flex gap-4 border-t border-sand py-5">
              <span aria-hidden="true" className="flex size-11 flex-none items-center justify-center bg-cream text-gold">
                {MORE_ICON[k]}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="m-0 font-display text-[22px] leading-[1.15] font-medium">{t(`more.${k}Title`)}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-mute">{t(`more.${k}Text`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* o "como começar" só com texto: os desenhos de "Feita para..." já mostram cupom, produto e outfit, e repeti-los aqui cansava.
          O peso vem dos números grandes em dourado; no desktop os passos ficam lado a lado, separados por um fio. */}
      <section className={`mx-auto flex max-w-[1440px] flex-col items-center gap-10 pt-24 md:gap-14 md:pt-40 ${pad}`}>
        <h2 className="m-0 text-center font-display text-[clamp(40px,5vw,72px)] leading-[1] font-normal lining-nums">{t("stepsTitle")}</h2>
        <ol className="m-0 grid w-full list-none p-0 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-col border-t border-sand py-6 md:border-t-0 md:border-l md:px-8 md:py-2 md:first:border-l-0 md:first:pl-0 lg:px-12">
              <span aria-hidden="true" className="font-display text-[clamp(56px,7vw,112px)] leading-[0.85] text-gold italic lining-nums">
                {i + 1}
              </span>
              <h3 className="m-0 pt-3 font-display text-[24px] leading-[1.1] font-medium md:pt-5 md:text-[26px]">{t(`steps.${s}`)}</h3>
              <p className="m-0 max-w-[24rem] pt-2 text-[15px] leading-relaxed text-mute">{t(`steps.${s}Text`, { host: HOST })}</p>
            </li>
          ))}
        </ol>
        {/* cada chamada tem o seu texto: aqui o botão é o primeiro passo; o fecho da página fica com "Criar minha vitrine grátis" */}
        <Link href="/criar-vitrine" className={`${pillDark} max-md:self-stretch`}>
          {t("stepsCta")}
        </Link>
      </section>

      {/* em duas colunas: as perguntas são curtas e, na largura toda, deixavam a metade direita da tela vazia */}
      <section className={`mx-auto grid max-w-[1440px] gap-4 pt-24 md:grid-cols-[1fr_2fr] md:gap-12 md:pt-40 ${pad}`}>
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

      {/* o fecho da página: a mesma faixa de foto da abertura, com o celular na mão (o link na bio).
          Foto: Farzane Mohammadi, Unsplash License (unsplash.com/photos/aGYOl28Umvs) */}
      <PhotoBand src="/cta/celular.webp" position="object-[50%_50%]">
        <h2 className="m-0 max-w-[16ch] font-display text-[clamp(40px,5vw,76px)] leading-[1.02] font-normal text-balance">{t("ctaTitle")}</h2>
        <p className="m-0 text-[18px] text-white/85">{t("ctaText")}</p>
        <Link href="/criar-vitrine" className={`${pillWhite} mt-3`}>
          {t("cta")}
        </Link>
      </PhotoBand>
    </div>
  );
}
