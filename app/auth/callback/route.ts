import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { track } from "@/lib/analytics/server";
import { routing } from "@/lib/i18n/routing";
import { takeReturn } from "@/lib/auth/return-to";
import { getUser } from "@/lib/supabase/server";
import { starterContent, takeClaim } from "@/lib/vitrine/claim";
import { createVitrine, HandleTakenError } from "@/lib/vitrine/store";
import { vitrineContentSchema } from "@/lib/vitrine/types";
import { vitrineTag } from "@/lib/vitrine/data";

/**
 * Volta do Google e dos links por e-mail (confirmar conta, senha nova): troca o código pela sessão e
 * leva de volta à página guardada (em que a pessoa clicou em "Entrar", ou /nova-senha) ou à home, /inicio.
 * Se veio do "escolher o link" em /criar-vitrine, cria a vitrine e abre o editor para terminar de montá-la.
 * Fica fora de app/[locale] (a URL de volta é fixa no Supabase): os redirecionamentos saem sem idioma e o proxy
 * leva ao idioma da última escolha (cookie NEXT_LOCALE), que também vale para o texto da vitrine nova.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const home = new URL("/inicio", request.url);
  const editor = new URL("/editor", request.url);
  const failed = new URL("/entrar?erro=login", request.url);
  if (!code) {
    // o usuário cancelou no Google ou o provedor recusou
    return NextResponse.redirect(params.has("error") ? failed : home);
  }

  const { supabase } = await getUser();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(failed);

  const { data: existing } = await supabase.from("vitrines").select("id").eq("owner_id", data.user.id).maybeSingle();
  const [claim, back] = await Promise.all([takeClaim(), takeReturn()]);
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const locale = hasLocale(routing.locales, cookieLocale) ? cookieLocale : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "vitrineDefaults" });
  const intro = { headline: t("headline"), sub: t("sub") };
  const parsed = claim && vitrineContentSchema.safeParse(starterContent(data.user, claim.handle, claim.name, intro));
  if (!existing && parsed?.success) {
    try {
      await createVitrine(supabase, data.user.id, parsed.data);
      // esta rota recebe a volta do Google e o link de confirmação por e-mail: o provedor da conta diz qual foi
      await track(data.user.id, "vitrine_created", { via: data.user.app_metadata?.provider === "google" ? "google" : "email" });
      revalidateTag(vitrineTag(parsed.data.handle), { expire: 0 });
    } catch (e) {
      // link ocupado nesse meio-tempo: o editor pede outro
      if (!(e instanceof HandleTakenError)) throw e;
    }
    return NextResponse.redirect(editor);
  }
  return NextResponse.redirect(back ? new URL(back, request.url) : home);
}
