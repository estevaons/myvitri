"use client";

import { useEffect, useState } from "react";
import { couponColor, inkOn } from "@/lib/vitrine/look";
import { couponOff } from "@/lib/vitrine/pricing";
import type { Coupon, VitrineContent } from "@/lib/vitrine/types";

const INTERVAL = 3000;
const LEAVE_MS = 450;
/** Posição de cada carta conforme a profundidade na pilha (0 = a da frente). */
const DEPTHS = [
  { x: 0, y: 0, rotate: 3, scale: 1 },
  { x: -10, y: -10, rotate: -2, scale: 0.96 },
  { x: -20, y: -20, rotate: -6, scale: 0.92 },
];

/**
 * Pilha decorativa com todos os cupons: a carta da frente desliza para o lado e volta para o fundo,
 * e a próxima assume. Todas ocupam a mesma célula do grid, então a pilha tem o tamanho da maior carta.
 */
export function CouponDeck({ coupons, look, className }: { coupons: Coupon[]; look: VitrineContent["look"]; className: string }) {
  const n = coupons.length;
  const [start, setStart] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let back: ReturnType<typeof setTimeout>;
    const tick = setInterval(() => {
      setLeaving(true);
      back = setTimeout(() => {
        setStart((s) => (s + 1) % n);
        setLeaving(false);
      }, LEAVE_MS);
    }, INTERVAL);
    return () => {
      clearInterval(tick);
      clearTimeout(back);
    };
  }, [n]);

  return (
    <div aria-hidden="true" className={`grid ${className}`}>
      {coupons.map((c, i) => {
        const depth = (i - (start % n) + n) % n;
        const out = depth === 0 && leaving;
        const pos = DEPTHS[Math.min(depth, DEPTHS.length - 1)];
        return (
          // Sem os furos de ticket: numa pilha eles mostram a carta de trás e parecem rasgados.
          <div
            key={c.id}
            className="col-start-1 row-start-1 flex rounded-[18px] shadow-[0_1px_2px_rgba(17,17,17,0.08),0_10px_24px_rgba(17,17,17,0.14)] transition-[transform,opacity] duration-[450ms] ease-out motion-reduce:transition-none"
            style={{
              background: couponColor(look, c, i),
              color: inkOn(couponColor(look, c, i)),
              zIndex: n - depth,
              // a carta sai inteira (sem ficar translúcida, que misturaria os textos) e depois volta por trás
              opacity: depth >= DEPTHS.length ? 0 : 1,
              transform: out
                ? "translate(72%, 14px) rotate(12deg)"
                : `translate(${pos.x}px, ${pos.y}px) rotate(${pos.rotate}deg) scale(${pos.scale})`,
            }}
          >
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-4 pr-4 pl-5 @max-md:py-3 @max-md:pl-4">
              <span className="flex min-w-0 items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária */}
                {c.logoUrl && <img src={c.logoUrl} alt="" className="size-6 flex-none rounded-full bg-white object-contain" />}
                <span className="truncate text-[15px] font-bold @max-md:text-[13px]">{c.brand}</span>
              </span>
              <span className="font-display text-[40px] leading-[0.95] font-extrabold tracking-[-0.04em] whitespace-nowrap @max-md:text-[28px]">
                {couponOff(c)}
              </span>
              {c.condition && <span className="truncate text-[13px] opacity-85">{c.condition}</span>}
            </div>
            {/* linha picotada que não encosta nas bordas */}
            <span aria-hidden="true" className="my-3.5 w-0 flex-none border-l-2 border-dashed border-current/30" />
            <div className="flex w-[104px] flex-none items-center justify-center px-3 @max-md:w-[88px]">
              {/* códigos longos diminuem em vez de quebrar no meio */}
              <span
                className={`text-center font-mono font-extrabold tracking-[0.06em] break-all ${c.code.length > 8 ? "text-xs @max-md:text-[10px]" : "text-[15px] @max-md:text-xs"}`}
              >
                {c.code}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
