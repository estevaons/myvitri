import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { TermsEn } from "@/components/legal/TermsEn";
import { TermsPt } from "@/components/legal/TermsPt";
import { BRAND } from "@/lib/brand";
import { pageMeta } from "@/lib/seo";

/** Data da versão em vigor (a mesma nos dois idiomas). */
const UPDATED = "2026-11-10";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return pageMeta({ title: t("termsTitle"), description: t("termsDescription", { brand: BRAND }), path: "/termos" });
}

/** Texto jurídico longo: um componente por idioma em vez de mensagens. O português é o que vale. */
export default async function Termos() {
  return (await getLocale()) === "en" ? <TermsEn updated={UPDATED} /> : <TermsPt updated={UPDATED} />;
}
