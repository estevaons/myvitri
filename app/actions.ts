"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HOST } from "@/lib/brand";
import { createPublicSupabase, getUser } from "@/lib/supabase/server";
import { HOME_TAG, vitrineTag } from "@/lib/vitrine/data";
import { saveClaim, starterContent } from "@/lib/vitrine/claim";
import { findStoreLogos, importProductFromUrl, type ImportedProduct } from "@/lib/vitrine/import-link";
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
    if (e instanceof HandleTakenError) return { ...state, error: `${HOST}/${handle} já está em uso` };
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
  if (await isHandleTaken(createPublicSupabase(), handle)) return { ...state, error: `${HOST}/${handle} já está em uso` };

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

/**
 * Apaga a conta de quem está logado, com vitrine, itens, métricas e rascunho (cascata no banco).
 * `confirm` precisa ser o link publicado da vitrine, digitado pela pessoa.
 */
export async function deleteAccountAction(confirm: string): Promise<{ error: string }> {
  const { supabase, user, vitrine } = await findMine();
  if (!user) return { error: "Sessão expirada. Entre de novo." };
  if (vitrine && confirm.trim().toLowerCase().replace(/^@/, "") !== vitrine.handle) return { error: "O link digitado não confere." };

  // Arquivos não saem na cascata do banco: apaga as imagens enviadas antes da conta.
  for (const name of ["brand-logos", "vitrine-photos"]) {
    const bucket = supabase.storage.from(name);
    const { data: files } = await bucket.list(user.id, { limit: 1000 });
    if (files?.length) await bucket.remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("delete_my_account", error);
    return { error: "Não deu para excluir a conta. Tente de novo." };
  }
  // A conta já não existe: só limpamos os cookies da sessão.
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  if (vitrine) updateTag(vitrineTag(vitrine.handle));
  updateTag(HOME_TAG);
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
    if (e instanceof HandleTakenError) return { ok: false, error: `${HOST}/${parsed.data.handle} já está em uso` };
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

/** Logos encontrados no site da loja do cupom, para a pessoa escolher. */
export async function findLogoAction(url: string): Promise<{ ok: true; logos: string[] } | { ok: false; error: string }> {
  const { user } = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre de novo." };
  try {
    return { ok: true, logos: await findStoreLogos(url) };
  } catch {
    return { ok: false, error: "Não conseguimos abrir o site da loja. Confira o link." };
  }
}

/** Para onde vai cada tipo de imagem enviada pelo editor, e o que cada bucket aceita. */
const UPLOADS = {
  logo: { bucket: "brand-logos", types: { "image/webp": "webp", "image/png": "png" }, maxBytes: 1_048_576 },
  cover: { bucket: "vitrine-photos", types: { "image/webp": "webp", "image/jpeg": "jpg" }, maxBytes: 2_097_152 },
  avatar: { bucket: "vitrine-photos", types: { "image/webp": "webp", "image/jpeg": "jpg" }, maxBytes: 2_097_152 },
  product: { bucket: "vitrine-photos", types: { "image/webp": "webp", "image/jpeg": "jpg" }, maxBytes: 2_097_152 },
} satisfies Record<string, { bucket: string; types: Record<string, string>; maxBytes: number }>;
export type ImageKind = keyof typeof UPLOADS;

/** Guarda a imagem enviada (já reduzida no navegador) na pasta da pessoa e devolve a URL pública. */
export async function uploadImageAction(kind: ImageKind, form: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre de novo." };
  const target = UPLOADS[kind];
  const file = form.get("file");
  const ext = file instanceof File ? (target?.types as Record<string, string> | undefined)?.[file.type] : undefined;
  if (!target || !(file instanceof File) || !ext || file.size > target.maxBytes) return { ok: false, error: "Use uma imagem PNG, JPG, SVG ou WebP." };

  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const bucket = supabase.storage.from(target.bucket);
  const { error } = await bucket.upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) {
    console.error("uploadImage", kind, error);
    return { ok: false, error: "Não deu para enviar a imagem. Tente de novo." };
  }
  return { ok: true, url: bucket.getPublicUrl(path).data.publicUrl };
}
