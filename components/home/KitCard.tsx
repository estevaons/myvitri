import { Link } from "@/lib/i18n/navigation";
import { ProductArt } from "@/components/storefront/ProductIcon";
import type { HomeKit } from "@/lib/vitrine/data";
import type { Product } from "@/lib/vitrine/types";

/**
 * Fotos do kit num quadrado, como o card de vitrine ao lado no carrossel: 1 ocupa tudo, 2 lado a lado,
 * 3 com a primeira na metade da esquerda e 4 em 2×2.
 */
const GRID = ["grid-cols-1", "grid-cols-2", "grid-cols-2 grid-rows-2", "grid-cols-2 grid-rows-2"];

/** O mosaico de fotos do kit; também usado no card da aba Kits. */
export function KitMosaic({ items: all }: { items: Product[] }) {
  const items = all.slice(0, 4);
  return (
    <div aria-hidden="true" className={`grid aspect-square gap-px overflow-hidden bg-white ${GRID[items.length - 1]}`}>
      {items.map((p, i) => (
        <div
          key={p.id}
          className={`relative flex items-center justify-center overflow-hidden bg-cream ${items.length === 3 && i === 0 ? "row-span-2" : ""}`}
        >
          <ProductArt product={p} iconClassName={items.length === 1 ? "w-[50%]" : "w-[56%]"} strokeWidth={3.6} />
        </div>
      ))}
    </div>
  );
}

/** Card de kit da home logada; leva aos kits da vitrine de quem montou. */
export function KitCard({ k }: { k: HomeKit }) {
  return (
    <Link href={`/${k.handle}#kits`} className="group flex min-w-0 flex-col text-ink no-underline">
      <KitMosaic items={k.items} />
      <div className="flex min-w-0 flex-col gap-0.5 pt-3 text-[15px] leading-snug max-md:text-sm">
        <span className="font-display text-[24px] leading-[1.1] md:text-[28px]">{k.name}</span>
        <span className="mt-1.5 truncate text-[13px] text-mute group-hover:text-ink">
          Montado por <span className="font-medium text-ink underline underline-offset-2">{k.creator}</span>
        </span>
      </div>
    </Link>
  );
}
