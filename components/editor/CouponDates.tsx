"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { boxCls, labelCls } from "./ui";

/** Nomes de mês e dia da semana no idioma da página. As datas são AAAA-MM-DD, lidas em UTC. */
const utc = (s: string) => new Date(`${s}T00:00:00Z`);
const fmt = (locale: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...o, timeZone: "UTC" });
/** Iniciais dos dias, de domingo a sábado (5 de jan. de 2025 foi um domingo). */
const weekdays = (locale: string) => Array.from({ length: 7 }, (_, i) => fmt(locale, { weekday: "narrow" }).format(utc(`2025-01-0${5 + i}`)));

// Datas como AAAA-MM-DD, calculadas em UTC para o fuso não mudar o dia.
const parts = (s: string) => s.split("-").map(Number) as [number, number, number];
const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
const addDays = (s: string, n: number) => {
  const [y, m, d] = parts(s);
  return iso(y, m - 1, d + n);
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** "8 nov" ("Nov 8" em inglês), ou "8 nov 2027" fora do ano de hoje. */
function short(s: string, today: string, locale: string) {
  const [y, , d] = parts(s);
  const month = fmt(locale, { month: "short" }).format(utc(s)).replace(".", "");
  const day = locale.startsWith("pt") ? `${d} ${month}` : `${month} ${d}`;
  return y === parts(today)[0] ? day : `${day} ${y}`;
}

type DatesT = ReturnType<typeof useTranslations<"editor.dates">>;

function fromToday(s: string, today: string, t: DatesT) {
  const n = daysBetween(today, s);
  if (n < 0) return t("past");
  if (n === 0) return t("today");
  if (n === 1) return t("tomorrow");
  return t("inDays", { n });
}

/** Calendário de um mês; tocar num dia escolhe. Setas do teclado andam pelos dias. */
function Calendar({ today, value, min, onPick }: { today: string; value: string | null; min: string; onPick: (day: string) => void }) {
  const t = useTranslations("editor.dates");
  const locale = useLocale();
  const [view, setView] = useState(() => (value ?? min).slice(0, 7));
  const [focus, setFocus] = useState(value ?? min);
  const grid = useRef<HTMLDivElement>(null);
  const keyNav = useRef(false);

  useEffect(() => {
    if (!keyNav.current) return;
    keyNav.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus();
  }, [focus, view]);

  const [vy, vm] = parts(`${view}-01`);
  const first = new Date(Date.UTC(vy, vm - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(vy, vm, 0)).getUTCDate();
  const shiftView = (n: number) => setView(iso(vy, vm - 1 + n, 1).slice(0, 7));
  const arrow = "flex size-8 items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#5E5A52] hover:bg-[#F4F2EE]";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button type="button" aria-label={t("prevMonth")} onClick={() => shiftView(-1)} className={arrow}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span aria-live="polite" className="text-sm font-semibold capitalize">
          {fmt(locale, { month: "long", year: "numeric" }).format(utc(`${view}-01`))}
        </span>
        <button type="button" aria-label={t("nextMonth")} onClick={() => shiftView(1)} className={arrow}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
      <div ref={grid} className="grid grid-cols-7 gap-y-0.5">
        {weekdays(locale).map((w, i) => (
          <span key={i} aria-hidden="true" className="pb-1 text-center text-[11px] font-medium text-[#ADA79C]">
            {w}
          </span>
        ))}
        {Array.from({ length: first }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day = iso(vy, vm - 1, i + 1);
          const picked = day === value;
          const tabbable = day === focus || (!focus.startsWith(view) && i === 0);
          return (
            <div key={day} className="flex justify-center">
              <button
                type="button"
                data-day={day}
                disabled={day < min}
                tabIndex={tabbable ? 0 : -1}
                aria-pressed={picked}
                aria-label={t("dayLabel", { date: fmt(locale, { dateStyle: "long" }).format(utc(day)), isToday: day === today ? "yes" : "no" })}
                onClick={() => onPick(day)}
                onKeyDown={(e) => {
                  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
                  if (!step) return;
                  e.preventDefault();
                  const next = addDays(day, step);
                  keyNav.current = true;
                  setFocus(next);
                  setView(next.slice(0, 7));
                }}
                className={`relative flex size-9 items-center justify-center rounded-full border-0 p-0 text-[13px] tabular-nums transition-colors disabled:opacity-30 ${
                  picked ? "bg-ink font-semibold text-white" : "bg-transparent text-ink enabled:hover:bg-[#F4F2EE]"
                } ${day === today && !picked ? "font-semibold after:absolute after:bottom-1 after:size-1 after:rounded-full after:bg-[#E8590C]" : ""}`}
              >
                {i + 1}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Campo de uma data: mostra o resumo e abre atalhos + calendário logo abaixo. */
function DateField({
  label,
  summary,
  today,
  value,
  min,
  options,
  onChange,
}: {
  label: string;
  summary: string;
  today: string;
  value: string | null;
  min: string;
  options: [string, string | null][];
  onChange: (day: string | null) => void;
}) {
  const t = useTranslations("editor.dates");
  const [open, setOpen] = useState(false);
  const id = useId();
  const choose = (day: string | null) => {
    onChange(day);
    setOpen(false);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className={labelCls}>
        {label}
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-labelledby={`${id} ${id}-v`}
        onClick={() => setOpen(!open)}
        className={`flex h-11 w-full items-center gap-2.5 px-3 text-left text-[15px] font-normal text-ink ${boxCls} ${open ? "border-[#B9B2A6] bg-white" : ""}`}
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-[#8F897E]">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span id={`${id}-v`} className="min-w-0 flex-1 truncate">
          {summary}
        </span>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`flex-none text-[#8F897E] transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="flex flex-col gap-3 rounded-[12px] border border-[#EEEBE5] bg-white p-3 shadow-[0_4px_16px_rgba(17,17,17,0.06)]">
          {options.length > 0 && (
            <div role="group" aria-label={t("shortcuts")} className="flex flex-wrap gap-1.5">
              {options.map(([text, day]) => (
                <button
                  key={text}
                  type="button"
                  aria-pressed={value === day}
                  onClick={() => choose(day)}
                  className={`min-h-8 rounded-full border px-3 text-xs font-medium transition-colors ${
                    value === day ? "border-ink bg-ink text-white" : "border-[#E6E2DA] bg-white text-[#5E5A52] hover:border-[#B9B2A6] hover:text-ink"
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
          )}
          <Calendar today={today} value={value} min={min} onPick={choose} />
        </div>
      )}
    </div>
  );
}

/**
 * Validade do cupom: um campo de data só. Sem data, o cupom não expira.
 * Cupons novos já valem ao cadastrar; um início agendado só aparece em cupons antigos, com aviso.
 */
export function CouponDates({
  today,
  start,
  end,
  onChange,
}: {
  today: string;
  start: string | null;
  end: string | null;
  onChange: (start: string | null, end: string | null) => void;
}) {
  const t = useTranslations("editor.dates");
  const locale = useLocale();
  const scheduled = !!start && start > today;
  const from = scheduled ? start : today;

  return (
    <div className="flex flex-col gap-2">
      <DateField
        label={t("until")}
        today={today}
        value={end}
        min={from}
        summary={end ? `${short(end, today, locale)} · ${end < today ? t("expired") : t("expires", { when: fromToday(end, today, t) })}` : t("noExpiry")}
        options={[
          [t("noExpiry"), null],
          [t("days", { n: 7 }), addDays(from, 7)],
          [t("days", { n: 15 }), addDays(from, 15)],
          [t("days", { n: 30 }), addDays(from, 30)],
        ]}
        onChange={(day) => onChange(start, day)}
      />
      {scheduled && (
        <p className="m-0 flex flex-wrap items-center gap-x-2 rounded-[10px] bg-[#F4F2EE] px-3 py-2 text-xs leading-snug text-[#5E5A52]">
          {t("scheduled", { date: short(start, today, locale) })}
          <button type="button" onClick={() => onChange(null, end)} className="min-h-6 border-0 bg-transparent p-0 text-xs font-semibold text-ink underline underline-offset-2">
            {t("startNow")}
          </button>
        </p>
      )}
    </div>
  );
}
