import { Link, vitrineHref } from "@/lib/i18n/navigation";
import { ProductArt } from "@/components/storefront/ProductIcon";
import type { CatalogProduct } from "@/lib/vitrine/catalog/products";

/** Card do catálogo de produtos: foto, nome e quem indica; leva aos produtos da vitrine dessa pessoa. */
export function ProductCard({ p }: { p: CatalogProduct }) {
  return (
    <Link href={vitrineHref(p.handle, "produtos")} className="group flex min-w-0 flex-col text-center text-ink no-underline">
      <div aria-hidden="true" className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-cream">
        <ProductArt product={p} iconClassName="w-[52%]" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 pt-3 text-[15px] leading-snug max-md:text-sm">
        <span className="line-clamp-2 font-medium break-words">{p.name}</span>
        <span className="mt-2 text-[13px] text-mute group-hover:text-ink">
          Indicado por <span className="font-medium text-ink underline underline-offset-2">{p.creator}</span>
          {p.others > 0 && ` e mais ${p.others}`}
        </span>
      </div>
    </Link>
  );
}
