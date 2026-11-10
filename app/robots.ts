import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";

/**
 * Buscadores e robôs de IA (GPTBot, ClaudeBot, PerplexityBot…) entram em tudo o que é público:
 * aparecer nas respostas dos assistentes é tão importante quanto no Google. Só o que é por login fica de fora.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/editor", "/inicio", "/metricas", "/boas-vindas", "/en/editor", "/en/inicio", "/en/metricas", "/en/boas-vindas", "/api/", "/auth/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
