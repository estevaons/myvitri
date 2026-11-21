import { getUser } from "@/lib/supabase/server";
import { safeUrl } from "@/lib/vitrine/links";
import type { Viewer } from "@/lib/vitrine/social";
import { findMineSummary, loadViewerState } from "@/lib/vitrine/store";

const reply = (viewer: Viewer) => Response.json(viewer, { headers: { "Cache-Control": "private, no-store" } });

/**
 * Quem está vendo a vitrine `?h=`: a página em si é igual para todos e fica em cache, então o que é por
 * pessoa (coração, formulário de comentário, botão de excluir) vem daqui. Como /{handle} não passa pelo
 * proxy, é nesta rota, que pode gravar cookies, que a sessão se renova para quem abre direto uma vitrine.
 */
export async function GET(request: Request) {
  const handle = (new URL(request.url).searchParams.get("h") ?? "").trim().toLowerCase().slice(0, 30);
  const { supabase, user } = await getUser();
  if (!user) return reply({ user: null });

  const meta = user.user_metadata as { name?: string; full_name?: string; avatar_url?: string };
  const profile = { id: user.id, name: meta.name || meta.full_name || "", avatarUrl: meta.avatar_url ?? "" };
  try {
    const [state, mine] = await Promise.all([loadViewerState(supabase, user.id, handle), findMineSummary(supabase, user.id)]);
    // quem tem vitrine comenta com o nome e a foto dela, como a lista de comentários mostra
    if (mine) Object.assign(profile, { name: mine.name || profile.name, avatarUrl: safeUrl(mine.avatarUrl || profile.avatarUrl) });
    return reply({ user: profile, ...state });
  } catch (e) {
    // a pessoa continua identificada: só o coração começa apagado e o excluir fica restrito aos próprios comentários
    console.error("viewer", e);
    return reply({ user: profile, favorited: false, owner: false });
  }
}
