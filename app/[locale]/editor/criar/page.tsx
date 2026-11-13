import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { IdentifyUser } from "@/components/analytics/IdentifyUser";
import { CreateVitrineForm, CreateVitrineFormSkeleton, CreateVitrineScreen } from "@/components/auth/forms";
import { redirect } from "@/lib/i18n/navigation";
import { needsOnboarding, recordingConsent } from "@/lib/onboarding/store";
import { getUser } from "@/lib/supabase/server";
import { findMineSummary } from "@/lib/vitrine/store";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.claimPanel");
  return { title: t("title"), robots: { index: false } };
}

/**
 * Criar só a vitrine, para quem já tem conta e ainda não tem vitrine (o /criar-vitrine é o cadastro: conta + vitrine,
 * e o proxy manda para cá quem já entrou). Quem não entrou vai para /entrar, quem ainda não respondeu o onboarding
 * responde antes, e quem já tem vitrine vai para o editor.
 */
async function CreateVitrineLoader() {
  await connection();
  const locale = await getLocale();
  const { supabase, user } = await getUser();
  if (!user) return redirect({ href: { pathname: "/entrar", query: { next: "/editor/criar" } }, locale });
  if (await needsOnboarding(supabase, user.id)) return redirect({ href: { pathname: "/boas-vindas", query: { next: "/editor/criar" } }, locale });
  const [vitrine, recording] = await Promise.all([findMineSummary(supabase, user.id), recordingConsent(supabase, user.id)]);
  if (vitrine) return redirect({ href: "/editor", locale });
  const meta = user.user_metadata as { name?: string };
  return (
    <>
      <IdentifyUser id={user.id} recording={recording} />
      <CreateVitrineForm suggestedName={meta.name ?? ""} />
    </>
  );
}

export default function Page() {
  return (
    <CreateVitrineScreen>
      <Suspense fallback={<CreateVitrineFormSkeleton />}>
        <CreateVitrineLoader />
      </Suspense>
    </CreateVitrineScreen>
  );
}
