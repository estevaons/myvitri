/** Tipos e limites de favoritos e comentários. Sem dependências: a vitrine pública (cliente) também usa. */

export const COMMENT_MAX = 500;

export type VitrineComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  body: string;
  /** Escrito por quem é dono da vitrine: a lista destaca. */
  byOwner: boolean;
  /** Data pronta para mostrar, calculada no servidor: servidor e navegador renderizam o mesmo texto. */
  dateLabel: string;
  createdAt: string;
};

/** Os comentários mais recentes e quantos a vitrine tem ao todo. */
export type CommentList = { total: number; items: VitrineComment[] };

/** Quem está vendo a vitrine. `owner`: é a dona, e pode apagar qualquer comentário dela. */
export type Viewer = { user: null } | { user: { id: string; name: string; avatarUrl: string }; favorited: boolean; owner: boolean };

export type SocialResult = { ok: true } | { ok: false; error: string };

/**
 * Uma ação de servidor rejeita quando nem chega resposta (sem internet, servidor fora do ar, deploy novo):
 * sem isto, o erro sobe pela transição e o Next troca a página inteira pela tela de erro.
 */
export function reachServer(action: Promise<SocialResult>): Promise<SocialResult> {
  return action.catch(() => ({ ok: false, error: "Não foi possível falar com o servidor. Confira sua conexão e tente de novo." }));
}
