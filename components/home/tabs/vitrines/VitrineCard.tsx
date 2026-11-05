import Link from "next/link";
import { CreatorCover } from "@/components/home/CreatorCard";
import { FavoriteButton } from "@/components/storefront/FavoriteButton";
import type { CatalogVitrine } from "@/lib/vitrine/catalog/vitrines";
import { couponOff } from "@/lib/vitrine/pricing";
import { countLabel } from "../../catalog/ui";

const BRANDS_SHOWN = 3;

/**
 * Card da aba "Vitrines": a capa da landing só com o nome e, por cima dela, o maior desconto, no mesmo
 * selo dos produtos: é o que mais ajuda a escolher em quem clicar. Embaixo, em ordem de importância: quem
 * é, as marcas, e quanto há para ver (o que está zerado não aparece). O coração fica fora do link, por cima
 * da capa: botão dentro de link não é HTML válido.
 */
export function VitrineCard({ v, favorited, stay = false }: { v: CatalogVitrine; favorited: boolean; stay?: boolean }) {
  const { card } = v;
  const extra = v.brands.length - BRANDS_SHOWN;
  const stats = [
    card.products > 0 && countLabel(card.products, "produto", "produtos"),
    card.coupons > 0 && countLabel(card.coupons, "cupom", "cupons"),
    v.kits > 0 && countLabel(v.kits, "kit", "kits"),
  ].filter((s) => s !== false);
  return (
    // `stay` (aba Favoritas): sem o coração, o card fica esmaecido no lugar, para dar para voltar atrás
    <div className={`relative flex min-w-0 flex-col ${stay ? "[&:has(button[aria-pressed=false])>a]:opacity-50" : ""}`}>
      <Link href={`/${card.handle}`} className="group flex min-w-0 flex-1 flex-col text-ink no-underline transition-opacity">
        <div className="relative">
          <CreatorCover c={card} face={false} />
          {v.best && <span className="absolute top-2.5 left-2.5 bg-ink px-2 py-1 text-[12px] leading-none font-medium whitespace-nowrap text-white lining-nums">Até {couponOff(v.best)}</span>}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-3 text-[13px] leading-snug md:text-[14px]">
          <span className="truncate text-mute group-hover:text-ink">@{card.handle}</span>
          {v.brands.length > 0 && (
            <span className="truncate font-medium">
              {v.brands.slice(0, BRANDS_SHOWN).join(", ")}
              {extra > 0 && <span className="font-normal text-mute"> +{extra}</span>}
            </span>
          )}
          {/* cada número quebra inteiro no card estreito; o ponto entre eles só aparece no computador, onde cabem numa linha */}
          <span className="flex flex-wrap gap-x-2 text-mute md:gap-x-1.5">
            {stats.map((s) => (
              <span key={s} className="whitespace-nowrap md:not-last:after:ml-1.5 md:not-last:after:content-['·']">
                {s}
              </span>
            ))}
          </span>
          {v.expiring && <span className="pt-1 text-[11px] font-medium tracking-[0.16em] text-gold uppercase">Cupom {v.expiring.toLowerCase()}</span>}
        </div>
      </Link>
      <FavoriteButton variant="card" handle={card.handle} name={card.creator} favorited={favorited} guest={false} stay={stay} />
    </div>
  );
}
