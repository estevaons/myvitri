"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { kicker } from "@/components/home/chrome";
import { ddmm } from "@/lib/vitrine/pricing";
import type { Stats } from "./stats";

/**
 * Duas séries que se distinguem pela claridade (tinta e um dourado claro), não só pelo tom:
 * continuam separáveis para quem não enxerga cores, e as duas passam de 3:1 no fundo branco.
 */
const SERIES = { views: { label: "visitsCol", color: "#111111" }, clicks: { label: "clicksCol", color: "#B07D3A" } } as const;

/** Teto "redondo" do eixo: 1, 2, 5, 10, 20, 50… */
function niceMax(n: number) {
  if (n <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(n));
  return [1, 2, 5, 10].map((m) => m * step).find((v) => v >= n)!;
}

/**
 * Visitas e cliques por dia: duas linhas num eixo só (as duas são contagens),
 * com legenda, linha-guia e dica ao passar o mouse, e a tabela para quem precisar.
 */
export function DailyChart({ days, period, today }: { days: Stats["days"]; period: number; today: string }) {
  const t = useTranslations("metrics.chart");
  const format = useFormatter();
  const locale = useLocale();
  const nf = { format: (n: number) => format.number(n) };
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-6 text-[14px] text-ink">
        {(["views", "clicks"] as const).map((k) => (
          <span key={k} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-[3px] w-5" style={{ background: SERIES[k].color }} />
            {t(SERIES[k].label)}
          </span>
        ))}
      </div>
      <div className="flex gap-3">
        <div aria-hidden="true" className="flex h-56 w-8 flex-none flex-col justify-between text-right text-[12px] text-mute tabular-nums md:h-72">
          <span className="-translate-y-1/2">{nf.format(top)}</span>
          <span className="-translate-y-1/2">{nf.format(top / 2)}</span>
          <span className="translate-y-1/2">0</span>
        </div>
        <div
          className="relative h-56 min-w-0 flex-1 md:h-72"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover(Math.min(period - 1, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * (period - 1)))));
          }}
          onPointerLeave={() => setHover(null)}
        >
          <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {[0, 50, 100].map((g) => (
              <line key={g} x1="0" x2="100" y1={g} y2={g} stroke="#ECE6DC" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            {!empty && <path d={`${line("views")}L100,100L0,100Z`} fill="#ECE6DC" opacity="0.6" />}
            {!empty &&
              (["views", "clicks"] as const).map((k) => (
                <path key={k} d={line(k)} fill="none" stroke={SERIES[k].color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              ))}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1="0" y2="100" stroke="#6B665E" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
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
              className="pointer-events-none absolute -top-2 z-10 flex -translate-y-full flex-col gap-0.5 bg-ink px-3 py-2 text-[13px] whitespace-nowrap text-white"
              style={hover! > period / 2 ? { right: `${100 - x(hover!)}%` } : { left: `${x(hover!)}%` }}
            >
              <span className="font-medium">{ddmm(shown.day, locale)}</span>
              <span>
                {t("visits", { count: shown.views })} · {t("clicks", { count: shown.clicks })}
              </span>
            </div>
          )}
          {empty && <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[15px] text-mute">{t("empty")}</span>}
        </div>
      </div>
      <div className="flex justify-between pl-11 text-[12px] text-mute tabular-nums">
        <span>{ddmm(series[0].day, locale)}</span>
        <span>{ddmm(series[Math.floor(period / 2)].day, locale)}</span>
        <span>{t("today")}</span>
      </div>
      {!empty && (
        <details className="text-[14px]">
          <summary className={`${kicker} cursor-pointer py-2 text-[11px] text-mute hover:text-ink`}>{t("table")}</summary>
          <table className="mt-2 w-full max-w-xl border-collapse tabular-nums">
            <thead>
              <tr className="text-left text-mute">
                <th className="py-1.5 font-medium">{t("day")}</th>
                <th className="py-1.5 text-right font-medium">{t("visitsCol")}</th>
                <th className="py-1.5 text-right font-medium">{t("clicksCol")}</th>
              </tr>
            </thead>
            <tbody>
              {series
                .filter((d) => d.views || d.clicks)
                .reverse()
                .map((d) => (
                  <tr key={d.day} className="border-t border-sand">
                    <td className="py-1.5">{ddmm(d.day, locale)}</td>
                    <td className="py-1.5 text-right">{nf.format(d.views)}</td>
                    <td className="py-1.5 text-right">{nf.format(d.clicks)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
