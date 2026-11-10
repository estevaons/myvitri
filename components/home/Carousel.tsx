"use client";

import { useTranslations } from "next-intl";
import { Children, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

/**
 * Carrossel parado, sem setas: só anda quando a pessoa arrasta ou rola para o lado. É rolagem nativa com encaixe
 * (snap), então cada card para alinhado à margem da página. Para ficar claro que dá para rolar, o card seguinte
 * aparece cortado na borda da tela. No mouse dá para arrastar com o clique
 * (a rolagem nativa só responde a toque, trackpad e shift+roda). Sem JavaScript é só uma lista rolável.
 */
export function Carousel({
  label,
  children,
  className = "",
  itemClassName = "w-[240px] md:w-[300px]",
}: {
  label: string;
  children: ReactNode;
  /** espaçamento lateral do trilho (ex.: o `pad` da página, com o `scroll-px` igual para o encaixe respeitar a margem) */
  className?: string;
  /** largura de cada item */
  itemClassName?: string;
}) {
  const t = useTranslations("common");
  const items = Children.toArray(children);
  const scroller = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [overflow, setOverflow] = useState(false);
  // arrasto com o mouse: de onde partiu e se andou o bastante para não valer como clique no card
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = scroller.current;
    const ul = list.current;
    if (!el || !ul) return;
    // folga de 1px: as larguras vêm fracionárias em telas com zoom
    const check = () => setOverflow(el.scrollWidth - el.clientWidth > 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    ro.observe(ul);
    return () => ro.disconnect();
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !overflow) return;
    drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      // durante o arrasto o encaixe fica desligado (senão ele puxa a lista de volta a cada pixel)
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (d.moved) e.currentTarget.scrollLeft = d.left - dx;
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (!d.moved) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    // o clique que vem logo depois de soltar não abre o card
    e.currentTarget.addEventListener("click", (c) => (c.preventDefault(), c.stopPropagation()), { capture: true, once: true });
  };

  if (!items.length) return null;

  return (
    <section aria-roledescription={t("carousel")} aria-label={label}>
      <div
        ref={scroller}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        // sem isto o navegador arrasta a imagem ou o link em vez da lista
        onDragStart={(e) => e.preventDefault()}
        className={`no-scrollbar flex overflow-x-auto overscroll-x-contain ${dragging ? "cursor-grabbing select-none" : "snap-x snap-mandatory"} ${className}`}
      >
        <ul ref={list} className="m-0 flex w-max flex-none list-none gap-3 p-0 md:gap-4">
          {items.map((item, i) => (
            <li key={i} className={`flex-none snap-start ${itemClassName}`}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
