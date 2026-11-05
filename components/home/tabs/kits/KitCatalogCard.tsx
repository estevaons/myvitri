import Link from "next/link";
import type { CatalogKit } from "@/lib/vitrine/catalog/kits";
import { formatBRL } from "@/lib/vitrine/pricing";
import { kicker } from "../../chrome";
import { KitMosaic } from "../../KitCard";

/**
 * Card do catálogo de kits: o mesmo mosaico do carrossel, com descrição, preço e quem montou, como o card de
 * produto. Leva aos kits da vitrine de quem montou.
 */
export function KitCatalogCard({ k }: { k: CatalogKit }) {
  const count = `${k.items.length} ${k.items.length === 1 ? "item" : "itens"}`;
  return (
    <Link href={`/${k.handle}#kits`} className="group flex min-w-0 flex-col text-ink no-underline">
      <KitMosaic items={k.items} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-3 text-[15px] leading-snug max-md:text-sm">
        <span className={`${kicker} text-[11px] text-gold`}>Kit · {count}</span>
        <span className="font-display text-[22px] leading-[1.1] break-words md:text-[28px]">{k.name}</span>
        {k.description && <p className="m-0 line-clamp-2 text-[13px] leading-snug text-mute md:text-[14px]">{k.description}</p>}
        {k.total > 0 && (
          <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">{formatBRL(k.final)}</span>
            {k.save > 0 && <span className="text-mute line-through">{formatBRL(k.total)}</span>}
          </span>
        )}
        <span className="mt-2 text-[13px] text-mute group-hover:text-ink">
          Montado por <span className="font-medium text-ink underline underline-offset-2">{k.creator}</span>
        </span>
      </div>
    </Link>
  );
}
