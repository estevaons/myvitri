"use client";

import { useTranslations } from "next-intl";
import { SOCIAL_LABELS, SOCIAL_NETWORKS, socialUrl } from "@/lib/vitrine/socials";
import type { VitrineContent } from "@/lib/vitrine/types";
import { Field, TextInput, type Update } from "./ui";

/** Redes sociais, na janela que abre pelos ícones embaixo do nome: aparecem discretas ali na vitrine. Aceita @, usuário ou o link do perfil. */
export function SocialsForm({ draft, update }: { draft: VitrineContent; update: Update }) {
  const t = useTranslations("editor.socials");
  return (
    <div className="flex flex-col gap-4">
      <span className="text-[13px] leading-snug text-[#77726A]">{t("hint")}</span>
      <div className="grid gap-3 sm:grid-cols-2">
        {SOCIAL_NETWORKS.map((n, i) => {
          const value = draft.socials[n];
          const bad = value.trim() !== "" && !socialUrl(n, value);
          return (
            <Field key={n} label={SOCIAL_LABELS[n]} hint={bad ? <span className="text-[#A3361B]">{t("invalid", { network: SOCIAL_LABELS[n] })}</span> : undefined}>
              <TextInput
                value={value}
                onChange={(v) => update((d) => ({ ...d, socials: { ...d.socials, [n]: v } }))}
                placeholder={t("placeholder")}
                maxLength={200}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-autofocus={i === 0 || undefined}
                aria-invalid={bad || undefined}
              />
            </Field>
          );
        })}
      </div>
    </div>
  );
}
