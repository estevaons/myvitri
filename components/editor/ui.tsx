"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { centsToInput, parseBRL } from "@/lib/vitrine/pricing";

export const inputCls =
  "h-[46px] w-full box-border rounded-xl border-[1.5px] border-[#D6D0C5] bg-white px-3 text-[15px] text-ink outline-none focus:border-ink";

export const newId = () => crypto.randomUUID();

export function H({ children }: { children: ReactNode }) {
  return <h2 className="m-0 text-sm font-bold">{children}</h2>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <span className="text-[13px] font-normal text-[#5E5A52]">{children}</span>;
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-[13px] font-semibold">
      {label}
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
  const [text, setText] = useState(cents ? centsToInput(cents) : "");
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] text-[#5E5A52]">R$</span>
      <input
        inputMode="decimal"
        value={text}
        placeholder="0,00"
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseBRL(e.target.value) ?? 0);
        }}
        onBlur={() => setText(cents ? centsToInput(cents) : "")}
        className={`${inputCls} pl-10`}
      />
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
      className="grid gap-[3px] rounded-xl bg-[#F2F0EB] p-[3px]"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          aria-pressed={id === value}
          onClick={() => onChange(id)}
          className={`min-h-10 rounded-[9px] border-0 text-[13px] ${
            id === value ? "bg-white font-bold shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "bg-transparent font-semibold text-[#3A3A3A]"
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
  thumb: ReactNode;
  open: boolean;
  onOpen: () => void;
  total: number;
  sort: DragSort;
  children?: ReactNode;
}) {
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
        sort.from !== null && sort.over === i && sort.from !== i ? "border-dashed border-ink bg-[#F7F6F3]" : open ? "border-ink" : "border-[#EEEBE5]"
      } ${sort.from === i ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2.5 p-1.5">
        <button
          type="button"
          {...sort.handle(i, total)}
          aria-label={`Mover ${title}, posição ${pos} de ${total}. Use as setas para cima e para baixo.`}
          title="Arraste para mudar a ordem"
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
            {sub && <span className="truncate text-xs text-[#5E5A52]">{sub}</span>}
          </span>
        </button>
      </div>
      {open && <div className="flex flex-col gap-3.5 border-t border-[#EEEBE5] p-3.5">{children}</div>}
    </div>
  );
}

export function FormActions({ onDone, onRemove, removeLabel }: { onDone: () => void; onRemove: () => void; removeLabel: string }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onDone} className="min-h-11 flex-1 rounded-xl border-0 bg-ink text-sm font-bold text-white">
        Concluir
      </button>
      <button type="button" onClick={onRemove} className="min-h-11 rounded-xl border-[1.5px] border-[#E7B7A8] bg-white px-4 text-sm font-semibold text-[#A3361B]">
        {removeLabel}
      </button>
    </div>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 min-h-12 rounded-[14px] border-2 border-dashed border-[#CFCAC0] bg-white text-sm font-bold text-[#3A3A3A]"
    >
      {children}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="m-0 rounded-[14px] bg-[#F7F6F3] p-4 text-sm leading-snug text-[#5E5A52]">{children}</p>;
}
