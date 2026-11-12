"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect as redirectTo } from "next/navigation";
import type { ZodError } from "zod";
import { hrefOf, redirect } from "@/lib/i18n/navigation";
import { internalPath } from "@/lib/i18n/routing";
import { DELETE_WORDS } from "@/lib/auth/account";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { safePath, saveReturn } from "@/lib/auth/return-to";
import { track } from "@/lib/analytics/server";
import { onboardingSchema } from "@/lib/onboarding/options";
import { saveOnboardingProfile, takeAttribution } from "@/lib/onboarding/store";
import { createPublicSupabase, getUser } from "@/lib/supabase/server";
import { commentsTag, favoritesTag, HOME_TAG, vitrineTag } from "@/lib/vitrine/data";
import { googlePhoto, saveClaim, starterContent } from "@/lib/vitrine/claim";
import { findStoreLogos, importProductFromUrl, type ImportedProduct } from "@/lib/vitrine/import-link";
import { COMMENT_MAX, type SocialResult } from "@/lib/vitrine/social";
import {
  addComment,
  CommentGoneError,
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
import { vitrineAddress } from "@/lib/vitrine/links";
import { emptyContent, pickProfile, vitrineContentSchema, vitrineProfileSchema, type VitrineContent, type VitrineProfile } from "@/lib/vitrine/types";

/**
 * `sent`: o link foi enviado por e-mail (confirmar a conta ou senha nova); a tela mostra o modal de "confira seu e-mail".
 * `sentAt`: quando (ms), para cada envio reiniciar a contagem do "Reenviar e-mail". `unconfirmed`: o envio veio de um login
 * com e-mail ainda não confirmado (o link foi mandado de novo); o modal troca o texto.
 */
export type FormState = { error?: string; sent?: "confirm" | "reset"; sentAt?: number; unconfirmed?: boolean; handle?: string; name?: string; email?: string };

/**
 * As mensagens saem no idioma da página que chamou a ação: Server Actions não têm o segmento [locale],
 * e o next-intl lê o idioma do cabeçalho que o proxy grava na requisição.
 */
const errors = () => getTranslations("errors");

/** Leva a uma página do site no idioma atual (`path` interno, sem idioma, com ou sem parâmetros). */
async function go(path: string): Promise<never> {
  redirect({ href: hrefOf(path), locale: await getLocale() });
  throw new Error("unreachable");
}

/** As mensagens dos schemas (lib/vitrine/types.ts) são chaves de `errors.schema`; as padrão do Zod viram uma genérica. */
async function issueText(error: ZodError) {
  const t = await getTranslations("errors.schema");
  const key = error.issues[0].message;
  return t.has(key as "invalid") ? t(key as "invalid") : t("invalid");
}

/** O texto padrão de uma vitrine nova, no idioma de quem está criando. */
async function intro() {
  const t = await getTranslations("vitrineDefaults");
  return { headline: t("headline"), sub: t("sub") };
}

function readClaim(form: FormData) {
  return {
    handle: String(form.get("handle") ?? "").trim().toLowerCase().replace(/^@/, ""),
    name: String(form.get("name") ?? "").trim(),
  };
}

/** Caminho da página que fez a requisição, só se for deste site (sem o aviso de erro do login nem o idioma). */
async function refererPath() {
  const h = await headers();
  try {
    const ref = new URL(h.get("referer") ?? "");
    if (ref.host !== h.get("host")) return null;
    ref.searchParams.delete("error");
    const path = safePath(ref.pathname + ref.search);
    return path && internalPath(path);
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
  if (error || !data.url) return { ...state, error: (await errors())("googleFailed") };
  redirectTo(data.url);
}

function readEmail(form: FormData) {
  return String(form.get("email") ?? "").trim().toLowerCase();
}

/** Erros do Supabase que valem igual para entrar, criar conta e trocar a senha. */
async function authErrorText(code: string | undefined) {
  const t = await getTranslations("auth.errors");
  switch (code) {
    case "email_provider_disabled":
    case "signup_disabled":
      return t("emailDisabled");
    case "weak_password":
      return t("weakPassword", { min: PASSWORD_MIN });
    // sem SMTP próprio, o Supabase só envia para os e-mails da equipe do projeto
    case "email_address_not_authorized":
      return t("emailNotAuthorized");
    case "over_email_send_rate_limit":
      return t("emailRateLimit");
    case "over_request_rate_limit":
      return t("requestRateLimit");
    default:
      return t("generic");
  }
}

/** Entrar com e-mail e senha; a mensagem não diz se o e-mail existe. */
export async function signInWithPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await getTranslations("auth.errors");
  const email = readEmail(form);
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { email, error: t("fillEmailAndPassword") };

  const { supabase } = await getUser();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") return { email, error: t("invalidCredentials") };
    if (error.code === "email_not_confirmed") {
      // a senha está certa, falta confirmar: manda o link de novo e a tela abre o mesmo modal do cadastro, com a contagem
      // do "Reenviar e-mail". Bater no limite quer dizer que um link saiu há menos de um minuto: o modal vale do mesmo jeito.
      const code = await sendConfirmation(email);
      if (code && !RATE_LIMITS.includes(code)) return { email, error: t("emailNotConfirmed") };
      return { email, sent: "confirm", sentAt: Date.now(), unconfirmed: true };
    }
    return { email, error: await authErrorText(error.code) };
  }
  const next = safePath(form.get("next"));
  return go(next ? internalPath(next) : "/inicio");
}

