"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HOST } from "@/lib/brand";
import { pillLight } from "./chrome";

const noop = () => () => {};
// o mesmo endereço em que a pessoa está (em dev, localhost), como no painel Divulgar
const useOrigin = () => useSyncExternalStore(noop, () => window.location.origin, () => "");

/**
 * Copiar o link público da vitrine. Sem área de transferência (http, iframe) o estado vira "manual" e quem usa
 * mostra o link num campo já selecionado, para copiar à mão.
 */
function useCopyLink(handle: string) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const field = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const origin = useOrigin();
  const url = origin ? `${origin}/${handle}` : "";
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (state === "manual") field.current?.select();
  }, [state]);

  const copy = () => {
    if (!navigator.clipboard) return setState("manual");
    navigator.clipboard.writeText(url).then(
      () => {
        setState("copied");
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setState("idle"), 2000);
      },
      () => setState("manual"),
    );
  };

  const manualField = (className: string) => (
    <input ref={field} readOnly value={url} aria-label="Link da sua vitrine" onFocus={(e) => e.currentTarget.select()} className={className} />
  );
  const announce = (
    <span aria-live="polite" className="sr-only">
      {state === "copied" ? "Link copiado" : ""}
    </span>
  );
  return { state, url, copy, manualField, announce };
}

/** Botão solto que copia o link público da vitrine (página de métricas). */
export function CopyLinkButton({ handle }: { handle: string }) {
  const { state, url, copy, manualField, announce } = useCopyLink(handle);
  if (state === "manual") return manualField("min-h-11 min-w-0 border border-ink bg-white px-4 text-[15px]");
  return (
    <>
      <button type="button" onClick={copy} disabled={!url} className={pillLight}>
        {state === "copied" ? "Link copiado" : "Copiar link"}
      </button>
      {announce}
    </>
  );
}

/**
 * O endereço da vitrine como um campo, na home: o botão grudado nele copia, e clicar no endereço também abre a vitrine
 * numa aba nova (atalho; o caminho principal é o botão "Ver minha vitrine" logo abaixo).
 */
export function VitrineLinkBar({ handle }: { handle: string }) {
  const { state, url, copy, manualField, announce } = useCopyLink(handle);
  return (
    <div className="flex min-h-12 w-full max-w-[34rem] items-stretch border border-ink">
      {state === "manual" ? (
        manualField("min-w-0 flex-1 border-0 bg-white px-4 text-[15px] outline-none")
      ) : (
        <Link
          href={`/${handle}`}
          target="_blank"
          rel="noopener"
          aria-label={`Abrir a vitrine ${HOST}/${handle} numa aba nova`}
          className="group flex min-w-0 flex-1 items-center gap-3 px-4 text-[16px] text-mute no-underline hover:bg-cream"
        >
          <span className="min-w-0 truncate">
            {HOST}/<em className="font-display text-[1.3em] leading-none text-ink">{handle}</em>
          </span>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto flex-none text-ink transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        </Link>
      )}
      <button
        type="button"
        onClick={copy}
        disabled={!url}
        className="flex-none cursor-pointer border-0 border-l border-ink bg-ink px-5 text-[11px] font-medium tracking-[0.18em] whitespace-nowrap text-white uppercase hover:bg-[#2b2925] disabled:opacity-60"
      >
        {state === "copied" ? "Copiado" : "Copiar"}
      </button>
      {announce}
    </div>
  );
}
