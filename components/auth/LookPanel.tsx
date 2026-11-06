"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/** A foto do look e como ela está enquadrada (o `object-position` do <Image>): é o que liga um ponto da foto a um ponto do painel. */
const PHOTO = { w: 2400, h: 1792, x: 0.5, y: 0.66 };
/** Quanto a foto leva para aparecer; os cards só saem depois. */
const FADE_MS = 1500;

/**
 * As peças do look em cards de produto da vitrine. `place` é onde o card fica; `from` é de onde ele sai, a peça na roupa da mulher,
 * em fração da foto. Os nomes são de exemplo.
 */
const PIECES = [
  // o blazer sobe pela parede lisa à esquerda; a bolsa fica embaixo, do lado da mão que a segura; a calça vai para a cortina
  { name: "Blazer de lã", src: "/hero/blazer.webp", place: "top-[11%] left-[5%]", from: [0.45, 0.66] },
  { name: "Calça de alfaiataria", src: "/hero/calca.webp", place: "top-[40%] right-[5%]", from: [0.53, 0.88] },
  { name: "Bolsa de couro", src: "/hero/carteira.webp", place: "bottom-[7%] left-[9%]", from: [0.42, 0.93] },
] as const;

/**
 * Painel direito de /entrar (só no desktop): a foto do look aparece devagar e, quando termina, cada peça sai da roupa como um card
 * pequeno que cresce até o lugar dele. Com movimento reduzido os cards só aparecem. Tudo é decorativo, fora do leitor de tela.
 */
export function LookPanel() {
  const panel = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const box = panel.current;
    if (!loaded || !box) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // o mesmo cálculo do object-cover: a foto cobre o painel e sobra para os lados (ou para cima e para baixo)
    const { width, height } = box.getBoundingClientRect();
    const scale = Math.max(width / PHOTO.w, height / PHOTO.h);
    const left = (width - PHOTO.w * scale) * PHOTO.x;
    const top = (height - PHOTO.h * scale) * PHOTO.y;

    const runs = PIECES.map((p, i) => {
      const card = cards.current[i];
      if (!card) return;
      card.style.opacity = "1";
      if (still) return card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 200 + i * 120, fill: "backwards" });
      // offsetLeft/offsetTop ignoram o transform: é o lugar final do card, de onde se mede o caminho até a peça
      const dx = left + p.from[0] * PHOTO.w * scale - (card.offsetLeft + card.offsetWidth / 2);
      const dy = top + p.from[1] * PHOTO.h * scale - (card.offsetTop + card.offsetHeight / 2);
      return card.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(0.04)`, opacity: 0 },
          { opacity: 1, offset: 0.1 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 1200, delay: FADE_MS + i * 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" },
      );
    });
    return () => runs.forEach((run) => run?.cancel());
  }, [loaded]);

  return (
    <div ref={panel} className="relative overflow-hidden bg-sand max-md:hidden">
      <Image
        src="/hero/retrato.webp"
        alt=""
        fill
        preload
        quality={90}
        // o next/image também avisa quando a foto já estava pronta antes de a página ganhar vida
        onLoad={() => setLoaded(true)}
        // o painel é mais estreito que a foto, deitada: ela aparece mais larga que ele. No celular o painel some e o 1px evita baixar a foto grande
        sizes="(min-width: 1024px) 90vw, (min-width: 768px) 180vw, 1px"
        className={`object-cover object-[50%_66%] transition-[opacity,scale] duration-1500 ease-out motion-reduce:duration-300 ${loaded ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"}`}
      />
      {PIECES.map((p, i) => (
        <div
          key={p.src}
          ref={(el) => {
            cards.current[i] = el;
          }}
          aria-hidden="true"
          // começa escondido: quem mostra é a animação. A largura segue a altura da tela (os dois da esquerda precisam caber um
          // sobre o outro) e a do painel (para não cobrir o look). No hover o card sobe, a sombra cresce e a foto aproxima;
          // `translate`/`scale` do Tailwind não brigam com o `transform` da animação de entrada
          className={`group absolute flex w-[clamp(112px,min(17vh,15vw),184px)] flex-col rounded-2xl bg-white p-2 opacity-0 shadow-[0_24px_60px_-28px_rgba(17,17,17,0.45)] transition-[translate,box-shadow] duration-300 ease-out hover:shadow-[0_32px_70px_-26px_rgba(17,17,17,0.55)] motion-safe:hover:-translate-y-1.5 ${p.place}`}
        >
          <div className="relative aspect-square overflow-hidden rounded-lg bg-cream">
            <Image
              src={p.src}
              alt=""
              fill
              sizes="(min-width: 768px) 184px, 1px"
              className="object-cover transition-[scale] duration-500 ease-out motion-safe:group-hover:scale-[1.06]"
            />
          </div>
          <span className="line-clamp-2 px-0.5 pt-2 pb-1 text-center text-[12px] leading-snug font-medium xl:text-[13px]">{p.name}</span>
        </div>
      ))}
    </div>
  );
}
