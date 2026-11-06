import { defineRouting } from "next-intl/routing";

/**
 * Português sem prefixo (`/inicio`) e inglês com (`/en/inicio`). O idioma da página vem sempre da URL;
 * o cookie só lembra a última escolha para redirecionar quem abre um link sem prefixo (veja proxy.ts).
 */
export const routing = defineRouting({
  locales: ["pt-BR", "en"],
  defaultLocale: "pt-BR",
  localePrefix: "as-needed",
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];

/**
 * Caminho sem o prefixo de idioma ("/en/tvin?x=1" → "/tvin?x=1"). Os caminhos de volta (depois de entrar,
 * do Google, do link por e-mail) são guardados assim, e o `Link`/`redirect` do next-intl põe o prefixo certo.
 */
export function withoutLocale(path: string) {
  const match = path.match(/^\/([^/?#]+)(.*)$/);
  if (!match || !routing.locales.some((l) => l === match[1] && l !== routing.defaultLocale)) return path;
  return match[2].startsWith("/") ? match[2] : `/${match[2]}`;
}
