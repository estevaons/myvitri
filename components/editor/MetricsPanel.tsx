"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { statsAction, type Stats } from "@/app/actions";
import { ddmm } from "@/lib/vitrine/pricing";
import type { VitrineContent } from "@/lib/vitrine/types";
import { Empty, H, Hint, Segmented } from "./ui";

const PERIODS: ["7" | "30" | "90", string][] = [
  ["7", "7 dias"],
  ["30", "30 dias"],
  ["90", "90 dias"],
];

/** Duas séries com cor própria (validadas para daltonismo e contraste no fundo branco). */
const SERIES = { views: { label: "Visitas", color: "#2A78D6" }, clicks: { label: "Cliques", color: "#EB6834" } };
/** Barras de uma série só usam a cor da primeira. */
const BAR = SERIES.views.color;

const nf = new Intl.NumberFormat("pt-BR");
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "–");

/** Teto "redondo" do eixo: 1, 2, 5, 10, 20, 50… */
function niceMax(n: number) {
  if (n <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(n));
  return [1, 2, 5, 10].map((m) => m * step).find((v) => v >= n)!;
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] bg-[#F7F6F3] p-3.5">
      <span className="text-[13px] font-semibold text-[#5E5A52]">{label}</span>
      <span className="text-[28px] leading-none font-bold tracking-[-0.02em] tabular-nums">{value}</span>
      {hint && <span className="text-xs text-[#5E5A52]">{hint}</span>}
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-[#EEEBE5] p-3.5">
      <div className="flex flex-col gap-0.5">
        <H>{title}</H>
        {sub && <Hint>{sub}</Hint>}
      </div>
      {children}
    </section>
  );
}

