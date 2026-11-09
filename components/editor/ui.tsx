"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { centsToInput, parseBRL } from "@/lib/vitrine/pricing";

/** Borda e foco dos campos; também usado em caixas que embrulham um input (ex.: o link). */
export const boxCls =
  "rounded-[10px] border border-[#E6E2DA] bg-[#FAF9F7] transition-[border-color,background-color,box-shadow] hover:border-[#D6D0C5] focus:border-[#B9B2A6] focus:bg-white focus:shadow-[0_0_0_3px_rgba(17,17,17,0.06)] focus-within:border-[#B9B2A6] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(17,17,17,0.06)]";

export const inputCls = `h-11 w-full box-border px-3 text-[15px] font-normal text-ink outline-none placeholder:text-[#ADA79C] ${boxCls}`;

export const labelCls = "text-[13px] font-medium text-[#3A3A3A]";

export const newId = () => crypto.randomUUID();

export function H({ children }: { children: ReactNode }) {
  return <h2 className="m-0 text-[15px] font-semibold">{children}</h2>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <span className="text-xs leading-snug font-normal text-[#77726A]">{children}</span>;
}

/** Seção de um painel: título curto e os campos logo abaixo. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="m-0 text-[11px] font-semibold tracking-[0.08em] text-[#8F897E] uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function Field({ label, hint, count, children }: { label: string; hint?: ReactNode; count?: [number, number]; children: ReactNode }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${labelCls}`}>
      <span className="flex items-baseline justify-between gap-2">
        {label}
        {count && (
          <span className={`text-[11px] font-normal tabular-nums ${count[0] >= count[1] ? "text-[#A3361B]" : "text-[#ADA79C]"}`}>
            {count[0]}/{count[1]}
          </span>
        )}
      </span>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className={rest.className ?? inputCls} />;
}

/** Preço em reais digitado livremente ("189,90"), guardado em centavos. */
export function MoneyInput({ cents, onChange }: { cents: number; onChange: (cents: number) => void }) {
  const t = useTranslations("editor.ui");
  const locale = useLocale();
  const [text, setText] = useState(cents ? centsToInput(cents, locale) : "");
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] font-normal text-[#8F897E]">R$</span>
      <input
        inputMode="decimal"
        value={text}
        placeholder={t("moneyPlaceholder")}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseBRL(e.target.value, locale) ?? 0);
        }}
        onBlur={() => setText(cents ? centsToInput(cents, locale) : "")}
        className={`${inputCls} pl-10`}
      />
    </div>
  );
}

