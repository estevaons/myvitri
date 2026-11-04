import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão do Supabase (cookies) antes das rotas que dependem de login.
 * Também encaminha `/?code=…` para o callback, caso o Supabase volte do Google
 * para a Site URL em vez de /auth/callback, manda a antiga aba /editor?aba=metricas para /metricas
 * e leva quem já entrou da landing para /inicio
 * (assim a landing não lê cookies e continua estática).
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
  const { data } = await supabase.auth.getClaims();
  if (pathname === "/" && data?.claims) {
    const home = NextResponse.redirect(new URL("/inicio", request.url));
    // leva junto os cookies da sessão que acabaram de ser renovados
    response.cookies.getAll().forEach((c) => home.cookies.set(c));
    return home;
  }
  return response;
}

export const config = {
  matcher: ["/", "/criar-vitrine", "/inicio", "/metricas", "/editor/:path*"],
};
