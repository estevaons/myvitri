import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link, vitrineHref, type Href } from "@/lib/i18n/navigation";
import { kicker, pad, pillDark, pillLight, SiteFooter, SiteHeader } from "@/components/home/chrome";
import { CopyLinkButton } from "@/components/home/CopyLinkButton";
import { ProductArt } from "@/components/storefront/ProductIcon";
import { HOST } from "@/lib/brand";
import { vitrineAddress } from "@/lib/vitrine/links";
import { couponOff } from "@/lib/vitrine/pricing";
import { postItems, type Coupon, type Post, type Product, type VitrineContent } from "@/lib/vitrine/types";
import { DailyChart } from "./DailyChart";
import { PERIODS, type EventKind, type Period, type Stats } from "./stats";

type MetricsT = ReturnType<typeof useTranslations<"metrics">>;

/** Espaço entre as seções, um pouco mais curto que o da landing: aqui é leitura de números, não vitrine. */
const block = `mx-auto flex max-w-[1440px] flex-col pt-16 md:pt-24 ${pad}`;
const section = `${block} gap-8`;
/** Duas colunas lado a lado no computador; no celular, uma embaixo da outra com folga entre elas. */
const twoCols = `${block} gap-16 md:grid md:grid-cols-2 lg:gap-24`;

export type MetricsData = {
  /** a vitrine publicada: nomes, fotos e avisos vêm dela */
  vitrine: VitrineContent;
  /** null quando a RPC falhou */
  stats: Stats | null;
  period: Period;
  /** AAAA-MM-DD no horário de Brasília, o mesmo dia da RPC */
  today: string;
  /** posição no ranking de cliques de hoje (1 = primeira); null = fora do ranking; undefined = não deu para ler */
  position?: number | null;
  /** caminho dos links do período (a prévia temporária usa o dela) */
  path?: "/metricas";
};

function Head({ label, title, text }: { label: string; title: string; text?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <span className={`${kicker} text-gold`}>{label}</span>
      <h2 className="m-0 font-display text-[clamp(32px,3.6vw,48px)] leading-[1.05] font-normal">{title}</h2>
      {text && <p className="m-0 max-w-[36rem] text-[16px] leading-relaxed text-mute">{text}</p>}
    </div>
  );
}

/**
 * "↑ 18% vs. 30 dias anteriores". Sem `prev` (migração ainda não aplicada) não aparece nada;
 * sem base anterior, "novo".
 */
function Delta({ cur, prev, period }: { cur: number; prev: number | undefined; period: Period }) {
  const t = useTranslations("metrics");
  if (prev === undefined) return null;
  const vs = t("vsPrevious", { period });
  if (cur === prev) return <span className="text-[13px] text-mute">{t("same", { period })}</span>;
  if (!prev) return <span className="text-[13px] font-medium text-[#1F6B3A]">{t("new", { period })}</span>;
  const change = Math.round(((cur - prev) / prev) * 100);
  const up = cur > prev;
  return (
    <span className={`text-[13px] font-medium ${up ? "text-[#1F6B3A]" : "text-[#A3361B]"}`}>
      <span aria-hidden="true">{up ? "↑" : "↓"} </span>
      <span className="sr-only">{up ? t("up") : t("down")} </span>
      {Math.abs(change) || "<1"}% <span className="font-normal text-mute">{vs}</span>
    </span>
  );
}

function Kpi({ label, value, hint, delta }: { label: string; value: number; hint?: string; delta: ReactNode }) {
  const format = useFormatter();
  return (
    <div className="flex min-w-0 flex-col gap-2 border-sand py-6 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0">
      <dt className={`${kicker} text-[11px] text-mute`}>{label}</dt>
      <dd className="m-0 font-display text-[clamp(52px,5.6vw,84px)] leading-[0.9] lining-nums">{format.number(value)}</dd>
      {hint && <dd className="m-0 text-[14px] text-mute">{hint}</dd>}
      {delta && <dd className="m-0">{delta}</dd>}
    </div>
  );
}

