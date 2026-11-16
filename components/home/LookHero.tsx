import { useTranslations } from "next-intl";
import Image from "next/image";

/**
 * Foto do topo da landing (`/hero/look.webp`, 3840×2560, de reza abdollahi no Unsplash, Unsplash License:
 * unsplash.com/photos/vljOAi748jU). É deitada, com a pessoa no meio e uma parede lisa de colunas à esquerda: no desktop
 * ela ocupa o hero inteiro e o título fica em cima da parede (o clareado na esquerda é o que dá contraste ao texto).
 * Com 3840px ela não estica nem numa tela de 2560px (a anterior tinha 2400px e perdia nitidez).
 * Em todas as larguras ela fica atrás do texto. No celular e no tablet o hero é em pé, a foto corta as laterais e fica só a pessoa;
 * o texto vai embaixo, sobre um clareado creme que sobe do pé da foto (o do desktop vem da esquerda).
 * `object-[50%_30%]`: no hero largo a foto corta em cima e embaixo, e assim o lenço e os óculos ficam inteiros.
 *
 * Do `lg` em diante a foto anda `SHIFT` para a direita, para a pessoa sair de perto do texto e não sobrar parede vazia à direita.
 * Como a foto já cobre a largura toda (só corta em cima e embaixo), não há sobra para mexer no enquadramento: a faixa que fica livre
 * à esquerda é preenchida com a própria foto espelhada, encostada nela. O espelho começa exatamente onde a foto termina, então a emenda
 * é contínua, e ali só há parede. Mesma `src` e mesmo `sizes`: o navegador baixa o arquivo uma vez só.
 */
export function LookHero() {
  const t = useTranslations("lookHero");
  // No celular o hero é em pé (~1:2) e a foto, 3:2: ela aparece ~3x mais larga que a tela, e no tablet ~1,85x. No celular o pedido
  // fica em 220vw, abaixo do que a tela de densidade 3 pediria: a 2560px a foto continua nítida e o arquivo cai quase pela metade.
  const sizes = "(min-width: 2560px) 2560px, (min-width: 1024px) 100vw, (min-width: 768px) 185vw, 220vw";
  const fit = "object-cover object-[50%_30%]";
  return (
    <div className="absolute inset-0 overflow-hidden bg-sand">
      {/* SHIFT = 18%: as classes abaixo (left/right da foto e do espelho) precisam andar juntas */}
      <div aria-hidden="true" className="absolute inset-y-0 right-[82%] w-full -scale-x-100 max-lg:hidden">
        <Image src="/hero/look.webp" alt="" fill quality={90} sizes={sizes} className={fit} />
      </div>
      <div className="absolute inset-0 lg:right-[-18%] lg:left-[18%]">
        <Image src="/hero/look.webp" alt={t("alt")} fill preload quality={90} sizes={sizes} className={fit} />
      </div>
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[62%] bg-linear-to-r from-cream/80 via-cream/45 to-transparent max-lg:hidden" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[66%] bg-linear-to-t from-cream from-40% via-cream/80 via-65% to-transparent lg:hidden" />
    </div>
  );
}
