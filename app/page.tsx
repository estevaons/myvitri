import Link from "next/link";
import type { ReactNode } from "react";
import { ClaimForm } from "@/components/auth/forms";
import { ProductIcon } from "@/components/storefront/ProductIcon";
import type { IconId } from "@/lib/vitrine/types";

/** Mesmo visual das vitrines: branco, cinza claro, títulos condensados em caixa alta e botões em pílula. */

const HERO: IconId[] = ["Shoe", "Bikini", "Bottle"];
const KIT: IconId[] = ["Hat", "Glasses", "Bag", "Jar"];
const STEPS = ["Escolha seu link vitri.me", "Cadastre seus cupons e produtos", "Coloque o link na bio e pronto"];

const pad = "px-5 md:px-12";
const pillDark = "flex min-h-12 items-center justify-center rounded-full bg-ink px-6 text-[15px] font-medium text-white no-underline";
const pillLight = "flex min-h-11 items-center justify-center rounded-full border border-[#CACACB] bg-white px-5 text-[15px] font-medium text-ink no-underline hover:border-ink";

function Feature({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <article className="flex min-w-0 flex-col">
      <div aria-hidden="true" className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-soft">
        {children}
      </div>
      <h3 className="m-0 pt-4 text-[17px] font-medium">{title}</h3>
      <p className="m-0 pt-1 text-[15px] leading-relaxed text-mute">{text}</p>
    </article>
  );
}

export default function Home() {
  return (
    <div className="overflow-hidden bg-white text-ink">
      <div className="bg-soft px-5 py-2.5 text-center text-[13px] leading-snug">
        <span className="font-medium">Grátis para começar.</span>{" "}
        <Link href="/marinacosta" className="font-medium text-inherit underline underline-offset-2">
          Ver uma vitrine de exemplo
        </Link>
      </div>

      <header className={`mx-auto flex max-w-[1440px] items-center justify-between gap-4 py-3.5 ${pad}`}>
        <span className="font-display text-[26px] font-extrabold tracking-[-0.04em]">
          vitri<span className="text-coral">.</span>
        </span>
        <nav className="flex items-center gap-5">
          <Link href="/marinacosta" className="text-[15px] font-medium text-ink no-underline hover:text-mute max-sm:hidden">
            Ver exemplo
          </Link>
          <Link href="/editor" className={pillLight}>
            Minha vitrine
          </Link>
        </nav>
      </header>

      <section className={`mx-auto max-w-[1440px] ${pad}`}>
        <div aria-hidden="true" className="grid grid-cols-3 gap-1">
          {HERO.map((icon) => (
            <div key={icon} className="flex aspect-square items-center justify-center bg-soft md:aspect-[4/3]">
              <ProductIcon icon={icon} className="w-[46%]" />
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-[880px] flex-col items-center gap-4 pt-10 text-center md:pt-12">
          <span className="text-[15px] font-medium">Para creators que divulgam marcas</span>
          <h1 className="m-0 font-condensed text-[clamp(44px,8vw,96px)] leading-[0.9] font-extrabold tracking-[-0.01em] text-balance uppercase">
            Todos os seus cupons. Um link só.
          </h1>
          <p className="m-0 max-w-[36rem] text-[17px] leading-relaxed">
            Monte sua vitrine com os produtos que você usa, o preço com o seu desconto e os cupons de todas as marcas que você divulga.
          </p>
          <div className="mt-3 flex w-full flex-col items-center gap-3">
            <ClaimForm />
            <span className="text-[13px] text-mute">É só entrar com sua conta Google.</span>
          </div>
        </div>
      </section>

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-6 pt-20 md:pt-28 ${pad}`}>
        <h2 className="m-0 text-2xl font-medium tracking-[-0.01em]">Feita para quem tem cupom de muita marca</h2>
        <div className="grid gap-x-4 gap-y-10 md:grid-cols-3">
          <Feature
            title="Todos os cupons num link só"
            text="Chega de responder “qual é o cupom?” no direct. Cada marca vira um cupom pronto para copiar, com validade e condição."
          >
            <div className="flex w-[64%] flex-col gap-3 bg-white p-5">
              <span className="text-[13px] font-medium">Sua marca parceira</span>
              <span className="font-condensed text-[44px] leading-[0.9] font-extrabold uppercase">20% OFF</span>
              <span className="flex min-h-10 items-center justify-center rounded-full border border-dashed border-[#CACACB] font-mono text-sm font-bold tracking-[0.08em]">
                SEUCUPOM
              </span>
            </div>
          </Feature>
          <Feature title="Preço com desconto na hora" text="Cole o link do produto e a gente puxa nome, foto e preço. Seu público vê quanto paga com o seu cupom.">
            <div className="flex w-[64%] flex-col">
              <div className="flex aspect-[4/3] items-center justify-center bg-white">
                <ProductIcon icon="Shoe" className="w-[54%]" />
              </div>
              <div className="flex flex-col gap-0.5 pt-2.5 text-sm leading-snug">
                <span className="font-medium text-sale">Cupom -15%</span>
                <span className="font-medium">Tênis de corrida</span>
                <span>
                  <span className="font-medium">R$ 339,90</span> <span className="text-mute line-through">R$ 399,90</span>
                </span>
              </div>
            </div>
          </Feature>
          <Feature title="Kits que vendem mais" text="Monte combos como “kit praia” ou “kit treino”, com total e economia somados automaticamente.">
            <div className="grid w-[56%] grid-cols-2 gap-1">
              {KIT.map((icon) => (
                <div key={icon} className="flex aspect-square items-center justify-center bg-white">
                  <ProductIcon icon={icon} className="w-[62%]" strokeWidth={3.4} />
                </div>
              ))}
            </div>
          </Feature>
        </div>
      </section>

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-8 pt-20 md:pt-28 ${pad}`}>
        <h2 className="m-0 font-condensed text-[clamp(36px,5vw,56px)] leading-[0.92] font-extrabold uppercase">Pronta em 2 minutos</h2>
        <ol className="m-0 grid list-none gap-0 p-0 md:grid-cols-3 md:gap-4">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-4 border-t border-line py-5 text-[17px] font-medium md:flex-col md:items-start md:gap-3">
              <span className="flex size-10 flex-none items-center justify-center rounded-full bg-soft text-[15px] font-semibold">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </section>

      <section className={`mx-auto max-w-[1440px] pt-16 md:pt-24 ${pad}`}>
        <div className="flex flex-col items-center gap-4 bg-soft px-6 py-16 text-center max-md:py-12">
          <h2 className="m-0 font-condensed text-[clamp(32px,4.4vw,52px)] leading-[0.92] font-extrabold uppercase">Veja como fica uma vitrine de verdade</h2>
          <p className="m-0 text-[17px]">Produtos, cupons e kits de uma creator de exemplo.</p>
          <Link href="/marinacosta" className={`${pillDark} mt-2`}>
            Abrir vitrine de exemplo
          </Link>
        </div>
      </section>

      <footer className={`mx-auto mt-14 flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-t border-line py-8 text-[13px] text-mute ${pad}`}>
        <span>vitri. · vitrines de cupons para creators</span>
        <span>Feito no Brasil</span>
      </footer>
    </div>
  );
}
