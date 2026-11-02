import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Storefront } from "@/components/storefront/Storefront";
import { getPublicVitrine } from "@/lib/vitrine/data";

export async function generateMetadata({ params }: PageProps<"/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const vitrine = await getPublicVitrine(handle);
  if (!vitrine) return { title: "Vitrine não encontrada" };
  const { name, sub } = vitrine.content;
  return {
    title: `Vitrine de ${name}`,
    description: sub || `Os cupons e produtos favoritos de ${name}.`,
  };
}

async function VitrinePage({ params }: Pick<PageProps<"/[handle]">, "params">) {
  const { handle } = await params;
  const vitrine = await getPublicVitrine(decodeURIComponent(handle).toLowerCase());
  if (!vitrine) notFound();
  return <Storefront content={vitrine.content} today={vitrine.today} />;
}

export default function Page({ params }: PageProps<"/[handle]">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <VitrinePage params={params} />
    </Suspense>
  );
}