/** Barras horizontais de uma série só: rótulo e número em cima, a barra embaixo. */
function Bars({ rows, empty }: { rows: { label: string; value: number; note?: string }[]; empty: string }) {
  const format = useFormatter();
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.some((r) => r.value)) return <p className="m-0 border-t border-sand py-5 text-[15px] text-mute">{empty}</p>;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-col gap-2.5 border-t border-sand py-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="min-w-0 truncate text-[15px]">{r.label}</span>
            <span className="flex-none text-[15px] whitespace-nowrap tabular-nums">
              <span className="font-display text-[26px] leading-none lining-nums">{format.number(r.value)}</span>
              {r.note && <span className="text-mute"> · {r.note}</span>}
            </span>
          </div>
          <div aria-hidden="true" className="h-1.5 bg-cream">
            <div className="h-full bg-ink" style={{ width: r.value ? `${Math.max(1.5, (r.value / max) * 100)}%` : 0 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Miniatura quadrada sobre o creme, como os cards da home. */
function Thumb({ children }: { children?: ReactNode }) {
  return (
    <div aria-hidden="true" className="relative flex size-16 flex-none items-center justify-center overflow-hidden bg-cream">
      {children}
    </div>
  );
}

function PostThumb({ url }: { url: string }) {
  return (
    <Thumb>
      {/* eslint-disable-next-line @next/next/no-img-element -- foto enviada pela creator para o bucket */}
      <img src={url} alt="" loading="lazy" className="size-full object-cover" />
    </Thumb>
  );
}

type RankRow = { id: string; n: number; thumb: ReactNode; title: string; sub: ReactNode };

/** `unit`: o nome da unidade para o número de cada linha ("clique"/"cliques"). */
function Ranking({ label, title, unit, rows, empty }: { label: string; title: string; unit: (n: number) => string; rows: RankRow[]; empty: string }) {
  const format = useFormatter();
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className={`${kicker} text-[11px] text-gold`}>{label}</span>
        <h3 className="m-0 font-display text-[30px] leading-[1.05] font-normal">{title}</h3>
      </div>
      {rows.length ? (
        <ol className="m-0 flex list-none flex-col p-0">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-4 border-t border-sand py-4">
              <span aria-hidden="true" className="w-4 flex-none font-display text-[20px] text-mute lining-nums">
                {i + 1}
              </span>
              {r.thumb}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-medium">{r.title}</span>
                <span className="truncate text-[13px] text-mute">{r.sub}</span>
              </div>
              <span className="flex flex-none flex-col items-end">
                <span className="font-display text-[28px] leading-none lining-nums">{format.number(r.n)}</span>
                <span className="text-[12px] text-mute">{unit(r.n)}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="m-0 border-t border-sand py-5 text-[15px] text-mute">{empty}</p>
      )}
    </div>
  );
}

type Alert = { key: string; title: string; text: string; href: Href; cta: string; urgent: boolean };

/** Uma aba do editor (`/editor?tab=coupons`). */
const editorTab = (tab: "coupons" | "products"): Href => ({ pathname: "/editor", query: { tab } });

/** O que precisa de atenção na vitrine publicada: os produtos esgotados. */
function alertsOf(v: VitrineContent, t: MetricsT): Alert[] {
  return v.products
    .filter((p) => p.soldOut)
    .map((p): Alert => ({ key: p.id, title: p.name, text: t("alerts.soldOut"), href: editorTab("products"), cta: t("alerts.fix"), urgent: true }));
}

function PeriodTabs({ period, path }: { period: Period; path: "/metricas" }) {
  const t = useTranslations("metrics");
  return (
    <nav aria-label={t("period")} className="flex gap-7 border-b border-sand md:gap-10">
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={{ pathname: path, query: { period: p } }}
          scroll={false}
          aria-current={p === period ? "page" : undefined}
          className={`${kicker} -mb-px flex min-h-12 items-center border-b whitespace-nowrap no-underline ${p === period ? "border-ink text-ink" : "border-transparent text-mute hover:text-ink"}`}
        >
          {t("days", { n: p })}
        </Link>
      ))}
    </nav>
  );
}

