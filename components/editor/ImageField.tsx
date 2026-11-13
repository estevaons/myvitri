"use client";

import { useTranslations } from "next-intl";
import { useState, type DragEvent, type ReactNode } from "react";
import { useImageCrop } from "./ImageCrop";
import { IMAGE_ACCEPT, uploadImage } from "./upload";
import { useConfirm } from "@/components/brand/ConfirmDialog";

export function UploadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

/**
 * De onde veio a foto: enviada pela pessoa (o bucket do projeto) ou puxada da loja. O endereço da imagem não diz qual
 * loja (costuma ser o servidor de imagens dela, como static.netshoes.com.br), por isso não aparece.
 */
const sourceOf = (url: string, t: ReturnType<typeof useTranslations<"editor.image">>) =>
  url.includes("/storage/v1/object/public/vitrine-photos/") ? t("sourceUpload") : t("sourceStore");

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
        // com foto, um cartão: a foto sem nada por cima, de onde ela veio e as ações; soltar outra foto em qualquer ponto
        // do cartão troca. No celular, a foto à esquerda e o resto ao lado; do `sm` em diante (a coluna estreita da janela
        // do produto), a foto grande em cima e o resto embaixo.
        <div
          {...drop}
          className={`flex items-center gap-4 rounded-[14px] border p-3 transition-colors sm:flex-col sm:items-stretch sm:gap-3 ${dragging ? "border-dashed border-ink bg-[#F4F2EE]" : "border-[#EEEBE5] bg-[#FAF9F7]"}`}
        >
          <span
            aria-hidden="true"
            className="relative flex size-24 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-cream text-[#8F897E] sm:aspect-square sm:size-auto sm:w-full"
          >
            {/* igual à vitrine, inteiro e com o fundo branco da foto se fundindo ao card */}
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element -- imagem vem de URL arbitrária ou do bucket
              <img src={value} alt="" onError={() => setBroken(value)} className={`size-full object-contain mix-blend-multiply ${uploading ? "opacity-40" : ""}`} />
            ) : (
              <UploadIcon />
            )}
            {uploading && <span className="absolute size-5 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:gap-2">
            <span className="truncate text-[13px] font-semibold text-ink" title={t("dragHint")}>
              {uploading ? t("sending") : dragging ? t("drop") : sourceOf(value, t)}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
              <FilePick
                onFile={send}
                disabled={uploading}
                className="flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[#E6E2DA] bg-white px-3.5 text-[13px] font-semibold text-ink transition-colors hover:border-[#B9B2A6] has-focus-visible:ring-2 has-focus-visible:ring-ink sm:flex-1"
              >
                <UploadIcon size={14} />
                {t("change")}
              </FilePick>
              <button
                type="button"
                onClick={remove}
                disabled={uploading}
                aria-label={t("remove")}
                title={t("remove")}
                className="flex min-h-9 min-w-9 justify-center cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-3 text-[13px] font-medium text-[#A3361B] transition-colors hover:bg-[#FFF1EC] focus-visible:outline-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-50"
              >
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
                {/* na coluna estreita (do `sm` em diante) só a lixeira, ao lado de "Trocar foto" */}
                <span aria-hidden="true" className="sm:hidden">
                  {t("remove")}
                </span>
              </button>
            </div>
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
