import { useTranslations } from "next-intl";
import Image from "next/image";

/**
 * Foto do topo da landing. É deitada, com a pessoa no meio e uma parede lisa à esquerda: no desktop ela ocupa
 * o hero inteiro e o título fica em cima da parede (o clareado na esquerda é o que dá contraste ao texto).
 * No celular e no tablet ela vem depois do texto, com um zoom que corta a parede e aproxima o look.
 */
export function LookHero() {
  const t = useTranslations("lookHero");
  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-sand md:aspect-[3/2] lg:absolute lg:inset-0 lg:aspect-auto">
      <Image
        src="/hero/retrato.webp"
        alt={t("alt")}
        fill
        preload
        quality={90}
        // abaixo do lg tem zoom (e, no celular, quadro em pé): a foto aparece mais larga que a tela, e é essa largura que o navegador precisa baixar
        sizes="(min-width: 2560px) 2560px, (min-width: 1024px) 100vw, (min-width: 768px) 130vw, 220vw"
        className="origin-[50%_72%] scale-[1.35] object-cover object-[50%_66%] md:scale-[1.3] lg:scale-100"
      />
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[62%] bg-linear-to-r from-cream/80 via-cream/45 to-transparent max-lg:hidden" />
    </div>
  );
}