/** Barras horizontais de uma série: rótulo em cima, valor na ponta. */
function HBars({ rows, empty }: { rows: { label: string; value: number; note?: string }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.some((r) => r.value)) return <p className="m-0 py-2 text-[13px] text-[#5E5A52]">{empty}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-col gap-1" title={`${r.label}: ${nf.format(r.value)}${r.note ? ` (${r.note})` : ""}`}>
          <span className="truncate text-[13px] font-semibold">{r.label}</span>
          <div className="flex items-center gap-2">
            <div className="h-3 min-w-0 flex-1">
              <div className="h-full rounded-r-[4px]" style={{ width: r.value ? `${Math.max(2, (r.value / max) * 100)}%` : 0, background: BAR }} />
            </div>
            <span className="w-[92px] flex-none text-right text-[13px] whitespace-nowrap tabular-nums">
              {nf.format(r.value)}
              {r.note && <span className="text-[#5E5A52]"> · {r.note}</span>}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Visitas e cliques por dia: duas linhas num eixo só (as duas são contagens),
 * com legenda, linha-guia e dica ao passar o mouse, e a tabela para quem precisar.
 */
function DailyChart({ days, period, today }: { days: Stats["days"]; period: number; today: string }) {
  const [hover, setHover] = useState<number | null>(null);
  // completa os dias sem nenhum evento com zero, para o eixo do tempo não pular
  const byDay = new Map(days.map((d) => [d.day, d]));
  const series = Array.from({ length: period }, (_, i) => {
    const day = new Date(Date.parse(today) - (period - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return byDay.get(day) ?? { day, views: 0, clicks: 0 };
  });
  const top = niceMax(Math.max(...series.map((d) => Math.max(d.views, d.clicks))));
  const x = (i: number) => (i / (period - 1)) * 100;
  const y = (v: number) => 100 - (v / top) * 100;
  const line = (k: "views" | "clicks") => series.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d[k])}`).join("");
  const empty = series.every((d) => !d.views && !d.clicks);
  const shown = hover !== null ? series[hover] : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-xs text-[#3A3A3A]">
        {(["views", "clicks"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-[3px] w-3.5 rounded-full" style={{ background: SERIES[k].color }} />
            {SERIES[k].label}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <div aria-hidden="true" className="flex h-32 flex-col justify-between text-right text-[11px] text-[#5E5A52] tabular-nums">
          <span className="-translate-y-1/2">{nf.format(top)}</span>
          <span className="-translate-y-1/2">{nf.format(top / 2)}</span>
          <span className="translate-y-1/2">0</span>
        </div>
        <div
          className="relative h-32 min-w-0 flex-1"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover(Math.round(((e.clientX - r.left) / r.width) * (period - 1)));
          }}
          onPointerLeave={() => setHover(null)}
        >
          <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {[0, 50, 100].map((g) => (
              <line key={g} x1="0" x2="100" y1={g} y2={g} stroke="#EEEBE5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            {!empty && <path d={`${line("views")}L100,100L0,100Z`} fill={SERIES.views.color} opacity="0.1" />}
            {!empty && (["views", "clicks"] as const).map((k) => (
              <path key={k} d={line(k)} fill="none" stroke={SERIES[k].color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            ))}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1="0" y2="100" stroke="#B8B1A6" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
          </svg>
          {shown &&
            (["views", "clicks"] as const).map((k) => (
              <span
                key={k}
                aria-hidden="true"
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                style={{ left: `${x(hover!)}%`, top: `${y(shown[k])}%`, background: SERIES[k].color }}
              />
            ))}
          {shown && (
            <div
              className="pointer-events-none absolute -top-2 z-10 flex -translate-y-full flex-col gap-0.5 rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
              style={hover! > period / 2 ? { right: `${100 - x(hover!)}%` } : { left: `${x(hover!)}%` }}
            >
              <span className="font-bold">{ddmm(shown.day)}</span>
              <span>
                {nf.format(shown.views)} visitas · {nf.format(shown.clicks)} cliques
              </span>
            </div>
          )}
          {empty && (
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[13px] text-[#5E5A52]">Sem visitas neste período</span>
          )}
        </div>
      </div>
      <div className="flex justify-between pl-7 text-[11px] text-[#5E5A52] tabular-nums">
        <span>{ddmm(series[0].day)}</span>
        <span>{ddmm(series[Math.floor(period / 2)].day)}</span>
        <span>hoje</span>
      </div>
      {!empty && (
        <details className="text-[13px]">
          <summary className="cursor-pointer py-1 font-semibold text-[#5E5A52]">Ver como tabela</summary>
          <table className="mt-1 w-full border-collapse tabular-nums">
            <thead>
              <tr className="text-left text-[#5E5A52]">
                <th className="py-1 font-semibold">Dia</th>
                <th className="py-1 text-right font-semibold">Visitas</th>
                <th className="py-1 text-right font-semibold">Cliques</th>
              </tr>
            </thead>
            <tbody>
              {series
                .filter((d) => d.views || d.clicks)
                .reverse()
                .map((d) => (
                  <tr key={d.day} className="border-t border-[#EEEBE5]">
                    <td className="py-1">{ddmm(d.day)}</td>
                    <td className="py-1 text-right">{nf.format(d.views)}</td>
                    <td className="py-1 text-right">{nf.format(d.clicks)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

export function MetricsPanel({ draft, today }: { draft: VitrineContent; today: string }) {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const [result, setResult] = useState<Awaited<ReturnType<typeof statsAction>> | null>(null);
  const [loading, startLoading] = useTransition();

  useEffect(() => {
    startLoading(async () => setResult(await statsAction(Number(period))));
  }, [period]);

  const stats = result?.ok ? result.stats : null;
  const total = (k: keyof Stats["totals"]) => stats?.totals[k] ?? 0;
  const views = total("view");
  const toStore = total("buy") + total("copy");
  const copied = total("copy") + total("buy");

  const names = new Map<string, string>([
    ...draft.products.map((p) => [p.id, p.name] as const),
    ...draft.coupons.map((c) => [c.id, `${c.code} · ${c.brand}`] as const),
    ...draft.kits.map((k) => [k.id, k.name] as const),
  ]);
  const top = (kind: string) =>
    (stats?.items ?? [])
      .filter((i) => i.kind === kind)
      .sort((a, b) => b.n - a.n)
      .slice(0, 5)
      .map((i) => ({ label: names.get(i.id) ?? "Item removido", value: i.n }));

  return (
    <div className="flex flex-col gap-[18px]">
      <Segmented label="Período" options={PERIODS} value={period} onChange={setPeriod} />
      {result && !result.ok && <Empty>{result.error}</Empty>}
      {!result && loading && <Empty>Carregando…</Empty>}
      {stats && (
        <div className={`flex flex-col gap-[18px] transition-opacity ${loading ? "opacity-50" : ""}`}>
          <div className="grid grid-cols-2 gap-2">
            <Tile label="Visitas" value={nf.format(views)} />
            <Tile label="Cliques para a loja" value={nf.format(toStore)} hint={views ? `${pct(toStore, views)} de quem visitou` : undefined} />
            <Tile label="Cupons copiados" value={nf.format(copied)} hint="nos cupons e nos produtos" />
            <Tile label="Kits e reviews" value={nf.format(total("kit") + total("video"))} />
          </div>

          {views + toStore === 0 && (
            <Empty>Ainda não há visitas neste período. Publique a vitrine e coloque o link na bio: cada visita e clique aparece nos gráficos abaixo.</Empty>
          )}

          <Card title="Visitas e cliques por dia">
            <DailyChart days={stats.days} period={Number(period)} today={today} />
          </Card>

          <Card title="Da visita à loja" sub="Quantas pessoas avançam em cada etapa.">
            <HBars
              empty="Aparece quando a vitrine tiver visitas."
              rows={[
                { label: "Visitaram a vitrine", value: views },
                { label: "Clicaram para a loja", value: toStore, note: pct(toStore, views) },
                { label: "Copiaram um cupom", value: copied, note: pct(copied, views) },
              ]}
            />
          </Card>

          <Card title="Onde clicam" sub="Cliques em cada parte da vitrine.">
            <HBars
              empty="Nenhum clique ainda."
              rows={[
                { label: "Produtos", value: total("buy") },
                { label: "Cupons", value: total("copy") },
                { label: "Kits", value: total("kit") },
                { label: "Reviews em vídeo", value: total("video") },
              ]}
            />
          </Card>

          {toStore + total("kit") + total("video") > 0 && (
            <>
              <Card title="Produtos mais clicados">
                <HBars rows={top("buy")} empty="Nenhum clique em produto ainda." />
              </Card>
              <Card title="Cupons mais copiados">
                <HBars rows={top("copy")} empty="Nenhum cupom copiado ainda." />
              </Card>
              {draft.kits.length > 0 && (
                <Card title="Kits mais usados">
                  <HBars rows={top("kit")} empty="Nenhum kit usado ainda." />
                </Card>
              )}
            </>
          )}

          <Hint>Conta só a vitrine publicada; a prévia aqui do editor não entra nos números. Uma visita por pessoa a cada vez que abre a página.</Hint>
        </div>
      )}
    </div>
  );
}
