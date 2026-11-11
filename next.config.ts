import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// lê a configuração de idioma por requisição em lib/i18n/request.ts
const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // o layout raiz fica em app/[locale]: o 404 de URLs fora dele vem de app/global-not-found.tsx
    globalNotFound: true,
  },
  cacheComponents: true,
  // 90 só para as fotos do hero da landing (LookHero); o resto usa o padrão 75
  images: { qualities: [75, 90] },
  redirects: async () => [
    // a página de venda se chamava /para-creators; mantém links antigos funcionando
    { source: "/para-creators", destination: "/criar-vitrine", permanent: true },
    // /favicon.ico (pedido automático dos navegadores) não tem arquivo nem passa pelo proxy: sem isto ele cairia
    // em app/[locale] com "favicon.ico" como idioma. O ícone do site é o /icon.svg.
    { source: "/favicon.ico", destination: "/icon.svg", permanent: true },
  ],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
