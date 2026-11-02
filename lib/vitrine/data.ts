import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/server";
import { findByHandle } from "./store";
import type { VitrineContent } from "./types";

export const vitrineTag = (handle: string) => `vitrine:${handle}`;

export type PublicVitrine = { content: VitrineContent; today: string };

/** Dados públicos de uma vitrine. Invalidado por `updateTag(vitrineTag(handle))` ao publicar. */
export async function getPublicVitrine(handle: string): Promise<PublicVitrine | null> {
  "use cache";
  cacheTag(vitrineTag(handle));
  // horas: cupons vencidos precisam sumir mesmo sem nova publicação
  cacheLife("hours");

  const content = await findByHandle(createPublicSupabase(), handle);
  if (!content) return null;
  return { content, today: new Date().toISOString().slice(0, 10) };
}
