import Link from "next/link";
import type { CSSProperties } from "react";
import { Avatar } from "@/components/home/CreatorCard";
import type { CatalogBrand } from "@/lib/vitrine/catalog/brands";
import { couponOff } from "@/lib/vitrine/pricing";
import { kicker } from "../../chrome";
import { countLabel } from "../../catalog/ui";
import { BrandLogo } from "./BrandCard";

/**
 * Comparativo de uma marca: todos os cupons ativos dela, de todas as creators, lado a lado e do melhor
 * para o pior. Sem o código: "Pegar cupom" leva à vitrine, onde a visita e a cópia contam para a creator.
 */
export function BrandDetail({
  b,
  closeHref,
  categories,
  className = "",
  style,
}: {
  b: CatalogBrand;
  closeHref: string;
  categories: string[];
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section id="marca-detalhe" aria-label={`Cupons de ${b.brand}`} style={style} className={`col-span-full flex min-w-0 flex-col gap-6 border border-ink bg-white p-5 md:p-8 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <BrandLogo name={b.brand} url={b.logoUrl} className="size-12 text-[24px] md:size-16 md:text-[32px]" />
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] leading-[1] font-normal break-words">{b.brand}</h3>
            <p className="m-0 text-[14px] text-mute">
              {countLabel(b.coupons.length, "cupom ativo", "cupons ativos")} · {countLabel(b.creators.length, "vitrine", "vitrines")}
              {categories.length > 0 && <span className="max-md:hidden"> · {categories.join(", ")}</span>}
            </p>
          </div>
        </div>
        <Link href={closeHref} scroll={false} className={`${kicker} flex min-h-11 flex-none items-center gap-1.5 text-[11px] text-ink no-underline hover:text-gold`}>
          Fechar <span aria-hidden="true" className="text-[16px] leading-none">×</span>
        </Link>
      </div>

      {/* no celular rola de lado, como os cupons da landing; no computador, em grade */}
      <ol className="no-scrollbar m-0 -mx-5 flex list-none snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] md:gap-4 md:overflow-visible md:px-0">
        {b.coupons.map((c, i) => (
          <li key={c.id} className="flex w-[78%] flex-none snap-start md:w-auto">
            <Link
              href={`/${c.handle}#cupons`}
              className="box-border flex w-full flex-col gap-4 border border-sand bg-cream p-5 text-ink no-underline hover:border-gold md:min-h-[240px]"
            >
              <span className="flex min-w-0 items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={c.name} url={c.avatarUrl} className="box-border size-8 flex-none rounded-full border border-sand text-[11px]" />
                  <span className="truncate text-[14px] font-medium">{c.name}</span>
                </span>
                {i === 0 && b.coupons.length > 1 && <span className={`${kicker} flex-none text-[10px] text-gold`}>Melhor</span>}
              </span>
              <span className="flex flex-col gap-1.5">
                <span className="font-display text-[44px] leading-[0.95] font-normal lining-nums md:text-[52px]">{couponOff(c)}</span>
                {c.condition && <span className="text-[14px] leading-snug text-mute">{c.condition}</span>}
              </span>
              <span className={`mt-auto border-t border-sand pt-4 ${kicker} text-[11px] text-gold`}>Pegar cupom</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
