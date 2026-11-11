import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthSkeleton } from "@/components/auth/AuthSkeleton";
import { NewPasswordScreen } from "@/components/auth/forms";
import { redirect } from "@/lib/i18n/navigation";
import { getUser } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages");
  return { title: t("newPassword"), robots: { index: false } };
}

async function Screen() {
  // por requisição: depende da sessão aberta pelo link do e-mail
  await connection();
  const { user } = await getUser();
  if (!user) redirect({ href: "/entrar", locale: await getLocale() });
  return <NewPasswordScreen />;
}

export default function Page() {
  return (
    <Suspense fallback={<AuthSkeleton screen="newPassword" />}>
      <Screen />
    </Suspense>
  );
}
