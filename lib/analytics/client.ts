import posthog from "posthog-js";

/**
 * PostHog no navegador, iniciado só na primeira vez que alguém precisa dele (e só se houver chave).
 * Sem cookies (persistência em localStorage) e sem gravação de tela. Captura automática de cliques e
 * mapas de calor estão ligados (a política de privacidade descreve), além de pageviews e dos eventos do app.
 */
let ready = false;

export function analytics() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") return null;
  if (!ready) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      persistence: "localStorage",
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      // cliques em botões e links (autocapture) e mapas de calor: ligados por padrão no SDK, desligue aqui se mudar de ideia
      autocapture: true,
      enable_heatmaps: true,
      // gravação de sessão desligada por padrão: só liga com startSessionRecording(), para quem consentiu (IdentifyUser)
      disable_session_recording: true,
      // campos de digitação ficam mascarados na gravação
      session_recording: { maskAllInputs: true },
    });
    ready = true;
  }
  return posthog;
}
