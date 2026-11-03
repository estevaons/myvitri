import type { Metadata, Viewport } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { BRAND, SITE_URL } from "@/lib/brand";
import { DESCRIPTION } from "@/lib/seo";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Títulos: serifa editorial, no tom de joalheria e revista. A Cormorant ficaria parecida, mas no Google Fonts ela desloca os acentos (ê, ú, ç).
const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"], style: ["normal", "italic"] });

// Sem `alternates.canonical` aqui: o layout passaria o canônico da home para todas as páginas. Cada página define o seu.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND} | Cupons e achados de quem você segue`, template: `%s · ${BRAND}` },
  description: DESCRIPTION,
  applicationName: BRAND,
  openGraph: { type: "website", siteName: BRAND, locale: "pt_BR" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#FFFFFF" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" className={`${inter.variable} ${garamond.variable} antialiased`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
