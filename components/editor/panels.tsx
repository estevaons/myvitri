"use client";

import type { VitrineContent } from "@/lib/vitrine/types";
import { Field, Section, TextInput, inputCls } from "./ui";

export type Update = (fn: (d: VitrineContent) => VitrineContent) => void;
type PanelProps = { draft: VitrineContent; update: Update };

export function ProfilePanel({ draft, update }: PanelProps) {
  const set = (patch: Partial<VitrineContent>) => update((d) => ({ ...d, ...patch }));
  return (
    <Section title="Textos">
      <Field label="Frase de destaque" hint="Aparece em letras grandes, logo abaixo da capa." count={[draft.headline.length, 90]}>
        <TextInput value={draft.headline} onChange={(headline) => set({ headline })} maxLength={90} />
      </Field>
      <Field label="Texto de apoio" count={[draft.sub.length, 240]}>
        <textarea
          value={draft.sub}
          onChange={(e) => set({ sub: e.target.value })}
          maxLength={240}
          rows={3}
          className={`${inputCls} h-auto resize-y py-2.5 leading-snug`}
        />
      </Field>
    </Section>
  );
}
