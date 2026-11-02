import "server-only";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { z } from "zod";
import { emptyContent } from "./types";

/** Link e nome escolhidos na landing, guardados enquanto o usuário vai e volta do Google. */
const CLAIM_COOKIE = "vitri_claim";
const claimSchema = z.object({ handle: z.string(), name: z.string() });
type Claim = z.infer<typeof claimSchema>;

export async function saveClaim(claim: Claim) {
  (await cookies()).set(CLAIM_COOKIE, JSON.stringify(claim), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });
}

/** Lê e apaga o cookie; sem ele (login pelo editor), o editor pede o link. */
export async function takeClaim(): Promise<Claim | null> {
  const store = await cookies();
  const raw = store.get(CLAIM_COOKIE)?.value;
  if (raw) store.delete(CLAIM_COOKIE);
  try {
    const saved = claimSchema.safeParse(JSON.parse(raw ?? "null"));
    if (saved.success) return saved.data;
  } catch {
    // cookie corrompido: o editor pede o link
  }
  return null;
}

/** Vitrine nova; quem entra pelo Google já ganha a foto da conta. */
export function starterContent(user: User, handle: string, name: string) {
  const { avatar_url } = user.user_metadata as { avatar_url?: string };
  return { ...emptyContent(handle, name), avatarUrl: avatar_url?.startsWith("https://") ? avatar_url : "" };
}
