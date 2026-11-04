"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { pillLight } from "./chrome";

const noop = () => () => {};
// o mesmo endereço em que a pessoa está (em dev, localhost), como no painel Divulgar
const useOrigin = () => useSyncExternalStore(noop, () => window.location.origin, () => "");

/** Copia o link público da vitrine. Sem área de transferência (http, iframe), mostra o link selecionado para copiar à mão. */
export function CopyLinkButton({ handle }: { handle: string }) {
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

  if (state === "manual") {
    return (
      <input
        ref={field}
        readOnly
        value={url}
        aria-label="Link da sua vitrine"
        onFocus={(e) => e.currentTarget.select()}
        className="min-h-11 min-w-0 border border-ink bg-white px-4 text-[15px]"
      />
    );
  }

  return (
    <>
      <button type="button" onClick={copy} disabled={!url} className={pillLight}>
        {state === "copied" ? "Link copiado" : "Copiar link"}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === "copied" ? "Link copiado" : ""}
      </span>
    </>
  );
}
