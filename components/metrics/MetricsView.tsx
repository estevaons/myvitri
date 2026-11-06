import Link from "next/link";
import type { ReactNode } from "react";
import { kicker, pad, pillDark, pillLight, SiteFooter, SiteHeader } from "@/components/home/chrome";
import { CopyLinkButton } from "@/components/home/CopyLinkButton";
import { ProductArt } from "@/components/storefront/ProductIcon";
import { HOST } from "@/lib/brand";
import { couponOff, couponStatus, daysLeft, ddmm, expiryLabel } from "@/lib/vitrine/pricing";
import type { Coupon, Kit, Product, VitrineContent } from "@/lib/vitrine/types";
import { DailyChart } from "./DailyChart";
import { PERIODS, type EventKind, type Period, type Stats } from "./stats";

const nf = new Intl.NumberFormat("pt-BR");
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "–");
const plural = (n: number, one: string, many: string) => `${nf.format(n)} ${n === 1 ? one : many}`;

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
  path?: string;
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
  if (prev === undefined) return null;
  const vs = `vs. ${period} dias anteriores`;
  if (cur === prev) return <span className="text-[13px] text-mute">= igual aos {period} dias anteriores</span>;
  if (!prev) return <span className="text-[13px] font-medium text-[#1F6B3A]">novo · sem dados nos {period} dias anteriores</span>;
  const change = Math.round(((cur - prev) / prev) * 100);
  const up = cur > prev;
  return (
    <span className={`text-[13px] font-medium ${up ? "text-[#1F6B3A]" : "text-[#A3361B]"}`}>
      <span aria-hidden="true">{up ? "↑" : "↓"} </span>
      <span className="sr-only">{up ? "subiu " : "caiu "}</span>
      {Math.abs(change) || "<1"}% <span className="font-normal text-mute">{vs}</span>
    </span>
  );
}

function Kpi({ label, value, hint, delta }: { label: string; value: number; hint?: string; delta: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 border-sand py-6 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0">
      <dt className={`${kicker} text-[11px] text-mute`}>{label}</dt>
      <dd className="m-0 font-display text-[clamp(52px,5.6vw,84px)] leading-[0.9] lining-nums">{nf.format(value)}</dd>
      {hint && <dd className="m-0 text-[14px] text-mute">{hint}</dd>}
      {delta && <dd className="m-0">{delta}</dd>}
    </div>
  );
}

