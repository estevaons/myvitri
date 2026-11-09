import Image from "next/image";

/** Painel direito das telas de acesso (só no desktop): a arara com as peças escolhidas, que é a ideia da vitrine. Decorativo, fora do leitor de tela. */
export function AuthPhoto() {
  return (
    <div aria-hidden="true" className="relative overflow-hidden bg-sand max-md:hidden">
      <Image
        src="/create_account/capa.webp"
        alt=""
        fill
        preload
        quality={90}
        // o painel é mais estreito que a foto, deitada: ela aparece mais larga que ele. No celular o painel some e o 1px evita baixar a foto grande
        sizes="(min-width: 1024px) 95vw, (min-width: 768px) 180vw, 1px"
        // enquadra da arara até a bolsa; em janela estreita não cabem as duas, e fica a arara inteira
        className="object-cover object-[57%_50%] max-xl:object-[46%_50%]"
      />
    </div>
  );
}
