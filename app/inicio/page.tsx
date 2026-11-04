import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions";
import { SignInPanel } from "@/components/auth/forms";
import { kicker, pad, pillDark, pillLight, SiteFooter, SiteHeader } from "@/components/home/chrome";
import { CopyLinkButton } from "@/components/home/CopyLinkButton";
import { HOST } from "@/lib/brand";
import { findMine } from "@/lib/vitrine/store";

export const metadata: Metadata = { title: "Início", robots: { index: false } };

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

async function HomeLoader({ searchParams }: Pick<PageProps<"/inicio">, "searchParams">) {
  // por requisição: depende da sessão, como o editor
  await connection();
  const { user, vitrine } = await findMine();
  const { erro } = await searchParams;
  if (!user) {
    // depois do Google, o callback volta para cá
    return <SignInPanel loginError={erro === "login"} />;
  }

  const meta = user.user_metadata as { name?: string };
  const name = firstName(vitrine?.name || meta.name || "") || user.email?.split("@")[0] || "";

  return (
    <div className="overflow-hidden bg-white text-ink">
      {/* sem links para a landing: com sessão, o proxy traz quem abre / de volta para cá */}
      <SiteHeader
        links={[]}
        action={
          <form action={signOutAction}>
            <button type="submit" className={pillLight}>
              Sair
            </button>
          </form>
        }
      />

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-8 pt-8 md:pt-14 ${pad}`}>
        <div className="flex flex-col gap-3">
          <span className={`${kicker} text-gold`}>Sua home</span>
          <h1 className="m-0 font-display text-[clamp(40px,5.6vw,80px)] leading-[1] font-normal">
            Olá, <em>{name}</em>
          </h1>
        </div>
        {/* busca (creators, marcas e produtos) entra aqui */}

        {vitrine ? (
          <div className="flex flex-col gap-5 bg-cream p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex min-w-0 flex-col gap-1">
              <span className={`${kicker} text-[11px] text-mute`}>Sua vitrine</span>
              <span className="truncate font-display text-[28px] leading-[1.1]">{vitrine.name}</span>
              <span className="truncate text-[15px] text-mute">
                {HOST}/{vitrine.handle}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/editor" className={pillDark}>
                Editar vitrine
              </Link>
              <a href={`/${vitrine.handle}`} target="_blank" rel="noopener" className={pillLight}>
                Ver vitrine
              </a>
              <CopyLinkButton handle={vitrine.handle} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 bg-sand p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex max-w-[36rem] flex-col gap-2">
              <span className={`${kicker} text-gold`}>Você também pode ter a sua</span>
              <h2 className="m-0 font-display text-[clamp(28px,3.4vw,44px)] leading-[1.05] font-normal">
                Monte sua vitrine <em>também</em>
              </h2>
              <p className="m-0 text-[16px] leading-relaxed text-ink/70">
                Junte num link só os cupons e produtos que você usa e indica. Grátis, pronta em 2 minutos.
              </p>
            </div>
            <Link href="/criar-vitrine" className={pillDark}>
              Criar minha vitrine
            </Link>
          </div>
        )}
        {/* métricas dos últimos 7 dias e avisos de cupom (quem tem vitrine) entram aqui */}
      </section>

      {/* carrosséis: creators do dia e últimos kits */}

      <SiteFooter />
    </div>
  );
}

export default function Page({ searchParams }: PageProps<"/inicio">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <HomeLoader searchParams={searchParams} />
    </Suspense>
  );
}
