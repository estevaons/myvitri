import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND, HOST } from "@/lib/brand";
import { kicker, pad, pillDark } from "./chrome";

/**
 * Fim da landing, para quem divulga: o que a vitrine faz, como começar e as perguntas frequentes.
 * Veio de /criar-vitrine, que agora é só o formulário de criar a conta.
 */

const KIT = ["/create_account/oculos.webp", "/hero/bolsa.webp", "/hero/brincos.webp", "/create_account/perfume.webp"];
/** O resto do que a vitrine faz, sem desenho: os três de cima já mostram como ela é. */
const MORE: [title: string, text: string][] = [
  ["Veja o que funciona", "Visitas, cliques, produtos mais clicados e cupons mais copiados, dia a dia."],
  ["Pronta para os stories", "Baixe uma imagem com seus cupons, poste e cole a figurinha de link para a vitrine."],
  ["Links com UTM", "Os links para as lojas levam UTM, para a marca ver que a visita veio da sua vitrine."],
  ["Cupom com data", "Agende quando o cupom começa e quando vence. Vencido, ele sai da vitrine sozinho."],
  ["Review em vídeo", "Junte ao produto o seu Reels, TikTok ou vídeo do YouTube mostrando como ele é."],
  ["Esgotou? Sem apagar", "Marque o produto como esgotado e ele continua lá, pronto para quando voltar."],
];
const STEPS = [`Escolha seu link ${HOST}`, "Cadastre seus cupons e produtos", "Coloque o link na bio e pronto"];

/** Respostas curtas e diretas: aparecem na página e vão no FAQPage, que é de onde buscadores e assistentes de IA tiram a resposta. */
export const FAQ: [question: string, answer: string][] = [
  [
    `O que é o ${BRAND}?`,
    `Uma vitrine em um link só para quem divulga marcas. Você reúne os cupons de todas as marcas parceiras e os produtos que usa, cada um com o seu link, e coloca o link na bio.`,
  ],
  [`Quanto custa?`, `É grátis para começar. Basta escolher o seu link e entrar com a conta do Google.`],
  [`Como fica o meu link?`, `Sua vitrine fica em ${HOST}/seunome. É esse endereço que vai na bio do Instagram, do TikTok ou onde você quiser.`],
  [
    `Preciso cadastrar cada produto na mão?`,
    `Não. Cole o link do produto na loja e a gente puxa nome e foto. Depois é só colocar o seu link de afiliado, se tiver.`,
  ],
  [
    `A marca consegue ver que a venda veio de mim?`,
    `Os links para as lojas podem sair com UTM, para a marca ver que a visita veio da sua vitrine.`,
  ],
  [
    `Posso usar meu link de afiliado?`,
    `Pode. Cada produto tem um campo para o seu link de afiliado, e o clique no produto leva direto para ele, do jeito que você colou. Os cupons ficam na mesma vitrine: seu público tem o desconto e você, a comissão.`,
  ],
  [`Como divulgo a vitrine?`, `O link já gera uma prévia com os seus cupons no WhatsApp e nas redes, e você baixa uma imagem pronta para os stories com os seus cupons.`],
];

function Feature({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <article className="flex min-w-0 flex-col">
      <div aria-hidden="true" className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-cream">
        {children}
      </div>
      <h3 className="m-0 pt-4 font-display text-[24px] leading-[1.1] font-medium">{title}</h3>
      <p className="m-0 pt-1 text-[15px] leading-relaxed text-mute">{text}</p>
    </article>
  );
}

