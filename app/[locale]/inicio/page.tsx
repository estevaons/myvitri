import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { flatParams, tabOf } from "@/components/home/catalog/params";
import { IdentifyUser } from "@/components/analytics/IdentifyUser";
import { HomeSkeleton } from "@/components/home/HomeSkeleton";
import { HomeView } from "@/components/home/HomeView";
import { WEEK, type WeekStats } from "@/components/home/ProfileHeader";
import type { Stats } from "@/components/metrics/stats";
import { redirect } from "@/lib/i18n/navigation";
import { needsOnboarding, recordingConsent } from "@/lib/onboarding/store";
import { accountOf } from "@/lib/vitrine/account";
import { unreadCount } from "@/lib/vitrine/notifications";
import { findMineSummary, listFavoriteHandles, type Db } from "@/lib/vitrine/store";
import { getUser } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("title"), robots: { index: false } };
}

/**
 * Os números do topo, pela mesma RPC da página de métricas (`vitrine_stats`, que acha a vitrine pela sessão).
 * Se ela falhar, o topo mostra só o link para as métricas, sem os números.
 */
async function loadWeek(db: Db): Promise<WeekStats | null> {
  const { data, error } = await db.rpc("vitrine_stats", { days: WEEK });
  if (error || !data) {
    if (error) console.error("vitrine_stats", error);
    return null;
  }
  const { totals } = data as unknown as Stats;
  return { views: totals.view ?? 0, clicks: totals.buy ?? 0, copied: totals.copy ?? 0 };
}

/**
 * Cada troca de aba ou filtro passa por aqui de novo, então as leituras vão juntas, e não uma depois da outra:
 * só a sessão vem antes, porque as outras precisam do id de quem entrou.
 */
async function HomeLoader({ searchParams }: Pick<PageProps<"/[locale]/inicio">, "searchParams">) {
  // por requisição: depende da sessão, como o editor
  await connection();
  const params = flatParams(await searchParams);
  const tab = tabOf(params);

  const { supabase, user } = await getUser();
  // o proxy já manda quem não entrou para a landing; isto cobre a sessão que cai entre ele e esta leitura
  if (!user) return redirect({ href: "/", locale: await getLocale() });
  // quem acabou de criar a conta responde o onboarding antes (volta para cá depois)
  if (await needsOnboarding(supabase, user.id)) return redirect({ href: { pathname: "/boas-vindas", query: { next: "/inicio" } }, locale: await getLocale() });

  // só as abas com o coração precisam saber as favoritas; os números só aparecem para quem tem vitrine
  const [recording, vitrine, favorites, week, unread] = await Promise.all([
    recordingConsent(supabase, user.id),
    findMineSummary(supabase, user.id),
    tab === "saved" || tab === "storefronts"
      ? listFavoriteHandles(supabase, user.id).catch((e: unknown) => {
          console.error("listFavoriteHandles", e);
          return [];
        })
      : [],
    loadWeek(supabase),
    unreadCount(supabase, user.id),
  ]);

  return (
    <>
      <IdentifyUser id={user.id} recording={recording} />
      <HomeView account={accountOf(user, vitrine)} stats={vitrine ? week : null} tab={tab} params={params} favorites={favorites} unread={unread} />
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/[locale]/inicio">) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeLoader searchParams={searchParams} />
    </Suspense>
  );
}
