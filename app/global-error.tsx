"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/brand/ErrorScreen";
import { pillDark, pillLight } from "@/components/home/chrome";
import { BRAND } from "@/lib/brand";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

/**
 * Textos próprios: esta tela substitui o layout raiz (app/[locale]/layout.tsx) quando é ele que falha, então fica
 * sem o provedor do next-intl. Carregar os arquivos de mensagens inteiros aqui pesaria no bundle por três frases.
 */
const TEXT = {
  "pt-BR": {
    kicker: "Algo deu errado",
    title: "O site não carregou",
    text: "Foi um problema do nosso lado, não do seu aparelho. Tente de novo em instantes.",
    retry: "Tentar de novo",
    home: "Ir para o início",
    code: "Código do erro",
  },
  en: {
    kicker: "Something went wrong",
    title: "The site didn't load",
    text: "The problem is on our side, not your device. Please try again in a moment.",
    retry: "Try again",
    home: "Go to home",
    code: "Error code",
  },
};

/** Falha no layout raiz. O idioma vem do prefixo da URL, como no roteamento (português sem prefixo). */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const locale = /^\/en(\/|$)/.test(usePathname() ?? "") ? "en" : "pt-BR";
  const t = TEXT[locale];
  const home = locale === "en" ? "/en" : "/";
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : undefined;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang={locale} className={`${fontVariables} antialiased`}>
      <body>
        <title>{`${t.kicker} · ${BRAND}`}</title>
        <ErrorScreen kicker={t.kicker} title={t.title} text={t.text} homeHref={home} homeLabel={BRAND} note={digest && `${t.code}: ${digest}`}>
          <button type="button" onClick={retry} className={`${pillDark} border-0`}>
            {t.retry}
          </button>
          {/* <a> e não <Link>: com o layout quebrado, vale recarregar o documento inteiro */}
          <a href={home} className={pillLight}>
            {t.home}
          </a>
        </ErrorScreen>
      </body>
    </html>
  );
}
