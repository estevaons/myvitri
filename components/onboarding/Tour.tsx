"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { finishTourAction } from "@/app/actions";
import { TOUR_EVENT, TOUR_PARAM, type TourId } from "@/lib/onboarding/tours";

/**
 * Tour guiado: escurece a página e destaca um elemento por vez, com um cartão de explicação ao lado (no celular, preso
 * embaixo da tela). Abre sozinho na primeira visita (`autoStart`), quando o menu da conta dispara `TOUR_EVENT` ou com
 * `?tour=1` na URL. Concluir ou pular grava o tour como visto (`finishTourAction`).
 *
 * É um `<dialog>` modal de tela inteira: fica na top layer (acima dos cabeçalhos presos), deixa o resto da página inerte
 * (o elemento destacado não recebe clique durante o tour) e o Esc pula. O destaque é um retângulo vazado por uma sombra
 * enorme, que anda de um alvo para o outro.
 */

export type TourStep = {
  /**
   * seletor CSS do que destacar; sem ele (ou se nada estiver na tela) o cartão fica no centro. Se o seletor pega mais de
   * um elemento (ex.: o título "Explorar" e a barra de busca e abas), o destaque cobre a área que junta todos
   */
  target?: string;
  title: string;
  text: string;
};

type Rect = { top: number; left: number; width: number; height: number };

/** Respiro em volta do elemento destacado. */
const PAD = 8;
/** Distância entre o destaque e o cartão, e do cartão às bordas da tela. */
const GAP = 16;
/** Faixa do topo que os cabeçalhos presos (editor, barra da home) podem cobrir: o alvo não para embaixo dela. */
const TOP_SAFE = 88;
/** Abaixo disso o cartão vira uma folha presa embaixo da tela. */
const MOBILE = 640;
const CARD_W = 380;
/** Espera para abrir sozinho: as imagens e a fonte assentam e a página para de mudar de tamanho. */
const AUTO_DELAY = 700;

/**
 * Retângulo do alvo na tela: a união dos elementos que o seletor pega e que têm tamanho (o `display: none` de uma
 * quebra de layout conta como ausente). `null` se nenhum estiver na tela.
 */
