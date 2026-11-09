import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ErrorScreen } from "@/components/brand/ErrorScreen";
import { pillDark, pillLight } from "@/components/home/chrome";
import { getPathname, Link } from "@/lib/i18n/navigation";
import { BRAND } from "@/lib/brand";

/** Vale para os endereços sem rota; a vitrine que não existe tem o título dela, do generateMetadata de [handle]. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("fallback");
  return { title: t("notFound.title") };
}

/**
 * 404 das páginas, no idioma da URL: vitrine que não existe (`notFound()` em [handle]) e endereços sem rota
 * (o catch-all [...rest]). URLs fora do idioma, como arquivos e APIs, caem no app/global-not-found.tsx.
 */
export default async function NotFound() {
  const [t, common, locale] = await Promise.all([getTranslations("fallback"), getTranslations("common"), getLocale()]);
  return (
    <ErrorScreen
      code="404"
      kicker={t("notFound.kicker")}
      title={t("notFound.title")}
      text={t("notFound.text")}
      homeHref={getPathname({ href: "/", locale })}
      homeLabel={common("brandHome", { brand: BRAND })}
    >
      <Link href="/" className={pillDark}>
        {t("explore")}
      </Link>
      <Link href="/criar-vitrine" className={pillLight}>
        {t("create")}
      </Link>
    </ErrorScreen>
  );
}
