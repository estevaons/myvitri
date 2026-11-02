"use client";

import QRCode from "qrcode";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { VitrineContent } from "@/lib/vitrine/types";
import type { Update } from "./panels";
import { Field, H, Hint, Switch, TextInput } from "./ui";

const noop = () => () => {};
/** Origem real do site (localhost, domínio próprio…); vazio no servidor. */
const useOrigin = () => useSyncExternalStore(noop, () => window.location.origin, () => "");

const btn = "flex min-h-11 items-center justify-center rounded-xl border-[1.5px] border-[#D6D0C5] bg-white px-3.5 text-[13px] font-bold text-ink no-underline";

function download(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

export function SharePanel({ draft, update, publishedHandle }: { draft: VitrineContent; update: Update; publishedHandle: string }) {
  const origin = useOrigin();
  const url = origin ? `${origin}/${publishedHandle}` : "";
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#111111", light: "#FFFFFF" } }).then((svg) => alive && setQr(svg));
    return () => {
      alive = false;
    };
  }, [url]);

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
        <div className="flex gap-2">
          <span className="flex h-[46px] min-w-0 flex-1 items-center truncate rounded-xl bg-[#F7F6F3] px-3 text-[15px]">{url.replace(/^https?:\/\//, "")}</span>
          <button type="button" onClick={copy} className={`${btn} flex-none`}>
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
        <Hint>Cole na bio do Instagram e do TikTok. Os outros recursos daqui usam a versão publicada.</Hint>
      </div>

      <div className="flex flex-col gap-2.5">
        <H>QR code</H>
        <div className="flex items-center gap-3.5">
          <div
            aria-label={`QR code de ${url}`}
            role="img"
            className="size-[132px] flex-none overflow-hidden rounded-[14px] border border-[#EEEBE5] bg-white p-1.5 [&>svg]:block [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <div className="flex flex-col gap-2">
            <Hint>Para colar em embalagem, evento ou no fim dos vídeos.</Hint>
            <button
              type="button"
              disabled={!url}
              onClick={async () => download(await QRCode.toDataURL(url, { width: 1024, margin: 2 }), `qr-${publishedHandle}.png`)}
              className={btn}
            >
              Baixar PNG
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <H>Imagens para divulgar</H>
        <div className="grid grid-cols-2 gap-2">
          <a href={`/${publishedHandle}/story`} download={`stories-${publishedHandle}.png`} className={btn}>
            Imagem para stories
          </a>
          <a href={`/${publishedHandle}/opengraph-image`} download={`vitrine-${publishedHandle}.png`} className={btn}>
            Imagem do link
          </a>
        </div>
        <Hint>A de stories já vem com o QR code. A do link é a prévia que aparece quando alguém compartilha sua vitrine no WhatsApp.</Hint>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm font-bold">Identificar minhas vendas (UTM)</span>
            <Hint>As marcas veem no analytics delas que a visita veio de você.</Hint>
          </div>
          <Switch on={draft.tracking.utm} label="Adicionar UTM aos links das lojas" onToggle={() => setTracking({ utm: !draft.tracking.utm })} />
        </div>
        {draft.tracking.utm && (
          <Field
            label="Nome da campanha"
            hint={
              <>
                Os links ganham <span className="break-all">utm_source=vitri&amp;utm_medium=creator&amp;utm_campaign={campaign}</span>. Links de afiliado
                ficam como estão.
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
