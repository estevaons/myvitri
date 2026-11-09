import type { Metadata, Viewport } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { BRAND, SITE_URL } from "@/lib/brand";
import "../globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Títulos: serifa editorial, no tom de joalheria e revista. A Cormorant ficaria parecida, mas no Google Fonts ela desloca os acentos (ê, ú, ç).
const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"], style: ["normal", "italic"] });

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
    <html lang={await getLocale()} data-scroll-behavior="smooth" className={`${inter.variable} ${garamond.variable} antialiased`}>
      <body>
        {/* mensagens e idioma para os componentes cliente (useTranslations) */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
