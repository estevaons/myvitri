import "server-only";
import { safeUrl } from "./links";
import { isMissingTable, type Db } from "./store";

/**
 * Notificações da dona da vitrine: novo seguidor e novo comentário (ou resposta). Quem grava são os gatilhos do
 * banco (`notify_follow`, `notify_comment`); aqui só se lê e se marca como lida. A RLS deixa cada conta ver só as
 * suas, então as consultas não precisam filtrar pelo destinatário, mas filtram para usar o índice.
 */

export type Notification = {
  id: string;
  kind: "follow" | "comment";
  createdAt: string;
  read: boolean;
  actor: {
    name: string;
    avatarUrl: string;
    /** a vitrine de quem seguiu ou comentou, se ela tiver uma */
    handle: string | null;
  };
  /** endereço da vitrine da dona: o comentário fica nela */
  handle: string;
  /** só nos comentários */
  comment: { body: string; reply: boolean } | null;
};

/** Quantas ainda não foram vistas. 0 se a leitura falhar ou se a migração ainda não foi aplicada: o sino só some. */
export async function unreadCount(db: Db, userId: string) {
  const { count, error } = await db.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null);
  if (error) {
    if (!isMissingTable(error)) console.error("unreadCount", error);
    return 0;
  }
  return count ?? 0;
}

/** As mais recentes, com a vitrine de quem seguiu ou comentou (nome e foto dela valem mais que os da conta). */
export async function listNotifications(db: Db, userId: string, limit: number): Promise<Notification[]> {
  const { data, error } = await db
    .from("notifications")
    .select("id, kind, actor_id, actor_name, actor_avatar_url, created_at, read_at, vitrines(handle), comments(body, parent_id)")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .order("id")
    .limit(limit);
  if (isMissingTable(error)) return [];
  if (error) throw error;
  if (!data.length) return [];

  const actors = [...new Set(data.map((n) => n.actor_id))];
  const { data: vitrines, error: vitrinesError } = await db.from("vitrines").select("owner_id, handle, name, avatar_url").in("owner_id", actors);
  if (vitrinesError) throw vitrinesError;
  const byOwner = new Map(vitrines.map((v) => [v.owner_id, v]));

  return data.map((n) => {
    const v = byOwner.get(n.actor_id);
    return {
      id: n.id,
      kind: n.kind === "comment" ? "comment" : "follow",
      createdAt: n.created_at,
      read: n.read_at !== null,
      actor: {
        name: v?.name || n.actor_name,
        avatarUrl: safeUrl(v?.avatar_url || n.actor_avatar_url),
        handle: v?.handle ?? null,
      },
      handle: n.vitrines?.handle ?? "",
      comment: n.comments && { body: n.comments.body, reply: n.comments.parent_id !== null },
    };
  });
}

/** Marca todas como lidas. */
export async function markAllRead(db: Db, userId: string) {
  const { error } = await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", userId).is("read_at", null);
  if (error && !isMissingTable(error)) throw error;
}
