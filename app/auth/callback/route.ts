import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { starterContent, takeClaim } from "@/lib/vitrine/claim";
import { createVitrine, HandleTakenError } from "@/lib/vitrine/store";
import { vitrineContentSchema } from "@/lib/vitrine/types";
import { vitrineTag } from "@/lib/vitrine/data";

/** Volta do Google: troca o código pela sessão e cria a vitrine escolhida na landing. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const editor = new URL("/editor", request.url);
  if (!code) {
    // o usuário cancelou no Google ou o provedor recusou
    if (params.has("error")) editor.searchParams.set("erro", "login");
    return NextResponse.redirect(editor);
  }

  const { supabase } = await getUser();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    editor.searchParams.set("erro", "login");
    return NextResponse.redirect(editor);
  }

  const { data: existing } = await supabase.from("vitrines").select("id").eq("owner_id", data.user.id).maybeSingle();
  const claim = await takeClaim();
  const parsed = claim && vitrineContentSchema.safeParse(starterContent(data.user, claim.handle, claim.name));
  if (!existing && parsed?.success) {
    try {
      await createVitrine(supabase, data.user.id, parsed.data);
      revalidateTag(vitrineTag(parsed.data.handle), { expire: 0 });
    } catch (e) {
      // link ocupado nesse meio-tempo: o editor pede outro
      if (!(e instanceof HandleTakenError)) throw e;
    }
  }
  return NextResponse.redirect(editor);
}
