import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  // 90 só para as fotos do hero da landing (LookHero); o resto usa o padrão 75
  images: { qualities: [75, 90] },
  // a página de venda se chamava /para-creators; mantém links antigos funcionando
  redirects: async () => [{ source: "/para-creators", destination: "/criar-vitrine", permanent: true }],
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

export default nextConfig;
