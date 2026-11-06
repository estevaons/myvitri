import Link from "next/link";
import { ProductArt } from "@/components/storefront/ProductIcon";
import type { CatalogProduct } from "@/lib/vitrine/catalog/products";

/** Card do catálogo de produtos: foto, nome e quem indica; leva aos produtos da vitrine dessa pessoa. */
export function ProductCard({ p }: { p: CatalogProduct }) {
  return (
    <Link href={`/${p.handle}#produtos`} className="group flex min-w-0 flex-col text-center text-ink no-underline">
      {/* selos só visuais: o texto ao lado repete para leitores de tela */}
      <div aria-hidden="true" className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-cream">
        <ProductArt product={p} iconClassName="w-[52%]" />
        {p.videoUrl && (
          <span className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full bg-white/90 text-ink">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="translate-x-px">
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 pt-3 text-[15px] leading-snug max-md:text-sm">
        <span className="line-clamp-2 font-medium break-words">{p.name}</span>
        {p.videoUrl && <span className="sr-only">Tem review em vídeo.</span>}
        <span className="mt-2 text-[13px] text-mute group-hover:text-ink">
          Indicado por <span className="font-medium text-ink underline underline-offset-2">{p.creator}</span>
          {p.others > 0 && ` e mais ${p.others}`}
        </span>
      </div>
    </Link>
  );
}
