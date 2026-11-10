import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { BRAND, SITE_URL } from "@/lib/brand";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

/** Um layout raiz por idioma, gerados no build (com Cache Components, cada root param precisa de um valor). */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Sem `alternates.canonical` aqui: o layout passaria o canônico da home para todas as páginas. Cada página define o seu.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.site");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title", { brand: BRAND }), template: `%s · ${BRAND}` },
    description: t("description"),
    applicationName: BRAND,
    icons: { icon: "/icon.svg" },
    openGraph: { type: "website", siteName: BRAND },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = { themeColor: "#FFFFFF" };

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <html lang={await getLocale()} data-scroll-behavior="smooth" className={`${fontVariables} antialiased`}>
      <body>
        {/* mensagens e idioma para os componentes cliente (useTranslations) */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Analytics />
        {/* tempo real de carregamento e resposta (LCP, INP, CLS) medido nos aparelhos dos visitantes */}
        <SpeedInsights />
      </body>
    </html>
  );
}
