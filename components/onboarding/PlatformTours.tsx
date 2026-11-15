"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Tour, type TourStep } from "./Tour";

/**
 * Os tours de cada página logada. Os alvos são marcados com `data-tour` nos componentes (ou pelo id da seção, no
 * editor); passo cujo alvo não está na tela (sino de quem não tem vitrine, botões que só aparecem com vitrine, alvo
 * escondido no celular) sai do tour sozinho, então a mesma lista serve para quem tem e quem não tem vitrine.
 */

/** Home (/inicio): perfil, números, atalhos da vitrine (ou o convite para criar), busca e abas (Explorar), sino e conta. */
export function HomeTour({ autoStart, name, hasVitrine }: { autoStart: boolean; name: string; hasVitrine: boolean }) {
  const t = useTranslations("tour.home");
  const first = name.trim().split(/\s+/)[0] ?? "";
  const steps = useMemo<TourStep[]>(
    () => [
      { title: first ? t("welcome.title", { name: first }) : t("welcome.titleNoName"), text: hasVitrine ? t("welcome.creator") : t("welcome.shopper") },
      { target: '[data-tour="link"]', title: t("link.title"), text: t("link.text") },
      { target: '[data-tour="stats"]', title: t("stats.title"), text: t("stats.text") },
      { target: '[data-tour="vitrine"]', title: t("vitrine.title"), text: t("vitrine.text") },
      { target: '[data-tour="create"]', title: t("create.title"), text: t("create.text") },
      { target: '[data-tour="explore"]', title: t("explore.title"), text: t("explore.text") },
      { target: '[data-tour="bell"]', title: t("bell.title"), text: t("bell.text") },
      { target: '[data-tour="account"]', title: t("account.title"), text: t("account.text") },
      { title: t("done.title"), text: hasVitrine ? t("done.creator") : t("done.shopper") },
    ],
    [t, first, hasVitrine],
  );
  return <Tour id="home" steps={steps} autoStart={autoStart} />;
}

/** Editor (/editor): a vitrine editável, de cima para baixo, e o rascunho/publicar no cabeçalho. */
export function EditorTour({ autoStart }: { autoStart: boolean }) {
  const t = useTranslations("tour.editor");
  const steps = useMemo<TourStep[]>(
    () => [
      { title: t("welcome.title"), text: t("welcome.text") },
      { target: '[data-tour="cover"]', title: t("cover.title"), text: t("cover.text") },
      { target: '[data-tour="profile"]', title: t("profile.title"), text: t("profile.text") },
      { target: "#outfits", title: t("outfits.title"), text: t("outfits.text") },
      { target: "#produtos", title: t("products.title"), text: t("products.text") },
      { target: "#cupons", title: t("coupons.title"), text: t("coupons.text") },
      { target: '[data-tour="publish"]', title: t("publish.title"), text: t("publish.text") },
      { title: t("done.title"), text: t("done.text") },
    ],
    [t],
  );
  return <Tour id="editor" steps={steps} autoStart={autoStart} />;
}
