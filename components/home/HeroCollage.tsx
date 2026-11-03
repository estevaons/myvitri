import { kicker } from "@/components/home/chrome";
import { ProductArt, ProductIcon } from "@/components/storefront/ProductIcon";
import type { HomeCoupon, HomeProduct } from "@/lib/vitrine/data";
import { couponBadge, couponOff } from "@/lib/vitrine/pricing";
import type { IconId } from "@/lib/vitrine/types";

/**
 * Topo da página de venda: produtos e um cupom de vitrines publicadas, do jeito que aparecem nelas.
 * Mostra do que uma vitrine é feita com coisa de verdade. Sem dados, o mesmo mosaico com ilustrações e um cupom de exemplo.
 */

const FALLBACK: IconId[] = ["Bikini", "Glasses", "Shoe"];

function Label({ children }: { children: string }) {
  return <span className={`absolute bottom-3 left-3 max-w-[calc(100%-24px)] truncate bg-white px-3 py-1.5 ${kicker} text-[11px]`}>{children}</span>;
}

export function HeroCollage({ products, coupon }: { products: HomeProduct[]; coupon?: HomeCoupon }) {
  // foto primeiro: é ela que mostra que a vitrine é de verdade
  const picks = [...products].sort((a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl))).slice(0, 3);
  const real = picks.length === 3;
  const tile = "relative flex aspect-square items-center justify-center overflow-hidden bg-cream";

  const tiles = real
    ? picks.map((p) => (
        <div key={p.id} className={tile}>
          <ProductArt product={p} iconClassName="w-[52%]" />
          <Label>{p.coupon ? `Cupom ${couponBadge(p.coupon)} · ${p.creator.split(" ")[0]}` : `por ${p.creator.split(" ")[0]}`}</Label>
        </div>
      ))
    : FALLBACK.map((icon) => (
        <div key={icon} className={tile}>
          <ProductIcon icon={icon} className="w-[52%]" />
        </div>
      ));

  const ticket = (
    <div key="cupom" className="flex aspect-square min-w-0 flex-col justify-between overflow-hidden bg-sand p-4 md:p-6">
      <span className={`${kicker} truncate text-[11px] text-gold`}>{real && coupon ? coupon.brand : "Sua marca parceira"}</span>
      <span className="font-display text-[32px] leading-[0.95] font-normal whitespace-nowrap lining-nums md:text-[clamp(40px,4.6vw,72px)]">{real && coupon ? couponOff(coupon) : "20% OFF"}</span>
      <span className="flex flex-col gap-2">
        <span className="flex min-h-9 items-center justify-center truncate border border-dashed border-gold/60 bg-white px-3 font-mono text-[13px] font-bold tracking-[0.08em]">
          {real && coupon ? coupon.code : "SEUCUPOM"}
        </span>
        {/* no celular o quadrado é pequeno: o nome sai para o cupom continuar do tamanho das fotos */}
        {real && coupon && <span className="truncate text-[13px] text-ink/70 max-md:hidden">com {coupon.creator}</span>}
      </span>
    </div>
  );

  // cupom no canto de cima à direita: a primeira coisa que se lê depois do título é um desconto
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-1">
      {tiles[0]}
      {ticket}
      {tiles.slice(1)}
    </div>
  );
}
