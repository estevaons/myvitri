"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DELETE_WORD } from "@/lib/auth/account";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { safePath, saveReturn } from "@/lib/auth/return-to";
import { HOST } from "@/lib/brand";
import { createPublicSupabase, getUser } from "@/lib/supabase/server";
import { commentsTag, HOME_TAG, vitrineTag } from "@/lib/vitrine/data";
import { googlePhoto, saveClaim, starterContent } from "@/lib/vitrine/claim";
import { findStoreLogos, importProductFromUrl, type ImportedProduct } from "@/lib/vitrine/import-link";
import { COMMENT_MAX, type SocialResult } from "@/lib/vitrine/social";
import {
  addComment,
  CommentRateLimitError,
  createVitrine,
  deleteComment,
  deleteDraft,
  findMine,
  HandleTakenError,
  isHandleTaken,
  listCommentedHandles,
  publishVitrine as publish,
  saveDraft,
  setFavorite,
  updateProfile,
} from "@/lib/vitrine/store";
import { emptyContent, pickProfile, vitrineContentSchema, vitrineProfileSchema, type VitrineContent, type VitrineProfile } from "@/lib/vitrine/types";

export type FormState = { error?: string; notice?: string; handle?: string; name?: string; email?: string };

function readClaim(form: FormData) {
  return {
    handle: String(form.get("handle") ?? "").trim().toLowerCase().replace(/^@/, ""),
    name: String(form.get("name") ?? "").trim(),
  };
}

/** Caminho da página que fez a requisição, só se for deste site (sem o aviso de erro do login). */
async function refererPath() {
  const h = await headers();
  try {
    const ref = new URL(h.get("referer") ?? "");
    if (ref.host !== h.get("host")) return null;
    ref.searchParams.delete("erro");
    return safePath(ref.pathname + ref.search);
  } catch {
    return null;
  }
}

/** Para onde o Supabase manda de volta (Google e links por e-mail). */
async function callbackUrl() {
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return `${origin}/auth/callback`;
}

/** Leva ao login do Google; a volta passa por /auth/callback. */
async function startGoogle(state: FormState): Promise<FormState> {
  const { supabase } = await getUser();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: await callbackUrl() } });
  if (error || !data.url) return { ...state, error: "Não conseguimos abrir o login do Google. Tente de novo." };
  redirect(data.url);
}

function readEmail(form: FormData) {
  return String(form.get("email") ?? "").trim().toLowerCase();
}

/** Erros do Supabase que valem igual para entrar, criar conta e trocar a senha. */
function authErrorText(code: string | undefined) {
  switch (code) {
    case "email_provider_disabled":
    case "signup_disabled":
      return "O acesso com e-mail e senha ainda não está disponível. Use o Google por enquanto.";
    case "weak_password":
      return `Essa senha é fraca. Use pelo menos ${PASSWORD_MIN} caracteres, misturando letras e números.`;
    // sem SMTP próprio, o Supabase só envia para os e-mails da equipe do projeto
    case "email_address_not_authorized":
      return "Não conseguimos enviar e-mail para esse endereço agora. Use o Google por enquanto.";
    case "over_email_send_rate_limit":
      return "Muitos e-mails enviados agora. Espere alguns minutos e tente de novo.";
    case "over_request_rate_limit":
      return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
    default:
      return "Não conseguimos concluir agora. Tente de novo.";
  }
}

/** Entrar com e-mail e senha; a mensagem não diz se o e-mail existe. */
export async function signInWithPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = readEmail(form);
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { email, error: "Preencha o e-mail e a senha." };

  const { supabase } = await getUser();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") return { email, error: "E-mail ou senha incorretos. Se você criou a conta com o Google, use o botão do Google." };
    if (error.code === "email_not_confirmed") return { email, error: "Falta confirmar seu e-mail: abra o link que enviamos para entrar." };
    return { email, error: authErrorText(error.code) };
  }
  redirect(safePath(form.get("next")) ?? "/inicio");
}

/**
 * Envia o link para definir uma senha nova. Também serve a quem só usa o Google e quer passar a ter senha.
 * A resposta é a mesma com ou sem conta, para ninguém descobrir quais e-mails estão cadastrados.
 */
