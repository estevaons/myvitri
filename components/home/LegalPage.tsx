import type { ReactNode } from "react";
import { pad, SiteFooter, SiteHeader } from "./chrome";

/** Moldura das páginas de privacidade e termos: título em serifa, data de atualização e texto corrido legível. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden bg-white text-ink">
      <SiteHeader
        links={[
          ["/", "Explorar vitrines"],
          ["/criar-vitrine", "Criar vitrine"],
        ]}
      />
      <article className={`mx-auto flex max-w-[760px] flex-col gap-10 pt-10 md:pt-16 ${pad}`}>
        <header className="flex flex-col gap-4">
          <h1 className="m-0 font-display text-[clamp(44px,7vw,80px)] leading-[1] font-normal">{title}</h1>
          <p className="m-0 text-[15px] text-mute">Atualizada em {updated}</p>
          <div className="text-[17px] leading-relaxed">{intro}</div>
        </header>
        {children}
      </article>
      <SiteFooter />
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 text-[16px] leading-relaxed [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2 [&_p]:m-0 [&_ul]:m-0 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
      <h2 className="m-0 font-display text-[32px] leading-[1.1] font-normal">{title}</h2>
      {children}
    </section>
  );
}
