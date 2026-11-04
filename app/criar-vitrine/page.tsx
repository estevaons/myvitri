import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/forms";
import { Wordmark } from "@/components/brand/Logo";
import { pageMeta } from "@/lib/seo";

/**
 * Criar conta: só o formulário, sem navegação nem rodapé, para quem já decidiu criar a vitrine.
 * O que a vitrine faz e as perguntas frequentes ficam no fim da landing (CreatorPitch).
 */

export const metadata: Metadata = pageMeta({
  title: "Crie sua vitrine de cupons grátis",
  description: "Monte sua vitrine com todos os seus cupons e produtos favoritos em um link só para a bio. Grátis para começar, pronta em 2 minutos.",
  path: "/criar-vitrine",
});

export default function CriarVitrine() {
  return (
    <main className="bg-white text-ink">
      <SignupForm>
        <Link href="/" aria-label="MyVitri — início" className="flex self-start text-ink no-underline">
          <Wordmark label="" className="h-[19px] w-auto" />
        </Link>
      </SignupForm>
    </main>
  );
}