export async function requestPasswordResetAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = readEmail(form);
  if (!email) return { error: "Informe seu e-mail." };

  const { supabase } = await getUser();
  // o link dura 1 hora: é a volta por /auth/callback que leva à tela de senha nova
  await saveReturn("/nova-senha", 60 * 60);
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: await callbackUrl() });
  // só erros que valem para qualquer e-mail: nenhum deles revela se a conta existe
  if (error && ["email_address_not_authorized", "over_email_send_rate_limit", "over_request_rate_limit", "email_provider_disabled"].includes(error.code ?? "")) return { email, error: authErrorText(error.code) };
  return { email, notice: `Se houver uma conta com ${email}, enviamos um link para criar uma senha nova. Abra o link neste mesmo navegador.` };
}

/** Tela /nova-senha: quem chegou pelo link do e-mail já tem sessão. */
export async function updatePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < PASSWORD_MIN) return { error: `Use pelo menos ${PASSWORD_MIN} caracteres.` };

  const { supabase, user } = await getUser();
  if (!user) return { error: "Este link expirou. Volte para a tela de entrar e peça outro." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.code === "same_password" ? "Use uma senha diferente da atual." : authErrorText(error.code) };
  redirect("/inicio");
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

/**
 * Conta nova com e-mail e senha. Com a confirmação de e-mail ligada não há sessão ainda: a vitrine é criada
 * na volta do link, por /auth/callback, se o cookie do link escolhido ainda valer (senão, o editor pede o link).
 * Se o e-mail já tiver conta, o Supabase não envia nada e responde igual: o aviso cobre os dois casos.
 */
async function signUpWithEmail(state: FormState & { handle: string; name: string }, form: FormData): Promise<FormState> {
  const email = readEmail(form);
  const password = String(form.get("password") ?? "");
  if (!email) return { ...state, email, error: "Informe seu e-mail." };
  if (password.length < PASSWORD_MIN) return { ...state, email, error: `Use uma senha com pelo menos ${PASSWORD_MIN} caracteres.` };

  const { supabase } = await getUser();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: state.name, full_name: state.name }, emailRedirectTo: await callbackUrl() },
  });
  if (error) return { ...state, email, error: authErrorText(error.code) };
  if (data.session) return createAndOpen(state.handle, state.name, state);
  await saveClaim({ handle: state.handle, name: state.name });
  return { ...state, email, notice: `Enviamos um link de confirmação para ${email}. Abra neste mesmo navegador para terminar. Se esse e-mail já tiver conta, nada é enviado: é só entrar.` };
}

/** Criar vitrine: escolhe o link e cria a conta, com e-mail e senha ou com o Google. Logado, cria direto. */
export async function claimAction(_prev: FormState, form: FormData): Promise<FormState> {
  const state = readClaim(form);
  const { handle, name } = state;

  const mine = await findMine();
  if (mine.vitrine) redirect("/editor");

  const parsed = vitrineContentSchema.safeParse(emptyContent(handle, name));
  if (!parsed.success) return { ...state, error: parsed.error.issues[0].message };
  if (await isHandleTaken(createPublicSupabase(), handle)) return { ...state, error: `${HOST}/${handle} já está em uso` };

  if (mine.user) return createAndOpen(handle, name, state);
  if (form.get("via") === "email") return signUpWithEmail(state, form);
  await saveClaim({ handle, name });
  return startGoogle(state);
}

/** "Entrar" de qualquer página: depois do Google, volta para `next` (a página em que a pessoa estava). */
export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  // o campo vem vazio se o clique foi antes de a página hidratar: aí vale a página que enviou o formulário
  const next = safePath(form.get("next")) ?? (await refererPath());
  if (next) await saveReturn(next);
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
 * `confirm` precisa ser o link publicado da vitrine, digitado pela pessoa; quem não tem vitrine digita "excluir".
 */
export async function deleteAccountAction(confirm: string): Promise<{ error: string }> {
  const { supabase, user, vitrine } = await findMine();
  if (!user) return { error: "Sessão expirada. Entre de novo." };
  const typed = confirm.trim().toLowerCase().replace(/^@/, "");
  if (typed !== (vitrine ? vitrine.handle : DELETE_WORD)) return { error: vitrine ? "O link digitado não confere." : `Digite ${DELETE_WORD} para confirmar.` };

  // Lido antes de apagar: depois da cascata não dá mais para saber em quais vitrines a pessoa comentou.
  const commented = await listCommentedHandles(supabase, user.id).catch(() => []);

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
  commented.forEach((handle) => updateTag(commentsTag(handle)));
  updateTag(HOME_TAG);
  redirect("/");
}

