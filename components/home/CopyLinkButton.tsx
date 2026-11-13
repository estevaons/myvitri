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
 * O endereço da vitrine numa linha discreta, embaixo do nome no topo da home: "myvitri.com/@fulana · Copiar link".
 * O endereço é só texto (abrir a vitrine é o botão "Ver minha vitrine"); o link ao lado copia e vira "Link copiado"
 * por 2 segundos. Sem área de transferência, a linha vira o campo com o endereço já selecionado.
 */
export function VitrineLinkLine({ handle }: { handle: string }) {
  const t = useTranslations("linkBar");
  const { state, url, copy, manualField, announce } = useCopyLink(handle);
  if (state === "manual") return manualField("min-h-11 w-full max-w-[26rem] border border-ink bg-white px-4 text-center text-[15px]");
  return (
    <p className="m-0 flex flex-wrap items-center justify-center gap-x-2 text-[15px] text-mute">
      <span className="break-all">{vitrineAddress(handle)}</span>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        onClick={copy}
        disabled={!url}
        className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-[15px] text-ink underline-offset-4 hover:underline disabled:opacity-60"
      >
        {state === "copied" ? t("copiedLink") : t("copyLink")}
      </button>
      {announce}
    </p>
  );
}
