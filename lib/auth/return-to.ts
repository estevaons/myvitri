import "server-only";
import { cookies } from "next/headers";

/**
 * Para onde voltar depois do Google: a página (com aba e filtros) em que a pessoa clicou em "Entrar".
 * Fica num cookie, como o link escolhido em /criar-vitrine, e não na URL de volta do Google: essa
 * precisaria estar na lista de URLs permitidas do Supabase.
 */
const RETURN_COOKIE = "vitri_return";

/** Só caminhos deste site: "/" seguido de algo que não seja outra barra (`//outro.site` sairia do domínio). */
export function safePath(path: unknown): string | null {
  return typeof path === "string" && /^\/(?![/\\])/.test(path) && !path.includes("\\") && path.length <= 500 ? path : null;
}

export async function saveReturn(path: string) {
  (await cookies()).set(RETURN_COOKIE, path, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });
}

/** Lê e apaga o cookie. */
export async function takeReturn(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(RETURN_COOKIE)?.value;
  if (raw) store.delete(RETURN_COOKIE);
  return safePath(raw);
}
