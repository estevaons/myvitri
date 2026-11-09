"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { getPathname } from "@/lib/i18n/navigation";
import type { VitrineContent } from "@/lib/vitrine/types";
import type { Update } from "./panels";
import { Field, H, Hint, Switch, TextInput } from "./ui";

const noop = () => () => {};
/** Origem real do site (localhost, domínio próprio…); vazio no servidor. */
const useOrigin = () => useSyncExternalStore(noop, () => window.location.origin, () => "");

const btn =
  "flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-[#E6E2DA] bg-white px-3.5 text-[13px] font-semibold text-ink no-underline transition-colors hover:border-[#D6D0C5] hover:bg-[#FAF9F7]";

function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const COPY = "M9 9h10v10H9zM5 15V5h10";
const CHECK = "M5 12l5 5 9-10";
const DOWNLOAD = "M12 3v12M7 10l5 5 5-5M5 21h14";

/** Hash curto da versão publicada: muda a URL das imagens quando ela muda, para o navegador não mostrar a antiga do cache. */
function versionKey(json: string) {
  let h = 5381;
  for (let i = 0; i < json.length; i++) h = (h * 33) ^ json.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** Passos do "Onde colar": chaves de `editor.share.where`, que marcam em <b> o nome do botão no app. */
type StepKey = "profile" | "igLinks" | "paste" | "ttSite" | "storyPost" | "storySticker" | "storyText";

/** Onde a pessoa cola o link (quem chega na vitrine vem da bio ou de um story) e o passo a passo no app. */
const WHERE = [
  {
    id: "instagram",
    name: "Instagram",
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
      </>
    ),
    steps: ["profile", "igLinks", "paste"],
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: <path d="M14 3.5v11a3.5 3.5 0 1 1-3.5-3.5M14 3.5c.4 2.6 2.4 4.6 5 4.9" />,
    steps: ["profile", "ttSite", "paste"],
  },
  {
    id: "stories",
    name: "Stories",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" strokeDasharray="3 2.4" />
        <path d="M12 8.5v7M8.5 12h7" />
      </>
    ),
    steps: ["storyPost", "storySticker", "storyText"],
  },
] satisfies { id: string; name: string; icon: ReactNode; steps: StepKey[] }[];

