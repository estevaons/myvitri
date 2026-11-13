"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

/** Com o mouse, o arrastar começa depois de mexer isto (px); antes disso é um clique. */
const MOUSE_SLOP = 6;
/** No toque, segurar o dedo parado por este tempo (ms) pega o card; mexer mais que TOUCH_SLOP antes disso é rolar a página. */
const TOUCH_HOLD = 350;
const TOUCH_SLOP = 8;
/** Perto desta distância (px) da borda da tela (ou do carrossel), a página rola sozinha enquanto arrasta. */
const EDGE = 90;

const speed = (depth: number) => Math.min(20, Math.ceil(depth / 4));

/**
 * Reordenar arrastando, no próprio lugar (a grade de produtos, o carrossel de cupons). Cada card leva
 * `data-reorder-id={id}` e é filho direto da lista; o botão que cobre o card recebe `handle(id)`. Enquanto o card passa
 * por cima de outro, `onMove(de, para)` troca os dois de lugar na hora (a lista é re-renderizada e o card segue o dedo).
 *
 * Mouse: arrastar a partir de 6px; um clique sem arrastar continua abrindo a edição. Toque: segurar o dedo parado pega o
 * card (rolar a página continua funcionando). Teclado: com o card em foco, ← e → mudam a posição.
 */
export function useDragReorder(ids: string[], onMove: (from: string, to: string) => void, enabled: boolean) {
  const [dragging, setDragging] = useState<string | null>(null);
  const latest = useRef({ ids, onMove });
  useEffect(() => {
    latest.current = { ids, onMove };
  });
  // estado do gesto em andamento, lido pelos ouvintes do documento
  const gesture = useRef<{ active: boolean; end: () => void } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // com o card pego, o dedo arrasta o card em vez de rolar a página; segurando o dedo, nada de menu do navegador. Os
    // ouvintes ficam no documento desde antes do toque: só assim o navegador espera por eles antes de rolar.
    const block = (e: Event) => {
      if (gesture.current?.active && e.cancelable) e.preventDefault();
    };
    const menu = (e: Event) => {
      if (gesture.current) e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    document.addEventListener("contextmenu", menu);
    return () => {
      document.removeEventListener("touchmove", block);
      document.removeEventListener("contextmenu", menu);
      gesture.current?.end();
    };
  }, [enabled]);

  const onPointerDown = (id: string) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || gesture.current) return;
    const item = e.currentTarget.closest<HTMLElement>("[data-reorder-id]");
    const list = item?.parentElement;
    if (!item || !list) return;
    const touch = e.pointerType !== "mouse";
    const pointerId = e.pointerId;
    const start = { x: e.clientX, y: e.clientY };
    let pos = start;
    // onde estavam a página, a lista e o card quando ele foi pego
    let base = { sx: 0, sy: 0, lx: 0, ly: 0, ox: 0, oy: 0, snap: "", maxX: 0, maxY: 0 };
    let over: string | null = null;
    let frame = 0;
    let timer = 0;

    // o card segue o ponteiro; offsetLeft/Top dão o lugar dele na lista sem o transform, que muda a cada troca
    const place = () => {
      const x = pos.x - start.x + (scrollX - base.sx) + (list.scrollLeft - base.lx) - (item.offsetLeft - base.ox);
      const y = pos.y - start.y + (scrollY - base.sy) + (list.scrollTop - base.ly) - (item.offsetTop - base.oy);
      item.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    // o card de baixo do ponteiro troca de lugar com o pego (uma vez por card: até a lista re-renderizar, ele continua ali)
    const hit = () => {
      let target: string | null = null;
      for (const el of list.children) {
        if (!(el instanceof HTMLElement) || el === item || !el.dataset.reorderId) continue;
        const r = el.getBoundingClientRect();
        if (pos.x >= r.left && pos.x <= r.right && pos.y >= r.top && pos.y <= r.bottom) target = el.dataset.reorderId;
      }
      if (target && target !== over) latest.current.onMove(id, target);
      over = target;
    };

    const tick = () => {
      // até o fim de antes de pegar o card: o próprio card, deslocado, alarga a lista e a página e as faria rolar sem parar
      const r = list.getBoundingClientRect();
      if (base.maxX > 0) {
        const left = Math.max(r.left, 0) + EDGE;
        const right = Math.min(r.right, innerWidth) - EDGE;
        if (pos.x < left) list.scrollLeft -= speed(left - pos.x);
        else if (pos.x > right) list.scrollLeft = Math.min(base.maxX, list.scrollLeft + speed(pos.x - right));
      }
      if (pos.y < EDGE) scrollBy(0, -speed(EDGE - pos.y));
      else if (pos.y > innerHeight - EDGE && scrollY < base.maxY) scrollBy(0, Math.min(base.maxY - scrollY, speed(pos.y - innerHeight + EDGE)));
      place();
      hit();
      frame = requestAnimationFrame(tick);
    };

    const activate = () => {
      base = {
        sx: scrollX,
        sy: scrollY,
        lx: list.scrollLeft,
        ly: list.scrollTop,
        ox: item.offsetLeft,
        oy: item.offsetTop,
        snap: list.style.scrollSnapType,
        maxX: list.scrollWidth - list.clientWidth,
        maxY: document.documentElement.scrollHeight - innerHeight,
      };
      // o carrossel "encaixa" a rolagem: sem isso, a rolagem automática volta para o card de antes
      list.style.scrollSnapType = "none";
      document.body.style.cursor = "grabbing";
      g.active = true;
      setDragging(id);
      if (touch) navigator.vibrate?.(10);
      frame = requestAnimationFrame(tick);
    };

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      pos = { x: ev.clientX, y: ev.clientY };
      if (!g.active) {
        const dist = Math.hypot(pos.x - start.x, pos.y - start.y);
        if (touch && dist > TOUCH_SLOP) return end();
        if (touch || dist <= MOUSE_SLOP) return;
        activate();
      }
      // já aqui, e não só no próximo quadro: um movimento rápido e soltar logo também troca
      place();
      hit();
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId === pointerId) end();
    };

    const end = () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", up);
      gesture.current = null;
      if (!g.active) return;
      list.style.scrollSnapType = base.snap;
      document.body.style.cursor = "";
      // o card assenta no lugar novo
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        item.style.transition = "transform 160ms ease-out";
        setTimeout(() => (item.style.transition = ""), 200);
      }
      item.style.transform = "";
      setDragging(null);
      // soltar não é um clique: a edição do card não abre
      const swallow = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      addEventListener("click", swallow, true);
      setTimeout(() => removeEventListener("click", swallow, true), 0);
    };

    const g = { active: false, end };
    gesture.current = g;
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up);
    if (touch) timer = window.setTimeout(activate, TOUCH_HOLD);
  };

  const onKeyDown = (id: string) => (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const { ids, onMove } = latest.current;
    const to = ids[ids.indexOf(id) + (e.key === "ArrowLeft" ? -1 : 1)];
    if (!to) return;
    e.preventDefault();
    onMove(id, to);
    // ao mover o card para a frente, o React tira e põe de volta o elemento, e o foco cai: volta para ele
    const btn = e.currentTarget;
    requestAnimationFrame(() => btn.focus());
  };

  return {
    dragging,
    /** as props do botão que cobre o card */
    handle: (id: string) => ({ onPointerDown: onPointerDown(id), onKeyDown: onKeyDown(id), "aria-keyshortcuts": "ArrowLeft ArrowRight" }),
  };
}
