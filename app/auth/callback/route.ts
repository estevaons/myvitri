import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { takeReturn } from "@/lib/auth/return-to";
import { getUser } from "@/lib/supabase/server";
import { starterContent, takeClaim } from "@/lib/vitrine/claim";
import { createVitrine, HandleTakenError } from "@/lib/vitrine/store";
import { vitrineContentSchema } from "@/lib/vitrine/types";
import { vitrineTag } from "@/lib/vitrine/data";

/**
 * Volta do Google: troca o código pela sessão e leva de volta à página em que a pessoa clicou em
 * "Entrar" (ou à home, /inicio). Se o login veio do "escolher o link" em /criar-vitrine, cria a
 * vitrine e abre o editor para terminar de montá-la.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const home = new URL("/inicio", request.url);
  const editor = new URL("/editor", request.url);
  if (!code) {
    // o usuário cancelou no Google ou o provedor recusou
    if (params.has("error")) home.searchParams.set("erro", "login");
    return NextResponse.redirect(home);
  }

  const { supabase } = await getUser();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    home.searchParams.set("erro", "login");
    return NextResponse.redirect(home);
  }

  const { data: existing } = await supabase.from("vitrines").select("id").eq("owner_id", data.user.id).maybeSingle();
  const [claim, back] = await Promise.all([takeClaim(), takeReturn()]);
  const parsed = claim && vitrineContentSchema.safeParse(starterContent(data.user, claim.handle, claim.name));
  if (!existing && parsed?.success) {
    try {
      await createVitrine(supabase, data.user.id, parsed.data);
      revalidateTag(vitrineTag(parsed.data.handle), { expire: 0 });
    } catch (e) {
      // link ocupado nesse meio-tempo: o editor pede outro
      if (!(e instanceof HandleTakenError)) throw e;
    }
    return NextResponse.redirect(editor);
  }
  return NextResponse.redirect(back ? new URL(back, request.url) : home);
}
