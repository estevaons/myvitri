import Link from "next/link";
import { ClaimForm } from "@/components/auth/forms";
import { ProductIcon } from "@/components/storefront/ProductIcon";

const FEATURES = [
  {
    bg: "#FF9EC4",
    title: "Todos os cupons num link só",
    text: "Chega de responder “qual é o cupom?” no direct. Cada marca vira um ticket pronto para copiar, com validade e condição.",
  },
  {
    bg: "#FFD84D",
    title: "Preço com desconto na hora",
    text: "Cole o link do produto e a gente puxa nome, foto e preço. Seu público vê quanto paga com o seu cupom.",
  },
  {
    bg: "#8FD3FF",
    title: "Kits que vendem mais",
    text: "Monte combos como “kit praia” ou “kit treino”, com total e economia somados automaticamente.",
  },
];

const STEPS = ["Escolha seu link vitri.me", "Cadastre seus cupons e produtos", "Coloque o link na bio e pronto"];

export default function Home() {
  return (
    <div className="overflow-hidden bg-white text-ink">
      <header className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-5">
        <span className="font-display text-[28px] font-extrabold tracking-[-0.04em]">
          vitri<span className="text-coral">.</span>
        </span>
        <nav className="flex items-center gap-2">
          <Link href="/marinacosta" className="flex min-h-11 items-center px-3 text-sm font-bold text-ink no-underline max-sm:hidden">
            Ver exemplo
          </Link>
          <Link href="/editor" className="flex min-h-11 items-center rounded-full border-2 border-ink px-[18px] text-sm font-bold text-ink no-underline">
            Minha vitrine
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-12 px-6 pt-8 pb-20">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-6">
          <span className="text-sm font-bold tracking-[0.12em] text-[#555555] uppercase">Para creators que divulgam marcas</span>
          <h1 className="font-display m-0 text-[clamp(48px,7.4vw,104px)] leading-[0.92] font-extrabold tracking-[-0.045em]">
            {/* texto em camada própria (relative): o fundo laranja da linha de baixo não cobre as letras de cima */}
            <span className="relative">Todos os seus cupons.</span>{" "}
            <span className="rounded-[0.12em] bg-coral px-[0.12em] [box-decoration-break:clone]">
              <span className="relative">Um link só.</span>
            </span>
          </h1>
          <p className="m-0 max-w-[34rem] text-[19px] leading-normal text-[#3A3A3A]">
            Monte sua vitrine com os produtos que você usa, o preço com o seu desconto e os cupons de todas as marcas que você divulga.
          </p>
          <ClaimForm />
          <span className="pl-4 text-sm text-[#555555]">Grátis para começar. É só entrar com sua conta Google.</span>
        </div>

        <div aria-hidden="true" className="relative h-[520px] max-w-[560px] min-w-0 flex-[1_1_420px] max-sm:h-[380px]">
          <div className="absolute top-[8%] left-0 flex h-[56%] w-[56%] -rotate-6 items-center justify-center rounded-[32px] bg-[#C7B5FF]">
            <ProductIcon icon="Shoe" className="w-[62%]" />
          </div>
          <div className="absolute top-0 right-0 flex h-[54%] w-1/2 rotate-[5deg] items-center justify-center rounded-[32px] bg-[#9BE7A8]">
            <ProductIcon icon="Hat" className="w-[62%]" />
          </div>
          <div className="absolute right-[8%] bottom-0 flex h-1/2 w-[52%] -rotate-3 items-center justify-center rounded-[32px] bg-[#FFB38A]">
            <ProductIcon icon="Jar" className="w-[56%]" />
          </div>
          <div className="absolute bottom-[14%] left-[4%] flex rotate-3 rounded-[18px] bg-ink text-white shadow-[0_18px_40px_rgba(17,17,17,0.25)]">
            <div className="flex flex-col gap-0.5 px-[18px] py-4">
              <span className="text-xs text-[#CFCFCF]">Sua marca parceira</span>
              <span className="font-display text-[32px] font-extrabold tracking-[-0.03em] text-coral">20% OFF</span>
            </div>
            <div className="flex items-center border-l-2 border-dashed border-[#555555] px-[18px] py-4 font-mono text-[17px] font-bold tracking-[0.08em]">
              SEUCUPOM
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y-2 border-ink bg-coral py-[18px]">
        <div className="vitri-tick font-display flex w-max gap-10 text-[26px] font-extrabold tracking-[-0.02em] whitespace-nowrap">
          {[0, 1].flatMap((copy) =>
            ["CUPONS", "PRODUTOS", "KITS", "PREÇO COM DESCONTO", "LINK NA BIO", "CUPONS", "PRODUTOS", "KITS"].flatMap((w, i) => [
              <span key={`${copy}${i}`} aria-hidden={copy === 1 || undefined}>
                {w}
              </span>,
              <span key={`${copy}${i}s`} aria-hidden="true">
                ✶
              </span>,
            ]),
          )}
        </div>
      </div>

      <section className="mx-auto flex max-w-[1280px] flex-col gap-10 px-6 py-24">
        <h2 className="font-display m-0 max-w-[48rem] text-[clamp(36px,5vw,64px)] leading-none font-extrabold tracking-[-0.04em]">
          Feita para quem tem cupom de muita marca
        </h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
          {FEATURES.map((f) => (
            <article key={f.title} className="flex flex-col gap-3 rounded-[28px] p-7" style={{ background: f.bg }}>
              <h3 className="font-display m-0 text-[28px] leading-[1.05] font-extrabold tracking-[-0.03em]">{f.title}</h3>
              <p className="m-0 text-base leading-normal text-[#222222]">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-10 px-6 py-24">
          <h2 className="font-display m-0 max-w-[30rem] text-[clamp(36px,5vw,64px)] leading-none font-extrabold tracking-[-0.04em]">
            Pronta em 2 minutos
          </h2>
          <ol className="m-0 flex list-none flex-col gap-5 p-0">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-4 text-xl font-semibold">
                <span className="flex size-11 flex-none items-center justify-center rounded-full bg-coral text-lg font-extrabold text-ink">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto box-border flex max-w-[1232px] flex-col items-center gap-6 rounded-[40px] bg-[#FFD84D] px-10 py-[72px] text-center max-sm:px-6">
          <h2 className="font-display m-0 max-w-[52rem] text-[clamp(32px,4.6vw,60px)] leading-none font-extrabold tracking-[-0.04em]">
            Veja como fica uma vitrine de verdade
          </h2>
          <Link href="/marinacosta" className="flex min-h-14 items-center rounded-full bg-ink px-8 text-base font-bold text-white no-underline">
            Abrir vitrine de exemplo
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-3 px-6 pb-10 text-[13px] text-[#555555]">
        <span>vitri. — vitrines de cupons para creators</span>
        <span>Feito no Brasil</span>
      </footer>
    </div>
  );
}
