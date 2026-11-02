"use client";

import { ACCENTS, FONTS, RADII, SECTIONS, THEMES, themeOf } from "@/lib/vitrine/look";
import type { VitrineContent } from "@/lib/vitrine/types";
import { Field, H, Hint, Segmented, Switch, TextInput, inputCls } from "./ui";

export type Update = (fn: (d: VitrineContent) => VitrineContent) => void;
type PanelProps = { draft: VitrineContent; update: Update };

const ring = (on: boolean) => (on ? "border-ink" : "border-[#E2DED6]");

export function LookPanel({ draft, update }: PanelProps) {
  const look = draft.look;
  const setLook = (patch: Partial<VitrineContent["look"]>) => update((d) => ({ ...d, look: { ...d.look, ...patch } }));
  const customAccent = !ACCENTS.some(([c]) => c === look.accent);

  return (
    <div className="flex flex-col gap-[26px]">
      <div className="flex flex-col gap-2.5">
        <H>Tema</H>
        <div className="grid grid-cols-2 gap-2.5">
          {Object.entries(THEMES).map(([id, t]) => (
            <button
              key={id}
              type="button"
              aria-pressed={id === look.theme}
              onClick={() => setLook({ theme: id as VitrineContent["look"]["theme"] })}
              className={`flex flex-col items-stretch gap-1.5 rounded-[14px] border-2 bg-white p-1.5 ${ring(id === look.theme)}`}
            >
              <span aria-hidden="true" className="box-border flex h-[58px] items-end gap-1 rounded-[9px] border border-[#E8E5DF] p-1.5" style={{ background: t.bg }}>
                {[70, 92, 55].map((h, i) => (
                  <span key={i} className="flex-1 rounded-[5px]" style={{ height: `${h}%`, background: t.tiles[i] }} />
                ))}
              </span>
              <span className="px-0.5 pb-0.5 text-left text-[13px] font-semibold">{t.label}</span>
            </button>
          ))}
          {/* Tema com o fundo escolhido pela creator; texto e blocos se ajustam sozinhos. */}
          <div className={`relative flex flex-col items-stretch gap-1.5 rounded-[14px] border-2 bg-white p-1.5 ${ring(look.theme === "personalizado")}`}>
            <button
              type="button"
              aria-pressed={look.theme === "personalizado"}
              onClick={() => setLook({ theme: "personalizado" })}
              className="flex flex-col items-stretch gap-1.5 border-0 bg-transparent p-0"
            >
              <span
                aria-hidden="true"
                className="box-border flex h-[58px] items-end gap-1 rounded-[9px] border border-[#E8E5DF] p-1.5"
                style={{ background: look.bg }}
              >
                {[70, 92, 55].map((h, i) => (
                  <span key={i} className="flex-1 rounded-[5px]" style={{ height: `${h}%`, background: themeOf({ ...look, theme: "personalizado" }).tiles[i] }} />
                ))}
              </span>
              <span className="px-0.5 pb-0.5 text-left text-[13px] font-semibold">Sua cor</span>
            </button>
            <label className="absolute right-2.5 bottom-1.5 flex min-h-7 cursor-pointer items-center gap-1 text-xs font-semibold text-[#5E5A52] underline underline-offset-2">
              Fundo
              <input
                type="color"
                aria-label="Cor de fundo do tema"
                value={look.bg}
                onChange={(e) => setLook({ theme: "personalizado", bg: e.target.value.toUpperCase() })}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
      </div>

      <Field label="Foto de capa (link da imagem, opcional)" hint="Uma imagem larga, tipo banner. Aparece no topo da vitrine.">
        <TextInput value={look.bannerUrl} onChange={(bannerUrl) => setLook({ bannerUrl })} placeholder="https://…" inputMode="url" />
      </Field>

      <div className="flex flex-col gap-2.5">
        <H>Cor de destaque</H>
        <div className="flex flex-wrap gap-1.5">
          {ACCENTS.map(([color, label]) => (
            <button
              key={color}
              type="button"
              aria-label={`Cor ${label}`}
              aria-pressed={color === look.accent}
              onClick={() => setLook({ accent: color })}
              className={`box-border size-[46px] rounded-full border-[3px] bg-white p-[3px] ${color === look.accent ? "border-ink" : "border-transparent"}`}
            >
              <span aria-hidden="true" className="block size-full rounded-full" style={{ background: color }} />
            </button>
          ))}
          <label
            title="Escolher outra cor"
            className={`relative box-border flex size-[46px] cursor-pointer items-center justify-center rounded-full border-[3px] bg-white p-[3px] ${customAccent ? "border-ink" : "border-transparent"}`}
          >
            <span
              aria-hidden="true"
              className="block size-full rounded-full"
              style={{ background: customAccent ? look.accent : "conic-gradient(#FF5A36, #FFD84D, #7BD389, #7AA7FF, #C7B5FF, #FF5A36)" }}
            />
            <input
              type="color"
              aria-label="Outra cor"
              value={look.accent}
              onChange={(e) => setLook({ accent: e.target.value.toUpperCase() })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <H>Fonte dos títulos</H>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(FONTS).map(([id, f]) => (
            <button
              key={id}
              type="button"
              aria-pressed={id === look.font}
              onClick={() => setLook({ font: id as VitrineContent["look"]["font"] })}
              className={`flex min-h-[76px] flex-col items-start justify-center gap-1 rounded-[14px] border-2 bg-white px-3 py-2 ${ring(id === look.font)}`}
            >
              <span aria-hidden="true" className="text-[26px] leading-none font-extrabold tracking-[-0.02em]" style={{ fontFamily: f.family }}>
                Aa
              </span>
              <span className="text-xs font-semibold">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <H>Destaque do topo</H>
        <Segmented
          label="Destaque do topo"
          options={[
            ["produtos", "Produtos"],
            ["cupons", "Cupons"],
          ]}
          value={look.hero}
          onChange={(hero) => setLook({ hero })}
        />
        <Hint>O que aparece ao lado da sua frase. Se faltar produto ou cupom, mostramos o outro.</Hint>
      </div>

      <div className="flex flex-col gap-2.5">
        <H>Cantos dos cards</H>
        <Segmented
          label="Cantos dos cards"
          options={Object.entries(RADII).map(([id, r]) => [id as VitrineContent["look"]["radius"], r.label])}
          value={look.radius}
          onChange={(radius) => setLook({ radius })}
        />
      </div>
    </div>
  );
}

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
      <Field label="Frase de destaque" hint="Coloque um trecho entre *asteriscos* para destacá-lo com sua cor.">
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

export function SectionsPanel({ draft, update }: PanelProps) {
  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col">
        <h2 className="m-0 mb-1.5 text-sm font-bold">Mostrar na vitrine</h2>
        {SECTIONS.map(([id, label, hint]) => {
          const on = draft.show[id] !== false;
          return (
            <div key={id} className="flex items-center gap-3 border-b border-[#EEEBE5] py-1.5">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold">{label}</span>
                <Hint>{hint}</Hint>
              </div>
              <Switch on={on} label={`Mostrar ${label}`} onToggle={() => update((d) => ({ ...d, show: { ...d.show, [id]: !on } }))} />
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-2.5">
        <H>Exibição dos produtos</H>
        <Segmented
          label="Exibição dos produtos"
          options={[
            ["grade", "Grade"],
            ["lista", "Lista"],
          ]}
          value={draft.look.layout}
          onChange={(layout) => update((d) => ({ ...d, look: { ...d.look, layout } }))}
        />
      </div>
    </div>
  );
}
