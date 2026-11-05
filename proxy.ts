import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão do Supabase (cookies) antes das rotas que dependem de login.
 * Também encaminha `/?code=…` para o callback, caso o Supabase volte do Google
 * para a Site URL em vez de /auth/callback, manda a antiga aba /editor?aba=metricas para /metricas
 * e separa as portas de entrada: quem já entrou vai da landing e de /entrar para /inicio, quem não entrou
 * vai de /inicio para a landing (assim a landing não lê cookies e continua estática).
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" && searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }
  // a antiga aba Métricas do editor virou a página /metricas (links e favoritos antigos)
  if (pathname === "/editor" && searchParams.get("aba") === "metricas") {
    return NextResponse.redirect(new URL("/metricas", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  if (pathname !== "/" && pathname !== "/inicio" && pathname !== "/entrar") {
    await supabase.auth.getClaims();
    return response;
  }

  // Estas rotas mandam umas para as outras, então confere a sessão no Supabase: getClaims só valida o JWT
  // e aceitaria uma sessão já encerrada até ele expirar, com "/" e "/inicio" se redirecionando sem fim.
  const { data } = await supabase.auth.getUser();
  const target = pathname === "/inicio" ? (data.user ? null : "/") : data.user ? "/inicio" : null;
  if (!target) return response;
  const redirect = NextResponse.redirect(new URL(target, request.url));
  // leva junto os cookies da sessão que acabaram de ser renovados
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export const config = {
  matcher: ["/", "/criar-vitrine", "/entrar", "/nova-senha", "/inicio", "/metricas", "/editor/:path*"],
};
