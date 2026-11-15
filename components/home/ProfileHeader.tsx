import { useFormatter, useTranslations } from "next-intl";
import { Link, vitrineHref } from "@/lib/i18n/navigation";
import type { Account } from "./AccountMenu";
import { kicker, pad, pillDark } from "./chrome";
import { VitrineLinkLine } from "./CopyLinkButton";
import { ProfilePhoto } from "./ProfilePhoto";

/**
 * Botões do perfil no areia das capas sem foto (`CoverLetter`), com o texto escuro: o principal (editar) preenchido,
 * um tom mais fundo ao passar o mouse; o outro (ver a vitrine) só com a borda areia, que preenche ao passar o mouse.
 */
const pill = "flex min-h-12 items-center justify-center px-6 text-[12px] font-medium tracking-[0.18em] text-ink uppercase no-underline";
const pillSand = `${pill} bg-sand hover:bg-[#e0d7c8]`;
const pillSandLine = `${pill} border border-sand bg-white hover:bg-sand`;

/** Os números do topo: visitas, cliques nos produtos e cupons copiados nos últimos `WEEK` dias (RPC `vitrine_stats`). */
export type WeekStats = { views: number; clicks: number; copied: number };
export const WEEK = 7;

function Stat({ n, label }: { n: number; label: string }) {
  const format = useFormatter();
  return (
    // o número vem antes na tela (order), mas o rótulo antes no HTML (dt antes de dd); tudo preso no topo, para os
    // números ficarem na mesma linha mesmo quando um rótulo quebra em duas no celular
    <div className="flex flex-col items-center justify-start gap-1.5 px-2 py-4 md:py-5">
      <dt className="order-2 text-[12px] leading-snug text-balance text-mute md:text-[13px]">{label}</dt>
      <dd className="order-1 m-0 font-display text-[clamp(28px,3vw,40px)] leading-none lining-nums">{format.number(n)}</dd>
    </div>
  );
}

/** "Ver métricas" com a seta que anda para a direita quando o `group` em volta recebe o mouse. */
function MetricsCue({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] text-ink uppercase">
      {label}
      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}

/**
 * Os números da semana são a porta de entrada do /metricas: o bloco inteiro é um link só, com um rodapé fino
 * ("Últimos 7 dias" à esquerda, "Ver métricas →" à direita) separado dos números por uma linha areia, e um fundo
 * areia claro ao passar o mouse. Assim o atalho fica onde faz sentido sem virar um terceiro botão entre os números e
 * os botões de editar e ver.
 */
function StatsCard({ stats }: { stats: WeekStats }) {
  const t = useTranslations("home.profile");
  return (
    <Link
      href="/metricas"
      className="group block w-full border-y border-sand text-ink no-underline transition-colors hover:bg-sand/50 focus-visible:bg-sand/50"
    >
      <dl className="m-0 grid grid-cols-3 divide-x divide-sand">
        <Stat n={stats.views} label={t("views", { count: stats.views })} />
        <Stat n={stats.clicks} label={t("clicks", { count: stats.clicks })} />
        <Stat n={stats.copied} label={t("copied", { count: stats.copied })} />
      </dl>
      <div className="flex items-center justify-between gap-3 border-t border-sand px-3 py-2.5 md:px-4">
        <span className="text-[12px] text-mute md:text-[13px]">{t("period", { days: WEEK })}</span>
        <MetricsCue label={t("metrics")} />
      </div>
    </Link>
  );
}

/**
 * O topo da home logada, como um perfil do Instagram: a foto centralizada (tocar nela troca a foto, `ProfilePhoto`), o nome, o endereço (que copia),
 * as métricas da semana e os botões de editar e de ver a vitrine. Rola junto com a página; quem fica presa no
 * topo é a barra de busca e abas logo abaixo. Quem ainda não tem vitrine vê a própria conta (nome e foto do
 * Google) e, no lugar dos números, o convite para criar uma.
 */
export function ProfileHeader({ account, stats }: { account: Account; stats: WeekStats | null }) {
  const t = useTranslations("home.profile");
  const v = account.vitrine;
  const name = v?.name || account.name;
  return (
    <section aria-labelledby="perfil" className={`mx-auto flex max-w-[52rem] flex-col items-center gap-5 pt-10 pb-10 text-center md:pt-14 ${pad}`}>
      <ProfilePhoto name={name} url={account.avatarUrl} editable={Boolean(v)} />
      <div className="flex flex-col items-center gap-1">
        <h1 id="perfil" className="m-0 font-display text-[clamp(38px,4.4vw,56px)] leading-[1] font-normal break-words text-balance">
          {name}
        </h1>
        {v && <VitrineLinkLine handle={v.handle} />}
      </div>

      {v ? (
        <>
          {stats ? (
            <StatsCard stats={stats} />
          ) : (
            <Link href="/metricas" className="group no-underline">
              <MetricsCue label={t("metrics")} />
            </Link>
          )}
          <div className="grid w-full max-w-[34rem] grid-cols-2 gap-2">
            <Link href="/editor" className={pillSand}>
              {t("edit")}
            </Link>
            <Link href={vitrineHref(v.handle)} target="_blank" rel="noopener" className={`${pillSandLine} group gap-2`}>
              {t("view")}
              <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </Link>
          </div>
        </>
      ) : (
        <div className="mt-1 flex w-full max-w-[34rem] flex-col items-center gap-3 bg-sand px-6 py-8">
          <span className={`${kicker} text-[11px] text-gold`}>{t("create.kicker")}</span>
          <p className="m-0 font-display text-[clamp(26px,2.6vw,34px)] leading-[1.1]">{t.rich("create.title", { em: (s) => <em>{s}</em> })}</p>
          <p className="m-0 max-w-[26rem] text-[15px] leading-relaxed text-ink/70">{t("create.text")}</p>
          <Link href="/criar-vitrine" className={`${pillDark} mt-1 w-full`}>
            {t("create.button")}
          </Link>
        </div>
      )}
    </section>
  );
}
