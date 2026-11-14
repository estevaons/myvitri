import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// lê a configuração de idioma por requisição em lib/i18n/request.ts
const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy sem nonce: com nonce toda página seria dinâmica, e a landing, o /criar-vitrine e as
 * vitrines são estáticas/em cache. Por isso os scripts inline do Next continuam liberados ('unsafe-inline'); o que a
 * política garante é que nenhum script venha de outro domínio além do PostHog e da Vercel, que nada de plugin rode
 * (object-src), que um <base> injetado não mude os links e que o site não abra dentro de iframe de outro (clickjacking).
 * Imagens: qualquer https, porque fotos de produto e logos vêm das lojas. Em dev, o React precisa de eval e o HMR de ws:.
 */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://*.posthog.com https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.posthog.com ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}${isDev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  // navegadores antigos, que não leem frame-ancestors
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // sem includeSubDomains: outros subdomínios do domínio podem não ter https
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

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
  headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
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
