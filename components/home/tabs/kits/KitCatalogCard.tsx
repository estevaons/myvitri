import { Link, vitrineHref } from "@/lib/i18n/navigation";
import type { CatalogKit } from "@/lib/vitrine/catalog/kits";
import { KitMosaic } from "../../KitCard";

/**
 * Card do catálogo de kits: o mesmo mosaico do carrossel, com descrição e quem montou, como o card de
 * produto. Leva aos kits da vitrine de quem montou.
 */
export function KitCatalogCard({ k }: { k: CatalogKit }) {
  return (
    <Link href={vitrineHref(k.handle, "kits")} className="group flex min-w-0 flex-col text-ink no-underline">
      <KitMosaic items={k.items} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-3 text-[15px] leading-snug max-md:text-sm">
        <span className="font-display text-[22px] leading-[1.1] break-words md:text-[28px]">{k.name}</span>
        {k.description && <p className="m-0 line-clamp-2 text-[13px] leading-snug text-mute md:text-[14px]">{k.description}</p>}
        <span className="mt-2 text-[13px] text-mute group-hover:text-ink">
          Montado por <span className="font-medium text-ink underline underline-offset-2">{k.creator}</span>
        </span>
      </div>
    </Link>
  );
}
