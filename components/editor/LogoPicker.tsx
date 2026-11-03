"use client";

import { useEffect, useState } from "react";
import { findLogoAction } from "@/app/actions";
import { IMAGE_ACCEPT, uploadImage } from "./upload";
import { TextInput, inputCls, labelCls } from "./ui";

const isLink = (s: string) => /^https?:\/\/[^/\s]+\.[^/\s]+/i.test(s.trim());

/**
 * Logo da marca do cupom. Com o link da loja preenchido, busca sozinha os logos do site
 * e mostra como opções (sem escolher por conta própria); colar o link da imagem fica como alternativa.
 */
export function LogoPicker({ storeUrl, logoUrl, onChange }: { storeUrl: string; logoUrl: string; onChange: (url: string) => void }) {
  const [found, setFound] = useState<{ for: string; logos: string[]; error?: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [broken, setBroken] = useState<string[]>([]);
  const [pasting, setPasting] = useState(false);
  // o campo de colar mostra só o que a pessoa colou, não o endereço de um logo achado no site
  const [typed, setTyped] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const upload = async (file: File) => {
    setUploadError("");
    setUploading(true);
    const res = await uploadImage("logo", file);
    setUploading(false);
    if (!res.ok) return setUploadError(res.error);
    onChange(res.url);
    setTyped("");
    setPasting(false);
  };

  const search = async (url: string) => {
    setSearching(true);
    const res = await findLogoAction(url.trim());
    setSearching(false);
    setFound(res.ok ? { for: url, logos: res.logos } : { for: url, logos: [], error: res.error });
  };

  // Busca automática só enquanto o cupom não tem logo; espera a pessoa parar de digitar o link.
  useEffect(() => {
    if (logoUrl || !isLink(storeUrl) || found?.for === storeUrl) return;
    const t = setTimeout(() => search(storeUrl), 700);
    return () => clearTimeout(t);
  }, [logoUrl, storeUrl, found?.for]);

  const options = (found?.for === storeUrl ? found.logos : []).filter((src) => !broken.includes(src));
  const searched = found?.for === storeUrl;
  const status = !isLink(storeUrl) && !logoUrl && !pasting
    ? "Toque no + para enviar uma imagem, ou preencha o link da loja e a gente busca o logo."
    : searched && found.error
      ? found.error
      : searched && !options.length && !logoUrl && !pasting
        ? "Não achamos um logo no site. Toque no + para enviar uma imagem."
        : options.length && !logoUrl
          ? `${options.length === 1 ? "Achamos este" : "Achamos estes"} no site da loja. Toque para usar.`
          : "";

  // O logo atual entra junto das opções (escolhido).
  const circles = logoUrl && !options.includes(logoUrl) ? [logoUrl, ...options] : options;
  const circle = "flex size-12 flex-none items-center justify-center overflow-hidden rounded-full border bg-white p-0";

  return (
    <div className="flex flex-col gap-2">
      <span className={labelCls}>Logo da marca (opcional)</span>
      <div role="group" aria-label="Logo da marca" aria-busy={searching} className="flex flex-wrap items-center gap-2.5">
        {circles.map((src, i) => (
          <span key={src} className="relative">
            <button
              type="button"
              aria-pressed={src === logoUrl}
              aria-label={src === logoUrl ? "Logo em uso" : `Usar logo ${i + 1} do site da loja`}
              onClick={() => {
                onChange(src);
                setPasting(false);
              }}
              className={`${circle} transition-shadow ${src === logoUrl ? "border-ink ring-2 ring-ink ring-offset-2" : "border-[#E6E2DA] hover:border-[#B9B2A6]"}`}
            >
              {broken.includes(src) ? (
                <span aria-hidden="true" className="text-base font-semibold text-[#A3361B]">!</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária
                <img src={src} alt="" className="size-full object-contain" onError={() => setBroken((b) => [...b, src])} />
              )}
            </button>
            {src === logoUrl && (
              <button
                type="button"
                aria-label="Remover logo"
                title="Remover logo"
                onClick={() => {
                  onChange("");
                  setTyped("");
                }}
                className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border-0 bg-ink p-0 text-white shadow-[0_0_0_2px_white]"
              >
                <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </span>
        ))}
        {uploading && <span aria-hidden="true" className={`${circle} animate-pulse border-[#EEEBE5] bg-[#F4F2EE]`} />}
        {searching &&
          [0, 1].map((i) => <span key={i} aria-hidden="true" className={`${circle} animate-pulse border-[#EEEBE5] bg-[#F4F2EE]`} />)}
        <button
          type="button"
          onClick={() => setPasting(!pasting)}
          aria-expanded={pasting}
          aria-label="Enviar ou colar outro logo"
          title="Enviar ou colar outro logo"
          className={`${circle} border-dashed transition-colors ${pasting ? "border-[#8F897E] text-ink" : "border-[#D6D0C5] text-[#8F897E] hover:border-[#8F897E] hover:text-ink"}`}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      {searching || uploading ? (
        <span role="status" className="text-xs text-[#77726A]">
          {uploading ? "Enviando imagem…" : "Procurando no site da loja…"}
        </span>
      ) : (
        status && (
          <span role="status" className="text-xs leading-snug text-[#77726A]">
            {status}
          </span>
        )
      )}
      {pasting && (
        <div className="flex flex-col gap-2 rounded-[12px] bg-[#FAF9F7] p-3">
          <label
            className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-ink text-sm font-semibold text-white transition-opacity has-focus-visible:ring-2 has-focus-visible:ring-ink has-focus-visible:ring-offset-2 ${uploading ? "pointer-events-none opacity-50" : ""}`}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V3M7 8l5-5 5 5" />
              <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
            </svg>
            {uploading ? "Enviando…" : "Enviar imagem"}
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              disabled={uploading}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) upload(file);
              }}
            />
          </label>
          {uploadError && (
            <span role="alert" className="text-xs font-medium text-[#A3361B]">
              {uploadError}
            </span>
          )}
          <span aria-hidden="true" className="flex items-center gap-2 py-0.5 text-[11px] text-[#ADA79C] before:h-px before:flex-1 before:bg-[#EEEBE5] after:h-px after:flex-1 after:bg-[#EEEBE5]">
            ou cole o link
          </span>
          <TextInput
            value={typed}
            onChange={(url) => {
              setTyped(url);
              onChange(url.trim());
            }}
            placeholder="Cole o link da imagem (https://…)"
            inputMode="url"
            aria-label="Link da imagem do logo"
            className={`${inputCls} bg-white`}
          />
          {typed && broken.includes(typed.trim()) ? (
            <span role="alert" className="text-xs font-medium text-[#A3361B]">
              Essa imagem não abriu. Confira se o link termina em .png, .jpg, .svg ou .webp.
            </span>
          ) : (
            <span className="text-xs leading-snug text-[#77726A]">Uma imagem quadrada fica melhor. Aparece num círculo ao lado do nome da marca.</span>
          )}
          {isLink(storeUrl) && !searched && !searching && (
            <button
              type="button"
              onClick={() => search(storeUrl)}
              className="min-h-8 self-start border-0 bg-transparent p-0 text-[13px] font-medium text-[#5E5A52] underline-offset-4 hover:text-ink hover:underline"
            >
              Buscar no site da loja
            </button>
          )}
        </div>
      )}
    </div>
  );
}
