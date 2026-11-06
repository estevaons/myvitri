"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { Wordmark } from "@/components/brand/Logo";
import { HOST } from "@/lib/brand";

/*
 * Prévia de /criar-vitrine: a vitrine pública num celular, com o nome e o link que a pessoa digita, rolando sozinha pelas
 * seções; em volta, um perfil com o link na bio e avisos do que acontece quando a vitrine está no ar (tudo recurso que existe:
 * cupom copiado, visitas das métricas, favorito, comentário). Marcas e pessoas são de exemplo. É decorativa: fica fora
 * do leitor de tela, e a legenda diz o que ela mostra.
 */

const PRODUCTS = [
  { name: "Sérum de vitamina C", src: "/create_account/serum.webp" },
  { name: "Eau de parfum Âmbar", src: "/create_account/perfume.webp" },
  { name: "Óculos de sol tartaruga", src: "/create_account/oculos.webp" },
  { name: "Tênis de couro branco", src: "/create_account/tenis.webp" },
  { name: "Vela de figo", src: "/create_account/vela.webp" },
  { name: "Bolsa de couro", src: "/hero/carteira.webp" },
];
/** O kit junta sérum, perfume e vela. */
const KIT = [0, 1, 4].map((i) => PRODUCTS[i]);

const COUPONS = [
  { brand: "Casa Alma", off: "15% OFF", code: "ALMA15", rule: "Em todo o site, acima de R$ 150" },
  { brand: "Ótica Mira", off: "20% OFF", code: "MIRA20", rule: "Na coleção de verão" },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/** Pausa em cada seção marcada com `data-stop`, desce até o fim e volta ao topo; para com o mouse em cima. */
function useAutoScroll(view: React.RefObject<HTMLDivElement | null>, feed: React.RefObject<HTMLDivElement | null>) {
  const run = useRef<Animation | null>(null);

  useEffect(() => {
    const box = view.current;
    const body = feed.current;
    if (!box || !body || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const MOVE = 1500;
    const HOLD = 2000;
    let last = -1;

    const build = () => {
      const max = body.scrollHeight - box.clientHeight;
      // o nome que muda de linha mexe na altura; sem mudança, a rolagem segue de onde está
      if (max === last) return;
      last = max;
      run.current?.cancel();
      if (max <= 0) return;
      const marks = [...body.querySelectorAll<HTMLElement>("[data-stop]")].map((el) => Math.min(Math.max(el.offsetTop - 16, 0), max));
      const stops = [...new Set([0, ...marks, max])];
      const points: [number, number][] = [];
      let t = 0;
      stops.forEach((y, i) => {
        if (i > 0) t += MOVE;
        points.push([t, y]);
        t += HOLD;
        points.push([t, y]);
      });
      t += MOVE * 1.4;
      points.push([t, 0]);
      run.current = body.animate(
        points.map(([ms, y]) => ({ offset: ms / t, transform: `translateY(${-y}px)`, easing: "cubic-bezier(0.65, 0, 0.35, 1)" })),
        { duration: t, iterations: Infinity, delay: 1200 },
      );
    };

    const watch = new ResizeObserver(build);
    watch.observe(box);
    watch.observe(body);
    return () => {
      watch.disconnect();
      run.current?.cancel();
    };
  }, [view, feed]);

  return { pause: () => run.current?.pause(), play: () => run.current?.play() };
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="m-0 font-display text-[22px] leading-none font-normal">{children}</h3>;
}

function ProductCard({ p }: { p: (typeof PRODUCTS)[number] }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="relative aspect-square overflow-hidden bg-cream">
        <Image src={p.src} alt="" fill sizes="(min-width: 768px) 140px, 1px" className="object-cover" />
      </div>
      <span className="line-clamp-2 pt-1.5 text-center text-[10px] leading-snug font-medium">{p.name}</span>
    </div>
  );
}

/** A vitrine pública em miniatura, na ordem dela: capa, quem indica, título, cupons, produtos e kit. */
function PhoneStorefront({ name, handle }: { name: string; handle: string }) {
  const view = useRef<HTMLDivElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  const { pause, play } = useAutoScroll(view, feed);
  const shown = name.trim() || "Seu nome";
  // sem nome ainda, "A vitrine de Seu" soaria estranho
  const headline = name.trim() ? `A vitrine de ${name.trim().split(/\s+/)[0]}` : "A sua vitrine";

  return (
    <div
      onMouseEnter={pause}
      onMouseLeave={play}
      className="relative aspect-[9/19.5] h-[min(640px,calc(100dvh-150px))] rounded-[46px] bg-ink p-[9px] shadow-[0_40px_90px_-40px_rgba(17,17,17,0.55)]"
    >
      <div className="flex size-full flex-col overflow-hidden rounded-[38px] bg-white">
        {/* barra de status e endereço, que ficam paradas enquanto a página rola */}
        <div className="relative flex h-9 flex-none items-center justify-between px-6 text-[10px] font-semibold">
          <span>9:41</span>
          <span aria-hidden="true" className="absolute top-2 left-1/2 h-[18px] w-[74px] -translate-x-1/2 rounded-full bg-ink" />
          <span className="flex items-center gap-1">
            <span className="flex items-end gap-px">
              {[4, 6, 8, 10].map((h) => (
                <span key={h} className="w-[2.5px] rounded-sm bg-ink" style={{ height: h }} />
              ))}
            </span>
            <span className="h-[9px] w-[18px] rounded-[3px] border border-ink p-px">
              <span className="block h-full w-3/4 rounded-[1.5px] bg-ink" />
            </span>
          </span>
        </div>
        <div className="flex-none px-3 pb-2">
          <div className="flex h-7 items-center justify-center gap-1.5 rounded-full bg-cream px-3 text-[10px] text-ink">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <span className="truncate">
              {HOST}/<span className="font-semibold">{handle || "seunome"}</span>
            </span>
          </div>
        </div>

        <div ref={view} className="relative min-h-0 flex-1 overflow-hidden">
          <div ref={feed} className="relative flex flex-col pb-10 will-change-transform">
            <div className="flex justify-center py-2.5">
              <Wordmark label="" className="h-[9px] w-auto" />
            </div>
            <div className="px-3">
              <div className="relative aspect-[4/3] overflow-hidden bg-cream">
                <Image src="/create_account/capa.webp" alt="" fill sizes="(min-width: 768px) 300px, 1px" className="object-cover object-[60%_50%]" />
              </div>
            </div>
            <div className="relative -mt-7 flex flex-col items-center gap-1.5 px-3 text-center">
              <span className="box-border flex size-14 items-center justify-center rounded-full bg-sand font-display text-[20px] ring-4 ring-white">
                {initials(shown) || "?"}
              </span>
              <div className="flex max-w-full min-w-0 flex-col leading-tight">
                <span className="truncate font-display text-[16px] font-medium">{shown}</span>
                <span className="truncate text-[10px] text-mute">@{handle || "seunome"}</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 px-4 pt-4 text-center">
              <span className="font-display text-[30px] leading-[1] text-balance break-words">{headline}</span>
              <span className="text-[10.5px] leading-relaxed text-mute">Os produtos que eu uso de verdade e os cupons que eu garimpo.</span>
              <span className="mt-1 flex gap-1.5">
                <span className="flex min-h-8 items-center bg-ink px-3.5 text-[8px] font-medium tracking-[0.18em] text-white uppercase">Ver produtos</span>
                <span className="flex min-h-8 items-center border border-ink px-3.5 text-[8px] font-medium tracking-[0.18em] uppercase">Ver cupons</span>
              </span>
            </div>

            <section data-stop className="flex flex-col gap-3 pt-9">
              <div className="px-3">
                <SectionTitle>Cupons</SectionTitle>
              </div>
              <div className="flex gap-2 overflow-hidden px-3">
                {COUPONS.map((c) => (
                  <div key={c.code} className="box-border flex w-[78%] flex-none flex-col gap-2.5 border border-sand bg-cream p-3.5">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="flex size-5 flex-none items-center justify-center rounded-full bg-white font-display text-[10px]">{c.brand[0]}</span>
                      <span className="truncate text-[10px] font-medium">{c.brand}</span>
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="font-display text-[32px] leading-none lining-nums">{c.off}</span>
                      <span className="text-[9.5px] leading-snug text-mute">{c.rule}</span>
                    </div>
                    <span className="flex min-h-8 items-center justify-center border border-dashed border-gold/50 bg-white font-mono text-[10px] font-bold tracking-[0.08em]">
                      {c.code}
                    </span>
                    <span className="flex min-h-8 items-center justify-center bg-ink text-[7.5px] font-medium tracking-[0.14em] text-white uppercase">
                      Copiar e ir para a loja
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section data-stop className="flex flex-col gap-3 px-3 pt-9">
              <SectionTitle>Produtos</SectionTitle>
              <div className="flex gap-1.5">
                {["Todos", "Beleza", "Moda", "Casa"].map((c, i) => (
                  <span
                    key={c}
                    className={`flex min-h-6 items-center px-2.5 text-[8.5px] font-medium ${i === 0 ? "bg-ink text-white" : "border border-sand text-ink"}`}
                  >
                    {c}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-5">
                {PRODUCTS.map((p) => (
                  <ProductCard key={p.src} p={p} />
                ))}
              </div>
            </section>

            <section data-stop className="flex flex-col gap-3 px-3 pt-9">
              <SectionTitle>Kits</SectionTitle>
              <div className="grid grid-cols-3 grid-rows-2 gap-1">
                {KIT.map((p, i) => (
                  <div key={p.src} className={`relative aspect-square overflow-hidden bg-cream ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                    <Image src={p.src} alt="" fill sizes="(min-width: 768px) 180px, 1px" className="object-cover" />
                  </div>
                ))}
              </div>
              <span className="font-display text-[22px] leading-none">Ritual de autocuidado</span>
              <ul className="m-0 flex list-none flex-col border-t border-sand p-0">
                {KIT.map((p) => (
                  <li key={p.src} className="border-b border-sand py-1.5 text-[10px] font-medium">
                    {p.name}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** O perfil com o link na bio: o link acompanha o que a pessoa digita, que é o endereço que ela vai colar lá. */
function BioCard({ name, handle }: { name: string; handle: string }) {
  const shown = name.trim() || "Seu nome";
  return (
    <div className="flex w-[180px] flex-col gap-2.5 rounded-2xl bg-white p-3 xl:w-[210px] xl:p-3.5 text-[11px] leading-snug shadow-[0_24px_60px_-28px_rgba(17,17,17,0.45)]">
      <div className="flex items-center gap-2.5">
        {/* anel em degradê, como o de quem tem stories */}
        <span className="flex size-11 flex-none items-center justify-center rounded-full bg-linear-to-tr from-[#d9a35f] via-[#b5654a] to-[#7a5f30] p-[2px]">
          <span className="flex size-full items-center justify-center rounded-full bg-sand font-display text-[15px] ring-2 ring-white">{initials(shown) || "?"}</span>
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{handle || "seunome"}</span>
          <span className="truncate text-mute">{shown}</span>
        </span>
      </div>
      <span>Meus achados favoritos e os cupons que eu uso de verdade.</span>
      <span className="flex min-w-0 items-center gap-1 font-semibold text-[#00376B]">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="flex-none">
          <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
          <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
        </svg>
        <span className="truncate">
          {HOST}/{handle || "seunome"}
        </span>
      </span>
    </div>
  );
}

function Icon({ children, tone = "bg-cream text-ink" }: { children: ReactNode; tone?: string }) {
  return (
    <span className={`flex size-8 flex-none items-center justify-center rounded-full ${tone}`}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}

/** Avisos que aparecem um por vez, alternando os lados: cada um fica uns 2 s e some antes do próximo. Com movimento reduzido não aparecem. */
const NOTES: { place: string; body: ReactNode }[] = [
  {
    place: "top-[19%] -right-[64px] xl:-right-[150px]",
    body: (
      <>
        <Icon tone="bg-ink text-white">
          <path d="M5 12l5 5 9-10" />
        </Icon>
        <span className="flex flex-col">
          <span className="font-medium">Cupom ALMA15 copiado</span>
          <span className="text-mute">Alguém foi para a loja agora</span>
        </span>
      </>
    ),
  },
  {
    place: "top-[45%] -left-[64px] xl:-left-[150px]",
    body: (
      <>
        <Icon>
          <path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6" />
        </Icon>
        <span className="flex flex-col">
          <span className="font-medium">+128 visitas hoje</span>
          <span className="text-mute">42 cliques nas lojas</span>
        </span>
      </>
    ),
  },
  {
    place: "top-[63%] -right-[64px] xl:-right-[150px]",
    body: (
      <>
        <Icon tone="bg-[#f6e3dd] text-[#A3361B]">
          <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z" fill="currentColor" />
        </Icon>
        <span className="flex flex-col">
          <span className="font-medium">Marina favoritou</span>
          <span className="text-mute">Óculos de sol tartaruga</span>
        </span>
      </>
    ),
  },
  {
    place: "bottom-[9%] -left-[64px] xl:-left-[150px]",
    body: (
      <>
        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-sand font-display text-[13px]">J</span>
        <span className="flex flex-col">
          <span className="font-medium">Julia comentou</span>
          <span className="text-mute">“Amei esse perfume! Fixa bem?”</span>
        </span>
      </>
    ),
  },
];

export function SignupPreview({ name, handle }: { name: string; handle: string }) {
  return (
    <figure className="m-0 flex flex-col items-center gap-6">
      <div aria-hidden="true" className="relative">
        <PhoneStorefront name={name} handle={handle} />
        <div className="absolute top-[5%] -left-[64px] max-lg:hidden xl:-left-[150px]">
          <BioCard name={name} handle={handle} />
        </div>
        {NOTES.map((n, i) => (
          <div
            key={i}
            style={{ animationDelay: `${1500 + i * 3500}ms` } as CSSProperties}
            className={`absolute flex w-[176px] items-center gap-2 rounded-2xl bg-white p-2 text-[10.5px] xl:w-[200px] xl:gap-2.5 xl:p-2.5 xl:text-[11px] leading-snug shadow-[0_20px_50px_-24px_rgba(17,17,17,0.45)] max-lg:hidden motion-reduce:hidden motion-safe:animate-float-note ${n.place}`}
          >
            {n.body}
          </div>
        ))}
      </div>
      <figcaption className="text-center text-[15px] text-ink/70">É assim que sua vitrine aparece para o seu público.</figcaption>
    </figure>
  );
}