export function CreatorPitch() {
  return (
    <div id="para-quem-divulga" className="scroll-mt-4">
      <section className={`mx-auto max-w-[1440px] pt-20 md:pt-28 ${pad}`}>
        {/* abre a parte de quem divulga: entra no lugar do antigo convite "O que é bom merece ser dividido" */}
        <div className="flex flex-col items-center gap-4 bg-sand px-6 py-16 text-center max-md:py-12">
          <span className={`${kicker} text-gold`}>Para quem divulga marcas</span>
          <h2 className="m-0 max-w-[18ch] font-display text-[clamp(32px,4.4vw,52px)] leading-[1.04] font-normal text-balance">
            Seu público pergunta. <em>A vitrine responde.</em>
          </h2>
          <p className="m-0 max-w-[32rem] text-[17px] leading-relaxed text-ink/70">
            Seus cupons e os links dos produtos num lugar só. Você para de mandar o mesmo código no direct.
          </p>
        </div>
      </section>

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-6 pt-20 md:pt-28 ${pad}`}>
        <h2 className="m-0 font-display text-[clamp(32px,4vw,48px)] leading-[1.05] font-normal">Feita para quem tem cupom de muita marca</h2>
        <div className="grid gap-x-4 gap-y-10 md:grid-cols-3">
          <Feature
            title="Todos os cupons num link só"
            text="Cada marca vira um cupom pronto para copiar, com a condição de uso."
          >
            <div className="flex w-[64%] flex-col gap-3 bg-white p-5">
              <span className={`${kicker} text-[11px] text-gold`}>Sua marca parceira</span>
              <span className="font-display text-[44px] leading-[1] font-normal lining-nums">20% OFF</span>
              <span className="flex min-h-10 items-center justify-center border border-dashed border-gold/50 font-mono text-sm font-bold tracking-[0.08em]">
                SEUCUPOM
              </span>
            </div>
          </Feature>
          <Feature
            title="Produtos com o seu link de afiliado"
            text="Cole o link do produto e a gente puxa nome e foto. Um clique no produto e seu público vai direto para o seu link de afiliado."
          >
            <div className="flex w-[64%] flex-col">
              <div className="relative aspect-[2/1] overflow-hidden bg-white">
                {/* a foto é quadrada e o tênis fica na parte de baixo dela */}
                <Image src="/create_account/tenis.webp" alt="" fill sizes="(min-width: 768px) 300px, 60vw" className="object-cover object-[50%_75%]" />
              </div>
              <span className="pt-2.5 text-center text-sm leading-snug font-medium">Tênis de couro</span>
              {/* o link sai como a pessoa colou: é a parte "ref=voce" que paga a comissão */}
              <span className="mt-2.5 truncate border border-dashed border-gold/50 bg-white px-2.5 py-1.5 font-mono text-[11px] text-mute">
                loja.com/tenis?<span className="font-bold text-ink">ref=voce</span>
              </span>
            </div>
          </Feature>
          <Feature title="Kits que vendem mais" text="Monte combos como “kit praia” ou “kit treino”, cada produto com o seu link.">
            <div className="grid w-[56%] grid-cols-2 gap-1">
              {KIT.map((src) => (
                <div key={src} className="relative aspect-square overflow-hidden bg-white">
                  <Image src={src} alt="" fill sizes="(min-width: 768px) 160px, 28vw" className="object-cover" />
                </div>
              ))}
            </div>
          </Feature>
        </div>
      </section>

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-4 pt-12 md:pt-16 ${pad}`}>
        <h2 className="m-0 font-display text-[clamp(28px,3.2vw,40px)] leading-[1.05] font-normal">E ainda</h2>
        <ul className="m-0 grid list-none gap-x-4 p-0 md:grid-cols-3">
          {MORE.map(([title, text]) => (
            <li key={title} className="flex flex-col gap-1 border-t border-sand py-5">
              <h3 className="m-0 font-display text-[22px] leading-[1.15] font-medium">{title}</h3>
              <p className="m-0 text-[15px] leading-relaxed text-mute">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-4 pt-14 md:gap-6 md:pt-20 ${pad}`}>
        <h2 className="m-0 font-display text-[clamp(36px,4.4vw,56px)] leading-[1] font-normal lining-nums">Pronta em 2 minutos</h2>
        <ol className="m-0 grid list-none gap-0 p-0 md:grid-cols-3 md:gap-4">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-4 border-t border-sand py-5 text-[17px] md:flex-col md:items-start md:gap-3">
              <span className="w-10 flex-none font-display text-[40px] leading-none text-gold italic lining-nums">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </section>

      {/* em duas colunas: as perguntas são curtas e, na largura toda, deixavam a metade direita da tela vazia */}
      <section className={`mx-auto grid max-w-[1440px] gap-4 pt-14 md:grid-cols-[1fr_2fr] md:gap-12 md:pt-20 ${pad}`}>
        <h2 className="m-0 font-display text-[clamp(36px,4.4vw,56px)] leading-[1] font-normal text-balance">Perguntas frequentes</h2>
        <div className="flex flex-col border-b border-sand">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-t border-sand">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden="true" className="flex-none font-display text-[28px] leading-none text-gold transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="m-0 max-w-[44rem] pb-6 text-[16px] leading-relaxed text-mute">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={`mx-auto max-w-[1440px] pt-14 md:pt-20 ${pad}`}>
        <div className="flex flex-col items-center gap-4 bg-sand px-6 py-14 text-center max-md:py-10">
          <h2 className="m-0 font-display text-[clamp(32px,4.4vw,52px)] leading-[1] font-normal">Seu link na bio, pronto hoje</h2>
          <p className="m-0 text-[17px] text-ink/70">Grátis para começar. É só escolher o link e criar sua conta.</p>
          <Link href="/criar-vitrine" className={`${pillDark} mt-2`}>
            Criar minha vitrine grátis
          </Link>
        </div>
      </section>
    </div>
  );
}
