import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "@/lib/i18n/navigation";
import { CreateVitrinePanel } from "@/components/auth/forms";
import { Editor } from "@/components/editor/Editor";
import { EditorSkeleton } from "@/components/editor/EditorSkeleton";
import { IdentifyUser } from "@/components/analytics/IdentifyUser";
import { needsOnboarding, recordingConsent } from "@/lib/onboarding/store";
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
  const { tab } = await searchParams;
  const locale = await getLocale();
  if (!user) return redirect({ href: { pathname: "/entrar", query: { next: "/editor" } }, locale });
  // quem acabou de criar a conta responde o onboarding antes de editar (volta para cá depois)
  if (await needsOnboarding(supabase, user.id)) return redirect({ href: { pathname: "/boas-vindas", query: { next: "/editor" } }, locale });
  const recording = await recordingConsent(supabase, user.id);
  if (!vitrine) {
    const meta = user.user_metadata as { name?: string };
    return (
      <>
        <IdentifyUser id={user.id} recording={recording} />
        <CreateVitrinePanel suggestedName={meta.name ?? ""} />
      </>
    );
  }
  const draft = await findDraft(supabase, user.id, vitrine);
  return (
    <>
      <IdentifyUser id={user.id} recording={recording} />
      <Editor published={vitrine} draft={draft} account={accountOf(user, vitrine)} initialTab={typeof tab === "string" ? tab : undefined} />
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/[locale]/editor">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditorLoader searchParams={searchParams} />
    </Suspense>
  );
}
