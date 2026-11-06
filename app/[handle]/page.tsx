import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Storefront } from "@/components/storefront/Storefront";
import { activeBrands, JsonLd, listNames, pageMeta, vitrineJsonLd } from "@/lib/seo";
import { getComments, getPublicVitrine } from "@/lib/vitrine/data";
import type { CommentList } from "@/lib/vitrine/social";

const clean = (handle: string) => decodeURIComponent(handle).toLowerCase();

export async function generateMetadata({ params }: PageProps<"/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const vitrine = await getPublicVitrine(clean(handle));
  if (!vitrine) return { title: "Vitrine não encontrada", robots: { index: false } };
  const { content, today } = vitrine;
  const brands = activeBrands(content, today);
  // a busca chega por "cupom <marca> <pessoa>": as marcas entram no título e na descrição
  const title = brands.length ? `Cupons de ${content.name}: ${listNames(brands, 3)}` : `Vitrine de ${content.name}`;
  const base = content.sub || `Os cupons e produtos favoritos de ${content.name}.`;
  const description = brands.length ? `${base} Cupons ativos de ${listNames(brands)}.` : base;
  // canônico sempre minúsculo: /Fulana e /fulana são a mesma vitrine
  return pageMeta({ title, description, path: `/${content.handle}`, ogType: "profile" });
}

async function VitrinePage({ params }: Pick<PageProps<"/[handle]">, "params">) {
  const { handle } = await params;
  const [vitrine, comments] = await Promise.all([
    getPublicVitrine(clean(handle)),
    // erro nos comentários não pode derrubar a vitrine, que é o que a pessoa veio ver
    getComments(clean(handle)).catch((e): CommentList => {
      console.error("getComments", e);
      return { total: 0, items: [] };
    }),
  ]);
  if (!vitrine) notFound();
  return (
    <>
      <JsonLd data={vitrineJsonLd(vitrine.content)} />
      <Storefront content={vitrine.content} today={vitrine.today} comments={comments} />
    </>
  );
}

export default function Page({ params }: PageProps<"/[handle]">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <VitrinePage params={params} />
    </Suspense>
  );
}