/**
 * Envia o link para definir uma senha nova. Também serve a quem só usa o Google e quer passar a ter senha.
 * A resposta é a mesma com ou sem conta, para ninguém descobrir quais e-mails estão cadastrados.
 */
export async function requestPasswordResetAction(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await errors();
  const email = readEmail(form);
  if (!email) return { error: t("enterEmail") };

  const { supabase } = await getUser();
  // o link dura 1 hora: é a volta por /auth/callback que leva à tela de senha nova
  await saveReturn("/nova-senha", 60 * 60);
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: await callbackUrl() });
  // só erros que valem para qualquer e-mail: nenhum deles revela se a conta existe
  if (error && ["email_address_not_authorized", "over_email_send_rate_limit", "over_request_rate_limit", "email_provider_disabled"].includes(error.code ?? "")) return { email, error: await authErrorText(error.code) };
  return { email, sent: "reset" };
}

/** Tela /nova-senha: quem chegou pelo link do e-mail já tem sessão. */
export async function updatePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await errors();
  const password = String(form.get("password") ?? "");
  if (password.length < PASSWORD_MIN) return { error: t("passwordMin", { min: PASSWORD_MIN }) };
  if (password !== String(form.get("passwordConfirm") ?? "")) return { error: t("passwordMismatch") };

  const { supabase, user } = await getUser();
  if (!user) return { error: t("linkExpired") };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.code === "same_password" ? t("samePassword") : await authErrorText(error.code) };
  return go("/inicio");
}

async function createAndOpen(handle: string, name: string, state: FormState): Promise<FormState> {
  const t = await errors();
  const { supabase, user } = await getUser();
  if (!user) return { ...state, error: t("sessionExpired") };
  try {
    await createVitrine(supabase, user.id, starterContent(user, handle, name, await intro()));
    await track(user.id, "vitrine_created", { via: "form" });
  } catch (e) {
    if (e instanceof HandleTakenError) return { ...state, error: t("handleTaken", { url: vitrineAddress(handle) }) };
    throw e;
  }
  updateTag(vitrineTag(handle));
  return go("/editor");
}

/**
 * Conta nova com e-mail e senha. Com a confirmação de e-mail ligada não há sessão ainda: a vitrine é criada
 * na volta do link, por /auth/callback, se o cookie do link escolhido ainda valer (senão, o editor pede o link).
 * Se o e-mail já tiver conta, o Supabase não envia nada e responde igual: o aviso cobre os dois casos.
 */
async function signUpWithEmail(state: FormState & { handle: string; name: string }, form: FormData): Promise<FormState> {
  const t = await errors();
  const email = readEmail(form);
  const password = String(form.get("password") ?? "");
  if (!email) return { ...state, email, error: t("enterEmail") };
  if (password.length < PASSWORD_MIN) return { ...state, email, error: t("signupPasswordMin", { min: PASSWORD_MIN }) };
  if (password !== String(form.get("passwordConfirm") ?? "")) return { ...state, email, error: t("passwordMismatch") };

  const { supabase } = await getUser();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: state.name, full_name: state.name }, emailRedirectTo: await callbackUrl() },
  });
  if (error) return { ...state, email, error: await authErrorText(error.code) };
  if (data.session) return createAndOpen(state.handle, state.name, state);
  await saveClaim({ handle: state.handle, name: state.name });
  return { ...state, email, sent: "confirm", sentAt: Date.now() };
}

