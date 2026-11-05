import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { flatParams, GUEST_LIMIT, tabOf } from "@/components/home/catalog/params";
import { HomeView, type ForYou } from "@/components/home/HomeView";
import { getHomeFeed, getRecentKits, getTopCreators, type HomeCreator, type HomeKit } from "@/lib/vitrine/data";
import { findMine } from "@/lib/vitrine/store";

export const metadata: Metadata = { title: "Início", robots: { index: false } };

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** Sem banco (ou sem a migração do ranking e dos kits) a home ainda abre, só sem os carrosséis. */
const orEmpty =
  <T,>(label: string) =>
  (e: unknown): T[] => {
    console.error(label, e);
    return [];
  };

/**
 * Vitrines do dia pelo ranking de cliques; enquanto ninguém clicou em nada hoje, as vitrines
 * publicadas mais recentes, com outro título.
 */
async function loadCreators(): Promise<{ ranked: boolean; creators: HomeCreator[] }> {
  const top = await getTopCreators().catch(orEmpty<HomeCreator>("getTopCreators"));
  if (top.length) return { ranked: true, creators: top };
  const feed = await getHomeFeed().catch(() => null);
  return { ranked: false, creators: feed?.creators ?? [] };
}

async function HomeLoader({ searchParams }: Pick<PageProps<"/inicio">, "searchParams">) {
  // por requisição: depende da sessão, como o editor
  await connection();
  const params = flatParams(await searchParams);
  const tab = tabOf(params);
  // os carrosséis só são lidos na aba "Para você"; as outras abas buscam os próprios dados
  const [{ user, vitrine }, rows] = await Promise.all([
    findMine(),
    tab === "para-voce" ? Promise.all([loadCreators(), getRecentKits().catch(orEmpty<HomeKit>("getRecentKits"))]) : null,
  ]);

  // sem sessão a home abre do mesmo jeito (o "Explorar vitrines" da landing traz para cá), com até 2
  // páginas por aba: mesmo um ?limite= maior digitado na URL para em GUEST_LIMIT
  if (!user && Number(params.limite) > GUEST_LIMIT) params.limite = String(GUEST_LIMIT);
  const meta = user?.user_metadata as { name?: string } | undefined;
  const name = user ? firstName(vitrine?.name || meta?.name || "") || user.email?.split("@")[0] || "" : null;

  const forYou: ForYou | null = rows && { vitrine, ranked: rows[0].ranked, creators: rows[0].creators, kits: rows[1] };
  return <HomeView name={name} tab={tab} params={params} forYou={forYou} loginError={params.erro === "login"} />;
}

export default function Page({ searchParams }: PageProps<"/inicio">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <HomeLoader searchParams={searchParams} />
    </Suspense>
  );
}
