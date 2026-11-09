import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignupForm } from "@/components/auth/forms";
import { pageMeta } from "@/lib/seo";

/**
 * Criar conta: só o formulário, sem navegação nem rodapé, para quem já decidiu criar a vitrine.
 * O que a vitrine faz e as perguntas frequentes ficam no fim da landing (CreatorPitch).
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages");
  return pageMeta({ title: t("signupTitle"), description: t("signupDescription"), path: "/criar-vitrine" });
}

export default function CriarVitrine() {
  return <SignupForm />;
}