function measure(target?: string): Rect | null {
  if (!target) return null;
  let box: { top: number; left: number; right: number; bottom: number } | null = null;
  for (const el of document.querySelectorAll(target)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    box = box
      ? { top: Math.min(box.top, r.top), left: Math.min(box.left, r.left), right: Math.max(box.right, r.right), bottom: Math.max(box.bottom, r.bottom) }
      : { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
  }
  return box && { top: box.top, left: box.left, width: box.right - box.left, height: box.bottom - box.top };
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const seenKey = (id: TourId) => `vitri:tour:${id}`;

function rememberSeen(id: TourId) {
  try {
    sessionStorage.setItem(seenKey(id), "1");
  } catch {}
}
function seenThisSession(id: TourId) {
  try {
    return sessionStorage.getItem(seenKey(id)) === "1";
  } catch {
    return false;
  }
}

export function Tour({ id, steps, autoStart }: { id: TourId; steps: TourStep[]; autoStart: boolean }) {
  const t = useTranslations("tour");
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  // os passos do tour aberto (só os que têm o alvo na tela) e se ele foi reaberto à mão
  const [run, setRun] = useState<{ steps: TourStep[]; manual: boolean } | null>(null);
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<Rect | null>(null);
  const [cardSize, setCardSize] = useState({ w: CARD_W, h: 240 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const step = run?.steps[index];
  const total = run?.steps.length ?? 0;
  const last = index === total - 1;

  const start = useCallback(
    (manual: boolean) => {
      const visible = steps.filter((s) => !s.target || measure(s.target));
      if (visible.length === 0) return;
      // já com o tamanho da tela: o cartão nasce visível e o botão principal pode receber o foco
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      setIndex(0);
      setRun({ steps: visible, manual });
    },
    [steps],
  );

  const finish = useCallback(
    (outcome: "done" | "skipped") => {
      if (!run) return;
      rememberSeen(id);
      void finishTourAction(id, outcome, index + 1, run.steps.length, run.manual);
      dialog.current?.close();
      setRun(null);
      setSpot(null);
    },
    [id, index, run],
  );

  // abrir: sozinho (primeira visita), por ?tour=1 ou pelo evento do menu da conta
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get(TOUR_PARAM) === "1";
    if (fromUrl) {
      url.searchParams.delete(TOUR_PARAM);
      window.history.replaceState(window.history.state, "", url);
    }
    const timer = fromUrl || (autoStart && !seenThisSession(id)) ? setTimeout(() => start(fromUrl), AUTO_DELAY) : undefined;
    const onEvent = (e: Event) => {
      // avisa quem disparou que esta página tem tour
      e.preventDefault();
      start(true);
    };
    window.addEventListener(TOUR_EVENT, onEvent);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(TOUR_EVENT, onEvent);
    };
  }, [autoStart, id, start]);

  // abre o <dialog> e, a cada passo, põe o foco no botão principal (Enter avança)
  useEffect(() => {
    const d = dialog.current;
    if (!run || !d) return;
    if (!d.open) d.showModal();
    primary.current?.focus({ preventScroll: true });
  }, [run, index]);

  // o tamanho do cartão decide onde ele cabe (e quanto espaço o alvo tem acima dele no celular)
  useLayoutEffect(() => {
    const el = card.current;
    if (!run || !el) return;
    const measure = () => setCardSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [run]);

  // a cada passo: rola a página até o alvo (centrado no espaço que sobra fora do cartão)
  useEffect(() => {
    if (!step) return;
    const r = measure(step.target);
    if (!r) return;
    const vh = window.innerHeight;
    const bottom = cardSize.h + GAP * 2;
    const room = vh - TOP_SAFE - bottom;
    // cabe com o cartão embaixo: centraliza; mais alto que isso (uma seção inteira do editor): encosta no topo
    const desired = r.height <= room ? TOP_SAFE + (room - r.height) / 2 : TOP_SAFE;
    if (Math.abs(r.top - desired) > 4) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - desired), behavior: reducedMotion() ? "auto" : "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao trocar de passo; o cartão mudar de altura não rola de novo
  }, [step]);

  // acompanha o alvo enquanto a página rola (inclusive a rolagem suave acima) ou muda de tamanho
  useEffect(() => {
    if (!step) return;
    let frame = 0;
    let prev = "";
    const tick = () => {
      const r = measure(step.target);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const next: Rect | null = r && { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
      const key = JSON.stringify([next, vw, vh]);
      if (key !== prev) {
        prev = key;
        setSpot(next);
        setViewport({ w: vw, h: vh });
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [step]);

  if (!run || !step) return <dialog ref={dialog} />;

  const { w: vw, h: vh } = viewport;
  const mobile = vw > 0 && vw < MOBILE;
  const cardW = Math.min(CARD_W, vw - GAP * 2);

  // o destaque, preso à tela; alto demais (seção inteira), mostra só o começo, deixando lugar para o cartão
  let hole: Rect | null = null;
  if (spot && vw > 0) {
    const top = Math.max(spot.top, 4);
    const left = Math.max(spot.left, 4);
    const right = Math.min(spot.left + spot.width, vw - 4);
    let bottom = Math.min(spot.top + spot.height, vh - 4);
    const fitsAbove = top - cardSize.h - GAP * 2 >= 0;
    const floor = vh - cardSize.h - GAP * 2;
    if (bottom > floor && (mobile || !fitsAbove)) bottom = Math.max(top + 64, floor);
    hole = bottom > top && right > left ? { top, left, width: right - left, height: bottom - top } : null;
  }

  // o cartão: embaixo do destaque se couber, senão em cima, senão no pé da tela; sem destaque, no centro
  let cardTop: number;
  let cardLeft: number;
  if (mobile) {
    cardTop = vh - cardSize.h - 12;
    cardLeft = (vw - cardW) / 2;
  } else if (!hole) {
    cardTop = (vh - cardSize.h) / 2;
    cardLeft = (vw - cardW) / 2;
  } else {
    const below = hole.top + hole.height + GAP;
    const above = hole.top - GAP - cardSize.h;
    cardTop = below + cardSize.h <= vh - GAP ? below : above >= GAP ? above : vh - cardSize.h - GAP;
    cardLeft = Math.min(Math.max(hole.left + hole.width / 2 - cardW / 2, GAP), vw - cardW - GAP);
  }

  // sem alvo, o "buraco" é um ponto no centro: a sombra cobre a tela toda e o destaque cresce a partir dali
  const shape = hole ?? { top: vh / 2, left: vw / 2, width: 0, height: 0 };
  const move = "transition-[top,left,width,height] duration-300 ease-out motion-reduce:transition-none";

  return (
    <dialog
      ref={dialog}
      aria-labelledby="tour-titulo"
      aria-describedby="tour-texto"
      onCancel={(e) => {
        // Esc: pula o tour (fecha por aqui, para gravar como visto)
        e.preventDefault();
        finish("skipped");
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" && !last) setIndex((i) => i + 1);
        if (e.key === "ArrowLeft" && index > 0) setIndex((i) => i - 1);
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-transparent"
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed rounded-[3px] ${move} ${hole ? "outline-2 outline-offset-0 outline-white" : ""}`}
        style={{ ...shape, boxShadow: "0 0 0 200vmax rgba(17, 17, 17, 0.62)" }}
      />

      <div
        ref={card}
        className={`fixed flex flex-col gap-4 bg-white p-6 shadow-[0_24px_60px_-20px_rgba(17,17,17,0.5)] ${mobile ? "" : move} ${vw === 0 ? "invisible" : ""}`}
        style={{ top: cardTop, left: cardLeft, width: cardW }}
      >
        <div key={index} className="flex flex-col gap-2.5 motion-safe:animate-rise-in" aria-live="polite">
          <span className="text-[11px] font-medium tracking-[0.22em] text-gold uppercase">{t("step", { current: index + 1, total })}</span>
          <h2 id="tour-titulo" className="m-0 font-display text-[clamp(24px,2.4vw,28px)] leading-[1.1] font-normal text-balance">
            {step.title}
          </h2>
          <p id="tour-texto" className="m-0 text-[15px] leading-relaxed text-ink/75">
            {step.text}
          </p>
        </div>

        {/* o progresso: um traço por passo */}
        <div aria-hidden="true" className="flex gap-1">
          {run.steps.map((s, i) => (
            <span key={i} className={`h-0.5 flex-1 transition-colors ${i <= index ? "bg-ink" : "bg-sand"}`} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          {last ? (
            <span />
          ) : (
            <button type="button" onClick={() => finish("skipped")} className="min-h-11 cursor-pointer border-0 bg-transparent px-0 text-[13px] text-mute underline underline-offset-4 hover:text-ink">
              {t("skip")}
            </button>
          )}
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="min-h-11 cursor-pointer border border-sand bg-white px-4 text-[12px] font-medium tracking-[0.18em] text-ink uppercase hover:border-ink"
              >
                {t("back")}
              </button>
            )}
            <button
              ref={primary}
              type="button"
              onClick={() => (last ? finish("done") : setIndex((i) => i + 1))}
              className="min-h-11 cursor-pointer border-0 bg-ink px-5 text-[12px] font-medium tracking-[0.18em] text-white uppercase hover:bg-[#2b2925]"
            >
              {last ? t("finish") : index === 0 ? t("start") : t("next")}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
