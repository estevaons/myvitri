"use client";

import { useTranslations } from "next-intl";
import { CoverPicker } from "@/components/home/CoverPicker";
import { SOCIAL_LABELS, SOCIAL_NETWORKS, socialUrl } from "@/lib/vitrine/socials";
import type { VitrineContent } from "@/lib/vitrine/types";
import { Field, Section, TextInput, inputCls } from "./ui";

export type Update = (fn: (d: VitrineContent) => VitrineContent) => void;
type PanelProps = { draft: VitrineContent; update: Update };

/**
 * A capa da vitrine (topo da vitrine pública e cards da home). Não passa pelo rascunho: salva na hora pelo
 * `CoverPicker`, que faz `router.refresh()`; o editor recebe a capa nova no perfil publicado e a copia para o rascunho.
 */
function CoverField({ draft }: { draft: VitrineContent }) {
  const t = useTranslations("editor.profile");
  const cover = draft.look.bannerUrl;
  return (
    <Section title={t("cover")}>
      <p className="m-0 -mt-2 text-xs leading-snug text-[#77726A]">{t("coverHint")}</p>
      <div className="w-full max-w-[18rem]">
        <CoverPicker hasCover={Boolean(cover)} name={draft.name}>
          {/* eslint-disable-next-line @next/next/no-img-element -- capa enviada pela creator para o bucket */}
          <img src={cover} alt="" className="block aspect-square w-full bg-sand object-cover" />
        </CoverPicker>
      </div>
    </Section>
  );
}

export function ProfilePanel({ draft, update }: PanelProps) {
  const t = useTranslations("editor.profile");
  const set = (patch: Partial<VitrineContent>) => update((d) => ({ ...d, ...patch }));
  return (
    <>
    <CoverField draft={draft} />
    <Section title={t("section")}>
      <Field label={t("headline")} hint={t("headlineHint")} count={[draft.headline.length, 90]}>
        <TextInput value={draft.headline} onChange={(headline) => set({ headline })} maxLength={90} />
      </Field>
      <Field label={t("sub")} count={[draft.sub.length, 240]}>
        <textarea
          value={draft.sub}
          onChange={(e) => set({ sub: e.target.value })}
          maxLength={240}
          rows={3}
          className={`${inputCls} h-auto resize-y py-2.5 leading-snug`}
        />
      </Field>
      <SocialsFields draft={draft} update={update} />
    </Section>
    </>
  );
}

/** Redes sociais: aparecem discretas embaixo do nome na vitrine. Aceita @, usuário ou o link do perfil. */
function SocialsFields({ draft, update }: PanelProps) {
  const t = useTranslations("editor.socials");
  return (
    <div className="flex flex-col gap-3 border-t border-[#F1EEE8] pt-4">
      <span className="flex flex-col gap-0.5">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-[#8F897E] uppercase">{t("title")}</span>
        <span className="text-xs leading-snug text-[#77726A]">{t("hint")}</span>
      </span>
      <div className="grid gap-3 sm:grid-cols-2">
        {SOCIAL_NETWORKS.map((n) => {
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
                aria-invalid={bad || undefined}
              />
            </Field>
          );
        })}
      </div>
    </div>
  );
}
