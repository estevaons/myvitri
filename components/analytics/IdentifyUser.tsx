"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics/client";

/**
 * Liga as visitas desta pessoa ao id da conta. O id é o mesmo que o servidor usa nos eventos
 * (`distinct_id`), então as propriedades que o onboarding gravou aparecem no mesmo perfil.
 * Só o id interno vai ao PostHog: nada de nome ou e-mail.
 * `recording`: a pessoa aceitou gravação de sessão no onboarding. Sem isso, nada é gravado.
 */
export function IdentifyUser({ id, recording }: { id: string; recording: boolean }) {
  useEffect(() => {
    const ph = analytics();
    if (!ph) return;
    ph.identify(id);
    if (recording) ph.startSessionRecording();
    else ph.stopSessionRecording();
  }, [id, recording]);
  return null;
}
