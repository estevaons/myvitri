"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { IMAGE_ACCEPT, uploadImage } from "./upload";

const linkBtn = "min-h-8 border-0 bg-transparent p-0 text-[13px] font-medium text-[#5E5A52] underline-offset-4 hover:text-ink hover:underline";

export function UploadIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

/** Botão que abre o seletor de arquivo (um <label> com o input escondido dentro). */
export function FilePick({ onFile, disabled, className, children }: { onFile: (f: File) => void; disabled: boolean; className: string; children: ReactNode }) {
  return (
    <label className={`${className} ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      {children}
      <input
        type="file"
        accept={IMAGE_ACCEPT}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

/** Foto do produto: a que veio da loja ou uma enviada do aparelho (tocando ou arrastando). */
export function ImageField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [broken, setBroken] = useState("");

  const send = async (file: File) => {
    setError("");
    setUploading(true);
    const res = await uploadImage("product", file);
    setUploading(false);
    if (!res.ok) return setError(res.error);
    onChange(res.url);
  };

  const drop = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    // passar por cima de um texto de dentro também dispara o evento: só conta sair da área
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) send(file);
    },
  };

  const shown = value && broken !== value;

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div {...drop} className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className={`relative flex size-24 flex-none items-center justify-center overflow-hidden rounded-[12px] bg-cream text-[#8F897E] ${uploading ? "animate-pulse" : ""} ${dragging ? "ring-2 ring-ink ring-offset-2" : ""}`}
          >
            {/* igual à vitrine, inteiro e com o fundo branco da foto se fundindo ao card */}
            {uploading ? null : shown ? (
              // eslint-disable-next-line @next/next/no-img-element -- imagem vem de URL arbitrária ou do bucket
              <img src={value} alt="" onError={() => setBroken(value)} className="size-full object-contain mix-blend-multiply" />
            ) : (
              <UploadIcon />
            )}
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <FilePick
              onFile={send}
              disabled={uploading}
              className="flex min-h-9 cursor-pointer items-center rounded-[10px] border border-[#E6E2DA] bg-white px-3.5 text-[13px] font-semibold text-ink transition-colors hover:border-[#D6D0C5] hover:bg-[#FAF9F7] has-focus-visible:ring-2 has-focus-visible:ring-ink"
            >
              {uploading ? "Enviando…" : "Trocar foto"}
            </FilePick>
            {!uploading && (
              <button type="button" onClick={() => onChange("")} className={`${linkBtn} text-[#A3361B] hover:text-[#A3361B]`}>
                Remover
              </button>
            )}
          </div>
        </div>
      ) : (
        // sem foto, a área toda envia: clicar ou soltar a imagem em qualquer ponto dela
        <div {...drop}>
          <FilePick
            onFile={send}
            disabled={uploading}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-[12px] border-[1.5px] border-dashed px-4 py-6 text-center transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ink ${
              dragging ? "border-ink bg-[#F4F2EE]" : "border-[#DDD8CF] bg-[#FAF9F7] hover:border-ink"
            }`}
          >
            <span className="mb-1.5 flex size-10 items-center justify-center rounded-full bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
              <UploadIcon />
            </span>
            <span className="text-sm font-semibold text-ink">{uploading ? "Enviando…" : dragging ? "Solte a foto aqui" : "Enviar foto"}</span>
            <span className="text-[13px] leading-snug text-[#5E5A52] md:hidden">Toque para escolher uma imagem</span>
            <span className="text-[13px] leading-snug text-[#5E5A52] max-md:hidden">Clique ou arraste uma imagem para cá</span>
            <span className="mt-1 text-xs leading-snug text-[#8F897E]">Sem foto, a vitrine mostra uma ilustração</span>
          </FilePick>
        </div>
      )}

      {error && (
        <span role="alert" className="text-xs font-medium text-[#A3361B]">
          {error}
        </span>
      )}
      {value && broken === value && (
        <span role="alert" className="text-xs font-medium text-[#A3361B]">
          Essa imagem não abriu. Envie outra foto.
        </span>
      )}
    </div>
  );
}
