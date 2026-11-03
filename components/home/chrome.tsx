import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/Logo";
import { BRAND } from "@/lib/brand";

/** Peças comuns da home e da página para creators, no mesmo visual das vitrines. */

export const pad = "px-5 md:px-12";
export const pillDark = "flex min-h-12 items-center justify-center rounded-full bg-ink px-6 text-[15px] font-medium text-white no-underline";
export const pillLight =
  "flex min-h-11 items-center justify-center rounded-full border border-[#CACACB] bg-white px-5 text-[15px] font-medium text-ink no-underline hover:border-ink";

export function SiteHeader({ links }: { links: [href: string, label: string][] }) {
  return (
    <header className={`mx-auto flex max-w-[1440px] items-center justify-between gap-4 py-3.5 ${pad}`}>
      <Link href="/" aria-label="MyVitri — início" className="flex text-ink no-underline">
        <Wordmark label="" className="h-[38px] w-auto" />
      </Link>
      <nav className="flex items-center gap-5">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="text-[15px] font-medium text-ink no-underline hover:text-mute max-md:hidden">
            {label}
          </Link>
        ))}
        <Link href="/editor" className={pillLight}>
          Minha vitrine
        </Link>
      </nav>
    </header>
  );
}

/** Cabeçalho de seção: rótulo pequeno + título grande à esquerda, texto e ações à direita. */
export function SectionHead({ kicker, title, text, children }: { kicker: string; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10">
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-medium">{kicker}</span>
        <h2 className="m-0 font-condensed text-[clamp(48px,7vw,88px)] leading-[0.88] font-extrabold uppercase">{title}</h2>
      </div>
      <div className="flex max-w-[26rem] flex-col gap-4 md:items-end md:text-right">
        <p className="m-0 text-[17px] leading-relaxed">{text}</p>
        {children && <div className="flex flex-wrap gap-2 md:justify-end">{children}</div>}
      </div>
    </div>
  );
}

const FOOTER: [title: string, links: [href: string, label: string][]][] = [
  [
    "Para quem compra",
    [
      ["/#creators", "Creators"],
      ["/#cupons", "Cupons ativos"],
      ["/#categorias", "Categorias"],
      ["/#marcas", "Marcas"],
    ],
  ],
  [
    "Para creators",
    [
      ["/para-creators", "Criar minha vitrine"],
      ["/editor", "Entrar"],
      ["/marinacosta", "Vitrine de exemplo"],
    ],
  ],
];

export function SiteFooter() {
  return (
    <footer className={`mx-auto mt-20 max-w-[1440px] md:mt-28 ${pad}`}>
      <div className="grid gap-10 border-t border-line py-12 md:grid-cols-[2fr_1fr_1fr]">
        <div className="flex max-w-xs flex-col gap-3">
          <Wordmark className="h-[38px] w-auto self-start text-ink" />
          <p className="m-0 text-[15px] leading-relaxed text-mute">Os achados de quem você segue, com o cupom já no preço.</p>
        </div>
        {FOOTER.map(([title, links]) => (
          <nav key={title} aria-label={title} className="flex flex-col gap-3">
            <span className="text-[15px] font-medium">{title}</span>
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="text-[15px] text-mute no-underline hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line py-6 text-[13px] text-mute">
        <span>
          © {BRAND} · Preços e cupons podem mudar na loja da marca.
        </span>
        <nav aria-label="Informações legais" className="flex gap-5">
          <Link href="/privacidade" className="text-inherit no-underline hover:text-ink">
            Privacidade
          </Link>
          <Link href="/termos" className="text-inherit no-underline hover:text-ink">
            Termos
          </Link>
          <span>Feito no Brasil</span>
        </nav>
      </div>
    </footer>
  );
}
