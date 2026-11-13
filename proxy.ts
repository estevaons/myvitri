import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_OPTIONS, captureAttribution } from "@/lib/analytics/attribution";
import { localizePath, parsePath, routing } from "@/lib/i18n/routing";

const handleI18n = createMiddleware(routing);

/** Rotas que dependem de login (caminhos internos): só nelas a sessão do Supabase é renovada. */
const SESSION_PATHS = ["/", "/criar-vitrine", "/entrar", "/nova-senha", "/boas-vindas", "/inicio", "/metricas", "/editor"];

/**
 * Idioma, sessão e portas de entrada.
 * - Idioma (next-intl): `/en/...` é inglês, com o caminho traduzido (`/en/home` é a página /inicio), e o resto,
 *   português. Quem abre um link sem prefixo vai para o idioma da última escolha (cookie NEXT_LOCALE). O idioma do
 *   navegador não conta: o público é brasileiro, e um navegador em inglês não deve tirar ninguém do português.
 * - Sessão: renova os cookies do Supabase antes das rotas que dependem de login.
 * - Encaminha `/?code=…` para o callback, caso o Supabase volte do Google para a Site URL em vez de /auth/callback.
 * - Portas de entrada: quem já entrou vai da landing e de /entrar para /inicio, e de /criar-vitrine para /editor/criar
 *   (criar só a vitrine, sem cadastro); quem não entrou vai de /inicio para a landing (assim a landing e o
 *   /criar-vitrine não leem cookies e continuam estáticos).
 */
export async function proxy(incoming: NextRequest) {
  const headers = new Headers(incoming.headers);
  headers.delete("accept-language");
  const request = new NextRequest(incoming, { headers });

  const { pathname, searchParams } = request.nextUrl;
  const { locale, prefixed, internal: path } = parsePath(pathname);
  // sem prefixo, o destino sai em português e o next-intl leva ao idioma do cookie, se for outro
  const target = prefixed ? locale : routing.defaultLocale;
  const localized = (to: string) => new URL(localizePath(to, target), request.url);

  if (path === "/" && searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  // primeiro toque de atribuição (utm, ?ref=, origem): só na landing e em /criar-vitrine, e só uma vez por navegador
  const attribution = path === "/" || path === "/criar-vitrine" ? captureAttribution(request) : null;

  const renewed: { name: string; value: string; options?: object }[] = [];
  if (SESSION_PATHS.some((p) => path === p || (p === "/editor" && path.startsWith("/editor/")))) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          // na requisição, para as páginas lerem a sessão nova; na resposta, para o navegador guardar
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          renewed.push(...list);
        },
      },
    });
    if (path === "/inicio") {
      // Cada aba e filtro do /inicio passa por aqui, então basta o JWT (conferido aqui mesmo, sem ir ao Supabase).
      // Uma sessão já encerrada ainda passa até o JWT expirar, mas a página confere no Supabase e manda para a
      // landing, que confere também e fica nela: não há vaivém.
      const { data } = await supabase.auth.getClaims();
      if (!data?.claims) {
        const redirect = NextResponse.redirect(localized("/"));
        renewed.forEach(({ name, value, options }) => redirect.cookies.set(name, value, options));
        return redirect;
      }
    } else if (path !== "/" && path !== "/entrar" && path !== "/criar-vitrine") {
      await supabase.auth.getClaims();
    } else {
      // A landing e o /entrar mandam para o /inicio, então conferem a sessão no Supabase: getClaims só valida o JWT
      // e aceitaria uma sessão já encerrada até ele expirar, com "/" e "/inicio" se redirecionando sem fim.
      // /criar-vitrine é o cadastro (conta + vitrine): quem já tem conta vai para o /editor/criar, que pede só nome
      // e link (e manda para o editor quem já tem vitrine).
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const redirect = NextResponse.redirect(localized(path === "/criar-vitrine" ? "/editor/criar" : "/inicio"));
        // leva junto os cookies da sessão que acabaram de ser renovados
        renewed.forEach(({ name, value, options }) => redirect.cookies.set(name, value, options));
        return redirect;
      }
    }
  }

  const response = handleI18n(request);
  renewed.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  if (attribution) response.cookies.set(ATTRIBUTION_COOKIE, attribution, ATTRIBUTION_OPTIONS);
  return response;
}

export const config = {
  // Tudo menos API, callback do login, arquivos internos do Next e arquivos estáticos. Handles podem ter ponto
  // (`maria.silva`), então só extensões de arquivo conhecidas ficam de fora.
  matcher: ["/((?!api/|auth/|_next/|_vercel/|.*\\.(?:svg|png|jpe?g|webp|gif|ico|txt|xml|js|css|map|woff2?|json)$).*)"],
};
