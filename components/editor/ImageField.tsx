"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { Hint, TextInput, inputCls } from "./ui";
import { IMAGE_ACCEPT, uploadImage } from "./upload";

const pill =
  "flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-white/95 px-3.5 text-[13px] font-semibold text-ink shadow-[0_1px_4px_rgba(0,0,0,0.18)] has-focus-visible:ring-2 has-focus-visible:ring-ink";
const linkBtn = "min-h-8 border-0 bg-transparent p-0 text-[13px] font-medium text-[#5E5A52] underline-offset-4 hover:text-ink hover:underline";

function UploadIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

/** Botão que abre o seletor de arquivo (um <label> com o input escondido dentro). */
function FilePick({ onFile, disabled, className, children }: { onFile: (f: File) => void; disabled: boolean; className: string; children: ReactNode }) {
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

/**
 * Foto de capa ou de perfil: enviar do aparelho (tocando ou arrastando) é o caminho principal;
 * colar o link de uma imagem fica como alternativa.
 */
export function ImageField({
  kind,
  value,
  onChange,
  hint,
  initials = "",
}: {
  kind: "cover" | "avatar";
  value: string;
  onChange: (url: string) => void;
  hint: string;
  /** só no perfil: o que mostrar no círculo sem foto */
  initials?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pasting, setPasting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [broken, setBroken] = useState("");
  const noun = kind === "cover" ? "foto de capa" : "foto de perfil";

  const send = async (file: File) => {
    setError("");
    setUploading(true);
    const res = await uploadImage(kind, file);
    setUploading(false);
    if (!res.ok) return setError(res.error);
    onChange(res.url);
    setPasting(false);
  };

  const drop = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) send(file);
    },
  };

  const shown = value && broken !== value;
  // eslint-disable-next-line @next/next/no-img-element -- imagem vem de URL arbitrária ou do bucket
  const img = (cls: string) => <img src={value} alt="" onError={() => setBroken(value)} className={cls} />;

  return (
    <div className="flex flex-col gap-2">
      {kind === "cover" ? (
        shown || uploading ? (
          <div {...drop} className={`relative overflow-hidden rounded-[12px] bg-[#F4F2EE] ${dragging ? "ring-2 ring-ink ring-offset-2" : ""}`}>
            {uploading ? <div className="aspect-[3/1] w-full animate-pulse" /> : img("block aspect-[3/1] w-full object-cover")}
            <div className="absolute right-2 bottom-2 flex gap-1.5">
              <FilePick onFile={send} disabled={uploading} className={pill}>
                <UploadIcon />
                {uploading ? "Enviando…" : "Trocar"}
              </FilePick>
              {!uploading && (
                <button type="button" onClick={() => onChange("")} className={pill}>
                  Remover
                </button>
              )}
            </div>
          </div>
        ) : (
          <FilePick
            onFile={send}
            disabled={uploading}
            className={`flex aspect-[3/1] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] border-dashed text-center transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ink ${
              dragging ? "border-ink bg-[#F4F2EE]" : "border-[#DDD8CF] bg-[#FAF9F7] hover:border-[#B9B2A6] hover:bg-[#F4F2EE]"
            }`}
          >
            <span {...drop} className="flex size-full flex-col items-center justify-center gap-1.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-white text-[#5E5A52] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <UploadIcon />
              </span>
              <span className="text-sm font-semibold text-ink">Enviar foto de capa</span>
              <span className="text-xs text-[#8F897E]">Toque para escolher ou arraste a foto aqui</span>
            </span>
          </FilePick>
        )
      ) : (
        <div {...drop} className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className={`flex size-16 flex-none items-center justify-center overflow-hidden rounded-full bg-[#F4F2EE] text-xl font-semibold text-[#8F897E] ${uploading ? "animate-pulse" : ""} ${dragging ? "ring-2 ring-ink ring-offset-2" : ""}`}
          >
            {uploading ? null : shown ? img("size-full object-cover") : initials || "?"}
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <FilePick
              onFile={send}
              disabled={uploading}
              className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#E6E2DA] bg-white px-3.5 text-[13px] font-semibold text-ink transition-colors hover:border-[#D6D0C5] hover:bg-[#FAF9F7] has-focus-visible:ring-2 has-focus-visible:ring-ink"
            >
              <UploadIcon />
              {uploading ? "Enviando…" : value ? "Trocar foto" : "Enviar foto"}
            </FilePick>
            {value && !uploading && (
              <button type="button" onClick={() => onChange("")} className={`${linkBtn} text-[#A3361B] hover:text-[#A3361B]`}>
                Remover
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <span role="alert" className="text-xs font-medium text-[#A3361B]">
          {error}
        </span>
      )}
      {value && broken === value && (
        <span role="alert" className="text-xs font-medium text-[#A3361B]">
          Essa imagem não abriu. Envie a foto ou confira o link.
        </span>
      )}
      <Hint>{hint}</Hint>
      <button type="button" onClick={() => setPasting(!pasting)} aria-expanded={pasting} className={`${linkBtn} self-start`}>
        {pasting ? "Fechar" : "Prefere colar o link da imagem?"}
      </button>
      {pasting && <TextInput value={value} onChange={onChange} placeholder="https://…" inputMode="url" aria-label={`Link da ${noun}`} className={inputCls} />}
    </div>
  );
}
