import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SignInPanel } from "@/components/auth/forms";
import { HomeView } from "@/components/home/HomeView";
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
 * Creators do dia pelo ranking de cliques; enquanto ninguém clicou em nada hoje, as vitrines
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
  const [{ user, vitrine }, { erro }, { ranked, creators }, kits] = await Promise.all([
    findMine(),
    searchParams,
    loadCreators(),
    getRecentKits().catch(orEmpty<HomeKit>("getRecentKits")),
  ]);
  if (!user) {
    // depois do Google, o callback volta para cá
    return <SignInPanel loginError={erro === "login"} />;
  }

  const meta = user.user_metadata as { name?: string };
  const name = firstName(vitrine?.name || meta.name || "") || user.email?.split("@")[0] || "";

  return <HomeView name={name} vitrine={vitrine} ranked={ranked} creators={creators} kits={kits} />;
}

export default function Page({ searchParams }: PageProps<"/inicio">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <HomeLoader searchParams={searchParams} />
    </Suspense>
  );
}
