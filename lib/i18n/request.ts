import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { routing } from "./routing";

/** Os preços e as datas das vitrines são do Brasil: o fuso não muda com o idioma. */
export const TIME_ZONE = "America/Sao_Paulo";

/**
 * O segmento `[locale]` da rota. Server Actions e route handlers não têm root params e o Next lança um erro
 * comum na hora da chamada; os erros internos dele (com `digest`, como o de renderização dinâmica) seguem adiante.
 */
async function routeLocale() {
  try {
    return await rootParams.locale();
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return undefined;
  }
}

/**
 * Idioma de cada renderização. Nas páginas vem do segmento `[locale]`
 * por `next/root-params`, que entra na chave do cache. Em Server Actions e route handlers vale o idioma que
 * o proxy grava no cabeçalho da requisição, ou o passado explicitamente pelo chamador.
 */
export default getRequestConfig(async ({ locale, requestLocale }) => {
  const candidate = locale ?? (await routeLocale()) ?? (await requestLocale);
  if (!hasLocale(routing.locales, candidate)) notFound();
  return { locale: candidate, timeZone: TIME_ZONE, messages: (await import(`../../messages/${candidate}.json`)).default };
});
