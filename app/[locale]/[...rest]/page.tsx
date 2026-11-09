import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

// O título do 404 também precisa estar aqui: o HTML usa o metadata do not-found.tsx, mas no navegador o Next
// resolve o da rota, e sem este ele volta para o título padrão do site.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("fallback");
  return { title: t("notFound.title") };
}

/** URLs que não são de nenhuma rota: 404 dentro do layout do idioma (app/[locale]/not-found.tsx), em vez do global. */
export default function CatchAll() {
  notFound();
}
