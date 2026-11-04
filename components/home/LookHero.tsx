import Image from "next/image";
import { formatBRL } from "@/lib/vitrine/pricing";

/**
 * Topo da landing: a foto de um look e, por cima, as peças dele como cards de produto da vitrine
 * (cupom, preço com desconto e código). Ilustração com marcas fictícias, por isso nada aqui é link.
 * Os cards ficam meio dentro, meio fora da foto, e a sombra dá a profundidade.
 */

type Piece = { img: string; name: string; price: number; off: number; code: string; at: string };

// `at` posiciona o card em volta da foto, dois de cada lado em alturas alternadas; no celular só os dois primeiros
const LOOK: Piece[] = [
  { img: "blazer", name: "Blazer creme", price: 48990, off: 15, code: "LUME15", at: "left-0 top-[8%]" },
  { img: "bolsa", name: "Bolsa de couro", price: 35990, off: 10, code: "OCRE10", at: "right-0 top-[32%] max-md:top-auto max-md:bottom-[6%]" },
  { img: "brincos", name: "Brincos pérola", price: 12990, off: 20, code: "ORLA20", at: "left-0 top-[58%] max-md:hidden" },
  { img: "calca", name: "Pantalona", price: 27990, off: 15, code: "LUME15", at: "right-[3%] top-[78%] max-md:hidden" },
];

/** Card de produto como na vitrine, deitado para caber quatro em volta da foto: foto, cupom, nome, preço e código. */
function PieceCard({ p }: { p: Piece }) {
  const final = Math.round((p.price * (100 - p.off)) / 100);
  return (
    // no hover o card sobe, a sombra cresce, a foto aproxima e ele passa para a frente dos outros
    <div
      className={`group absolute z-10 flex w-[54%] max-w-[250px] items-center gap-2.5 bg-white p-2 shadow-[0_22px_45px_-20px_rgba(17,17,17,0.5)] transition-[translate,scale,box-shadow] duration-300 ease-out hover:z-20 hover:-translate-y-1.5 hover:scale-[1.04] hover:shadow-[0_30px_60px_-22px_rgba(17,17,17,0.6)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 md:w-[42%] ${p.at}`}
    >
      <div className="relative aspect-square w-[34%] flex-none overflow-hidden bg-cream">
        <Image
          src={`/hero/${p.img}.webp`}
          alt=""
          fill
          sizes="120px"
          quality={90}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10px] font-medium tracking-[0.16em] text-gold uppercase">Cupom -{p.off}%</span>
        <span className="truncate text-[13px] leading-snug">{p.name}</span>
        <span className="flex flex-wrap items-baseline gap-x-1.5 text-[13px] leading-snug">
          <span className="font-medium">{formatBRL(final)}</span>
          <span className="text-[11px] text-mute line-through">{formatBRL(p.price)}</span>
        </span>
        <span className="mt-1 self-start border border-dashed border-gold/50 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.08em] transition-colors duration-300 group-hover:border-gold group-hover:bg-cream">{p.code}</span>
      </div>
    </div>
  );
}

export function LookHero() {
  return (
    <figure aria-label="Exemplo de look com as peças e os cupons, como aparecem numa vitrine" className="relative m-0 py-[4%]">
      {/* a foto fica recuada dos lados: é esse recuo que os cards invadem */}
      <div className="relative mx-[14%] aspect-[4/5] overflow-hidden bg-cream">
        <Image
          src="/hero/retrato.webp"
          alt="Mulher de blazer creme, calça taupe e bolsa caramelo perto de uma janela"
          fill
          priority
          quality={90}
          // a foto é deitada e o quadro é em pé: ela aparece ~1,7× mais larga que o quadro, e é essa largura que o navegador precisa baixar
          sizes="(min-width: 1440px) 760px, (min-width: 768px) 52vw, 112vw"
          className="object-cover object-[50%_40%]"
        />
      </div>
      {LOOK.map((p) => (
        <PieceCard key={p.img} p={p} />
      ))}
    </figure>
  );
}