/** Uma rede por vez: abas com ícone e, embaixo, o passo a passo numerado. */
function WhereToPaste() {
  const t = useTranslations("editor.share");
  const [id, setId] = useState<(typeof WHERE)[number]["id"]>("instagram");
  const net = WHERE.find((n) => n.id === id)!;
  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label={t("network")} className="grid grid-cols-3 gap-[3px] rounded-[12px] bg-[#F4F2EE] p-[3px]">
        {WHERE.map((n) => (
          <button
            key={n.id}
            type="button"
            role="tab"
            aria-selected={n.id === id}
            onClick={() => setId(n.id)}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] border-0 text-[13px] transition-colors ${
              n.id === id ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "bg-transparent font-medium text-[#77726A] hover:text-ink"
            }`}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {n.icon}
            </svg>
            {n.name}
          </button>
        ))}
      </div>
      <ol role="tabpanel" aria-label={t("howTo", { name: net.name })} className="m-0 flex list-none flex-col gap-3 p-0 pl-0.5">
        {net.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span aria-hidden="true" className="flex size-6 flex-none items-center justify-center rounded-full bg-[#F4F2EE] text-xs font-semibold text-ink tabular-nums">
              {i + 1}
            </span>
            <span className="pt-0.5 text-sm leading-snug text-[#3A3A3A] [&_b]:font-semibold [&_b]:text-ink">{t.rich(`where.${step}`, { b: (s) => <b>{s}</b> })}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Imagem pronta, gerada a partir da versão publicada: prévia pequena e botão de baixar. */
function ShareImage({ src, file, title, text, tall }: { src: string; file: string; title: string; text: string; tall?: boolean }) {
  const t = useTranslations("editor.share");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-[14px] border border-[#EEEBE5] p-2.5">
      <div className={`flex h-40 items-center justify-center overflow-hidden rounded-[10px] bg-[#F4F2EE] ${state === "loading" ? "animate-pulse" : ""}`}>
        {state !== "error" ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagem gerada na hora pela rota da vitrine
          <img
            src={src}
            alt={t("previewAlt", { title })}
            // já carregada antes da hidratação, a imagem não dispara onLoad
            ref={(el) => {
              if (el?.complete && el.naturalWidth) setState("ok");
            }}
            onLoad={() => setState("ok")}
            onError={() => setState("error")}
            className={`max-h-full shadow-[0_2px_10px_rgba(17,17,17,0.12)] ${tall ? "h-[136px] w-auto" : "w-[88%]"} ${state === "ok" ? "" : "invisible"}`}
          />
        ) : (
          <span className="px-3 text-center text-xs text-[#8F897E]">{t("publishFirst")}</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-0.5">
        <span className="text-[13px] font-semibold">{title}</span>
        <Hint>{text}</Hint>
      </div>
      <a href={src} download={file} aria-disabled={state === "error"} className={`${btn} mt-auto min-h-10 ${state === "error" ? "pointer-events-none opacity-50" : ""}`}>
        <Icon d={DOWNLOAD} />
        {t("download")}
      </a>
    </div>
  );
}

export function SharePanel({
  draft,
  update,
  publishedHandle,
  publishedJson,
}: {
  draft: VitrineContent;
  update: Update;
  publishedHandle: string;
  publishedJson: string;
}) {
  const t = useTranslations("editor.share");
  const locale = useLocale();
  // as imagens saem no idioma em que a pessoa está editando (`/en/fulana/story` em inglês)
  const imagePath = getPathname({ href: `/${publishedHandle}`, locale });
  const v = versionKey(publishedJson);
  const dirty = JSON.stringify(draft) !== publishedJson;
  const origin = useOrigin();
  const url = origin ? `${origin}/${publishedHandle}` : "";
  const shortUrl = url.replace(/^https?:\/\//, "");
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  };

  const setTracking = (patch: Partial<VitrineContent["tracking"]>) => update((d) => ({ ...d, tracking: { ...d.tracking, ...patch } }));
  const campaign = draft.tracking.campaign || draft.handle;

  return (
    <div className="flex flex-col gap-[26px]">
      <div className="flex flex-col gap-2.5">
        <H>{t("yourLink")}</H>
        {/* o endereço inteiro é o botão de copiar: é o que a pessoa veio fazer aqui */}
        <button
          type="button"
          onClick={copy}
          disabled={!url}
          className="group flex items-center gap-3 rounded-[14px] border border-[#EEEBE5] bg-white p-3.5 text-left transition-colors hover:border-[#DDD8CF] hover:bg-[#FAF9F7]"
        >
          <span aria-hidden="true" className="flex size-11 flex-none items-center justify-center overflow-hidden rounded-full bg-[#F4F2EE] text-base font-semibold text-[#8F897E]">
            {draft.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto do bucket ou de URL arbitrária
              <img src={draft.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
            ) : (
              (draft.name || draft.handle).slice(0, 1).toUpperCase()
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-semibold tracking-[-0.01em]">{shortUrl}</span>
            <span className="text-xs text-[#77726A]">{copied ? t("copiedHint") : t("tapToCopy")}</span>
          </span>
          <span
            className={`flex size-9 flex-none items-center justify-center rounded-full transition-colors ${
              copied ? "bg-[#EAF5EE] text-[#1F6B3A]" : "bg-[#F4F2EE] text-[#5E5A52] group-hover:bg-[#ECE9E3]"
            }`}
          >
            <Icon d={copied ? CHECK : COPY} />
          </span>
          <span role="status" className="sr-only">
            {copied ? t("copied") : ""}
          </span>
        </button>
        {/* o link mostra sempre a versão publicada: avisa só quando o rascunho está diferente dela */}
        {dirty ? (
          <span className="flex items-start gap-2 rounded-[10px] bg-[#FFF6E5] px-3 py-2.5 text-[13px] leading-snug text-[#7A5200]">
            <span aria-hidden="true" className="mt-[5px] size-2 flex-none rounded-full bg-[#E8590C]" />
            {t("unpublished")}
          </span>
        ) : (
          <span className="flex items-center gap-2 text-[13px] text-[#5E5A52]">
            <span aria-hidden="true" className="size-2 flex-none rounded-full bg-[#2F9E5B]" />
            {t("live")}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <H>{t("whereTitle")}</H>
        <WhereToPaste />
      </div>

      <div className="flex flex-col gap-2.5">
        <H>{t("images")}</H>
        <div className="grid grid-cols-2 gap-2">
          <ShareImage
            // nova versão publicada recomeça o carregamento (e sai de um erro anterior)
            key={`story-${v}`}
            src={`${imagePath}/story?v=${v}`}
            file={`stories-${publishedHandle}.png`}
            title={t("storyTitle")}
            text={t("storyText")}
            tall
          />
          <ShareImage
            key={`opengraph-image-${v}`}
            src={`${imagePath}/opengraph-image?v=${v}`}
            file={`vitrine-${publishedHandle}.png`}
            title={t("ogTitle")}
            text={t("ogText")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold">{t("utmTitle")}</span>
            <Hint>{t("utmHint")}</Hint>
          </div>
          <Switch on={draft.tracking.utm} label={t("utmSwitch")} onToggle={() => setTracking({ utm: !draft.tracking.utm })} />
        </div>
        {draft.tracking.utm && (
          <Field
            label={t("campaign")}
            hint={t.rich("campaignHint", { campaign, code: (s) => <span className="break-all">{s}</span> })}
          >
            <TextInput value={draft.tracking.campaign} onChange={(c) => setTracking({ campaign: c.replace(/\s+/g, "-") })} maxLength={60} placeholder={draft.handle} />
          </Field>
        )}
      </div>
    </div>
  );
}
