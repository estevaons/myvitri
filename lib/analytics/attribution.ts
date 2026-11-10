import type { NextRequest } from "next/server";
import { HANDLE_RE } from "@/lib/vitrine/types";

/**
 * De onde veio a primeira visita (primeiro toque): utm, `?ref=` de uma vitrine e o domínio de origem.
 * O cookie é gravado pelo proxy na landing e em /criar-vitrine, uma vez, e lido no onboarding (ele vai para
 * `profiles.signup_source`). Não guardamos IP nem a URL completa de origem, só o domínio.
 */
export const ATTRIBUTION_COOKIE = "vitri_ref";

export const ATTRIBUTION_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
};

/** Texto de rastreio: letras, números e pontuação simples, até 60 caracteres. */
function clean(value: string | null) {
  const text = (value ?? "").replace(/[^\p{L}\p{N}\s._-]/gu, "").trim().slice(0, 60);
  return text || null;
}

/**
 * Valor do cookie para a primeira visita, ou `null` se já existe um (o primeiro toque fica).
 * Seguro para o proxy: só lê a URL e o cabeçalho `referer`.
 */
export function captureAttribution(request: NextRequest): string | null {
  if (request.cookies.has(ATTRIBUTION_COOKIE)) return null;
  const params = request.nextUrl.searchParams;

  let referrerHost: string | null = null;
  try {
    const host = new URL(request.headers.get("referer") ?? "").host;
    if (host && host !== request.nextUrl.host) referrerHost = host.slice(0, 100);
  } catch {
    // sem referer, ou inválido: a visita conta como direta
  }

  const ref = params.get("ref")?.trim().toLowerCase() ?? "";
  const data = {
    source: clean(params.get("utm_source")),
    medium: clean(params.get("utm_medium")),
    campaign: clean(params.get("utm_campaign")),
    ref: HANDLE_RE.test(ref) ? ref : null,
    referrer_host: referrerHost,
    landing: request.nextUrl.pathname,
    first_seen_at: new Date().toISOString(),
  };
  return encodeURIComponent(JSON.stringify(data));
}
