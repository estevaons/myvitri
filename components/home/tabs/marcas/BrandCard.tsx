import Link from "next/link";
import { Avatar } from "@/components/home/CreatorCard";
import type { BrandCreator, CatalogBrand } from "@/lib/vitrine/catalog/brands";
import { couponOff, daysLeft, expiryLabel } from "@/lib/vitrine/pricing";
import { kicker } from "../../chrome";
import { SOON_DAYS, soonest } from "./query";

/** Logo da marca num círculo; sem logo, a inicial em serifa. */
export function BrandLogo({ name, url, className }: { name: string; url: string; className: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária
    return <img src={url} alt="" loading="lazy" className={`${className} flex-none rounded-full bg-white object-contain`} />;
  }
  return (
    <span aria-hidden="true" className={`${className} flex flex-none items-center justify-center rounded-full border border-sand bg-white font-display text-ink`}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/** Rostos sobrepostos de quem oferece cupom da marca (até 3). */
export function CreatorFaces({ creators }: { creators: BrandCreator[] }) {
  return (
    <span aria-hidden="true" className="flex flex-none">
      {creators.slice(0, 3).map((c, i) => (
        <Avatar key={c.handle} name={c.name} url={c.avatarUrl} className={`box-border size-7 rounded-full border-2 border-white text-[10px] ${i > 0 ? "-ml-2.5" : ""}`} />
      ))}
    </span>
  );
}

/** "em 3 vitrines" ou "com Fulana" quando é uma só. */
export const creatorsLabel = (creators: BrandCreator[]) => (creators.length > 1 ? `em ${creators.length} vitrines` : `com ${creators[0]?.name ?? ""}`);

/** Card do diretório: o melhor cupom somando todas as creators. Clicar abre (ou fecha) o comparativo. */
export function BrandCard({ b, today, href, selected }: { b: CatalogBrand; today: string; href: string; selected: boolean }) {
  const best = b.coupons[0];
  const next = soonest(b);
  const soon = next !== null && (daysLeft(next, today) ?? Infinity) <= SOON_DAYS;
  return (
    <Link
      href={href}
      scroll={false}
      aria-expanded={selected}
      aria-controls={selected ? "marca-detalhe" : undefined}
      className={`group flex min-w-0 flex-col gap-4 p-4 text-ink no-underline md:gap-5 md:p-6 ${selected ? "bg-sand shadow-[inset_0_0_0_1px_var(--color-ink)]" : "bg-cream hover:bg-sand"}`}
    >
      <BrandLogo name={b.brand} url={b.logoUrl} className="size-10 text-[20px] md:size-12 md:text-[24px]" />
      <span className="flex min-w-0 flex-col gap-2">
        <span className="font-display text-[24px] leading-[1.05] font-normal break-words md:text-[clamp(26px,2.4vw,34px)]">{b.brand}</span>
        <span className={`${kicker} text-[11px] text-gold`}>{b.coupons.length > 1 ? `Até ${couponOff(best)}` : couponOff(best)}</span>
      </span>
      <span className="mt-auto flex min-w-0 flex-col gap-2 border-t border-black/10 pt-3 text-[13px]">
        <span className="flex min-w-0 items-center gap-2">
          <CreatorFaces creators={b.creators} />
          <span className="truncate text-mute">{creatorsLabel(b.creators)}</span>
        </span>
        <span className={soon ? "font-medium text-gold" : "text-mute"}>{next ? expiryLabel(next, today) : "Sem validade"}</span>
      </span>
    </Link>
  );
}
