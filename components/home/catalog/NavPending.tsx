"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

/**
 * Cada aba, filtro, ordem e "Ver mais" do /inicio é um link que o servidor monta de novo, e a página antiga fica
 * na tela até a nova chegar. Enquanto isso, o conteúdo esmaece (quem esmaece usa `group-aria-busy:`) e uma barra
 * corre no topo, para o clique não parecer perdido. Vale para qualquer link do /inicio dentro dela, inclusive
 * os das listas dos filtros, que fecham no clique.
 *
 * A espera acaba quando a URL muda: o roteador troca a URL junto com o conteúdo novo.
 */
export function NavPending({ className, children }: { className?: string; children: ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = search ? `${pathname}?${search}` : pathname;
  // a URL de quando o link foi clicado: enquanto ela for a atual, a próxima página ainda não chegou
  const [from, setFrom] = useState<string | null>(null);
  // a URL mudou: esquece o clique, senão o voltar do navegador para aquela URL acenderia a espera de novo
  const [seen, setSeen] = useState(here);
  if (seen !== here) {
    setSeen(here);
    setFrom(null);
  }
  const pending = from === here;

  return (
    <div
      aria-busy={pending}
      className={`group ${className ?? ""}`}
      onClickCapture={(e) => {
        // nova aba, nova janela e download não trocam esta página
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = (e.target as Element).closest("a");
        if (!a || a.target || a.hasAttribute("download")) return;
        const url = new URL(a.href, location.href);
        // só os links do próprio /inicio que mudam alguma coisa: clicar na aba atual não carrega nada
        if (url.origin !== location.origin || url.pathname !== location.pathname || url.search === location.search) return;
        setFrom(here);
      }}
    >
      {pending && <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left animate-nav-progress bg-gold motion-reduce:animate-none motion-reduce:opacity-60" />}
      {children}
    </div>
  );
}
