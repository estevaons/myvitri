import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { safePath } from "@/lib/auth/return-to";
import { hrefOf, redirect } from "@/lib/i18n/navigation";
import { internalPath } from "@/lib/i18n/routing";
import { needsOnboarding } from "@/lib/onboarding/store";
import { getUser } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("title"), robots: { index: false } };
}

/**
 * Perguntas logo depois de criar a conta. Quem já respondeu (ou pulou) cai direto em `next`.
 * `next` é a página que mandou para cá (/inicio ou /editor), validada por `safePath` e lida como caminho interno
 * (um "/en/home" vira "/inicio"), para o `redirect` pôr o idioma certo.
 */
async function OnboardingLoader({ searchParams }: Pick<PageProps<"/[locale]/boas-vindas">, "searchParams">) {
  await connection();
  const locale = await getLocale();
  const { next } = await searchParams;
  const safe = safePath(next);
  const back = safe ? internalPath(safe) : "/inicio";
  const { supabase, user } = await getUser();
  if (!user) return redirect({ href: { pathname: "/entrar", query: { next: "/boas-vindas" } }, locale });
  if (!(await needsOnboarding(supabase, user.id))) return redirect({ href: hrefOf(back), locale });
  return <OnboardingFlow next={back} />;
}

export default function Page({ searchParams }: PageProps<"/[locale]/boas-vindas">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <OnboardingLoader searchParams={searchParams} />
    </Suspense>
  );
}
