"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { vitrineAddress, vitrinePath } from "@/lib/vitrine/links";
import { pillLight } from "./chrome";

const noop = () => () => {};
// o mesmo endereço em que a pessoa está (em dev, localhost)
const useOrigin = () => useSyncExternalStore(noop, () => window.location.origin, () => "");

/**
 * Copiar o link público da vitrine. Sem área de transferência (http, iframe) o estado vira "manual" e quem usa
 * mostra o link num campo já selecionado, para copiar à mão.
 */
function useCopyLink(handle: string) {
  const t = useTranslations("linkBar");
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  // cada cópia conta: copiar de novo com "Link copiado" na tela recomeça os 2 segundos
  const [copies, setCopies] = useState(0);
  const field = useRef<HTMLInputElement>(null);
  const origin = useOrigin();
  const url = origin ? `${origin}${vitrinePath(handle)}` : "";
  useEffect(() => {
    if (state === "manual") field.current?.select();
  }, [state]);
  // O "Link copiado" volta a "Copiar link" por um Effect, e não por um timer guardado no clique: com `cacheComponents`
  // a página sai de cena escondida (React <Activity>), o que roda as limpezas e cancelaria o timer, e o botão ficaria
  // em "Link copiado" para sempre. Assim, ao voltar, o Effect roda de novo e agenda a volta.
  useEffect(() => {
    if (state !== "copied") return;
    const id = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(id);
  }, [state, copies]);

  const copy = () => {
    if (!navigator.clipboard) return setState("manual");
    navigator.clipboard.writeText(url).then(
      () => {
        setState("copied");
        setCopies((n) => n + 1);
      },
      () => setState("manual"),
    );
  };

  const manualField = (className: string) => (
    <input ref={field} readOnly value={url} aria-label={t("fieldLabel")} onFocus={(e) => e.currentTarget.select()} className={className} />
  );
  const announce = (
    <span aria-live="polite" className="sr-only">
      {state === "copied" ? t("copiedLink") : ""}
    </span>
  );
  return { state, url, copy, manualField, announce };
}

/** Botão solto que copia o link público da vitrine (página de métricas). */
export function CopyLinkButton({ handle }: { handle: string }) {
  const t = useTranslations("linkBar");
  const { state, url, copy, manualField, announce } = useCopyLink(handle);
  if (state === "manual") return manualField("min-h-11 min-w-0 border border-ink bg-white px-4 text-[15px]");
  return (
    <>
      <button type="button" onClick={copy} disabled={!url} className={pillLight}>
        {state === "copied" ? t("copiedLink") : t("copyLink")}
      </button>
      {announce}
    </>
  );
}

/**
 * O endereço da vitrine num botão discreto de borda areia, embaixo do nome no topo da home:
 * "myvitri.com/@fulana | ⧉ COPIAR LINK". O botão todo copia (abrir a vitrine é o botão "Ver minha vitrine"); o ícone
 * vira um ✓ e o rótulo "Link copiado" por 2 segundos. Sem área de transferência, vira o campo com o endereço já selecionado.
 */
export function VitrineLinkLine({ handle }: { handle: string }) {
  const t = useTranslations("linkBar");
  const { state, url, copy, manualField, announce } = useCopyLink(handle);
  if (state === "manual") return manualField("mt-2 min-h-10 w-full max-w-[26rem] border border-ink bg-white px-4 text-center text-[14px]");
  const copied = state === "copied";
  return (
    <>
      <button
        type="button"
        onClick={copy}
        disabled={!url}
        className="group mt-2 inline-flex min-h-10 max-w-full cursor-pointer items-center gap-3 border border-sand bg-white py-1.5 pr-3 pl-4 text-[14px] text-mute transition-colors hover:border-ink/25 hover:text-ink disabled:cursor-default disabled:opacity-60"
      >
        <span className="min-w-0 break-all">{vitrineAddress(handle)}</span>
        <span aria-hidden="true" className="h-4 w-px shrink-0 bg-sand" />
        <span className={`flex shrink-0 items-center gap-1.5 text-[11px] font-medium tracking-[0.16em] whitespace-nowrap uppercase ${copied ? "text-gold" : "text-ink"}`}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {copied ? (
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            ) : (
              <>
                <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
                <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
              </>
            )}
          </svg>
          {/* no celular só o ícone, para o endereço caber numa linha; o nome do botão continua sendo o rótulo */}
          <span className="max-sm:sr-only">{copied ? t("copiedLink") : t("copyLink")}</span>
        </span>
      </button>
      {announce}
    </>
  );
}
