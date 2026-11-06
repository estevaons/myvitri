import Link from "next/link";
import { FavoriteButton } from "@/components/storefront/FavoriteButton";
import type { HomeCreator } from "@/lib/vitrine/data";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

export function Avatar({ name, url, className }: { name: string; url: string; className: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- avatar vem de URL arbitrária
    return <img src={url} alt="" referrerPolicy="no-referrer" className={`${className} object-cover`} />;
  }
  return (
    <span aria-hidden="true" className={`${className} flex items-center justify-center bg-white font-semibold text-ink`}>
      {initials(name) || "?"}
    </span>
  );
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * A capa de quem não enviou foto: a primeira letra do nome, grande, ocupando o espaço da capa. O tamanho acompanha a
 * caixa (largura e altura), para servir do card quadrado à faixa larga do topo da vitrine.
 */
export function CoverLetter({ name }: { name: string }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-sand [container-type:size]">
      <span className="font-display text-[min(52cqw,72cqh)] leading-none font-normal text-ink">{[...name.trim()][0]?.toUpperCase() || "?"}</span>
    </div>
  );
}

/**
 * Capa quadrada da vitrine: a foto de capa ou a primeira letra do nome, com o nome por cima.
 * `caption={false}` tira o nome, para quando ele já aparece ao lado.
 */
export function CreatorCover({ c, caption = true }: { c: HomeCreator; caption?: boolean }) {
  return (
    <div className="relative aspect-square overflow-hidden bg-sand">
      {c.bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- capa vem de URL arbitrária
        <img src={c.bannerUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      ) : (
        <CoverLetter name={c.creator} />
      )}
      {caption && (
        // O nome vem na frente, como na capa de uma revista; a foto de capa fica de fundo.
        <div
          className={`absolute inset-x-0 bottom-0 flex flex-col items-start p-3 md:p-5 ${c.bannerUrl ? "bg-linear-to-t from-black/75 via-black/35 to-transparent pt-10 text-white md:pt-20" : ""}`}
        >
          <span className="font-display text-[22px] leading-[1.05] font-medium break-words md:text-[clamp(26px,2.4vw,36px)]">{c.creator}</span>
        </div>
      )}
    </div>
  );
}

/** Card de vitrine da home logada. O coração fica fora do link: botão dentro de link não é HTML válido. */
export function CreatorCard({ c, favorited }: { c: HomeCreator; favorited: boolean }) {
  const stats = [c.products > 0 && count(c.products, "produto", "produtos"), c.coupons > 0 && count(c.coupons, "cupom", "cupons")]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="relative min-w-0">
      <Link href={`/${c.handle}`} className="group flex min-w-0 flex-col text-ink no-underline">
        <CreatorCover c={c} />
        {/* no celular o card é estreito: os números descem para a linha de baixo em vez de cortar */}
        <span className="flex min-w-0 flex-col pt-3 text-[14px] text-mute group-hover:text-ink md:flex-row md:text-[15px]">
          <span className="truncate">@{c.handle}</span>
          {stats && (
            <span className="truncate">
              <span className="max-md:hidden">&nbsp;·&nbsp;</span>
              {stats}
            </span>
          )}
        </span>
      </Link>
      <FavoriteButton variant="card" handle={c.handle} name={c.creator} favorited={favorited} guest={false} />
    </div>
  );
}
