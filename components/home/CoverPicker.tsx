"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type DragEvent, type ReactNode } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { updateCoverAction } from "@/app/actions";
import { FilePick, UploadIcon } from "@/components/editor/ImageField";
import { useImageCrop } from "@/components/editor/ImageCrop";
import { uploadImage } from "@/components/editor/upload";
import { kicker, pillDark } from "./chrome";
import { CoverLetter } from "./CreatorCard";

// links discretos: a altura mínima é só para o toque no celular
const action = "flex min-h-9 cursor-pointer items-center border-0 bg-transparent p-0 text-[13px] text-mute underline-offset-4 hover:text-ink hover:underline has-focus-visible:text-ink has-focus-visible:underline";

/**
 * A capa da vitrine, no painel Perfil do editor: opcional e salva na hora, sem passar pela publicação. Sem capa, um convite para enviar;
 * com capa, `children` é a foto, e trocar e remover ficam abaixo dela, para não cobri-la.
 */
export function CoverPicker({ hasCover, name, children }: { hasCover: boolean; name: string; children: ReactNode }) {
  const t = useTranslations("cover");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [sending, start] = useTransition();
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cropper, crop] = useImageCrop();

  const save = (url: () => Promise<{ ok: true; url: string } | { ok: false; error: string }>) => {
    setError("");
    start(async () => {
      const up = await url();
      const res = up.ok ? await updateCoverAction(up.url) : up;
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  };
  const send = async (picked: File) => {
    const file = await crop(picked, "cover");
    if (file) save(() => uploadImage("cover", file, tErrors("imageUnreadable")));
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

  const failure = error && (
    <p role="alert" className="m-0 text-sm font-semibold text-[#A3361B]">
      {error}
    </p>
  );

  // Sem capa, só a dona vê este convite (o público vê a letra): o quadrado todo envia, com a letra apagada ao fundo mostrando o que aparece hoje.
  // O quadrado cresce se o texto não couber nele, em vez de cortar: por isso o overflow fica só na letra.
  if (!hasCover)
    return (
      <div className="flex min-w-0 flex-col gap-2">
        {cropper}
        <div {...drop} className={`group relative ${dragging ? "ring-2 ring-ink ring-offset-2" : ""} ${sending ? "animate-pulse" : ""}`}>
          <FilePick onFile={send} disabled={sending} className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center bg-sand text-center has-focus-visible:ring-2 has-focus-visible:ring-ink">
            <div className="absolute inset-0 overflow-hidden [&_span]:text-ink/[0.06]">
              <CoverLetter name={name} />
            </div>
            <span className="relative flex flex-col items-center gap-3 p-6 md:gap-4">
              <span className={`${kicker} text-[11px] text-gold`}>{t("kicker")}</span>
              <span className="max-w-[11em] font-display text-[clamp(32px,3.6vw,52px)] leading-[1.05] text-balance">{t("title")}</span>
              <span className="max-w-[24rem] text-[15px] leading-relaxed text-ink/70">{t("text")}</span>
              <span className={`${pillDark} mt-1 gap-2`}>
                <UploadIcon />
                {sending ? t("sending") : t("send")}
              </span>
              <span className="text-[13px] text-ink/60 max-md:hidden">{t("drag")}</span>
            </span>
          </FilePick>
        </div>
        {failure}
      </div>
    );

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {cropper}
      <div {...drop} className={`relative ${dragging ? "ring-2 ring-ink ring-offset-2" : ""} ${sending ? "animate-pulse" : ""}`}>
        {children}
      </div>
      {/* remover pede confirmação: a foto sai na hora da vitrine pública */}
      {confirming ? (
        <div role="group" aria-label={t("confirmLabel")} className="flex flex-wrap items-center gap-x-4">
          <span className="text-[13px] text-ink">{t("confirm")}</span>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              save(async () => ({ ok: true, url: "" }));
            }}
            className={`${action} text-[#A3361B] hover:text-[#A3361B]`}
          >
            {t("yes")}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className={action}>
            {t("cancel")}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <FilePick onFile={send} disabled={sending} className={action}>
            {sending ? t("saving") : t("change")}
          </FilePick>
          {!sending && (
            <button type="button" onClick={() => setConfirming(true)} className={action}>
              {t("remove")}
            </button>
          )}
        </div>
      )}
      {failure}
    </div>
  );
}
