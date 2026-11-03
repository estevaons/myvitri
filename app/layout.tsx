import type { Metadata } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Títulos: serifa editorial, no tom de joalheria e revista. A Cormorant ficaria parecida, mas no Google Fonts ela desloca os acentos (ê, ú, ç).
const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "MyVitri | Sua vitrine de cupons", template: "%s · MyVitri" },
  description: "Junte todos os seus cupons e produtos favoritos em um link só. Feito para quem divulga marcas.",
};

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
