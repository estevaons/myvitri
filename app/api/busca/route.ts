import { searchHome } from "@/lib/vitrine/data";

/**
 * Busca da home logada (/inicio), chamada enquanto a pessoa digita. Só lê o que já é público,
 * então não depende da sessão. Erro do banco vira 500 sem detalhes: a tela mostra um aviso.
 */
export async function GET(request: Request) {
  // minúsculas, sem espaço nas pontas e sem o "@" de quem busca uma creator pelo @: "Nike", "nike " e "@beka"/"beka"
  // caem no mesmo cache (o handle no banco não tem o @, então "@beka" não acharia ninguém)
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().replace(/^@+/, "").trim().toLowerCase().slice(0, 60);
  try {
    return Response.json(await searchHome(q));
  } catch (e) {
    console.error("busca", e);
    return Response.json({ error: "busca" }, { status: 500 });
  }
}
