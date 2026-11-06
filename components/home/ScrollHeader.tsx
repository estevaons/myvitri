"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Deixa o cabeçalho da landing fixo no topo: quando a página passa da altura dele, ele encolhe e o fundo vira vidro.
 * O espaço reservado tem a altura do cabeçalho aberto (a mesma que o hero desconta), para a página não pular quando ele encolhe, e
 * é também o que marca a hora de encolher. Os filhos reagem com `group-data-[compact]/header:`.
 */
export function ScrollHeader({ children }: { children: ReactNode }) {
  const spacer = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!spacer.current) return;
    const watch = new IntersectionObserver((entries) => setCompact(!entries[entries.length - 1].isIntersecting));
    watch.observe(spacer.current);
    return () => watch.disconnect();
  }, []);

  return (
    <>
      <div ref={spacer} aria-hidden="true" className="h-[73px] md:h-[81px]" />
      <div
        data-compact={compact ? "" : undefined}
        className="group/header fixed inset-x-0 top-0 z-50 bg-white transition-[background-color,box-shadow] duration-200 ease-out data-[compact]:bg-white/80 data-[compact]:shadow-[0_1px_0_rgba(17,17,17,0.08)] data-[compact]:backdrop-blur-[40px] data-[compact]:backdrop-saturate-[1.6] motion-reduce:transition-none"
      >
        {children}
      </div>
    </>
  );
}
