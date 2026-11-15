/**
 * Tours guiados da plataforma (componente `components/onboarding/Tour.tsx`). Cada página logada tem o seu, que abre
 * sozinho na primeira visita e pode ser reaberto pelo menu da conta. O que já foi visto fica em `profiles.tours`
 * (chave = id do tour, valor = quando terminou), gravado pela RPC `mark_tour_seen`.
 * Novo tour: some o id aqui e na lista da função `mark_tour_seen` (migração).
 */
export const TOUR_IDS = ["home", "editor"] as const;
export type TourId = (typeof TOUR_IDS)[number];

export const isTourId = (v: unknown): v is TourId => typeof v === "string" && (TOUR_IDS as readonly string[]).includes(v);

/** Ids vistos, a partir do jsonb de `profiles.tours` (ignora chave desconhecida e valor que não é texto). */
export function seenTours(raw: unknown): TourId[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw)
    .filter(([k, v]) => isTourId(k) && typeof v === "string")
    .map(([k]) => k as TourId);
}

/** Evento de janela que abre o tour da página atual (disparado pelo menu da conta). */
export const TOUR_EVENT = "vitri:tour";

/** `?tour=1` na URL abre o tour da página ao carregar (link de suporte, teste). */
export const TOUR_PARAM = "tour";
