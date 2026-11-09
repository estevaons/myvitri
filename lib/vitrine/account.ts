import "server-only";
import type { User } from "@supabase/supabase-js";
import type { Account } from "@/components/home/AccountMenu";
import { googlePhoto } from "./claim";
import type { VitrineContent } from "./types";

/** O que o menu da conta (home e editor) precisa saber de quem entrou. */
export function accountOf(user: User, vitrine: Pick<VitrineContent, "handle" | "name" | "avatarUrl"> | null): Account {
  const google = googlePhoto(user);
  return {
    name: (user.user_metadata as { name?: string }).name ?? "",
    avatarUrl: vitrine?.avatarUrl || google,
    googlePhoto: google,
    email: user.email ?? "",
    providers: (user.app_metadata.providers as string[] | undefined) ?? [user.app_metadata.provider ?? "email"],
    vitrine: vitrine && { handle: vitrine.handle, name: vitrine.name, avatarUrl: vitrine.avatarUrl },
  };
}
