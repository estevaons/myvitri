import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SignInScreen } from "@/components/auth/forms";
import { withoutLocale } from "@/lib/i18n/routing";
import { safePath } from "@/lib/auth/return-to";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages");
  return { title: t("signIn"), robots: { index: false } };
}

async function Screen({ searchParams }: Pick<PageProps<"/[locale]/entrar">, "searchParams">) {
  const { next, erro } = await searchParams;
  const back = safePath(next);
  // o caminho de volta fica sem idioma: o Link e o redirect do next-intl põem o prefixo certo
  return <SignInScreen next={back ? withoutLocale(back) : "/inicio"} loginError={erro === "login"} />;
}

/** Tela de entrar: quem já tem sessão nem chega aqui, o proxy leva para /inicio. */
export default function Page({ searchParams }: PageProps<"/[locale]/entrar">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <Screen searchParams={searchParams} />
    </Suspense>
  );
}
