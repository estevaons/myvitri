"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { withHttps } from "@/lib/vitrine/links";
import { centsToInput, parseBRL } from "@/lib/vitrine/pricing";
import type { VitrineContent } from "@/lib/vitrine/types";

/** Muda o rascunho da vitrine (o estado do editor). */
export type Update = (fn: (d: VitrineContent) => VitrineContent) => void;

/** Borda e foco dos campos; também usado em caixas que embrulham um input (ex.: o link). */
export const boxCls =
  "rounded-[10px] border border-[#E6E2DA] bg-[#FAF9F7] transition-[border-color,background-color,box-shadow] hover:border-[#D6D0C5] focus:border-[#B9B2A6] focus:bg-white focus:shadow-[0_0_0_3px_rgba(17,17,17,0.06)] focus-within:border-[#B9B2A6] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(17,17,17,0.06)]";

export const inputCls = `h-11 w-full box-border px-3 text-[15px] font-normal text-ink outline-none placeholder:text-[#ADA79C] ${boxCls}`;

export const labelCls = "text-[13px] font-medium text-[#3A3A3A]";

export const newId = () => crypto.randomUUID();

export function Hint({ children }: { children: ReactNode }) {
  return <span className="text-xs leading-snug font-normal text-[#77726A]">{children}</span>;
}

/** Bloco de uma janela de edição: título pequeno em caixa alta e os campos logo abaixo, separado do próximo por uma linha. */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-[#F1EEE8] pb-5 last-of-type:border-0 last-of-type:pb-0">
      <h3 className="m-0 text-[11px] font-semibold tracking-[0.08em] text-[#8F897E] uppercase">{title}</h3>
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

/** Campo de link: ao sair dele, "nike.com.br" vira "https://nike.com.br" (`withHttps`), como a vitrine vai guardar. */
export function UrlInput({ value, onChange, onBlur, ...rest }: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholder="https://…"
      inputMode="url"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      {...rest}
      value={value}
      onChange={onChange}
      onBlur={(e) => {
        const full = withHttps(value);
        if (full !== value) onChange(full);
        onBlur?.(e);
      }}
    />
  );
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

/** Tira o item de `from` e põe em `to`. */
export function reorder<T>(list: T[], from: number, to: number) {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
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
