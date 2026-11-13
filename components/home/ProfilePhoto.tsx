"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { updateAvatarAction } from "@/app/actions";
import { FilePick } from "@/components/editor/ImageField";
import { useImageCrop } from "@/components/editor/ImageCrop";
import { uploadImage } from "@/components/editor/upload";
import { useRouter } from "@/lib/i18n/navigation";

const box = "box-border size-28 flex-none rounded-full border-4 border-white ring-1 ring-sand md:size-34";

/** A foto (ou, sem ela, a primeira letra do nome em serifa sobre o areia). */
function Photo({ name, url }: { name: string; url: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- foto da vitrine (bucket) ou do Google
    return <img src={url} alt="" referrerPolicy="no-referrer" className={`${box} bg-sand object-cover`} />;
  }
  return (
    <span aria-hidden="true" className={`${box} flex items-center justify-center bg-sand font-display text-[56px] leading-none text-ink/55 md:text-[68px]`}>
      {[...name.trim()][0]?.toUpperCase() || "?"}
    </span>
  );
}

/**
 * A foto de perfil grande do topo da home. Com vitrine (`editable`), tocar nela troca a foto: escolhe o arquivo,
 * envia (`uploadImage("avatar")`) e salva na hora (`updateAvatarAction`), sem passar pelas configurações; o selo de
 * câmera no canto mostra que dá para trocar. Sem vitrine é só a foto da conta (a do Google), sem troca.
 */
export function ProfilePhoto({ name, url, editable }: { name: string; url: string; editable: boolean }) {
  const t = useTranslations("home.profile");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState("");
  const [cropper, crop] = useImageCrop();

  if (!editable) return <Photo name={name} url={url} />;

  const send = async (picked: File) => {
    const file = await crop(picked, "avatar");
    if (!file) return;
    setError("");
    start(async () => {
      const up = await uploadImage("avatar", file, tErrors("imageUnreadable"));
      const res = up.ok ? await updateAvatarAction(up.url) : up;
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {cropper}
      <FilePick
        onFile={send}
        disabled={busy}
        className={`group relative cursor-pointer rounded-full has-focus-visible:ring-2 has-focus-visible:ring-ink has-focus-visible:ring-offset-2 ${busy ? "animate-pulse" : ""}`}
      >
        <span className="sr-only">{busy ? t("photoSending") : t("photoChange")}</span>
        <Photo name={name} url={url} />
        {/* o selo de câmera: diz que a foto é clicável, sem cobrir o rosto */}
        <span
          aria-hidden="true"
          className="absolute right-1 bottom-1 flex size-9 items-center justify-center rounded-full border-2 border-white bg-ink text-white transition-transform group-hover:scale-110 md:right-2 md:bottom-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        </span>
      </FilePick>
      {error && (
        <p role="alert" className="m-0 text-sm font-semibold text-[#A3361B]">
          {error}
        </p>
      )}
    </div>
  );
}
