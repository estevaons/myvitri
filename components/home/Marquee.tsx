"use client";

import { useTranslations } from "next-intl";
import { Children, useEffect, useRef, useState, type ReactNode } from "react";

const arrow = "flex size-11 items-center justify-center border border-ink text-ink hover:bg-ink hover:text-white disabled:opacity-30";

/**
 * Carrossel que anda sozinho e não acaba: a lista é renderizada duas vezes e, ao passar da
 * primeira cópia, a rolagem volta a largura dela. É rolagem nativa (não transform), então dá
 * para arrastar, usar o teclado e os botões. Para com mouse, foco ou toque em cima; com
 * "reduzir movimento", ou com poucos itens para encher a largura, vira uma lista parada.
 * A cópia fica fora do leitor de tela e do Tab, mas responde ao clique: ela também aparece na tela.
 * Sem JavaScript é só uma lista rolável.
 */
export function Marquee({
  label,
  children,
  speed = 30,
  className = "",
  itemClassName = "w-[240px] md:w-[300px]",
}: {
  label: string;
  children: ReactNode;
  /** px por segundo */
  speed?: number;
  /** espaçamento lateral do trilho (ex.: o `pad` da página) */
  className?: string;
  /** largura de cada item */
  itemClassName?: string;
}) {
  const t = useTranslations("common");
  const items = Children.toArray(children);
  const scroller = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLUListElement>(null);
  const copy = useRef<HTMLUListElement>(null);
  const paused = useRef(false);
  const resume = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [overflow, setOverflow] = useState(false);
  const [reduced, setReduced] = useState(false);
  const loop = overflow && !reduced;

  useEffect(() => {
    const el = scroller.current;
    const list = first.current;
    if (!el || !list) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const check = () => {
      setReduced(motion.matches);
      setOverflow(list.offsetWidth > el.clientWidth);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    ro.observe(list);
    motion.addEventListener("change", check);
    return () => {
      ro.disconnect();
      motion.removeEventListener("change", check);
    };
  }, []);

  useEffect(() => {
    if (!loop) return;
    const el = scroller.current!;
    // scrollLeft é arredondado em alguns navegadores: a posição fracionária fica aqui
    let pos = el.scrollLeft;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      // a cópia sai do DOM (loop desligado, troca de página) um pouco antes de a limpeza do efeito cancelar o quadro
      if (!copy.current || !first.current) return;
      if (paused.current) {
        pos = el.scrollLeft;
      } else {
        const half = copy.current.offsetLeft - first.current.offsetLeft;
        pos += (speed * dt) / 1000;
        if (pos >= half) pos -= half;
        el.scrollLeft = pos;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [loop, speed]);

  useEffect(() => () => clearTimeout(resume.current), []);

  // sem `inert` na cópia: ele também mataria o clique em tudo o que aparece dela na ponta do carrossel
  useEffect(() => {
    copy.current?.querySelectorAll("a, button").forEach((el) => el.setAttribute("tabindex", "-1"));
  }, [loop, children]);

  const pause = () => {
    clearTimeout(resume.current);
    paused.current = true;
  };
  const play = (delay = 0) => {
    clearTimeout(resume.current);
    resume.current = setTimeout(() => (paused.current = false), delay);
  };

  const step = (dir: 1 | -1) => {
    const el = scroller.current;
    const item = first.current?.firstElementChild as HTMLElement | null;
    if (!el || !item) return;
    const gap = parseFloat(getComputedStyle(first.current!).columnGap) || 0;
    el.scrollBy({ left: dir * (item.offsetWidth + gap), behavior: reduced ? "auto" : "smooth" });
  };

  if (!items.length) return null;

  const list = (hidden: boolean) => (
    <ul
      ref={hidden ? copy : first}
      aria-hidden={hidden || undefined}
      className="m-0 flex w-max flex-none list-none gap-3 p-0 md:gap-4"
    >
      {items.map((item, i) => (
        <li key={i} className={`flex-none ${loop ? "" : "snap-start"} ${itemClassName}`}>
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-roledescription={t("carousel")}
      aria-label={label}
      className="flex flex-col gap-4"
      onPointerEnter={pause}
      onPointerLeave={() => play()}
      onFocus={pause}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) play();
      }}
      onTouchStart={pause}
      onTouchEnd={() => play(2000)}
    >
      <div
        ref={scroller}
        className={`no-scrollbar flex gap-3 overflow-x-auto md:gap-4 ${loop ? "" : "snap-x snap-mandatory"} ${className}`}
      >
        {list(false)}
        {loop && list(true)}
      </div>
      {overflow && (
        <div className={`flex justify-end gap-2 ${className}`}>
          <button type="button" aria-label={t("previous")} className={arrow} onClick={() => step(-1)}>
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" aria-label={t("next")} className={arrow} onClick={() => step(1)}>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </section>
  );
}
