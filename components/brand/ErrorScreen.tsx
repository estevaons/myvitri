import NextLink from "next/link";
import type { ReactNode } from "react";
import { kicker as kickerClass, pad } from "@/components/home/chrome";
import { TagMark, Wordmark } from "@/components/brand/Logo";
import { BRAND } from "@/lib/brand";

/**
 * Tela das páginas de erro (404 e falhas): só a marca no topo e uma mensagem centrada, no visual editorial do site.
 * Não usa hooks nem o `Link` do next-intl, porque também monta o global-error e o global-not-found, que ficam fora
 * do provedor de idioma: quem chama passa os textos já traduzidos e o endereço do início com o prefixo do idioma.
 */
export function ErrorScreen({
  code,
  kicker,
  title,
  text,
  homeHref,
  homeLabel,
  children,
  note,
}: {
  /** número grande no lugar da etiqueta (404); sem ele, a etiqueta da marca */
  code?: string;
  kicker: string;
  title: string;
  text: string;
  homeHref: string;
  /** nome acessível do logotipo, que leva ao início */
  homeLabel: string;
  /** botões de ação */
  children: ReactNode;
  /** linha miúda no fim, como o código do erro para o suporte */
  note?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-ink">
      <header className={`mx-auto flex w-full max-w-[1440px] items-center border-b border-sand py-4 ${pad}`}>
        <NextLink href={homeHref} aria-label={homeLabel} className="flex text-ink no-underline">
          <Wordmark label={BRAND} className="h-[19px] w-auto" />
        </NextLink>
      </header>
      <main className={`flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center ${pad}`}>
        {code ? (
          <span aria-hidden="true" className="font-display text-[clamp(120px,22vw,220px)] leading-[0.8] font-normal text-sand select-none">
            {code}
          </span>
        ) : (
          <TagMark label="" className="size-16" />
        )}
        <div className="flex max-w-[34rem] flex-col items-center gap-4">
          <span className={`${kickerClass} text-gold`}>{kicker}</span>
          <h1 className="m-0 font-display text-[clamp(40px,5.2vw,64px)] leading-[1.05] font-normal text-balance">{title}</h1>
          <p className="m-0 text-[16px] leading-relaxed text-pretty text-mute">{text}</p>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div>
        {note && <p className="m-0 text-[13px] text-mute">{note}</p>}
      </main>
    </div>
  );
}
