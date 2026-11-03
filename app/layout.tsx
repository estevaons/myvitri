import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Títulos da vitrine das creators, em caixa alta, no estilo das lojas de esporte.
const barlow = Barlow_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["700", "800"] });

export const metadata: Metadata = {
  title: { default: "vitri — sua vitrine de cupons", template: "%s · vitri" },
  description: "Junte todos os seus cupons e produtos favoritos em um link só. Feito para creators.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" className={`${inter.variable} ${barlow.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