/**
 * "Reenviar e-mail" do link de confirmação (modal depois de criar a conta e login de conta não confirmada).
 * Como no "esqueci minha senha", a resposta não diz se o e-mail tem conta: só aparecem erros que valem para qualquer
 * endereço (limite de envios, envio bloqueado); o resto conta como enviado.
 */
export async function resendConfirmationAction(email: string): Promise<{ error?: string }> {
  const address = String(email ?? "").trim().toLowerCase();
  if (!address) return { error: (await errors())("enterEmail") };
  const code = await sendConfirmation(address);
  return code ? { error: await authErrorText(code) } : {};
}

/** Erros de envio de e-mail que valem para qualquer endereço: mostrá-los não revela se a conta existe. */
const SEND_ERRORS = ["email_address_not_authorized", "over_email_send_rate_limit", "over_request_rate_limit", "email_provider_disabled"];
const RATE_LIMITS = ["over_email_send_rate_limit", "over_request_rate_limit"];

/** Manda de novo o link de confirmação. Devolve o código de erro só se for um de `SEND_ERRORS`; o resto conta como enviado. */
async function sendConfirmation(email: string): Promise<string | null> {
  const { supabase } = await getUser();
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: await callbackUrl() } });
  return error && SEND_ERRORS.includes(error.code ?? "") ? error.code! : null;
}

/** Criar vitrine: escolhe o link e cria a conta, com e-mail e senha ou com o Google. Logado, cria direto. */
export async function claimAction(_prev: FormState, form: FormData): Promise<FormState> {
  const state = readClaim(form);
  const { handle, name } = state;

  const mine = await findMine();
  if (mine.vitrine) return go("/editor");

  const parsed = vitrineContentSchema.safeParse(emptyContent(handle, name));
  if (!parsed.success) return { ...state, error: await issueText(parsed.error) };
  if (await isHandleTaken(createPublicSupabase(), handle)) return { ...state, error: (await errors())("handleTaken", { url: vitrineAddress(handle) }) };

  if (mine.user) return createAndOpen(handle, name, state);
  if (form.get("via") === "email") return signUpWithEmail(state, form);
  await saveClaim({ handle, name });
  return startGoogle(state);
}

/** "Entrar" de qualquer página: depois do Google, volta para `next` (a página em que a pessoa estava). */
export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  // o campo vem vazio se o clique foi antes de a página hidratar: aí vale a página que enviou o formulário
  const field = safePath(form.get("next"));
  const next = field ? internalPath(field) : await refererPath();
  if (next) await saveReturn(next);
  return startGoogle({});
}

/** Logado mas ainda sem vitrine (ex.: o link escolhido foi ocupado antes da confirmação). */
export async function createVitrineAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { handle, name } = readClaim(form);
  const parsed = vitrineContentSchema.safeParse(emptyContent(handle, name));
  if (!parsed.success) return { handle, name, error: await issueText(parsed.error) };
  return createAndOpen(handle, name, { handle, name });
}

export type OnboardingState = { error?: string };

function readOnboarding(form: FormData) {
  const list = (name: string) => form.getAll(name).map(String).filter(Boolean);
  const one = (name: string) => String(form.get(name) ?? "") || null;
  // texto do "Outro": até 60 caracteres, vazio vira null
  const other = (name: string) => String(form.get(name) ?? "").trim().slice(0, 60) || null;
  return {
    persona: String(form.get("persona") ?? ""),
    networks: list("networks"),
    audience: one("audience"),
    niches: list("niches"),
    interests: list("interests"),
    heardFrom: one("heardFrom"),
    marketingOptIn: form.get("marketingOptIn") === "on",
    recording: form.get("recording") === "on",
    other: {
      networks: other("otherNetworks"),
      audience: other("otherAudience"),
      niches: other("otherNiches"),
      heardFrom: other("otherHeardFrom"),
      interests: other("otherInterests"),
    },
  };
}

