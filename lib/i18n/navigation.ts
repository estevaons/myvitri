import type { ComponentProps } from "react";
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * No lugar de `next/link` e `next/navigation`: põem o prefixo do idioma e traduzem o caminho
 * ("/inicio" vira "/en/home" em inglês). Com parâmetros ou âncora, passe um objeto:
 * `{ pathname: "/inicio", query: { tab: "products" } }`; para uma vitrine, `vitrineHref(handle)`.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

/** Destino aceito pelo `Link` (e pelo `redirect`): uma página do routing ou o objeto com parâmetros. */
export type Href = ComponentProps<typeof Link>["href"];

/** Destino aceito pelo `redirect` e pelo `getPathname` (sem âncora); também serve ao `Link`. */
export type RedirectHref = Parameters<typeof redirect>[0]["href"];

/**
 * Caminho interno em texto ("/inicio?tab=x", vindo de um `?next=` ou de um cookie) → destino do `Link`/`redirect`.
 * Caminho que não é página do routing (o link de uma vitrine) segue igual, só com o prefixo do idioma.
 */
export function hrefOf(path: string): RedirectHref {
  const url = new URL(path, "http://x");
  return { pathname: url.pathname, query: Object.fromEntries(url.searchParams) } as RedirectHref;
}

/** Link de uma vitrine (`/@fulana`, com âncora opcional como "cupons"), igual nos dois idiomas. */
export const vitrineHref = (handle: string, hash?: string): Href => ({ pathname: "/[handle]", params: { handle: `@${handle}` }, ...(hash && { hash }) });
