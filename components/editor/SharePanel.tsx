"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
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
    steps: [
      <>No seu perfil, toque em <b>Editar perfil</b></>,
      <>Toque em <b>Links</b> e depois em <b>Adicionar link externo</b></>,
      <>Cole o link da vitrine e salve</>,
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: <path d="M14 3.5v11a3.5 3.5 0 1 1-3.5-3.5M14 3.5c.4 2.6 2.4 4.6 5 4.9" />,
    steps: [
      <>No seu perfil, toque em <b>Editar perfil</b></>,
      <>Toque em <b>Site</b></>,
      <>Cole o link da vitrine e salve</>,
    ],
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
    steps: [
      <>Poste a imagem de stories daqui de baixo (ou qualquer story)</>,
      <>Toque em <b>Figurinhas</b> e escolha <b>Link</b></>,
      <>Cole o link e escreva algo como “meus cupons”</>,
    ],
  },
] satisfies { id: string; name: string; icon: ReactNode; steps: ReactNode[] }[];

/** Uma rede por vez: abas com ícone e, embaixo, o passo a passo numerado. */
function WhereToPaste() {
  const [id, setId] = useState<(typeof WHERE)[number]["id"]>("instagram");
  const net = WHERE.find((n) => n.id === id)!;
  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Rede social" className="grid grid-cols-3 gap-[3px] rounded-[12px] bg-[#F4F2EE] p-[3px]">
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
      <ol role="tabpanel" aria-label={`Como colar no ${net.name}`} className="m-0 flex list-none flex-col gap-3 p-0 pl-0.5">
        {net.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span aria-hidden="true" className="flex size-6 flex-none items-center justify-center rounded-full bg-[#F4F2EE] text-xs font-semibold text-ink tabular-nums">
              {i + 1}
            </span>
            <span className="pt-0.5 text-sm leading-snug text-[#3A3A3A] [&_b]:font-semibold [&_b]:text-ink">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Imagem pronta, gerada a partir da versão publicada: prévia pequena e botão de baixar. */
function ShareImage({ src, file, title, text, tall }: { src: string; file: string; title: string; text: string; tall?: boolean }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-[14px] border border-[#EEEBE5] p-2.5">
      <div className={`flex h-40 items-center justify-center overflow-hidden rounded-[10px] bg-[#F4F2EE] ${state === "loading" ? "animate-pulse" : ""}`}>
        {state !== "error" ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagem gerada na hora pela rota da vitrine
          <img
            src={src}
            alt={`Prévia: ${title}`}
            // já carregada antes da hidratação, a imagem não dispara onLoad
            ref={(el) => {
              if (el?.complete && el.naturalWidth) setState("ok");
            }}
            onLoad={() => setState("ok")}
            onError={() => setState("error")}
            className={`max-h-full shadow-[0_2px_10px_rgba(17,17,17,0.12)] ${tall ? "h-[136px] w-auto" : "w-[88%]"} ${state === "ok" ? "" : "invisible"}`}
          />
        ) : (
          <span className="px-3 text-center text-xs text-[#8F897E]">Publique a vitrine para gerar a imagem.</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-0.5">
        <span className="text-[13px] font-semibold">{title}</span>
        <Hint>{text}</Hint>
      </div>
      <a href={src} download={file} aria-disabled={state === "error"} className={`${btn} mt-auto min-h-10 ${state === "error" ? "pointer-events-none opacity-50" : ""}`}>
        <Icon d={DOWNLOAD} />
        Baixar
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
        <H>Seu link</H>
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
            <span className="text-xs text-[#77726A]">{copied ? "Copiado! Agora é só colar na bio." : "Toque para copiar"}</span>
          </span>
          <span
            className={`flex size-9 flex-none items-center justify-center rounded-full transition-colors ${
              copied ? "bg-[#EAF5EE] text-[#1F6B3A]" : "bg-[#F4F2EE] text-[#5E5A52] group-hover:bg-[#ECE9E3]"
            }`}
          >
            <Icon d={copied ? CHECK : COPY} />
          </span>
          <span role="status" className="sr-only">
            {copied ? "Link copiado" : ""}
          </span>
        </button>
        {/* o link mostra sempre a versão publicada: avisa só quando o rascunho está diferente dela */}
        {dirty ? (
          <span className="flex items-start gap-2 rounded-[10px] bg-[#FFF6E5] px-3 py-2.5 text-[13px] leading-snug text-[#7A5200]">
            <span aria-hidden="true" className="mt-[5px] size-2 flex-none rounded-full bg-[#E8590C]" />
            Você tem mudanças não publicadas. Publique para elas aparecerem no link e nas imagens.
          </span>
        ) : (
          <span className="flex items-center gap-2 text-[13px] text-[#5E5A52]">
            <span aria-hidden="true" className="size-2 flex-none rounded-full bg-[#2F9E5B]" />
            No ar com a última versão
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <H>Onde colar</H>
        <WhereToPaste />
      </div>

      <div className="flex flex-col gap-2.5">
        <H>Imagens prontas</H>
        <div className="grid grid-cols-2 gap-2">
          <ShareImage
            // nova versão publicada recomeça o carregamento (e sai de um erro anterior)
            key={`story-${v}`}
            src={`/${publishedHandle}/story?v=${v}`}
            file={`stories-${publishedHandle}.png`}
            title="Stories"
            text="Poste e cole a figurinha de link por cima."
            tall
          />
          <ShareImage
            key={`opengraph-image-${v}`}
            src={`/${publishedHandle}/opengraph-image?v=${v}`}
            file={`vitrine-${publishedHandle}.png`}
            title="Prévia do link"
            text="Aparece sozinha quando mandam seu link no WhatsApp."
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold">Identificar minhas vendas (UTM)</span>
            <Hint>As marcas veem no analytics delas que a visita veio de você.</Hint>
          </div>
          <Switch on={draft.tracking.utm} label="Adicionar UTM aos links das lojas" onToggle={() => setTracking({ utm: !draft.tracking.utm })} />
        </div>
        {draft.tracking.utm && (
          <Field
            label="Nome da campanha"
            hint={
              <>
                Os links de loja dos cupons ganham <span className="break-all">utm_source=myvitri&amp;utm_medium=creator&amp;utm_campaign={campaign}</span>. Os
                links de produto ficam como você colou.
              </>
            }
          >
            <TextInput value={draft.tracking.campaign} onChange={(c) => setTracking({ campaign: c.replace(/\s+/g, "-") })} maxLength={60} placeholder={draft.handle} />
          </Field>
        )}
      </div>
    </div>
  );
}
