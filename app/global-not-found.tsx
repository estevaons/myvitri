import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "404", robots: { index: false } };

/**
 * 404 de URLs que não passam pelo idioma (arquivos e APIs inexistentes). As páginas têm o 404 do
 * layout de app/[locale], no idioma de quem está navegando.
 */
export default function GlobalNotFound() {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white p-6 text-center text-ink">
        <h1 className="text-2xl font-semibold">404</h1>
        <p>Página não encontrada · Page not found</p>
        <Link href="/" className="underline">
          myvitri.com
        </Link>
      </body>
    </html>
  );
}
