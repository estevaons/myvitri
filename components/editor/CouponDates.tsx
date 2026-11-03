"use client";

import { useEffect, useId, useRef, useState } from "react";
import { boxCls, labelCls } from "./ui";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

// Datas como AAAA-MM-DD, calculadas em UTC para o fuso não mudar o dia.
const parts = (s: string) => s.split("-").map(Number) as [number, number, number];
const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
const addDays = (s: string, n: number) => {
  const [y, m, d] = parts(s);
  return iso(y, m - 1, d + n);
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** "8 nov", ou "8 nov 2027" fora do ano de hoje. */
function short(s: string, today: string) {
  const [y, m, d] = parts(s);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}${y === parts(today)[0] ? "" : ` ${y}`}`;
}

function fromToday(s: string, today: string) {
  const n = daysBetween(today, s);
  if (n < 0) return "já passou";
  if (n === 0) return "hoje";
  if (n === 1) return "amanhã";
  return `em ${n} dias`;
}

/** Calendário de um mês; tocar num dia escolhe. Setas do teclado andam pelos dias. */
function Calendar({ today, value, min, onPick }: { today: string; value: string | null; min: string; onPick: (day: string) => void }) {
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
        <button type="button" aria-label="Mês anterior" onClick={() => shiftView(-1)} className={arrow}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span aria-live="polite" className="text-sm font-semibold capitalize">
          {MONTHS[vm - 1]} {vy}
        </span>
        <button type="button" aria-label="Próximo mês" onClick={() => shiftView(1)} className={arrow}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
      <div ref={grid} className="grid grid-cols-7 gap-y-0.5">
        {WEEKDAYS.map((w, i) => (
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
                aria-label={`${i + 1} de ${MONTHS[vm - 1]} de ${vy}${day === today ? ", hoje" : ""}`}
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
            <div role="group" aria-label="Atalhos" className="flex flex-wrap gap-1.5">
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
  const scheduled = !!start && start > today;
  const from = scheduled ? start : today;

  return (
    <div className="flex flex-col gap-2">
      <DateField
        label="Vale até"
        today={today}
        value={end}
        min={from}
        summary={end ? `${short(end, today)} · ${end < today ? "já venceu" : `vence ${fromToday(end, today)}`}` : "Sem validade"}
        options={[
          ["Sem validade", null],
          ["7 dias", addDays(from, 7)],
          ["15 dias", addDays(from, 15)],
          ["30 dias", addDays(from, 30)],
        ]}
        onChange={(day) => onChange(start, day)}
      />
      {scheduled && (
        <p className="m-0 flex flex-wrap items-center gap-x-2 rounded-[10px] bg-[#F4F2EE] px-3 py-2 text-xs leading-snug text-[#5E5A52]">
          Só entra na vitrine em {short(start, today)}.
          <button type="button" onClick={() => onChange(null, end)} className="min-h-6 border-0 bg-transparent p-0 text-xs font-semibold text-ink underline underline-offset-2">
            Começar agora
          </button>
        </p>
      )}
    </div>
  );
}
