import type { Metadata } from "next";
import NextLink from "next/link";
import { ErrorScreen } from "@/components/brand/ErrorScreen";
import { pillDark } from "@/components/home/chrome";
import { BRAND } from "@/lib/brand";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: `404 · ${BRAND}`,
  robots: { index: false },
};

/**
 * 404 de URLs que não passam pelo idioma (arquivos e APIs inexistentes). Sem idioma na URL, o texto vai nas duas
 * línguas. As páginas têm o 404 de app/[locale]/not-found.tsx, no idioma de quem está navegando.
 */
export default function GlobalNotFound() {
  return (
    <html lang="pt-BR" className={`${fontVariables} antialiased`}>
      <body>
        <ErrorScreen
          code="404"
          kicker="Erro 404 · Error 404"
          title="Página não encontrada"
          text="Page not found. O link pode estar errado ou o conteúdo saiu do ar."
          homeHref="/"
          homeLabel={BRAND}
        >
          <NextLink href="/" className={pillDark}>
            Ir para o início
          </NextLink>
        </ErrorScreen>
      </body>
    </html>
  );
}
