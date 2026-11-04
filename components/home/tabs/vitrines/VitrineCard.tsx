import Link from "next/link";
import { CreatorCover } from "@/components/home/CreatorCard";
import type { CatalogVitrine } from "@/lib/vitrine/catalog/vitrines";
import { couponOff } from "@/lib/vitrine/pricing";

const BRANDS_SHOWN = 3;

// Número em serifa e o rótulo ao lado, em linha: no card estreito do celular os três quebram de linha
// em vez de cortar o rótulo, como aconteceria em colunas.
function Stat({ n, one, many }: { n: number; one: string; many: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <dt className="order-2 text-[12px] text-mute md:text-[13px]">{n === 1 ? one : many}</dt>
      <dd className="order-1 m-0 font-display text-[24px] leading-none lining-nums md:text-[30px]">{n}</dd>
    </div>
  );
}

/**
 * Card da aba "Vitrines": a capa da landing com rosto e nome, e embaixo o que ajuda a escolher em quem
 * clicar — do que a vitrine fala, as marcas, os números e o maior desconto.
 */
export function VitrineCard({ v }: { v: CatalogVitrine }) {
  const { card } = v;
  const extra = v.brands.length - BRANDS_SHOWN;
  return (
    <Link href={`/${card.handle}`} className="group flex min-w-0 flex-col text-ink no-underline">
      <div className="relative">
        <CreatorCover c={card} />
        {v.isNew && <span className="absolute top-2 left-2 bg-white px-2 py-1 text-[10px] font-medium tracking-[0.2em] text-ink uppercase md:top-3 md:left-3 md:text-[11px]">Nova</span>}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-3">
        <span className="flex min-w-0 flex-col text-[14px] text-mute group-hover:text-ink md:flex-row md:text-[15px]">
          <span className="truncate">@{card.handle}</span>
          {v.category && (
            <span className="truncate">
              <span className="max-md:hidden">&nbsp;·&nbsp;</span>
              {v.category}
            </span>
          )}
        </span>

        {v.brands.length > 0 && (
          <span className="line-clamp-2 text-[13px] leading-snug md:text-[14px]">
            {v.brands.slice(0, BRANDS_SHOWN).join(", ")}
            {extra > 0 && <span className="text-mute"> +{extra}</span>}
          </span>
        )}

        <dl className="m-0 flex flex-wrap gap-x-4 gap-y-1.5 border-y border-sand py-3">
          <Stat n={card.products} one="produto" many="produtos" />
          <Stat n={card.coupons} one="cupom" many="cupons" />
          <Stat n={v.kits} one="kit" many="kits" />
        </dl>

        {(v.best || v.expiring) && (
          <span className="flex flex-col gap-1 text-[13px] leading-snug md:text-[14px]">
            {v.best && <span className="font-medium">Até {couponOff(v.best)}</span>}
            {v.expiring && <span className="text-[11px] font-medium tracking-[0.16em] text-gold uppercase">Cupom {v.expiring.toLowerCase()}</span>}
          </span>
        )}
      </div>
    </Link>
  );
}
