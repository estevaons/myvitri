"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";

/**
 * Troca de idioma: leva para a mesma página no outro idioma. O proxy guarda a escolha no cookie
 * NEXT_LOCALE, e os links sem prefixo passam a abrir no idioma escolhido.
 */
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("common.locale");
  const current = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className={`flex gap-3 ${className}`}>
      {routing.locales.map((locale) =>
        locale === current ? (
          <span key={locale} aria-current="true" className="text-ink">
            {t(locale)}
          </span>
        ) : (
          <Link key={locale} href={pathname} locale={locale} hrefLang={locale} className="text-inherit no-underline hover:text-ink">
            {t(locale)}
          </Link>
        ),
      )}
    </nav>
  );
}
