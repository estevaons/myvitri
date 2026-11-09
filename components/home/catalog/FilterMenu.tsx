"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Botão que abre uma lista de opções: suspensa no computador, de baixo para cima no celular. Só o abrir e
 * fechar fica no cliente; as opções continuam sendo links do servidor (`children`) que mudam a URL.
 * Fecha ao escolher, ao clicar fora, com Esc e quando o foco sai dele.
 */
export function FilterMenu({
  title,
  ariaLabel,
  className,
  align = "start",
  children,
  options,
}: {
  /** o nome do filtro, no topo da lista no celular */
  title: string;
  ariaLabel: string;
  className: string;
  align?: "start" | "end";
  /** o que aparece no botão */
  children: ReactNode;
  options: ReactNode;
}) {
  const t = useTranslations("catalog");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className="relative flex flex-none"
      onBlur={(e) => {
        // sem relatedTarget é clique (o Safari não foca links), e quem cuida dele é o pointerdown
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button ref={button} type="button" aria-label={ariaLabel} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className={className}>
        {children}
        <svg aria-hidden="true" viewBox="0 0 12 12" className={`size-2.5 flex-none ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="m2 4 4 4 4-4" />
        </svg>
      </button>
      {open && <div aria-hidden="true" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/40 md:hidden" />}
      <div
        id={id}
        hidden={!open}
        onClick={(e) => {
          if ((e.target as Element).closest("a")) setOpen(false);
        }}
        className={`z-50 border-sand bg-white max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[70dvh] max-md:overflow-y-auto max-md:border-t max-md:pb-4 md:absolute md:top-full md:mt-1 md:max-h-80 md:min-w-52 md:overflow-y-auto md:border md:shadow-[0_8px_24px_rgb(0_0_0/0.08)] ${align === "end" ? "md:right-0" : "md:left-0"}`}
      >
        <div className="flex min-h-13 items-center justify-between border-b border-sand px-5 md:hidden">
          <span className="font-display text-[22px]">{title}</span>
          <button type="button" onClick={() => setOpen(false)} className="border-0 bg-transparent p-0 text-[14px] text-mute underline underline-offset-4">
            {t("close")}
          </button>
        </div>
        {options}
      </div>
    </div>
  );
}
