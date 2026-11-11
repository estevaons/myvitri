import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/**
 * Peças das telas de espera: enquanto a página busca os dados (sessão, vitrine), aparece o formato dela em vez de
 * uma tela branca. Não leem nada por requisição, então entram no shell estático que o Next pré-carrega e surgem
 * na hora do clique.
 */

/**
 * Bloco cinza no lugar de um texto, foto ou botão que ainda não chegou, com um reflexo que o atravessa
 * (`skeleton` e `animate-shimmer`, em app/globals.css). Com "reduzir movimento", fica parado.
 */
export function Bone({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block skeleton motion-safe:animate-shimmer ${className}`} />;
}

/** Embrulho da tela de espera: avisa o leitor de tela que a página está carregando. */
export function LoadingScreen({ className = "", children }: { className?: string; children: ReactNode }) {
  const t = useTranslations("common");
  return (
    <div role="status" aria-busy="true" aria-label={t("loading")} className={className}>
      {children}
    </div>
  );
}
