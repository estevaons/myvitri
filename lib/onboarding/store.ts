import "server-only";
import { cookies } from "next/headers";
import { ATTRIBUTION_COOKIE } from "@/lib/analytics/attribution";
import type { OnboardingAnswers } from "@/lib/onboarding/options";
import { ONBOARDING_VERSION } from "@/lib/onboarding/options";
import type { createSupabase } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

type Db = Awaited<ReturnType<typeof createSupabase>>;

/**
 * Quem não tem linha em `profiles` ainda não passou pelo onboarding (respondeu ou pulou).
 * Se a leitura falhar (ex.: a migração ainda não foi aplicada), não bloqueia o app: segue sem perguntar.
 */
export async function needsOnboarding(db: Db, userId: string): Promise<boolean> {
  const { data, error } = await db.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("needsOnboarding", error);
    return false;
  }
  return !data;
}

/** A pessoa aceitou gravação de sessão no onboarding? Se a leitura falhar, não grava (o padrão é não gravar). */
export async function recordingConsent(db: Db, userId: string): Promise<boolean> {
  const { data, error } = await db.from("profiles").select("recording_opt_in").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("recordingConsent", error);
    return false;
  }
  return data?.recording_opt_in === true;
}

/** Lê o primeiro toque de atribuição e apaga o cookie: ele vale só para o cadastro que acabou de acontecer. */
export async function takeAttribution(): Promise<Record<string, unknown>> {
  const store = await cookies();
  const raw = store.get(ATTRIBUTION_COOKIE)?.value;
  if (raw) store.delete(ATTRIBUTION_COOKIE);
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw ?? "null"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Texto livre das opções "Outro", só das que estão marcadas (o resto é descartado).
 * Chaves = nome da pergunta. Vai em `profiles.other_answers`.
 */
export function otherAnswers(a: OnboardingAnswers): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (key: string, marked: boolean, text: string | null) => {
    if (marked && text) out[key] = text;
  };
  put("networks", a.networks.includes("outra"), a.other.networks);
  put("audience", a.audience === "outro", a.other.audience);
  put("niches", a.niches.includes("outro"), a.other.niches);
  put("heardFrom", a.heardFrom === "outro", a.other.heardFrom);
  put("interests", a.interests.includes("outro"), a.other.interests);
  return out;
}

/** Grava as respostas (ou o "pular", com `answers` nulo). Quem grava é a própria pessoa: a RLS confere. */
export async function saveOnboardingProfile(db: Db, userId: string, answers: OnboardingAnswers | null, signupSource: Record<string, unknown>) {
  const now = new Date().toISOString();
  const { error } = await db.from("profiles").upsert(
    {
      user_id: userId,
      persona: answers?.persona ?? null,
      networks: answers?.networks ?? [],
      audience_band: answers?.audience ?? null,
      niches: answers?.niches ?? [],
      interests: answers?.interests ?? [],
      heard_from: answers?.heardFrom ?? null,
      other_answers: answers ? otherAnswers(answers) : {},
      marketing_opt_in: answers?.marketingOptIn ?? false,
      opt_in_at: answers?.marketingOptIn ? now : null,
      recording_opt_in: answers?.recording ?? false,
      recording_opt_in_at: answers?.recording ? now : null,
      signup_source: signupSource as Json,
      onboarding_version: ONBOARDING_VERSION,
      onboarded_at: answers ? now : null,
      skipped_at: answers ? null : now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
