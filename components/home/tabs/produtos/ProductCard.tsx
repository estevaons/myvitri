import Link from "next/link";
import { ProductArt } from "@/components/storefront/ProductIcon";
import type { CatalogProduct } from "@/lib/vitrine/catalog/products";
import { couponBadge, formatBRL } from "@/lib/vitrine/pricing";

/** Card do catálogo de produtos; leva aos produtos da vitrine de quem indica pelo menor preço. */
export function ProductCard({ p }: { p: CatalogProduct }) {
  return (
    <Link href={`/${p.handle}#produtos`} className="group flex min-w-0 flex-col text-ink no-underline">
      {/* selos só visuais: o texto ao lado repete para leitores de tela */}
      <div aria-hidden="true" className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-cream">
        <ProductArt product={p} iconClassName="w-[52%]" />
        {p.coupon && <span className="absolute top-2.5 left-2.5 bg-ink px-2 py-1 text-[12px] leading-none font-medium text-white lining-nums">{couponBadge(p.coupon)}</span>}
        {p.videoUrl && (
          <span className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full bg-white/90 text-ink">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="translate-x-px">
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 pt-3 text-[15px] leading-snug max-md:text-sm">
        <span className="line-clamp-2 break-words">{p.name}</span>
        {p.brand && <span className="truncate text-mute">{p.brand}</span>}
        {p.price > 0 && (
          <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">{formatBRL(p.final)}</span>
            {p.final !== p.price && (
              <s className="text-mute">
                <span className="sr-only">de </span>
                {formatBRL(p.price)}
              </s>
            )}
          </span>
        )}
        {(p.coupon || p.videoUrl) && (
          <span className="sr-only">
            {p.coupon && `Cupom ${couponBadge(p.coupon)}. `}
            {p.videoUrl && "Tem review em vídeo."}
          </span>
        )}
        <span className="mt-2 text-[13px] text-mute group-hover:text-ink">
          Indicado por <span className="font-medium text-ink underline underline-offset-2">{p.creator}</span>
          {p.others > 0 && ` e mais ${p.others}`}
        </span>
      </div>
    </Link>
  );
}
