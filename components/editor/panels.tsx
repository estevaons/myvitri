"use client";

import type { VitrineContent } from "@/lib/vitrine/types";
import { Field, TextInput, inputCls } from "./ui";

export type Update = (fn: (d: VitrineContent) => VitrineContent) => void;
type PanelProps = { draft: VitrineContent; update: Update };

export function ProfilePanel({ draft, update }: PanelProps) {
  const set = (patch: Partial<VitrineContent>) => update((d) => ({ ...d, ...patch }));
  return (
    <div className="flex flex-col gap-4">
      <Field label="Nome">
        <TextInput value={draft.name} onChange={(name) => set({ name })} maxLength={60} />
      </Field>
      <Field label="Seu link" hint="O endereço da sua vitrine.">
        <div className="flex items-center rounded-xl border-[1.5px] border-[#D6D0C5] bg-white pl-3 focus-within:border-ink">
          <span className="text-[15px] text-[#5E5A52]">vitri.me/</span>
          <input
            value={draft.handle}
            onChange={(e) => set({ handle: e.target.value.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_.]/g, "") })}
            maxLength={30}
            className="h-[43px] min-w-0 flex-1 border-0 bg-transparent pr-3 text-[15px] outline-none"
          />
        </div>
      </Field>
      <Field label="Foto (link da imagem)" hint="Cole o link de uma imagem quadrada. Sem foto, mostramos suas iniciais.">
        <TextInput value={draft.avatarUrl} onChange={(avatarUrl) => set({ avatarUrl })} placeholder="https://…" inputMode="url" />
      </Field>
      <Field label="Foto de capa (link da imagem, opcional)" hint="Uma foto horizontal grande, tipo campanha. Sem capa, mostramos seus primeiros produtos.">
        <TextInput
          value={draft.look.bannerUrl}
          onChange={(bannerUrl) => update((d) => ({ ...d, look: { ...d.look, bannerUrl } }))}
          placeholder="https://…"
          inputMode="url"
        />
      </Field>
      <Field label="Frase de destaque" hint="Aparece em letras grandes, logo abaixo da capa.">
        <TextInput value={draft.headline} onChange={(headline) => set({ headline })} maxLength={90} />
      </Field>
      <Field label="Texto de apoio">
        <textarea
          value={draft.sub}
          onChange={(e) => set({ sub: e.target.value })}
          maxLength={240}
          rows={3}
          className={`${inputCls} h-auto resize-y py-2.5 leading-snug`}
        />
      </Field>
    </div>
  );
}
