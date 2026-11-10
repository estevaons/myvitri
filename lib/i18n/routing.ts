import { defineRouting } from "next-intl/routing";

/**
 * Português sem prefixo (`/inicio`) e inglês com prefixo e caminho traduzido (`/en/home`). O idioma da página vem
 * sempre da URL; o cookie só lembra a última escolha para redirecionar quem abre um link sem prefixo (veja proxy.ts).
 *
 * `pathnames`: a chave é o caminho interno (o nome da pasta em app/[locale]) e o valor, a URL de cada idioma.
 * O `Link`, o `redirect` e o `useRouter` de ./navigation traduzem sozinhos; com parâmetros, use
 * `{ pathname: "/inicio", query: { … } }`, porque um texto com `?` não é reconhecido como página.
 */
export const routing = defineRouting({
  locales: ["pt-BR", "en"],
  defaultLocale: "pt-BR",
  localePrefix: "as-needed",
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
  pathnames: {
    "/": "/",
    "/inicio": { "pt-BR": "/inicio", en: "/home" },
    "/criar-vitrine": { "pt-BR": "/criar-vitrine", en: "/create-storefront" },
    "/entrar": { "pt-BR": "/entrar", en: "/sign-in" },
    "/nova-senha": { "pt-BR": "/nova-senha", en: "/new-password" },
    "/editor": "/editor",
    "/metricas": { "pt-BR": "/metricas", en: "/metrics" },
    "/termos": { "pt-BR": "/termos", en: "/terms" },
    "/privacidade": { "pt-BR": "/privacidade", en: "/privacy" },
    // vitrine: `/@fulana` nos dois idiomas (o segmento chega com o `@`; veja lib/vitrine/links.ts)
    "/[handle]": "/[handle]",
  },
});

export type Locale = (typeof routing.locales)[number];

/** "/inicio?tab=x" → ["/inicio", "?tab=x"]: o caminho e o resto (busca e âncora). */
function splitPath(path: string): [pathname: string, rest: string] {
  const i = path.search(/[?#]/);
  return i < 0 ? [path, ""] : [path.slice(0, i), path.slice(i)];
}

const localizedOf = (internal: string, locale: Locale) => {
  const value = routing.pathnames[internal as keyof typeof routing.pathnames];
  return value === undefined ? internal : typeof value === "string" ? value : value[locale];
};

/**
 * Lê um caminho do navegador ("/en/home?tab=x") e devolve o idioma, se veio com prefixo e o caminho interno
 * ("/inicio?tab=x"). Caminho que não é de página do site (o link de uma vitrine) volta igual, sem o prefixo.
 */
export function parsePath(path: string): { locale: Locale; prefixed: boolean; internal: string } {
  const [full, rest] = splitPath(path);
  const first = full.split("/")[1];
  const prefix = routing.locales.find((l) => l === first && l !== routing.defaultLocale);
  const locale = prefix ?? routing.defaultLocale;
  const pathname = prefix ? full.slice(prefix.length + 1) || "/" : full;
  const internal = Object.keys(routing.pathnames).find((key) => localizedOf(key, locale) === pathname) ?? pathname;
  return { locale, prefixed: Boolean(prefix), internal: internal + rest };
}

/**
 * Caminho interno, sem idioma ("/en/home?tab=x" → "/inicio?tab=x"). Os caminhos de volta (depois de entrar, do
 * Google, do link por e-mail) são guardados assim, e o `Link`/`redirect` de ./navigation põe o idioma certo.
 */
export const internalPath = (path: string) => parsePath(path).internal;

/** Caminho interno → URL no idioma, com o prefixo ("/inicio?tab=x" em inglês → "/en/home?tab=x"). */
export function localizePath(path: string, locale: Locale) {
  const [internal, rest] = splitPath(path);
  const localized = localizedOf(internal, locale);
  if (locale === routing.defaultLocale) return localized + rest;
  return (localized === "/" ? `/${locale}` : `/${locale}${localized}`) + rest;
}
