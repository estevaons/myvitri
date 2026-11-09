import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "@/lib/i18n/navigation";
import { CreateVitrinePanel } from "@/components/auth/forms";
import { Editor } from "@/components/editor/Editor";
import { accountOf } from "@/lib/vitrine/account";
import { findDraft, findMine } from "@/lib/vitrine/store";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages");
  return { title: t("editor"), robots: { index: false } };
}

async function EditorLoader({ searchParams }: Pick<PageProps<"/[locale]/editor">, "searchParams">) {
  // O editor é sempre por requisição: a sessão entra no App Shell, mas a data
  // de hoje e a validação do login no Supabase não podem ser pré-renderizadas.
  await connection();
  const { supabase, user, vitrine } = await findMine();
  const { aba } = await searchParams;
  if (!user) return redirect({ href: { pathname: "/entrar", query: { next: "/editor" } }, locale: await getLocale() });
  if (!vitrine) {
    const meta = user.user_metadata as { name?: string };
    return <CreateVitrinePanel suggestedName={meta.name ?? ""} />;
  }
  const draft = await findDraft(supabase, user.id, vitrine);
  return <Editor published={vitrine} draft={draft} today={new Date().toISOString().slice(0, 10)} account={accountOf(user, vitrine)} initialTab={typeof aba === "string" ? aba : undefined} />;
}

export default function Page({ searchParams }: PageProps<"/[locale]/editor">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <EditorLoader searchParams={searchParams} />
    </Suspense>
  );
}