/** Respostas de /boas-vindas. Quem grava é a própria pessoa (RLS); a origem do cadastro vai junto, uma vez. */
export async function saveOnboardingAction(_prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse(readOnboarding(form));
  if (!parsed.success) return { error: (await getTranslations("onboarding"))("errors.choose") };
  const { supabase, user } = await getUser();
  if (!user) return { error: (await errors())("sessionExpired") };
  try {
    await saveOnboardingProfile(supabase, user.id, parsed.data, await takeAttribution());
  } catch (e) {
    console.error("saveProfile", e);
    return { error: (await getTranslations("onboarding"))("errors.save") };
  }
  const a = parsed.data;
  // $set: estas propriedades ficam no perfil da pessoa no PostHog, para segmentar qualquer funil
  await track(user.id, "onboarding_completed", {
    persona: a.persona,
    networks: a.networks,
    audience: a.audience,
    niches: a.niches,
    interests: a.interests,
    heard_from: a.heardFrom,
    marketing_opt_in: a.marketingOptIn,
    recording_opt_in: a.recording,
    $set: { persona: a.persona, audience_band: a.audience, heard_from: a.heardFrom, marketing_opt_in: a.marketingOptIn },
  });
  // creator monta a vitrine (editor); comprador vai para a home. A página de origem (`next`) só vale para quem pulou.
  return go(a.persona === "creator" ? "/editor" : "/inicio");
}

/** "Pular" no onboarding: conta como respondido para não perguntar de novo, sem respostas. */
export async function skipOnboardingAction(form: FormData) {
  const { supabase, user } = await getUser();
  if (!user) return go("/entrar");
  const safe = safePath(form.get("next"));
  const next = safe ? internalPath(safe) : "/inicio";
  try {
    await saveOnboardingProfile(supabase, user.id, null, await takeAttribution());
  } catch (e) {
    console.error("skipProfile", e);
    // volta para as perguntas sem perder a página de destino
    return go(`/boas-vindas?next=${encodeURIComponent(next)}`);
  }
  await track(user.id, "onboarding_skipped");
  return go(next);
}

export async function signOutAction() {
  const { supabase } = await getUser();
  await supabase.auth.signOut();
  return go("/");
}

/**
 * Apaga a conta de quem está logado, com vitrine, itens, métricas e rascunho (cascata no banco).
 * `confirm` precisa ser o link publicado da vitrine, digitado pela pessoa; quem não tem vitrine digita "excluir"
 * (ou a palavra do idioma da página, como "delete").
 */
export async function deleteAccountAction(confirm: string): Promise<{ error: string }> {
  const t = await errors();
  const { supabase, user, vitrine } = await findMine();
  if (!user) return { error: t("sessionExpired") };
  const typed = confirm.trim().toLowerCase().replace(/^@/, "");
  const word = DELETE_WORDS[(await getLocale()) as keyof typeof DELETE_WORDS];
  const ok = vitrine ? typed === vitrine.handle : Object.values(DELETE_WORDS).includes(typed);
  if (!ok) return { error: vitrine ? t("deleteMismatch") : t("deleteTypeWord", { word }) };

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
    return { error: t("deleteFailed") };
  }
  // A conta já não existe: só limpamos os cookies da sessão.
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  if (vitrine) updateTag(vitrineTag(vitrine.handle));
  commented.forEach((handle) => updateTag(commentsTag(handle)));
  updateTag(HOME_TAG);
  return go("/");
}

/** Liga ou desliga o favorito de quem entrou. A lista é privada; o que muda no cache é só o número da vitrine. */
export async function setFavoriteAction(handle: string, on: boolean): Promise<SocialResult> {
  const t = await errors();
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: t("sessionExpired") };
  try {
    if (!(await setFavorite(supabase, user.id, handle, on))) return { ok: false, error: t("vitrineGone") };
  } catch (e) {
    console.error("setFavorite", e);
    return { ok: false, error: t("saveFailed") };
  }
  updateTag(favoritesTag(handle));
  return { ok: true };
}

