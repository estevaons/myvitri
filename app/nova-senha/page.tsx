import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { NewPasswordScreen } from "@/components/auth/forms";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Criar senha nova", robots: { index: false } };

async function Screen() {
  // por requisição: depende da sessão aberta pelo link do e-mail
  await connection();
  const { user } = await getUser();
  if (!user) redirect("/entrar");
  return <NewPasswordScreen />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <Screen />
    </Suspense>
  );
}
