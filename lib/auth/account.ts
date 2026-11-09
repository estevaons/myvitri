import type { Locale } from "@/lib/i18n/routing";

/**
 * O que quem não tem vitrine digita para confirmar a exclusão da conta (quem tem digita o link da vitrine),
 * no idioma da página. A ação aceita a palavra de qualquer idioma.
 */
export const DELETE_WORDS: Record<Locale, string> = { "pt-BR": "excluir", en: "delete" };
