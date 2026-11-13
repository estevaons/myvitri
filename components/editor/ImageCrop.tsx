"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { MAX_SIDE } from "./upload";

/** As fotos que passam pelo recorte antes de subir (o logo da marca não: é transparente e de qualquer formato). */
export type CropKind = "avatar" | "cover" | "product" | "post";

/**
 * O formato de cada lugar. Perfil: quadrado, mostrado redondo. Capa: 4:3, como no celular e na janela da capa (no computador
 * a vitrine mostra só a faixa 21:9 do meio, marcada no recorte). Produto: quadrado e pode afastar até caber inteiro, com
 * fundo branco, porque a vitrine mostra a foto da loja inteira. Outfit: 4:5, o card da vitrine.
 */
const SHAPE: Record<CropKind, { aspect: number; round?: boolean; fit?: boolean }> = {
  avatar: { aspect: 1, round: true },
  cover: { aspect: 4 / 3 },
  product: { aspect: 1, fit: true },
  post: { aspect: 4 / 5 },
};
/** a faixa da capa que aparece na vitrine no computador (`aspect-[21/9]` em Storefront) */
const DESKTOP_BAND = 21 / 9;
/** aproxima até 4× além de cobrir o quadro */
const MAX_ZOOM = 4;

type Photo = { el: HTMLImageElement; w: number; h: number; src: string };
/** O enquadramento: o centro do recorte em pixels da foto e o zoom (1 = o menor possível). */
type View = { cx: number; cy: number; z: number };

const between = (v: number, a: number, b: number) => Math.min(Math.max(v, Math.min(a, b)), Math.max(a, b));

/**
 * A geometria em "larguras de quadro": o quadro mede 1 de largura e 1/aspect de altura, e `s` é quanto do quadro um pixel
 * da foto ocupa. Assim o enquadramento não depende do tamanho da tela (só a conversão para px de CSS usa a largura medida).
 */
function geometry(p: Photo, aspect: number, fit: boolean) {
  const cover = Math.max(1 / p.w, 1 / aspect / p.h);
  const base = fit ? Math.min(1 / p.w, 1 / aspect / p.h) : cover;
  const zMax = (cover * MAX_ZOOM) / base;
  const clamp = (v: View): View => {
    const z = Math.min(Math.max(v.z, 1), zMax);
    const s = base * z;
    const hw = 0.5 / s;
    const hh = 0.5 / aspect / s;
    // maior que o quadro: não deixa aparecer borda; menor (só o produto afastado): não deixa sair do quadro
    return { z, cx: between(v.cx, hw, p.w - hw), cy: between(v.cy, hh, p.h - hh) };
  };
  return { base, zMax, clamp };
}

/** Desenha o recorte no tamanho em que a foto vai subir (sem ampliar) e devolve um PNG, que o envio converte para webp. */
async function render(p: Photo, v: View, aspect: number, base: number, kind: CropKind): Promise<File> {
  const s = base * v.z;
  const aw = 1 / s;
  const ah = 1 / aspect / s;
  const x0 = v.cx - aw / 2;
  const y0 = v.cy - ah / 2;
  const long = Math.max(1, Math.min(MAX_SIDE[kind], Math.round(Math.max(aw, ah))));
  const outW = aspect >= 1 ? long : Math.max(1, Math.round(long * aspect));
  const outH = aspect >= 1 ? Math.max(1, Math.round(long / aspect)) : long;
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  // o produto afastado deixa sobra: branco, como o fundo das fotos de loja
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, outW, outH);
  ctx.imageSmoothingQuality = "high";
  // a foto inteira com a transformação do recorte (recortar pela origem com coordenadas negativas falha em alguns navegadores)
  ctx.setTransform(outW / aw, 0, 0, outH / ah, (-x0 * outW) / aw, (-y0 * outH) / ah);
  ctx.drawImage(p.el, 0, 0, p.w, p.h);
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/png"));
  if (!blob) throw new Error("recorte inválido");
  return new File([blob], "recorte.png", { type: "image/png" });
}

type Job = { file: File; kind: CropKind; done: (f: File | null) => void };

/**
 * Recorte antes de enviar: `crop(arquivo, tipo)` abre a janela com o formato do lugar e devolve a foto recortada, ou
 * `null` se a pessoa cancelar. `cropper` é a janela: renderize-o em qualquer ponto do componente (vai por portal ao body).
 * Imagem que o navegador não abre volta como veio, para o envio mostrar o erro de sempre.
 */
export function useImageCrop() {
  const [job, setJob] = useState<Job | null>(null);
  const crop = useCallback((file: File, kind: CropKind) => new Promise<File | null>((done) => setJob({ file, kind, done })), []);
  const cropper = job
    ? createPortal(
        <CropDialog
          key={`${job.file.name}-${job.file.lastModified}-${job.kind}`}
          file={job.file}
          kind={job.kind}
          onDone={(f) => {
            setJob(null);
            job.done(f);
          }}
        />,
        document.body,
      )
    : null;
  return [cropper, crop] as const;
}

