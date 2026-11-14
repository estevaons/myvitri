import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PrivacyEn } from "@/components/legal/PrivacyEn";
import { PrivacyPt } from "@/components/legal/PrivacyPt";
import { BRAND } from "@/lib/brand";
import { pageMeta } from "@/lib/seo";

/** Data da versão em vigor (a mesma nos dois idiomas). */
const UPDATED = "2026-11-13";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return pageMeta({ title: t("privacyTitle"), description: t("privacyDescription", { brand: BRAND }), path: "/privacidade" });
}

/** Texto jurídico longo: um componente por idioma em vez de mensagens. O português é o que vale. */
export default async function Privacidade() {
  return (await getLocale()) === "en" ? <PrivacyEn updated={UPDATED} /> : <PrivacyPt updated={UPDATED} />;
}
