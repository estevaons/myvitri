import Link from "next/link";
import { HOST } from "@/lib/brand";
import type { HomeCreator } from "@/lib/vitrine/data";
import { CoverLetter } from "./CreatorCard";
import { kicker } from "./chrome";

/**
 * Mosaico de vitrines da landing, como a página de uma revista: uma vitrine em destaque ocupando duas colunas
 * e duas linhas, as outras em cards altos colados, sempre com o nome sobre a foto. O card "Sua vitrine aqui"
 * vem por último e estica até fechar a última linha, para o mosaico não ficar com buraco com poucas vitrines.
 */

/** Largura do card de convite, conforme quantos cards há além do destaque (contando ele). */
const INVITE_SPAN: Record<number, string> = {
  1: "md:col-span-2 md:row-span-2",
  2: "md:col-span-2",
  3: "md:col-span-2",
  5: "md:col-span-4 md:min-h-64",
  6: "md:col-span-3",
  7: "md:col-span-2",
};

/** O destaque precisa aguentar o tamanho: de preferência quem tem foto de capa e, entre esses, a vitrine mais completa. */
function pickLead(creators: HomeCreator[]) {
  return [...creators].sort((a, b) => Number(Boolean(b.bannerUrl)) - Number(Boolean(a.bannerUrl)) || b.products - a.products)[0];
}

function Tile({ c, lead = false, className }: { c: HomeCreator; lead?: boolean; className: string }) {
  const cover = Boolean(c.bannerUrl);
  return (
    <Link href={`/${c.handle}`} className={`group relative block min-w-0 overflow-hidden bg-sand no-underline ${cover ? "text-white" : "text-ink"} ${className}`}>
      {c.bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- capa vem de URL arbitrária
        <img src={c.bannerUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
      ) : (
        <CoverLetter name={c.creator} />
      )}
      <span
        className={`absolute inset-x-0 bottom-0 flex flex-col font-display ${cover ? "bg-linear-to-t from-black/70 via-black/30 to-transparent" : ""} ${
          lead ? "items-center gap-1 p-6 pt-32 text-center md:gap-2 md:p-10 md:pt-48" : "items-start p-3 pt-16 md:p-5 md:pt-24"
        }`}
      >
        <em className={lead ? "text-[20px] leading-none md:text-[clamp(20px,2vw,28px)]" : "text-[14px] leading-tight md:text-[16px]"}>Vitrine de</em>
        <span className={`font-normal break-words ${lead ? "text-[44px] leading-[1] md:text-[clamp(44px,5.6vw,84px)]" : "text-[22px] leading-[1.05] md:text-[clamp(26px,2.4vw,36px)]"}`}>
          {c.creator}
        </span>
      </span>
    </Link>
  );
}

function Invite({ className }: { className: string }) {
  return (
    <Link href="/criar-vitrine" className={`group flex min-w-0 flex-col justify-between gap-4 bg-sand p-4 text-ink no-underline xl:p-6 ${className}`}>
      {/* no celular bem estreito a pergunta sai, para o card não ficar mais alto que o vizinho */}
      <span className={`${kicker} text-[11px] text-gold max-[359px]:hidden`}>Você cria conteúdo?</span>
      {/* em telas menores o card é estreito: título sem o "aqui" e tamanhos menores, para caber */}
      <span className="flex flex-col gap-2">
        <span className="font-display text-[30px] leading-[1] font-normal md:max-lg:text-[26px] xl:text-[clamp(36px,4vw,56px)]">
          Sua vitrine<span className="max-xl:hidden"> <em>aqui</em></span>
        </span>
        <span className="text-[15px] leading-snug text-mute max-md:hidden">
          Monte a sua em 2 minutos: {HOST}/seunome
        </span>
      </span>
      <span className={`flex min-h-10 items-center justify-center bg-ink px-4 ${kicker} text-[11px] text-white group-hover:bg-[#2b2925] max-md:px-1 max-md:text-[11px] max-md:tracking-[0.1em] xl:min-h-11`}>Criar grátis</span>
    </Link>
  );
}

export function CreatorMosaic({ creators }: { creators: HomeCreator[] }) {
  const lead = pickLead(creators);
  const rest = creators.filter((c) => c !== lead);
  const cards = rest.length + 1;
  // com um card só ao lado do destaque, ele e o convite empilham em duas faixas largas, da altura de duas linhas
  const tall = cards === 2 ? "aspect-[4/5] md:col-span-2 md:aspect-auto" : "aspect-[4/5]";
  return (
    // as duas linhas ao lado do destaque são iguais: sem isso, o conteúdo do convite esticaria só a dele
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4 md:grid-rows-2">
      <Tile c={lead} lead className="col-span-2 aspect-[4/5] md:row-span-2" />
      {rest.map((c) => (
        <Tile key={c.handle} c={c} className={tall} />
      ))}
      {/* no celular são duas colunas: número ímpar de cards deixa o convite na largura toda */}
      <Invite className={`${INVITE_SPAN[cards] ?? ""} ${cards % 2 ? "col-span-2 max-md:min-h-56" : "max-md:aspect-[4/5]"}`} />
    </div>
  );
}
