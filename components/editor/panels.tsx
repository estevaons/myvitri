"use client";

import { HOST } from "@/lib/brand";
import type { VitrineContent } from "@/lib/vitrine/types";
import { ImageField } from "./ImageField";
import { Field, Section, TextInput, boxCls, inputCls, labelCls } from "./ui";

export type Update = (fn: (d: VitrineContent) => VitrineContent) => void;
type PanelProps = { draft: VitrineContent; update: Update };

export function ProfilePanel({ draft, update }: PanelProps) {
  const set = (patch: Partial<VitrineContent>) => update((d) => ({ ...d, ...patch }));
  // mesmas iniciais que a vitrine mostra sem foto
  const initials = draft.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex flex-col gap-8">
      <Section title="Sobre você">
        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>Foto de perfil</span>
          <ImageField
            kind="avatar"
            value={draft.avatarUrl}
            onChange={(avatarUrl) => set({ avatarUrl })}
            initials={initials}
            hint="Uma foto quadrada sua. Sem foto, mostramos suas iniciais."
          />
        </div>
        <Field label="Nome">
          <TextInput value={draft.name} onChange={(name) => set({ name })} maxLength={60} />
        </Field>
        <Field label="Seu link" hint="O endereço da sua vitrine.">
          <div className={`flex items-center pl-3 ${boxCls}`}>
            <span className="text-[15px] font-normal text-[#8F897E]">{HOST}/</span>
            <input
              value={draft.handle}
              onChange={(e) => set({ handle: e.target.value.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_.]/g, "") })}
              maxLength={30}
              className="h-[42px] min-w-0 flex-1 border-0 bg-transparent pr-3 text-[15px] font-normal outline-none"
            />
          </div>
        </Field>
      </Section>

      <Section title="Foto de capa (opcional)">
        <ImageField
          kind="cover"
          value={draft.look.bannerUrl}
          onChange={(bannerUrl) => update((d) => ({ ...d, look: { ...d.look, bannerUrl } }))}
          hint="Uma foto horizontal grande, tipo campanha. Sem capa, mostramos seus primeiros produtos."
        />
      </Section>

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
    </div>
  );
}