/** Com `parentId`, responde a um comentário (ou a uma resposta, que entra na mesma conversa). */
export async function addCommentAction(handle: string, body: string, parentId?: string): Promise<SocialResult> {
  const t = await errors();
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: t("sessionExpired") };
  const text = body.trim();
  if (!text) return { ok: false, error: t("commentEmpty") };
  if (text.length > COMMENT_MAX) return { ok: false, error: t("commentMax", { max: COMMENT_MAX }) };
  try {
    if (!(await addComment(supabase, handle, text, parentId))) return { ok: false, error: t("vitrineGone") };
  } catch (e) {
    if (e instanceof CommentRateLimitError) return { ok: false, error: t("commentRate") };
    if (e instanceof CommentGoneError) {
      // a lista ainda mostra o comentário apagado: atualiza para a pessoa ver que ele saiu
      updateTag(commentsTag(handle));
      return { ok: false, error: t("replyGone") };
    }
    console.error("addComment", e);
    return { ok: false, error: t("commentFailed") };
  }
  updateTag(commentsTag(handle));
  return { ok: true };
}

/** Quem pode apagar (quem escreveu ou a dona da vitrine) é decidido pela RLS. */
export async function deleteCommentAction(id: string): Promise<SocialResult> {
  const t = await errors();
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: t("sessionExpired") };
  try {
    const handle = await deleteComment(supabase, id);
    if (!handle) return { ok: false, error: t("commentDeleteFailed") };
    updateTag(commentsTag(handle));
    return { ok: true };
  } catch (e) {
    console.error("deleteComment", e);
    return { ok: false, error: t("commentDeleteFailed") };
  }
}

/** Listas do conteúdo cujo erro de validação diz o item ("Cupom 2: …"). */
const ITEM_LISTS = new Set(["coupons", "products", "posts"]);

export type PublishResult = { ok: true; updatedAt: string } | { ok: false; error: string };

export async function publishVitrine(content: VitrineContent): Promise<PublishResult> {
  const t = await errors();
  const { supabase, user, vitrine } = await findMine();
  if (!user || !vitrine) return { ok: false, error: t("sessionExpired") };

  // o editor pode estar aberto há tempos: nome, link, foto e capa valem os do banco, não a cópia dele
  const parsed = vitrineContentSchema.safeParse({ ...content, ...pickProfile(vitrine) });
  if (!parsed.success) {
    const { path } = parsed.error.issues[0];
    const message = await issueText(parsed.error);
    const item = String(path[0]);
    return { ok: false, error: ITEM_LISTS.has(item) && typeof path[1] === "number" ? t("publishItem", { item, n: path[1] + 1, message }) : message };
  }

  try {
    const { prevHandle, updatedAt } = await publish(supabase, user.id, parsed.data);
    await deleteDraft(supabase, user.id).catch((e) => console.error("deleteDraft", e));
    await track(user.id, "vitrine_published", { coupons: parsed.data.coupons.length, products: parsed.data.products.length, posts: parsed.data.posts.length });
    updateTag(vitrineTag(prevHandle));
    if (prevHandle !== parsed.data.handle) updateTag(vitrineTag(parsed.data.handle));
    updateTag(HOME_TAG);
    return { ok: true, updatedAt };
  } catch (e) {
    if (e instanceof HandleTakenError) return { ok: false, error: t("handleTaken", { url: vitrineAddress(parsed.data.handle) }) };
    console.error("publish_vitrine", e);
    return { ok: false, error: t("publishFailed") };
  }
}

