import { z } from "zod";

/**
 * Perguntas do onboarding (versão 1). Os valores são gravados no banco; os rótulos ficam nas mensagens
 * (`onboarding.options.*` em messages/*.json), para sair em cada idioma.
 * Mudar uma opção: ajuste aqui e nas mensagens e, se for trocar um valor já salvo, a migração de dados.
 */
export const ONBOARDING_VERSION = 2;

export const PERSONAS = ["creator", "shopper"] as const;
export const NETWORKS = ["instagram", "tiktok", "youtube", "kwai", "pinterest", "whatsapp", "telegram", "blog", "outra"] as const;
export const AUDIENCES = ["menos-1k", "1k-10k", "10k-50k", "50k-200k", "200k-1m", "acima-1m", "outro"] as const;
export const NICHES = ["moda", "beleza", "casa", "maternidade", "fitness", "tecnologia", "games", "pets", "alimentacao", "viagem", "saude", "outro"] as const;
/** As redes aparecem aqui também: "como conheceu" pede a rede específica, não "rede social". */
export const HEARD_FROM = [
  "outra-creator", "indicacao", "google", "anuncio",
  "instagram", "tiktok", "youtube", "kwai", "pinterest", "whatsapp", "telegram", "blog",
  "outro",
] as const;

/** Texto livre que acompanha uma opção "Outro" (ou "Outra", em redes). Vazio vira null. */
const otherText = z.string().trim().max(60).nullable();

/** Respostas como chegam do formulário, já convertidas (listas vazias e campos vazios viram padrão). */
export const onboardingSchema = z.object({
  persona: z.enum(PERSONAS),
  networks: z.array(z.enum(NETWORKS)).max(NETWORKS.length),
  audience: z.enum(AUDIENCES).nullable(),
  niches: z.array(z.enum(NICHES)).max(3),
  interests: z.array(z.enum(NICHES)).max(12),
  heardFrom: z.enum(HEARD_FROM).nullable(),
  marketingOptIn: z.boolean(),
  /** aceitou participar do programa de testes com gravação de sessão (PostHog) */
  recording: z.boolean(),
  /** texto de cada "Outro"; só é guardado se a opção correspondente estiver marcada */
  other: z.object({
    networks: otherText,
    audience: otherText,
    niches: otherText,
    heardFrom: otherText,
    interests: otherText,
  }),
});

export type OnboardingAnswers = z.infer<typeof onboardingSchema>;