/** Barras horizontais de uma série só: rótulo e número em cima, a barra embaixo. */
function Bars({ rows, empty }: { rows: { label: string; value: number; note?: string }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.some((r) => r.value)) return <p className="m-0 border-t border-sand py-5 text-[15px] text-mute">{empty}</p>;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-col gap-2.5 border-t border-sand py-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="min-w-0 truncate text-[15px]">{r.label}</span>
            <span className="flex-none text-[15px] whitespace-nowrap tabular-nums">
              <span className="font-display text-[26px] leading-none lining-nums">{nf.format(r.value)}</span>
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

function KitThumb({ items }: { items: Product[] }) {
  if (items.length <= 1) return <Thumb>{items[0] && <ProductArt product={items[0]} iconClassName="w-[56%]" strokeWidth={3.6} />}</Thumb>;
  return (
    <div aria-hidden="true" className="grid size-16 flex-none grid-cols-2 grid-rows-2 gap-px overflow-hidden bg-white">
      {items.slice(0, 4).map((p) => (
        <div key={p.id} className="relative flex items-center justify-center overflow-hidden bg-cream">
          <ProductArt product={p} iconClassName="w-[60%]" strokeWidth={4} />
        </div>
      ))}
    </div>
  );
}

type RankRow = { id: string; n: number; thumb: ReactNode; title: string; sub: ReactNode };

function Ranking({ label, title, unit, rows, empty }: { label: string; title: string; unit: [string, string]; rows: RankRow[]; empty: string }) {
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
                <span className="font-display text-[28px] leading-none lining-nums">{nf.format(r.n)}</span>
                <span className="text-[12px] text-mute">{r.n === 1 ? unit[0] : unit[1]}</span>
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

type Alert = { key: string; title: string; text: string; href: string; cta: string; urgent: boolean };

/**
 * O que precisa de atenção na vitrine publicada. Cupons: o mesmo critério do `couponAlerts` do editor
 * (vence em até 7 dias ou já venceu), que não dá para chamar daqui por ser de um módulo de cliente.
 */
function alertsOf(v: VitrineContent, today: string): Alert[] {
  const coupons = v.coupons.flatMap((c): Alert[] => {
    const name = `Cupom ${c.code} · ${c.brand}`;
    const status = couponStatus(c, today);
    if (status === "agendado")
      return [{ key: c.id, title: name, text: `Agendado: entra na vitrine em ${ddmm(c.startsAt!)}.`, href: "/editor?aba=cupons", cta: "Ver cupom", urgent: false }];
    if (status === "vencido")
      return [{ key: c.id, title: name, text: `Venceu em ${ddmm(c.expiresAt!)} e saiu da vitrine.`, href: "/editor?aba=cupons", cta: "Corrigir", urgent: true }];
    const days = daysLeft(c, today);
    if (days !== null && days <= 7)
      return [{ key: c.id, title: name, text: `${expiryLabel(c, today)}. Confira com a marca se ele continua valendo.`, href: "/editor?aba=cupons", cta: "Corrigir", urgent: true }];
    return [];
  });
  const soldOut = v.products
    .filter((p) => p.soldOut)
    .map((p): Alert => ({ key: p.id, title: p.name, text: "Esgotado: aparece sem o link para a loja.", href: "/editor?aba=produtos", cta: "Corrigir", urgent: true }));
  // os urgentes primeiro; os agendados são só um lembrete
  return [...coupons, ...soldOut].sort((a, b) => Number(b.urgent) - Number(a.urgent));
}

function PeriodTabs({ period, path }: { period: Period; path: string }) {
  return (
    <nav aria-label="Período" className="flex gap-7 border-b border-sand md:gap-10">
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={`${path}?periodo=${p}`}
          scroll={false}
          aria-current={p === period ? "page" : undefined}
          className={`${kicker} -mb-px flex min-h-12 items-center border-b whitespace-nowrap no-underline ${p === period ? "border-ink text-ink" : "border-transparent text-mute hover:text-ink"}`}
        >
          {p} dias
        </Link>
      ))}
    </nav>
  );
}

function Position({ position, handle }: { position: number | null; handle: string }) {
  return (
    <div className="flex flex-col gap-6">
      <Head label="Sua posição hoje" title={position ? (position === 1 ? "A mais clicada do dia" : `${position}ª mais clicada do dia`) : "Fora do ranking de hoje"} />
      <p className="m-0 max-w-[32rem] text-[16px] leading-relaxed text-mute">
        {position
          ? // a home mostra as 12 primeiras em "Vitrines do dia"
            `${position === 1 ? "Você é a vitrine mais clicada hoje" : `Você é a ${position}ª vitrine mais clicada hoje`}${
              position <= 12 ? " e está entre as que aparecem em “Vitrines do dia”, na home." : ". Mais alguns cliques e ela chega a “Vitrines do dia”, na home."
            }`
          : "Sua vitrine ainda não está entre as mais clicadas de hoje. Divulgue o link nos stories e na bio: as vitrines mais clicadas do dia aparecem em “Vitrines do dia”, na home."}
      </p>
      <div className="flex flex-wrap gap-2">
        <CopyLinkButton handle={handle} />
        <Link href="/editor?aba=divulgar" className={pillLight}>
          Divulgar
        </Link>
      </div>
    </div>
  );
}

function Alerts({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="flex flex-col gap-6">
      <Head label="Avisos" title={alerts.length ? "O que merece atenção" : "Tudo em dia"} />
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
        <p className="m-0 border-t border-sand py-5 text-[15px] text-mute">Nenhum cupom vencendo, nenhum produto esgotado.</p>
      )}
    </div>
  );
}

/**
 * Métricas da vitrine publicada no visual da landing. Recebe tudo pronto (a página cuida da sessão
 * e da leitura), por isso a prévia temporária consegue mostrar com dados de exemplo.
 */
