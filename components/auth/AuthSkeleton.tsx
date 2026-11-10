import { useTranslations } from "next-intl";
import { AuthPhoto } from "@/components/auth/AuthPhoto";
import { BackLink } from "@/components/brand/BackLink";
import { Wordmark } from "@/components/brand/Logo";
import { Bone, LoadingScreen } from "@/components/brand/Skeleton";
import { Link } from "@/lib/i18n/navigation";
import { BRAND } from "@/lib/brand";

/**
 * Tela de espera de /entrar e /nova-senha, no formato do AuthShell (components/auth/forms.tsx): seta, logotipo,
 * título de verdade (não depende da requisição) e blocos no lugar dos campos; a foto à direita é a mesma.
 */
export function AuthSkeleton({ screen }: { screen: "signIn" | "newPassword" }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const fields = screen === "signIn" ? 2 : 1;
  return (
    <LoadingScreen className="grid min-h-dvh grid-cols-[minmax(0,1fr)] bg-white text-ink md:grid-cols-2">
      <div className="flex flex-col gap-10 px-5 py-6 md:px-12 md:py-8">
        <div className="flex items-center gap-3">
          <BackLink href="/" divider />
          <Link href="/" aria-label={tc("brandHome", { brand: BRAND })} className="flex text-ink no-underline">
            <Wordmark label="" className="h-[19px] w-auto" />
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center gap-4 pb-10">
          <div className="flex flex-col gap-3 pb-3">
            <p className="m-0 font-display text-[clamp(40px,4.6vw,56px)] leading-[1] font-normal">
              {screen === "signIn" ? t("signInTitle") : t("newPassword.title")}
            </p>
            <Bone className="h-5 w-[min(22rem,90%)]" />
          </div>
          {Array.from({ length: fields }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-12 w-full" />
            </div>
          ))}
          <Bone className="h-12 w-full" />
          {screen === "signIn" && <Bone className="mt-4 h-12 w-full" />}
        </div>
      </div>
      <AuthPhoto />
    </LoadingScreen>
  );
}