/** Porcentagem de 1 a 100. O texto fica livre enquanto digita (apagar não vira "1"); só ajusta ao sair do campo. */
export function PercentInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const t = useTranslations("editor.ui");
  const [text, setText] = useState(String(value));
  return (
    <div className="relative">
      <input
        inputMode="numeric"
        aria-label={t("percentLabel")}
        value={text}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
          setText(digits);
          const n = Number(digits);
          if (n >= 1) onChange(Math.min(100, n));
        }}
        onBlur={() => setText(String(value))}
        className={`${inputCls} pr-9`}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[15px] font-normal text-[#8F897E]">%</span>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-[3px] rounded-[10px] bg-[#F4F2EE] p-[3px]"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          aria-pressed={id === value}
          onClick={() => onChange(id)}
          className={`min-h-[38px] rounded-[8px] border-0 text-[13px] transition-colors ${
            id === value ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "bg-transparent font-medium text-[#77726A] hover:text-ink"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className="flex h-11 w-[60px] flex-none items-center justify-center border-0 bg-transparent p-0"
    >
      <span aria-hidden="true" className={`relative block h-7 w-12 rounded-full transition-colors ${on ? "bg-ink" : "bg-[#CFCAC0]"}`}>
        <span
          className="absolute top-[3px] size-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-[left]"
          style={{ left: on ? 23 : 3 }}
        />
      </span>
    </button>
  );
}

/**
 * Arrastar para reordenar pela alça da linha. Usa pointer events (mouse e toque; o arrastar
 * nativo do HTML não funciona no celular) e, com a alça focada, as setas do teclado.
 */
export function useDragSort(onMove: (from: number, to: number) => void) {
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  // a ref vale já no evento seguinte; o estado só depois de renderizar (arrasto rápido perderia o início)
  const drag = useRef<{ from: number; over: number } | null>(null);
  const end = () => {
    drag.current = null;
    setFrom(null);
    setOver(null);
  };
  return {
    from,
    over,
    handle: (i: number, total: number) => ({
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { from: i, over: i };
        setFrom(i);
        setOver(i);
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        if (!drag.current) return;
        const row = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-sort-index]");
        if (row) {
          drag.current.over = Number(row.dataset.sortIndex);
          setOver(drag.current.over);
        }
        // perto da borda da lista, rola junto
        const box = e.currentTarget.closest("aside");
        if (box) {
          const r = box.getBoundingClientRect();
          if (e.clientY < r.top + 80) box.scrollBy(0, -12);
          else if (e.clientY > r.bottom - 60) box.scrollBy(0, 12);
        }
      },
      onPointerUp: () => {
        const d = drag.current;
        if (d && d.over !== d.from) onMove(d.from, d.over);
        end();
      },
      onPointerCancel: end,
      onKeyDown: (e: React.KeyboardEvent) => {
        const to = i + (e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0);
        if (to === i) return;
        e.preventDefault();
        if (to >= 0 && to < total) onMove(i, to);
      },
    }),
  };
}
export type DragSort = ReturnType<typeof useDragSort>;

export function reorder<T>(list: T[], from: number, to: number) {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Linha de lista reordenável; clicar no corpo abre a edição. */
export function Row({
  pos,
  title,
  sub,
  badge,
  thumb,
  open,
  onOpen,
  total,
  sort,
  children,
}: {
  pos: number;
  title: string;
  sub?: string;
  badge?: ReactNode;
  thumb: ReactNode;
  open: boolean;
  onOpen: () => void;
  total: number;
  sort: DragSort;
  children?: ReactNode;
}) {
  const t = useTranslations("editor.ui");
  const i = pos - 1;
  // Ao abrir (inclusive um item recém-adicionado no fim da lista), rola só o
  // necessário para o formulário aparecer; se ele for maior que a tela, alinha o topo.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);
  return (
    <div
      ref={ref}
      data-sort-index={i}
      className={`scroll-mt-16 scroll-mb-5 rounded-[14px] border ${
        sort.from !== null && sort.over === i && sort.from !== i ? "border-dashed border-[#8F897E] bg-[#FAF9F7]" : open ? "border-[#DDD8CF] shadow-[0_4px_16px_rgba(17,17,17,0.06)]" : "border-[#EEEBE5] hover:border-[#DDD8CF]"
      } ${sort.from === i ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2.5 p-1.5">
        <button
          type="button"
          {...sort.handle(i, total)}
          aria-label={t("move", { title, pos, total })}
          title={t("drag")}
          className={`flex min-h-11 w-6 flex-none touch-none items-center justify-center rounded-lg border-0 bg-transparent p-0 text-[#B8B1A6] transition-colors hover:text-[#5E5A52] focus-visible:text-[#5E5A52] ${
            sort.from === i ? "cursor-grabbing text-[#5E5A52]" : "cursor-grab"
          }`}
        >
          <svg aria-hidden="true" width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            {[2, 7, 12].flatMap((y) => [2.5, 7.5].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.1" />))}
          </svg>
        </button>
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2.5 border-0 bg-transparent p-0 text-left"
        >
          {thumb}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{title}</span>
            {sub && <span className="truncate text-xs text-[#77726A]">{sub}</span>}
          </span>
          {badge && <span className="ml-auto flex-none pr-1.5">{badge}</span>}
        </button>
      </div>
      {open && <div className="flex flex-col gap-4 border-t border-[#EEEBE5] p-4">{children}</div>}
    </div>
  );
}

export function FormActions({ onDone, onRemove, removeLabel }: { onDone: () => void; onRemove: () => void; removeLabel: string }) {
  const t = useTranslations("editor.ui");
  return (
    <div className="flex items-center justify-between gap-2 border-t border-[#F1EEE8] pt-3.5">
      <button type="button" onClick={onRemove} className="-ml-2 min-h-10 rounded-[10px] border-0 bg-transparent px-2 text-sm font-medium text-[#A3361B] hover:bg-[#FFF1EC]">
        {removeLabel}
      </button>
      <button type="button" onClick={onDone} className="min-h-10 rounded-[10px] border-0 bg-ink px-6 text-sm font-semibold text-white">
        {t("done")}
      </button>
    </div>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 min-h-11 rounded-[12px] border-[1.5px] border-dashed border-[#DDD8CF] bg-white text-sm font-medium text-[#5E5A52] transition-colors hover:border-[#B9B2A6] hover:bg-[#FAF9F7] hover:text-ink"
    >
      {children}
    </button>
  );
}

const PILL_TONES = {
  ok: "bg-[#EAF5EE] text-[#1F6B3A]",
  warn: "bg-[#FFF1D6] text-[#7A5200]",
  off: "bg-[#F4F2EE] text-[#77726A]",
  bad: "bg-[#FDECE7] text-[#A3361B]",
};

/** Etiqueta curta de situação (vence em breve, agendado…). */
export function Pill({ tone, children }: { tone: keyof typeof PILL_TONES; children: ReactNode }) {
  return <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap ${PILL_TONES[tone]}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="m-0 rounded-[12px] bg-[#FAF9F7] p-4 text-[13px] leading-snug text-[#77726A]">{children}</p>;
}
