import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Storefront } from "@/components/storefront/Storefront";
import type { Locale } from "@/lib/i18n/routing";
import { activeBrands, JsonLd, listNames, pageMeta, vitrineJsonLd } from "@/lib/seo";
import { getComments, getFavoriteCount, getPublicVitrine } from "@/lib/vitrine/data";
import type { CommentList } from "@/lib/vitrine/social";

const clean = (handle: string) => decodeURIComponent(handle).toLowerCase();

export async function generateMetadata({ params }: PageProps<"/[locale]/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const [vitrine, t] = await Promise.all([getPublicVitrine(clean(handle)), getTranslations("seo.vitrine")]);
  if (!vitrine) return { title: t("notFound"), robots: { index: false } };
  const { content, today } = vitrine;
  const { name } = content;
  const brands = activeBrands(content, today);
  // a busca chega por "cupom <marca> <pessoa>": as marcas entram no título e na descrição
  const title = brands.length ? t("titleWithBrands", { name, brands: await listNames(brands, 3) }) : t("title", { name });
  const base = content.sub || t("fallbackSub", { name });
  const description = brands.length ? t("withBrands", { base, brands: await listNames(brands) }) : base;
  // canônico sempre minúsculo: /Fulana e /fulana são a mesma vitrine
  return pageMeta({ title, description, path: `/${content.handle}`, ogType: "profile" });
}

async function VitrinePage({ params }: Pick<PageProps<"/[locale]/[handle]">, "params">) {
  const { locale, handle } = await params;
  const [vitrine, comments, favorites] = await Promise.all([
    getPublicVitrine(clean(handle)),
    // erro nos comentários não pode derrubar a vitrine, que é o que a pessoa veio ver
    // o layout já barrou idiomas desconhecidos com notFound()
    getComments(clean(handle), locale as Locale).catch((e): CommentList => {
      console.error("getComments", e);
      return { total: 0, items: [] };
    }),
    // sem o número, o coração aparece sozinho
    getFavoriteCount(clean(handle)).catch((e): null => {
      console.error("getFavoriteCount", e);
      return null;
    }),
  ]);
  if (!vitrine) notFound();
  return (
    <>
      <JsonLd data={await vitrineJsonLd(vitrine.content)} />
      <Storefront content={vitrine.content} today={vitrine.today} comments={comments} favorites={favorites} />
    </>
  );
}

export default function Page({ params }: PageProps<"/[locale]/[handle]">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <VitrinePage params={params} />
    </Suspense>
  );
}