/** Liga ou desliga o favorito de quem entrou. A lista é privada: não há cache para invalidar. */
export async function setFavoriteAction(handle: string, on: boolean): Promise<SocialResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre de novo." };
  try {
    if (!(await setFavorite(supabase, user.id, handle, on))) return { ok: false, error: "Esta vitrine não existe mais." };
  } catch (e) {
    console.error("setFavorite", e);
    return { ok: false, error: "Não deu para salvar. Tente de novo." };
  }
  return { ok: true };
}

export async function addCommentAction(handle: string, body: string): Promise<SocialResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre de novo." };
  const text = body.trim();
  if (!text) return { ok: false, error: "Escreva alguma coisa antes de enviar." };
  if (text.length > COMMENT_MAX) return { ok: false, error: `Use até ${COMMENT_MAX} caracteres.` };
  try {
    if (!(await addComment(supabase, handle, text))) return { ok: false, error: "Esta vitrine não existe mais." };
  } catch (e) {
    if (e instanceof CommentRateLimitError) return { ok: false, error: "Muitos comentários em pouco tempo. Espere um minuto." };
    console.error("addComment", e);
    return { ok: false, error: "Não deu para comentar. Tente de novo." };
  }
  updateTag(commentsTag(handle));
  return { ok: true };
}

/** Quem pode apagar (quem escreveu ou a dona da vitrine) é decidido pela RLS. */
export async function deleteCommentAction(id: string): Promise<SocialResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre de novo." };
  try {
    const handle = await deleteComment(supabase, id);
    if (!handle) return { ok: false, error: "Não deu para excluir este comentário." };
    updateTag(commentsTag(handle));
    return { ok: true };
  } catch (e) {
    console.error("deleteComment", e);
    return { ok: false, error: "Não deu para excluir este comentário." };
  }
}

const ITEM_LABELS: Record<string, string> = { coupons: "Cupom", products: "Produto", kits: "Kit" };

export type PublishResult = { ok: true; updatedAt: string } | { ok: false; error: string };

export async function publishVitrine(content: VitrineContent): Promise<PublishResult> {
  const { supabase, user, vitrine } = await findMine();
  if (!user || !vitrine) return { ok: false, error: "Sessão expirada. Entre de novo." };

  // o editor pode estar aberto há tempos: nome, link, foto e capa valem os do banco, não a cópia dele
  const parsed = vitrineContentSchema.safeParse({ ...content, ...pickProfile(vitrine) });
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

/** Grava nome, link, foto e capa por cima do que já está na vitrine e atualiza as páginas públicas. */
async function saveProfile(patch: Partial<VitrineProfile>): Promise<SocialResult> {
  const { supabase, user, vitrine } = await findMine();
  if (!user || !vitrine) return { ok: false, error: "Sessão expirada. Entre de novo." };

  // sem foto própria, vale a do Google: fica gravada porque a página pública não tem acesso aos dados do login
  const profile = { ...pickProfile(vitrine), ...patch };
  const parsed = vitrineProfileSchema.safeParse({ ...profile, avatarUrl: profile.avatarUrl || googlePhoto(user) });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    await updateProfile(supabase, user.id, parsed.data);
  } catch (e) {
    if (e instanceof HandleTakenError) return { ok: false, error: `${HOST}/${parsed.data.handle} já está em uso` };
    console.error("updateProfile", e);
    return { ok: false, error: "Não deu para salvar. Tente de novo." };
  }
  updateTag(vitrineTag(vitrine.handle));
  if (vitrine.handle !== parsed.data.handle) updateTag(vitrineTag(parsed.data.handle));
  updateTag(HOME_TAG);
  return { ok: true };
}

/** Configurações: nome, link e foto de perfil. */
export async function updateProfileAction(profile: Pick<VitrineProfile, "handle" | "name" | "avatarUrl">): Promise<SocialResult> {
  return saveProfile(profile);
}

/** Home: a capa; vazia remove, e a vitrine passa a mostrar a primeira letra do nome. */
export async function updateCoverAction(bannerUrl: string): Promise<SocialResult> {
  return saveProfile({ look: { bannerUrl } });
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