function CropDialog({ file, kind, onDone }: { file: File; kind: CropKind; onDone: (f: File | null) => void }) {
  const t = useTranslations("crop");
  const { aspect, round = false, fit = false } = SHAPE[kind];
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [fw, setFw] = useState(0);
  const [saving, setSaving] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  // o onDone muda a cada render; os efeitos só rodam uma vez
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  // abre como modal, por cima da janela de edição se houver uma aberta. Fechar por fora (Esc) é cancelar; ao concluir, a
  // janela desmonta e a limpeza tira o listener antes de fechar.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (!d.open) {
      d.showModal();
      // o showModal() põe o foco no X; fica na própria janela, e o Tab leva à área do recorte (setas movem, +/- aproximam)
      d.focus();
    }
    // o evento chega numa tarefa à parte: o de um fechamento antigo (o React em desenvolvimento monta, desmonta e monta
    // de novo) não pode cancelar a janela que já reabriu
    const closed = () => {
      if (!d.open) done.current(null);
    };
    d.addEventListener("close", closed);
    return () => {
      d.removeEventListener("close", closed);
      if (d.open) d.close();
    };
  }, []);

  // carrega a foto do aparelho
  useEffect(() => {
    const src = URL.createObjectURL(file);
    const el = new Image();
    el.src = src;
    let alive = true;
    el.decode().then(
      () => {
        if (!alive) return;
        // SVG sem width/height vem com 0: trata como o tamanho máximo
        const w = el.naturalWidth || MAX_SIDE[kind];
        const h = el.naturalHeight || MAX_SIDE[kind];
        setPhoto({ el, w, h, src });
        setView({ cx: w / 2, cy: h / 2, z: 1 });
      },
      () => alive && done.current(file),
    );
    return () => {
      alive = false;
      URL.revokeObjectURL(src);
    };
  }, [file, kind]);

  // a largura do quadro na tela, para converter o arrasto em pixels da foto
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setFw(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = photo ? geometry(photo, aspect, fit) : null;

  /** Move o recorte `dx, dy` px de tela (a foto segue o dedo). */
  const pan = (dx: number, dy: number) => {
    if (!geo || !fw) return;
    setView((v) => v && geo.clamp({ ...v, cx: v.cx - dx / (geo.base * v.z * fw), cy: v.cy - dy / (geo.base * v.z * fw) }));
  };
  /** Zoom em torno de um ponto da tela (o centro do quadro, se não vier), mantendo parado o que está embaixo dele. */
  const zoomTo = (z: (old: number) => number, at?: { x: number; y: number }) => {
    if (!geo || !fw) return;
    const r = frame.current?.getBoundingClientRect();
    const fx = at && r ? at.x - (r.left + r.width / 2) : 0;
    const fy = at && r ? at.y - (r.top + r.height / 2) : 0;
    setView((v) => {
      if (!v) return v;
      const next = geo.clamp({ ...v, z: z(v.z) });
      const s0 = geo.base * v.z * fw;
      const s1 = geo.base * next.z * fw;
      return geo.clamp({ z: next.z, cx: v.cx + fx / s0 - fx / s1, cy: v.cy + fy / s0 - fy / s1 });
    });
  };

  // roda do mouse/trackpad: o listener do React é passivo e não deixa impedir a rolagem da página
  const wheel = useRef<(e: WheelEvent) => void>(() => {});
  useEffect(() => {
    wheel.current = (e) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      zoomTo((z) => z * Math.exp(-dy * 0.0015), { x: e.clientX, y: e.clientY });
    };
  });
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const on = (e: WheelEvent) => wheel.current(e);
    el.addEventListener("wheel", on, { passive: false });
    return () => el.removeEventListener("wheel", on);
  }, []);

  // arrastar com um dedo (ou o mouse) move; com dois, pinça
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const all = pointers.current;
    const prev = all.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    all.set(e.pointerId, cur);
    if (all.size === 1) return pan(cur.x - prev.x, cur.y - prev.y);
    const other = [...all.entries()].find(([id]) => id !== e.pointerId)?.[1];
    if (!other) return;
    const before = Math.hypot(prev.x - other.x, prev.y - other.y);
    const after = Math.hypot(cur.x - other.x, cur.y - other.y);
    if (before > 0) zoomTo((z) => (z * after) / before, { x: (cur.x + other.x) / 2, y: (cur.y + other.y) / 2 });
    pan((cur.x - prev.x) / 2, (cur.y - prev.y) / 2);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
  };
  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 40 : 10;
    const act: Record<string, () => void> = {
      ArrowLeft: () => pan(step, 0),
      ArrowRight: () => pan(-step, 0),
      ArrowUp: () => pan(0, step),
      ArrowDown: () => pan(0, -step),
      "+": () => zoomTo((z) => z * 1.1),
      "=": () => zoomTo((z) => z * 1.1),
      "-": () => zoomTo((z) => z / 1.1),
    };
    const fn = act[e.key];
    if (!fn) return;
    e.preventDefault();
    fn();
  };

  const confirm = async () => {
    if (!photo || !view || !geo) return;
    setSaving(true);
    try {
      done.current(await render(photo, view, aspect, geo.base, kind));
    } catch {
      // sem recorte, sobe a foto como veio (o envio reduz e mostra o erro, se houver)
      done.current(file);
    }
  };

  const px = photo && view && geo && fw ? geo.base * view.z * fw : 0;
  const fh = fw / aspect;

  return (
    <dialog
      ref={dialog}
      aria-label={t("title")}
      tabIndex={-1}
      className="box-border flex max-h-[96dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[20px] border-0 bg-white p-0 text-ink outline-none backdrop:bg-ink/60 max-sm:mt-auto max-sm:mb-0 motion-safe:animate-sheet-up sm:m-auto sm:w-[calc(100%-32px)] sm:max-w-[560px] sm:rounded-[20px] [&:not([open])]:hidden"
    >
      <header className="flex flex-none items-center justify-between gap-3 border-b border-[#EEEBE5] py-2 pr-2 pl-5">
        <h2 className="m-0 truncate text-[17px] font-semibold">{t("title")}</h2>
        <button
          type="button"
          onClick={() => done.current(null)}
          aria-label={t("cancel")}
          className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink hover:bg-[#F4F2EE]"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {/* o palco: a foto fora do quadro aparece escurecida, para mostrar o que fica de fora */}
        <div
          ref={stage}
          tabIndex={0}
          role="group"
          aria-label={t("area")}
          aria-roledescription={t("roledescription")}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={keys}
          className="relative flex flex-none cursor-grab touch-none items-center justify-center overflow-hidden bg-[#1C1B19] px-6 py-6 outline-none select-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-inset"
        >
          <div ref={frame} className="relative" style={{ width: `min(100%, calc(min(56dvh, 480px) * ${aspect}))`, aspectRatio: aspect }}>
            {/* o produto afastado: o branco do quadro é o fundo que sobe junto */}
            {fit && photo && <span aria-hidden="true" className="absolute inset-0 bg-white" />}
            {photo && view && px > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto do aparelho, ainda sem subir
              <img
                src={photo.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{ width: photo.w * px, height: photo.h * px, left: fw / 2 - view.cx * px, top: fh / 2 - view.cy * px, background: fit ? "#fff" : undefined }}
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-[13px] text-white/70">{t("loading")}</span>
            )}
            {/* tudo fora do quadro escurece; o quadro tem um contorno claro */}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 shadow-[0_0_0_9999px_rgba(28,27,25,0.62)] ring-1 ring-white/85 ${round ? "rounded-full" : ""}`}
            />
            {kind === "cover" && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 border-y border-dashed border-white/80"
                style={{ top: `${((1 - aspect / DESKTOP_BAND) / 2) * 100}%`, bottom: `${((1 - aspect / DESKTOP_BAND) / 2) * 100}%` }}
              >
                <span className="absolute top-1.5 left-2 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                  {t("desktop")}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 px-5 pt-4 pb-2">
          <label className="flex items-center gap-3">
            <span className="sr-only">{t("zoom")}</span>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-none text-[#8F897E]">
              <circle cx="11" cy="11" r="7" />
              <path d="M8 11h6M20 20l-3.5-3.5" />
            </svg>
            <input
              type="range"
              min={1}
              max={geo?.zMax ?? 1}
              step={0.01}
              value={view?.z ?? 1}
              disabled={!geo}
              onChange={(e) => zoomTo(() => Number(e.target.value))}
              className="h-11 min-w-0 flex-1 cursor-pointer accent-ink"
            />
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-none text-[#8F897E]">
              <circle cx="11" cy="11" r="7" />
              <path d="M8 11h6M11 8v6M20 20l-3.5-3.5" />
            </svg>
          </label>
          <p className="m-0 text-[13px] leading-snug text-[#5E5A52]">
            {t(`hint.${kind}`)} <span className="pointer-coarse:hidden">{t("hintMouse")}</span>
            <span className="pointer-fine:hidden">{t("hintTouch")}</span>
          </p>
        </div>
      </div>

      <footer className="flex flex-none items-center justify-end gap-2 border-t border-[#EEEBE5] bg-white px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <button type="button" onClick={() => done.current(null)} className="min-h-11 cursor-pointer rounded-full border-0 bg-transparent px-5 text-sm font-semibold text-ink hover:bg-[#F4F2EE]">
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={!photo || saving}
          className="min-h-11 cursor-pointer rounded-full border-0 bg-ink px-7 text-sm font-semibold text-white hover:opacity-85 disabled:cursor-default disabled:opacity-40"
        >
          {t("confirm")}
        </button>
      </footer>
    </dialog>
  );
}
