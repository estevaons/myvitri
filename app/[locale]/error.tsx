"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/brand/ErrorScreen";
import { pillDark, pillLight } from "@/components/home/chrome";
import { getPathname, Link } from "@/lib/i18n/navigation";
import { BRAND } from "@/lib/brand";

/**
 * Falha inesperada numa página: fica dentro do layout do idioma, então tem as traduções. Erro no próprio layout
 * cai no app/global-error.tsx. `retry` busca de novo a página no servidor e tenta renderizar outra vez.
 */
export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("fallback");
  const common = useTranslations("common");
  const locale = useLocale();
  // erro vindo do servidor chega sem a mensagem, só com o digest, que é o que liga a tela ao log
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : undefined;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      {/* error.tsx não aceita metadata: o React leva o <title> para o <head> */}
      <title>{`${t("error.title")} · ${BRAND}`}</title>
      <ErrorScreen
        kicker={t("error.kicker")}
        title={t("error.title")}
        text={t("error.text")}
        homeHref={getPathname({ href: "/", locale })}
        homeLabel={common("brandHome", { brand: BRAND })}
        note={digest && t("error.code", { digest })}
      >
        <button type="button" onClick={retry} className={`${pillDark} border-0`}>
          {t("error.retry")}
        </button>
        <Link href="/" className={pillLight}>
          {t("home")}
        </Link>
      </ErrorScreen>
    </>
  );
}
