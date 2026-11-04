import Link from "next/link";
import type { ReactNode } from "react";
import { LoginButton } from "@/components/auth/forms";
import { Wordmark } from "@/components/brand/Logo";
import { BRAND } from "@/lib/brand";

/** Peças comuns da home e da página de criar vitrine, no mesmo visual das vitrines. */

export const pad = "px-5 md:px-12";
// Botões retos, em caixa alta espaçada: o tom de loja de joias em vez do botão-pílula de loja esportiva.
export const pillDark =
  "flex min-h-12 items-center justify-center bg-ink px-7 text-[12px] font-medium tracking-[0.18em] text-white uppercase no-underline hover:bg-[#2b2925]";
export const pillLight =
  "flex min-h-11 items-center justify-center border border-ink bg-transparent px-6 text-[12px] font-medium tracking-[0.18em] text-ink uppercase no-underline hover:bg-ink hover:text-white";
/** Rótulo pequeno em caixa alta, usado acima dos títulos e nos cabeçalhos do rodapé. */
export const kicker = "text-[12px] font-medium tracking-[0.22em] uppercase";

/** `action` substitui o botão da direita (padrão: Entrar, que abre o login num modal). */
export function SiteHeader({ links, action }: { links: [href: string, label: string][]; action?: ReactNode }) {
  return (
    <header className={`mx-auto flex max-w-[1440px] items-center justify-between gap-4 border-b border-sand py-4 ${pad}`}>
      <Link href="/" aria-label="MyVitri — início" className="flex text-ink no-underline">
        <Wordmark label="" className="h-[19px] w-auto" />
      </Link>
      <nav className="flex items-center gap-7">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className={`${kicker} whitespace-nowrap text-ink no-underline hover:text-gold max-md:hidden`}>
            {label}
          </Link>
        ))}
        {action ?? (
          <LoginButton className={pillLight} />
        )}
      </nav>
    </header>
  );
}

/** Cabeçalho de seção centrado, como numa revista: rótulo pequeno, título em serifa e texto curto embaixo. */
export function SectionHead({ kicker: label, title, text, children }: { kicker: string; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className={`${kicker} text-gold`}>{label}</span>
      <h2 className="m-0 font-display text-[clamp(40px,5.2vw,68px)] leading-[1] font-normal">{title}</h2>
      <p className="m-0 max-w-[30rem] text-[16px] leading-relaxed text-mute">{text}</p>
      {children && <div className="flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

const FOOTER: [title: string, links: [href: string, label: string][]][] = [
  [
    "Para quem compra",
    [
      ["/#vitrines", "Vitrines"],
      ["/#cupons", "Cupons ativos"],
      ["/#categorias", "Categorias"],
      ["/#marcas", "Marcas"],
    ],
  ],
  [
    "Para quem divulga",
    [
      ["/criar-vitrine", "Criar minha vitrine"],
      // não é link: abre o modal de login
      ["#entrar", "Entrar"],
      ["/#vitrines", "Ver vitrines"],
    ],
  ],
];

export function SiteFooter() {
  return (
    <footer className={`mx-auto mt-20 max-w-[1440px] md:mt-28 ${pad}`}>
      <div className="grid gap-10 border-t border-sand py-12 md:grid-cols-[2fr_1fr_1fr]">
        <div className="flex max-w-xs flex-col gap-3">
          <Wordmark className="h-[19px] w-auto self-start text-ink" />
          <p className="m-0 text-[15px] leading-relaxed text-mute">Os achados de quem você segue, cada um na sua vitrine.</p>
        </div>
        {FOOTER.map(([title, links]) => (
          <nav key={title} aria-label={title} className="flex flex-col gap-3">
            <span className={kicker}>{title}</span>
            {links.map(([href, label]) =>
              href === "#entrar" ? (
                <LoginButton key={href} className="self-start text-left text-[15px] text-mute hover:text-ink">
                  {label}
                </LoginButton>
              ) : (
                <Link key={href} href={href} className="text-[15px] text-mute no-underline hover:text-ink">
                  {label}
                </Link>
              ),
            )}
          </nav>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-sand py-6 text-[13px] text-mute">
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