export function MetricsView({ vitrine, stats, period, today, position, path = "/metricas" }: MetricsData) {
  const total = (k: EventKind) => stats?.totals[k] ?? 0;
  const prev = stats?.previous;
  const prevOf = (...ks: EventKind[]) => (prev ? ks.reduce((s, k) => s + (prev[k] ?? 0), 0) : undefined);

  const products = new Map<string, Product>(vitrine.products.map((p) => [p.id, p]));
  const coupons = new Map<string, Coupon>(vitrine.coupons.map((c) => [c.id, c]));
  const kits = new Map<string, Kit>(vitrine.kits.map((k) => [k.id, k]));
  const items = stats?.items ?? [];
  const top = (kind: string) =>
    items
      .filter((i) => i.kind === kind)
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);

  const views = total("view");
  const toStore = total("buy") + total("copy");
  const copied = total("copy");
  const clicks = toStore + total("kit") + total("video");
  const alerts = alertsOf(vitrine, today);

  const productRows: RankRow[] = top("buy").map(({ id, n }) => {
    const p = products.get(id);
    return {
      id,
      n,
      thumb: <Thumb>{p && <ProductArt product={p} iconClassName="w-[56%]" strokeWidth={3.6} />}</Thumb>,
      title: p?.name ?? "Item removido",
      sub: p ? p.brand : "não está mais na vitrine",
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
      title: c?.brand ?? "Item removido",
      sub: c ? (
        <>
          <span className="font-mono font-bold tracking-[0.06em] text-ink">{c.code}</span> · {couponOff(c)}
        </>
      ) : (
        "não está mais na vitrine"
      ),
    };
  });
  const kitRows: RankRow[] = top("kit").map(({ id, n }) => {
    const k = kits.get(id);
    const kitItems = k ? k.productIds.map((pid) => products.get(pid)).filter((p): p is Product => !!p) : [];
    return {
      id,
      n,
      thumb: k ? <KitThumb items={kitItems} /> : <Thumb />,
      title: k?.name ?? "Item removido",
      sub: k ? plural(kitItems.length, "item", "itens") : "não está mais na vitrine",
    };
  });

  return (
    // clip, e não hidden: hidden criaria uma área de rolagem própria
    <div className="overflow-x-clip bg-white text-ink">
      <SiteHeader
        back="/inicio"
        links={[]}
        action={
          <Link href="/editor" aria-label="Editar vitrine" className={`${pillDark} max-md:px-5`}>
            Editar<span className="max-md:hidden">&nbsp;vitrine</span>
          </Link>
        }
      />

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-10 pt-10 md:gap-14 md:pt-16 ${pad}`}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <span className={`${kicker} text-gold`}>
              {HOST}/{vitrine.handle}
            </span>
            <h1 className="m-0 font-display text-[clamp(48px,6.8vw,100px)] leading-[1] font-normal tracking-[-0.01em]">Suas métricas</h1>
            <p className="m-0 max-w-[34rem] text-[17px] leading-relaxed text-mute">
              Quem visitou sua vitrine e o que clicou nos últimos {period} dias. Conta só a vitrine publicada: a prévia do editor fica de fora.
            </p>
          </div>
        </div>
        <PeriodTabs period={period} path={path} />
      </section>

      {!stats ? (
        <section className={section}>
          <p role="alert" className="m-0 bg-cream px-6 py-10 text-center text-[17px]">
            Não deu para carregar as métricas agora. Recarregue a página em alguns instantes.
          </p>
        </section>
      ) : (
        <>
          <section aria-label="Resumo do período" className={`mx-auto max-w-[1440px] pt-8 md:pt-10 ${pad}`}>
            <dl className="m-0 grid grid-cols-2 gap-x-6 border-b border-sand md:grid-cols-4 md:gap-x-0">
              <Kpi label="Visitas" value={views} delta={<Delta cur={views} prev={prevOf("view")} period={period} />} />
              <Kpi
                label="Cliques para a loja"
                value={toStore}
                hint={views ? `${pct(toStore, views)} de quem visitou` : undefined}
                delta={<Delta cur={toStore} prev={prevOf("buy", "copy")} period={period} />}
              />
              <Kpi label="Cupons copiados" value={copied} delta={<Delta cur={copied} prev={prevOf("copy")} period={period} />} />
              <Kpi
                label="Kits e reviews"
                value={total("kit") + total("video")}
                hint="compras pelos kits e vídeos abertos"
                delta={<Delta cur={total("kit") + total("video")} prev={prevOf("kit", "video")} period={period} />}
              />
            </dl>
          </section>

          {views + clicks === 0 ? (
            <section className={section}>
              <div className="flex flex-col items-center gap-5 bg-sand px-6 py-16 text-center md:py-20">
                <span className={`${kicker} text-gold`}>Sem visitas nos últimos {period} dias</span>
                <h2 className="m-0 max-w-[18ch] font-display text-[clamp(36px,4.6vw,64px)] leading-[1.04] font-normal text-balance">
                  Coloque o link da vitrine na <em>bio</em>
                </h2>
                <p className="m-0 max-w-[32rem] text-[17px] leading-relaxed text-ink/70">
                  Na bio do Instagram e do TikTok, nos stories e nos vídeos: cada visita e cada clique aparecem aqui no mesmo dia.
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <CopyLinkButton handle={vitrine.handle} />
                  <a href={`/${vitrine.handle}`} target="_blank" rel="noopener" className={pillLight}>
                    Ver vitrine
                  </a>
                </div>
              </div>
            </section>
          ) : (
            <>
              <section aria-labelledby="por-dia" className={section}>
                <div className="flex flex-col gap-3">
                  <span className={`${kicker} text-gold`}>Dia a dia</span>
                  <h2 id="por-dia" className="m-0 font-display text-[clamp(32px,3.6vw,48px)] leading-[1.05] font-normal">
                    Visitas e cliques por dia
                  </h2>
                </div>
                <DailyChart days={stats.days} period={period} today={today} />
              </section>

              <section className={twoCols}>
                <div className="flex min-w-0 flex-col gap-6">
                  <Head label="Funil" title="Da visita à loja" text="Quantas pessoas avançam em cada etapa." />
                  <Bars
                    empty="Aparece quando a vitrine tiver visitas."
                    rows={[
                      { label: "Visitaram a vitrine", value: views },
                      { label: "Clicaram para a loja", value: toStore, note: pct(toStore, views) },
                      { label: "Copiaram um cupom", value: copied, note: pct(copied, views) },
                    ]}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-6">
                  <Head label="Cliques" title="Onde clicam" text="Os cliques em cada parte da vitrine." />
                  <Bars
                    empty="Nenhum clique ainda."
                    rows={[
                      { label: "Produtos", value: total("buy"), note: pct(total("buy"), clicks) },
                      { label: "Cupons", value: total("copy"), note: pct(total("copy"), clicks) },
                      { label: "Kits", value: total("kit"), note: pct(total("kit"), clicks) },
                      { label: "Reviews em vídeo", value: total("video"), note: pct(total("video"), clicks) },
                    ]}
                  />
                </div>
              </section>

              <section aria-label="Mais clicados" className={`${block} gap-16 md:grid md:grid-cols-2 lg:grid-cols-3 lg:gap-12 xl:gap-16`}>
                <Ranking label="Produtos" title="Mais clicados" unit={["clique", "cliques"]} rows={productRows} empty="Nenhum clique em produto ainda." />
                <Ranking label="Cupons" title="Mais copiados" unit={["cópia", "cópias"]} rows={couponRows} empty="Nenhum cupom copiado ainda." />
                <Ranking
                  label="Kits"
                  title="Mais usados"
                  unit={["uso", "usos"]}
                  rows={kitRows}
                  empty={vitrine.kits.length ? "Nenhum kit usado ainda." : "Você ainda não montou nenhum kit."}
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
        Uma visita por pessoa a cada vez que ela abre a vitrine. Os dias seguem o horário de Brasília.
      </p>

      <SiteFooter signedIn />
    </div>
  );
}

/** Quem entrou mas ainda não tem vitrine: não há o que medir, então o convite para criar. */
export function NoVitrine() {
  return (
    <div className="overflow-x-clip bg-white text-ink">
      <SiteHeader back="/inicio" links={[]} action={null} />
      <section className={`mx-auto max-w-[1440px] pt-16 md:pt-24 ${pad}`}>
        <div className="flex flex-col items-center gap-5 bg-sand px-6 py-20 text-center max-md:py-14">
          <span className={`${kicker} text-gold`}>Suas métricas</span>
          <h1 className="m-0 max-w-[16ch] font-display text-[clamp(40px,5.6vw,76px)] leading-[1.04] font-normal text-balance">
            Crie sua vitrine para ver os <em>cliques</em>
          </h1>
          <p className="m-0 max-w-[30rem] text-[17px] leading-relaxed text-ink/70">
            Junte num link só os cupons e produtos que você indica. Cada visita e cada clique aparecem aqui.
          </p>
          <Link href="/criar-vitrine" className={`${pillDark} mt-2`}>
            Criar minha vitrine
          </Link>
          <span className="text-[15px] text-mute">{HOST}/seunome</span>
        </div>
      </section>
      <SiteFooter signedIn />
    </div>
  );
}
