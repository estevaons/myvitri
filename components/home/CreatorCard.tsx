import Link from "next/link";
import { FavoriteButton } from "@/components/storefront/FavoriteButton";
import { ProductArt } from "@/components/storefront/ProductIcon";
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
    return <img src={url} alt="" className={`${className} object-cover`} />;
  }
  return (
    <span aria-hidden="true" className={`${className} flex items-center justify-center bg-white font-semibold text-ink`}>
      {initials(name) || "?"}
    </span>
  );
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Capa quadrada da vitrine: a foto de capa ou um mosaico dos produtos, com o rosto e o nome por cima.
 * `caption={false}` tira o rosto e o nome, para quando eles já aparecem ao lado; `face={false}` tira só o rosto.
 */
export function CreatorCover({ c, caption = true, face = true }: { c: HomeCreator; caption?: boolean; face?: boolean }) {
  // Foto de loja é quadrada: o card também é, e cada célula do mosaico fica quadrada como a foto.
  // Célula de outro formato sobra faixa do cinza do card em volta, que não bate com o fundo da foto.
  // Por isso é 2×2 com 4 produtos ou mais; com menos, só o primeiro ocupando o card todo.
  const art = c.art.slice(0, c.art.length >= 4 ? 4 : 1);
  const cover = Boolean(c.bannerUrl || art.length);
  return (
    <div className="relative aspect-square overflow-hidden bg-cream">
      {c.bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- capa vem de URL arbitrária
        <img src={c.bannerUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      ) : (
        art.length > 0 && (
          <div aria-hidden="true" className={`grid size-full gap-px bg-white ${art.length === 4 ? "grid-cols-2 grid-rows-2" : "grid-cols-1"}`}>
            {art.map((p) => (
              <div key={p.id} className="relative flex items-center justify-center overflow-hidden bg-cream">
                <ProductArt product={p} iconClassName={art.length === 1 ? "w-[50%]" : "w-[56%]"} strokeWidth={3.6} />
              </div>
            ))}
          </div>
        )
      )}
      {caption && (
        // A pessoa vem na frente, como na capa de uma revista: rosto e nome sobre a imagem; os produtos ficam de fundo.
        <div
          className={`absolute inset-x-0 bottom-0 flex flex-col items-start gap-1.5 p-3 md:gap-3 md:p-5 ${cover ? "bg-linear-to-t from-black/75 via-black/35 to-transparent pt-10 text-white md:pt-20" : ""}`}
        >
          {face && <Avatar name={c.creator} url={c.avatarUrl} className="box-border size-9 rounded-full border-2 border-white text-xs md:size-14 md:text-sm" />}
          <span className="font-display text-[22px] leading-[1.05] font-medium break-words md:text-[clamp(26px,2.4vw,36px)]">{c.creator}</span>
        </div>
      )}
      {!caption && !cover && (
        <div aria-hidden="true" className="flex size-full items-center justify-center">
          <Avatar name={c.creator} url={c.avatarUrl} className="box-border size-[38%] rounded-full border-4 border-white text-[clamp(28px,4vw,56px)]" />
        </div>
      )}
    </div>
  );
}

/**
 * Card de vitrine da landing e da home. Com `favorited` (só na home: a landing é estática e não sabe quem
 * está vendo) ganha o coração, fora do link: botão dentro de link não é HTML válido.
 */
export function CreatorCard({ c, favorited }: { c: HomeCreator; favorited?: boolean }) {
  const stats = [c.products > 0 && count(c.products, "produto", "produtos"), c.coupons > 0 && count(c.coupons, "cupom", "cupons")]
    .filter(Boolean)
    .join(" · ");
  const card = (
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
  );
  if (favorited === undefined) return card;
  return (
    <div className="relative min-w-0">
      {card}
      <FavoriteButton variant="card" handle={c.handle} name={c.creator} favorited={favorited} guest={false} />
    </div>
  );
}