/** Grava nome, link, foto e capa por cima do que já está na vitrine e atualiza as páginas públicas. */
async function saveProfile(patch: Partial<VitrineProfile>): Promise<SocialResult> {
  const t = await errors();
  const { supabase, user, vitrine } = await findMine();
  if (!user || !vitrine) return { ok: false, error: t("sessionExpired") };

  // sem foto própria, vale a do Google: fica gravada porque a página pública não tem acesso aos dados do login
  const profile = { ...pickProfile(vitrine), ...patch };
  const parsed = vitrineProfileSchema.safeParse({ ...profile, avatarUrl: profile.avatarUrl || googlePhoto(user) });
  if (!parsed.success) return { ok: false, error: await issueText(parsed.error) };

  try {
    await updateProfile(supabase, user.id, parsed.data);
  } catch (e) {
    if (e instanceof HandleTakenError) return { ok: false, error: t("handleTaken", { url: vitrineAddress(parsed.data.handle) }) };
    console.error("updateProfile", e);
    return { ok: false, error: t("saveFailed") };
  }
  updateTag(vitrineTag(vitrine.handle));
  if (vitrine.handle !== parsed.data.handle) updateTag(vitrineTag(parsed.data.handle));
  updateTag(HOME_TAG);

  // Foto de perfil e capa trocadas não ficam guardadas: liberam espaço da cota de upload da pessoa.
  const stale = [
    vitrine.avatarUrl !== parsed.data.avatarUrl && ownPhotoPath(vitrine.avatarUrl, user.id),
    vitrine.look.bannerUrl !== parsed.data.look.bannerUrl && ownPhotoPath(vitrine.look.bannerUrl, user.id),
  ].filter((path): path is string => !!path);
  if (stale.length) {
    const { error } = await supabase.storage.from("vitrine-photos").remove(stale);
    if (error) console.error("removeStalePhotos", error);
  }
  return { ok: true };
}

/** Caminho no bucket vitrine-photos de uma URL pública do projeto, só quando o arquivo está na pasta da pessoa. */
function ownPhotoPath(url: string, userId: string) {
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vitrine-photos/`;
  if (!url.startsWith(prefix)) return null;
  const path = decodeURIComponent(url.slice(prefix.length).split("?")[0]);
  const [folder, file, ...rest] = path.split("/");
  return folder === userId && file && !rest.length ? path : null;
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
  const t = await errors();
  const { user } = await getUser();
  if (!user) return { ok: false, error: t("sessionExpired") };
  try {
    return { ok: true, product: await importProductFromUrl(url) };
  } catch {
    return { ok: false, error: t("importFailed") };
  }
}

/** Logos encontrados no site da loja do cupom, para a pessoa escolher. */
export async function findLogoAction(url: string): Promise<{ ok: true; logos: string[] } | { ok: false; error: string }> {
  const t = await errors();
  const { user } = await getUser();
  if (!user) return { ok: false, error: t("sessionExpired") };
  try {
    return { ok: true, logos: await findStoreLogos(url) };
  } catch {
    return { ok: false, error: t("logoFailed") };
  }
}

/** Para onde vai cada tipo de imagem enviada pelo editor, e o que cada bucket aceita. */
const UPLOADS = {
  logo: { bucket: "brand-logos", types: { "image/webp": "webp", "image/png": "png" }, maxBytes: 1_048_576 },
  cover: { bucket: "vitrine-photos", types: { "image/webp": "webp", "image/jpeg": "jpg" }, maxBytes: 2_097_152 },
  avatar: { bucket: "vitrine-photos", types: { "image/webp": "webp", "image/jpeg": "jpg" }, maxBytes: 2_097_152 },
  product: { bucket: "vitrine-photos", types: { "image/webp": "webp", "image/jpeg": "jpg" }, maxBytes: 2_097_152 },
  post: { bucket: "vitrine-photos", types: { "image/webp": "webp", "image/jpeg": "jpg" }, maxBytes: 2_097_152 },
} satisfies Record<string, { bucket: string; types: Record<string, string>; maxBytes: number }>;
export type ImageKind = keyof typeof UPLOADS;

/** Guarda a imagem enviada (já reduzida no navegador) na pasta da pessoa e devolve a URL pública. */
export async function uploadImageAction(kind: ImageKind, form: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const t = await errors();
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: t("sessionExpired") };
  const target = UPLOADS[kind];
  const file = form.get("file");
  const ext = file instanceof File ? (target?.types as Record<string, string> | undefined)?.[file.type] : undefined;
  if (!target || !(file instanceof File) || !ext || file.size > target.maxBytes) return { ok: false, error: t("imageType") };

  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const bucket = supabase.storage.from(target.bucket);
  const { error } = await bucket.upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) {
    console.error("uploadImage", kind, error);
    // O caminho é sempre a pasta da pessoa: recusa da policy aqui é a cota ou o ritmo de upload (storage_upload_allowed).
    const refused = "statusCode" in error && error.statusCode === "403";
    return { ok: false, error: t(refused ? "uploadLimit" : "uploadFailed") };
  }
  return { ok: true, url: bucket.getPublicUrl(path).data.publicUrl };
}
