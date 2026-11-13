"use client";

import { useTranslations } from "next-intl";
import { useState, type DragEvent, type ReactNode } from "react";
import { useImageCrop } from "./ImageCrop";
import { IMAGE_ACCEPT, uploadImage } from "./upload";
import { useConfirm } from "@/components/brand/ConfirmDialog";

// os círculos brancos do canto da foto (lápis e X), como os da capa no editor
const badge = "flex size-7 items-center justify-center rounded-full bg-white text-ink shadow-[0_1px_4px_rgba(17,17,17,0.18)]";

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
  const t = useTranslations("editor.image");
  const tErrors = useTranslations("errors");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [broken, setBroken] = useState("");
  const [cropper, crop] = useImageCrop();
  const [confirmDialog, ask] = useConfirm();

  const send = async (picked: File) => {
    const file = await crop(picked, "product");
    if (!file) return;
    setError("");
    setUploading(true);
    const res = await uploadImage("product", file, tErrors("imageUnreadable"));
    setUploading(false);
    if (!res.ok) return setError(res.error);
    onChange(res.url);
  };

  const remove = async () => {
    if (await ask({ title: t("removeTitle"), text: t("removeText"), confirm: t("removeConfirm"), danger: true })) onChange("");
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
      {cropper}
      {confirmDialog}
      {value ? (
        // com foto, igual à capa no editor: a própria foto troca (tocando ou soltando outra nela), com o lápis e o X no canto
        <div {...drop} className="flex items-center gap-4">
          <div className="relative flex-none">
            <FilePick
              onFile={send}
              disabled={uploading}
              className={`group/photo relative flex size-32 cursor-pointer items-center justify-center overflow-hidden rounded-[14px] bg-cream text-[#8F897E] has-focus-visible:ring-2 has-focus-visible:ring-ink has-focus-visible:ring-offset-2 ${uploading ? "animate-pulse" : ""} ${dragging ? "ring-2 ring-ink ring-offset-2" : ""}`}
            >
              <span className="sr-only">{uploading ? t("sending") : t("change")}</span>
              {/* igual à vitrine, inteiro e com o fundo branco da foto se fundindo ao card */}
              {uploading ? null : shown ? (
                // eslint-disable-next-line @next/next/no-img-element -- imagem vem de URL arbitrária ou do bucket
                <img src={value} alt="" onError={() => setBroken(value)} className="size-full object-contain mix-blend-multiply" />
              ) : (
                <UploadIcon />
              )}
              {/* no mouse, o hover escurece de leve e mostra "Trocar foto" embaixo */}
              {!uploading && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-end justify-center bg-ink/0 pb-2.5 transition-colors duration-200 group-hover/photo:bg-ink/15"
                >
                  <span className="translate-y-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink opacity-0 shadow-[0_2px_8px_rgba(17,17,17,0.18)] transition duration-200 group-hover/photo:translate-y-0 group-hover/photo:opacity-100">
                    {t("change")}
                  </span>
                </span>
              )}
            </FilePick>
            {!uploading && (
              <>
                <span aria-hidden="true" className={`${badge} pointer-events-none absolute top-1.5 right-1.5`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
                  </svg>
                </span>
                {/* um botão à parte, ao lado do lápis: a foto inteira já é o botão de trocar */}
                <button
                  type="button"
                  onClick={remove}
                  aria-label={t("remove")}
                  title={t("remove")}
                  className={`${badge} absolute top-1.5 right-10 cursor-pointer border-0 p-0 transition-[transform,color] hover:scale-105 hover:text-[#A3361B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`}
                >
                  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-semibold text-ink">{uploading ? t("sending") : t("title")}</span>
            <span className="text-[13px] leading-snug text-[#5E5A52] md:hidden">{t("changeTap")}</span>
            <span className="text-[13px] leading-snug text-[#5E5A52] max-md:hidden">{t("changeClick")}</span>
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
            <span className="text-sm font-semibold text-ink">{uploading ? t("sending") : dragging ? t("drop") : t("send")}</span>
            <span className="text-[13px] leading-snug text-[#5E5A52] md:hidden">{t("tap")}</span>
            <span className="text-[13px] leading-snug text-[#5E5A52] max-md:hidden">{t("click")}</span>
            <span className="mt-1 text-xs leading-snug text-[#8F897E]">{t("none")}</span>
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
          {t("broken")}
        </span>
      )}
    </div>
  );
}
