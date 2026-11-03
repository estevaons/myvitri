"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createPublicSupabase, getUser } from "@/lib/supabase/server";
import { HOME_TAG, vitrineTag } from "@/lib/vitrine/data";
import { saveClaim, starterContent } from "@/lib/vitrine/claim";
import { importProductFromUrl, type ImportedProduct } from "@/lib/vitrine/import-link";
import { createVitrine, deleteDraft, findMine, HandleTakenError, isHandleTaken, publishVitrine as publish, saveDraft } from "@/lib/vitrine/store";
import { emptyContent, vitrineContentSchema, type VitrineContent } from "@/lib/vitrine/types";

export type FormState = { error?: string; handle?: string; name?: string };

function readClaim(form: FormData) {
  return {
    handle: String(form.get("handle") ?? "").trim().toLowerCase().replace(/^@/, ""),
    name: String(form.get("name") ?? "").trim(),
  };
}

/** Leva ao login do Google; a volta passa por /auth/callback. */
async function startGoogle(state: FormState): Promise<FormState> {
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const { supabase } = await getUser();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/auth/callback` } });
  if (error || !data.url) return { ...state, error: "Não conseguimos abrir o login do Google. Tente de novo." };
  redirect(data.url);
}

async function createAndOpen(handle: string, name: string, state: FormState): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return { ...state, error: "Sessão expirada. Entre de novo." };
  try {
    await createVitrine(supabase, user.id, starterContent(user, handle, name));
  } catch (e) {
    if (e instanceof HandleTakenError) return { ...state, error: `vitri.me/${handle} já está em uso` };
    throw e;
  }
  updateTag(vitrineTag(handle));
  redirect("/editor");
}

/** Landing: escolhe o link e entra com o Google. Logado, cria direto. */
export async function claimAction(_prev: FormState, form: FormData): Promise<FormState> {
  const state = readClaim(form);
  const { handle, name } = state;

  const mine = await findMine();
  if (mine.vitrine) redirect("/editor");

  const parsed = vitrineContentSchema.safeParse(emptyContent(handle, name));
  if (!parsed.success) return { ...state, error: parsed.error.issues[0].message };
  if (await isHandleTaken(createPublicSupabase(), handle)) return { ...state, error: `vitri.me/${handle} já está em uso` };

  if (mine.user) return createAndOpen(handle, name, state);
  await saveClaim({ handle, name });
  return startGoogle(state);
}

/** Editor sem sessão. */
export async function signInAction(): Promise<FormState> {
  return startGoogle({});
}

/** Logado mas ainda sem vitrine (ex.: o link escolhido foi ocupado antes da confirmação). */
export async function createVitrineAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { handle, name } = readClaim(form);
  const parsed = vitrineContentSchema.safeParse(emptyContent(handle, name));
  if (!parsed.success) return { handle, name, error: parsed.error.issues[0].message };
  return createAndOpen(handle, name, { handle, name });
}

export async function signOutAction() {
  const { supabase } = await getUser();
  await supabase.auth.signOut();
  redirect("/");
}

const ITEM_LABELS: Record<string, string> = { coupons: "Cupom", products: "Produto", kits: "Kit" };

export type PublishResult = { ok: true; updatedAt: string } | { ok: false; error: string };

export async function publishVitrine(content: VitrineContent): Promise<PublishResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre de novo." };

  const parsed = vitrineContentSchema.safeParse(content);
  if (!parsed.success) {
    const { message, path } = parsed.error.issues[0];
    const where = ITEM_LABELS[String(path[0])];
    return { ok: false, error: where && typeof path[1] === "number" ? `${where} ${path[1] + 1}: ${message}` : message };
  }

  try {
    const { prevHandle, updatedAt } = await publish(supabase, user.id, parsed.data);
    await deleteDraft(supabase, user.id).catch((e) => console.error("deleteDraft", e));
    updateTag(vitrineTag(prevHandle));
    if (prevHandle !== parsed.data.handle) updateTag(vitrineTag(parsed.data.handle));
    updateTag(HOME_TAG);
    return { ok: true, updatedAt };
  } catch (e) {
    if (e instanceof HandleTakenError) return { ok: false, error: `vitri.me/${parsed.data.handle} já está em uso` };
    console.error("publish_vitrine", e);
    return { ok: false, error: "Erro ao salvar. Tente de novo." };
  }
}

/** Autosave do editor. null = igual ao publicado, não há rascunho para guardar. */
export async function saveDraftAction(content: VitrineContent | null): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false };
  try {
    if (content) await saveDraft(supabase, user.id, content);
    else await deleteDraft(supabase, user.id);
    return { ok: true };
  } catch (e) {
    console.error("saveDraft", e);
    return { ok: false };
  }
}

export type ImportResult = { ok: true; product: ImportedProduct } | { ok: false; error: string };

export async function importProductAction(url: string): Promise<ImportResult> {
  const { user } = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre de novo." };
  try {
    return { ok: true, product: await importProductFromUrl(url) };
  } catch {
    return { ok: false, error: "Não conseguimos ler esse link. Preencha os dados à mão." };
  }
}

export type PriceCheck = { id: string; price: number | null; available: boolean | null };

/** Confere preço e estoque na loja de cada produto (no máximo 60, 4 de cada vez). Quem falhar volta com nulls. */
export async function refreshPricesAction(items: { id: string; url: string }[]): Promise<{ ok: true; results: PriceCheck[] } | { ok: false; error: string }> {
  const { user } = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre de novo." };
  const queue = items.filter((i) => /^https?:\/\//i.test(i.url)).slice(0, 60);
  const results: PriceCheck[] = [];
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const found = await importProductFromUrl(item.url).catch(() => null);
      results.push({ id: item.id, price: found?.price ?? null, available: found?.available ?? null });
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return { ok: true, results };
}

export type Stats = {
  totals: Partial<Record<"view" | "buy" | "copy" | "kit" | "video", number>>;
  days: { day: string; views: number; clicks: number }[];
  items: { id: string; kind: string; n: number }[];
};

export async function statsAction(days: number): Promise<{ ok: true; stats: Stats } | { ok: false; error: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre de novo." };
  const { data, error } = await supabase.rpc("vitrine_stats", { days });
  if (error) {
    console.error("vitrine_stats", error);
    return { ok: false, error: "Não deu para carregar as métricas." };
  }
  return { ok: true, stats: data as unknown as Stats };
}
