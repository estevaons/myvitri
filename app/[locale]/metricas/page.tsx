import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "@/lib/i18n/navigation";
import { MetricsSkeleton } from "@/components/metrics/MetricsSkeleton";
import { MetricsView, NoVitrine } from "@/components/metrics/MetricsView";
import { parsePeriod, todaySP, type Stats } from "@/components/metrics/stats";
import { findMine, topCreatorsToday, type Db } from "@/lib/vitrine/store";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages");
  return { title: t("metrics"), robots: { index: false } };
}

/** null quando a RPC falha: a página abre com o aviso no lugar dos números. */
async function loadStats(db: Db, days: number): Promise<Stats | null> {
  const { data, error } = await db.rpc("vitrine_stats", { days });
  if (error) {
    console.error("vitrine_stats", error);
    return null;
  }
  return data as unknown as Stats;
}

/** Posição da vitrine entre as 50 mais clicadas hoje; null fora delas, undefined se o ranking não respondeu. */
async function loadPosition(db: Db, handle: string): Promise<number | null | undefined> {
  try {
    const i = (await topCreatorsToday(db, 50)).indexOf(handle);
    return i < 0 ? null : i + 1;
  } catch (e) {
    console.error("top_creators_today", e);
    return undefined;
  }
}

async function MetricsLoader({ searchParams }: Pick<PageProps<"/[locale]/metricas">, "searchParams">) {
  // por requisição: depende da sessão e do dia de hoje
  await connection();
  const [{ supabase, user, vitrine }, params] = await Promise.all([findMine(), searchParams]);
  if (!user) return redirect({ href: { pathname: "/entrar", query: { next: "/metricas" } }, locale: await getLocale() });
  if (!vitrine) return <NoVitrine />;

  const period = parsePeriod(params.period);
  const [stats, position] = await Promise.all([loadStats(supabase, period), loadPosition(supabase, vitrine.handle)]);
  return <MetricsView vitrine={vitrine} stats={stats} period={period} today={todaySP()} position={position} />;
}

export default function Page({ searchParams }: PageProps<"/[locale]/metricas">) {
  return (
    <Suspense fallback={<MetricsSkeleton />}>
      <MetricsLoader searchParams={searchParams} />
    </Suspense>
  );
}
