import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInScreen } from "@/components/auth/forms";
import { safePath } from "@/lib/auth/return-to";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

async function Screen({ searchParams }: Pick<PageProps<"/entrar">, "searchParams">) {
  const { next, erro } = await searchParams;
  return <SignInScreen next={safePath(next) ?? "/inicio"} loginError={erro === "login"} />;
}

/** Tela de entrar: quem já tem sessão nem chega aqui, o proxy leva para /inicio. */
export default function Page({ searchParams }: PageProps<"/entrar">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <Screen searchParams={searchParams} />
    </Suspense>
  );
}