function Position({ position, handle }: { position: number | null; handle: string }) {
  const t = useTranslations("metrics.position");
  const lead = position === 1 ? t("youFirst") : t("youNth", { position: position ?? 0 });
  return (
    <div className="flex flex-col gap-6">
      <Head label={t("label")} title={position ? (position === 1 ? t("first") : t("nth", { position })) : t("out")} />
      <p className="m-0 max-w-[32rem] text-[16px] leading-relaxed text-mute">
        {position
          ? // a home mostra as 12 primeiras em "Vitrines do dia"
            position <= 12
            ? t("inHome", { lead })
            : t("almost", { lead })
          : t("notYet")}
      </p>
      <div className="flex flex-wrap gap-2">
        <CopyLinkButton handle={handle} />
      </div>
    </div>
  );
}

function Alerts({ alerts }: { alerts: Alert[] }) {
  const t = useTranslations("metrics.alerts");
  return (
    <div className="flex flex-col gap-6">
      <Head label={t("label")} title={alerts.length ? t("title") : t("allGood")} />
      {alerts.length ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {alerts.map((a) => (
            <li key={a.key} className="flex items-center gap-4 border-t border-sand py-4">
              <span aria-hidden="true" className={`size-2 flex-none rounded-full ${a.urgent ? "bg-[#E8590C]" : "bg-sand ring-1 ring-mute/40"}`} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-medium">{a.title}</span>
                <span className="text-[14px] text-mute">{a.text}</span>
              </div>
              <Link href={a.href} className={`${kicker} flex min-h-11 flex-none items-center text-[11px] text-ink underline underline-offset-4 hover:text-gold`}>
                {a.cta}
                <span className="sr-only">: {a.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 border-t border-sand py-5 text-[15px] text-mute">{t("none")}</p>
      )}
    </div>
  );
}

/**
 * Métricas da vitrine publicada no visual da landing. Recebe tudo pronto (a página cuida da sessão
 * e da leitura), por isso a prévia temporária consegue mostrar com dados de exemplo.
 */
export function MetricsView({ vitrine, stats, period, today, position, path = "/metricas" }: MetricsData) {
  const t = useTranslations("metrics");
  const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "–");
  const total = (k: EventKind) => stats?.totals[k] ?? 0;
  const prev = stats?.previous;
  const prevOf = (...ks: EventKind[]) => (prev ? ks.reduce((s, k) => s + (prev[k] ?? 0), 0) : undefined);

  const products = new Map<string, Product>(vitrine.products.map((p) => [p.id, p]));
  const coupons = new Map<string, Coupon>(vitrine.coupons.map((c) => [c.id, c]));
  const posts = new Map<string, Post>(vitrine.posts.map((p) => [p.id, p]));
  const items = stats?.items ?? [];
  const top = (kind: string) =>
    items
      .filter((i) => i.kind === kind)
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);

  const views = total("view");
  const toStore = total("buy") + total("copy");
  const copied = total("copy");
  const clicks = toStore + total("post") + total("video");
  const alerts = alertsOf(vitrine, t);

  const productRows: RankRow[] = top("buy").map(({ id, n }) => {
    const p = products.get(id);
    return {
      id,
      n,
      thumb: <Thumb>{p && <ProductArt product={p} iconClassName="w-[56%]" strokeWidth={3.6} />}</Thumb>,
      title: p?.name ?? t("removed"),
      sub: p ? p.brand : t("gone"),
    };
  });
  const couponRows: RankRow[] = top("copy").map(({ id, n }) => {
    const c = coupons.get(id);
    return {
      id,
      n,
      thumb: (
        <Thumb>
          {c?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logos vêm de lojas arbitrárias
            <img src={c.logoUrl} alt="" loading="lazy" className="size-full object-contain p-2 mix-blend-multiply" />
          ) : (
            c && <span className="font-display text-[30px] leading-none">{c.brand.slice(0, 1).toUpperCase()}</span>
          )}
        </Thumb>
      ),
      title: c?.brand ?? t("removed"),
      sub: c ? (
        <>
          <span className="font-mono font-bold tracking-[0.06em] text-ink">{c.code}</span> · {couponOff(c)}
        </>
      ) : (
        t("gone")
      ),
    };
  });
  const postRows: RankRow[] = top("post").map(({ id, n }) => {
    const p = posts.get(id);
    const items = p ? postItems(p, vitrine.products) : [];
    return {
      id,
      n,
      thumb: p ? <PostThumb url={p.photoUrl} /> : <Thumb />,
      title: p ? t("postN", { n: vitrine.posts.indexOf(p) + 1 }) : t("removed"),
      sub: p ? t("items", { count: items.length }) : t("gone"),
    };
  });

  return (
    // clip, e não hidden: hidden criaria uma área de rolagem própria
    <div className="overflow-x-clip bg-white text-ink">
      <SiteHeader
        back="/inicio"
        home="/inicio"
        links={[]}
        action={
          <Link href="/editor" aria-label={t("editLabel")} className={`${pillDark} max-md:px-5`}>
            {t("edit")}
            <span className="max-md:hidden">&nbsp;{t("editRest")}</span>
          </Link>
        }
      />

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-10 pt-10 md:gap-14 md:pt-16 ${pad}`}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <span className={`${kicker} text-gold`}>
              {vitrineAddress(vitrine.handle)}
            </span>
            <h1 className="m-0 font-display text-[clamp(48px,6.8vw,100px)] leading-[1] font-normal tracking-[-0.01em]">{t("title")}</h1>
            <p className="m-0 max-w-[34rem] text-[17px] leading-relaxed text-mute">{t("intro", { period })}</p>
          </div>
        </div>
        <PeriodTabs period={period} path={path} />
      </section>

      {!stats ? (
        <section className={section}>
          <p role="alert" className="m-0 bg-cream px-6 py-10 text-center text-[17px]">
            {t("loadFailed")}
          </p>
        </section>
      ) : (
        <>
          <section aria-label={t("summary")} className={`mx-auto max-w-[1440px] pt-8 md:pt-10 ${pad}`}>
            <dl className="m-0 grid grid-cols-2 gap-x-6 border-b border-sand md:grid-cols-4 md:gap-x-0">
              <Kpi label={t("kpi.views")} value={views} delta={<Delta cur={views} prev={prevOf("view")} period={period} />} />
              <Kpi
                label={t("kpi.toStore")}
                value={toStore}
                hint={views ? t("kpi.toStoreHint", { pct: pct(toStore, views) }) : undefined}
                delta={<Delta cur={toStore} prev={prevOf("buy", "copy")} period={period} />}
              />
              <Kpi label={t("kpi.copied")} value={copied} delta={<Delta cur={copied} prev={prevOf("copy")} period={period} />} />
              <Kpi
                label={t("kpi.postsReviews")}
                value={total("post") + total("video")}
                hint={t("kpi.postsReviewsHint")}
                delta={<Delta cur={total("post") + total("video")} prev={prevOf("post", "video")} period={period} />}
              />
            </dl>
          </section>

          {views + clicks === 0 ? (
            <section className={section}>
              <div className="flex flex-col items-center gap-5 bg-sand px-6 py-16 text-center md:py-20">
                <span className={`${kicker} text-gold`}>{t("empty.kicker", { period })}</span>
                <h2 className="m-0 max-w-[18ch] font-display text-[clamp(36px,4.6vw,64px)] leading-[1.04] font-normal text-balance">
                  {t.rich("empty.title", { em: (s) => <em>{s}</em> })}
                </h2>
                <p className="m-0 max-w-[32rem] text-[17px] leading-relaxed text-ink/70">{t("empty.text")}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <CopyLinkButton handle={vitrine.handle} />
                  <Link href={vitrineHref(vitrine.handle)} target="_blank" rel="noopener" className={pillLight}>
                    {t("empty.view")}
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <>
              <section aria-labelledby="por-dia" className={section}>
                <div className="flex flex-col gap-3">
                  <span className={`${kicker} text-gold`}>{t("daily.kicker")}</span>
                  <h2 id="por-dia" className="m-0 font-display text-[clamp(32px,3.6vw,48px)] leading-[1.05] font-normal">
                    {t("daily.title")}
                  </h2>
                </div>
                <DailyChart days={stats.days} period={period} today={today} />
              </section>

              <section className={twoCols}>
                <div className="flex min-w-0 flex-col gap-6">
                  <Head label={t("funnel.label")} title={t("funnel.title")} text={t("funnel.text")} />
                  <Bars
                    empty={t("funnel.empty")}
                    rows={[
                      { label: t("funnel.visited"), value: views },
                      { label: t("funnel.toStore"), value: toStore, note: pct(toStore, views) },
                      { label: t("funnel.copied"), value: copied, note: pct(copied, views) },
                    ]}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-6">
                  <Head label={t("clicks.label")} title={t("clicks.title")} text={t("clicks.text")} />
                  <Bars
                    empty={t("clicks.empty")}
                    rows={[
                      { label: t("clicks.products"), value: total("buy"), note: pct(total("buy"), clicks) },
                      { label: t("clicks.coupons"), value: total("copy"), note: pct(total("copy"), clicks) },
                      { label: t("clicks.posts"), value: total("post"), note: pct(total("post"), clicks) },
                      { label: t("clicks.videos"), value: total("video"), note: pct(total("video"), clicks) },
                    ]}
                  />
                </div>
              </section>

              <section aria-label={t("top.label")} className={`${block} gap-16 md:grid md:grid-cols-2 lg:grid-cols-3 lg:gap-12 xl:gap-16`}>
                <Ranking label={t("top.products")} title={t("top.productsTitle")} unit={(n) => t("unitClicks", { count: n })} rows={productRows} empty={t("top.productsEmpty")} />
                <Ranking label={t("top.coupons")} title={t("top.couponsTitle")} unit={(n) => t("unitCopies", { count: n })} rows={couponRows} empty={t("top.couponsEmpty")} />
                <Ranking
                  label={t("top.posts")}
                  title={t("top.postsTitle")}
                  unit={(n) => t("unitClicks", { count: n })}
                  rows={postRows}
                  empty={vitrine.posts.length ? t("top.postsEmpty") : t("top.noPosts")}
                />
              </section>
            </>
          )}
        </>
      )}

      <section className={twoCols}>
        {position !== undefined && <Position position={position} handle={vitrine.handle} />}
        <Alerts alerts={alerts} />
      </section>

      <p className={`mx-auto max-w-[1440px] pt-14 text-[13px] text-mute ${pad}`}>
        {t("footnote")}
      </p>

      <SiteFooter signedIn />
    </div>
  );
}

/** Quem entrou mas ainda não tem vitrine: não há o que medir, então o convite para criar. */
export function NoVitrine() {
  const t = useTranslations("metrics");
  return (
    <div className="overflow-x-clip bg-white text-ink">
      <SiteHeader back="/inicio" home="/inicio" links={[]} action={null} />
      <section className={`mx-auto max-w-[1440px] pt-16 md:pt-24 ${pad}`}>
        <div className="flex flex-col items-center gap-5 bg-sand px-6 py-20 text-center max-md:py-14">
          <span className={`${kicker} text-gold`}>{t("title")}</span>
          <h1 className="m-0 max-w-[16ch] font-display text-[clamp(40px,5.6vw,76px)] leading-[1.04] font-normal text-balance">
            {t.rich("noVitrine.title", { em: (s) => <em>{s}</em> })}
          </h1>
          <p className="m-0 max-w-[30rem] text-[17px] leading-relaxed text-ink/70">{t("noVitrine.text")}</p>
          <Link href="/criar-vitrine" className={`${pillDark} mt-2`}>
            {t("noVitrine.button")}
          </Link>
          <span className="text-[15px] text-mute">{t("noVitrine.handle", { host: HOST })}</span>
        </div>
      </section>
      <SiteFooter signedIn />
    </div>
  );
}
