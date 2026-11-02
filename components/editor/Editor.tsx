"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { publishVitrine, saveDraftAction, signOutAction } from "@/app/actions";
import { Storefront } from "@/components/storefront/Storefront";
import type { VitrineContent } from "@/lib/vitrine/types";
import { couponAlerts, CouponsPanel } from "./CouponsPanel";
import { KitsPanel } from "./KitsPanel";
import { MetricsPanel } from "./MetricsPanel";
import { LookPanel, ProfilePanel, SectionsPanel, type Update } from "./panels";
import { ProductsPanel } from "./ProductsPanel";
import { SharePanel } from "./SharePanel";

const TABS = [
  ["look", "Aparência"],
  ["profile", "Perfil"],
  ["coupons", "Cupons"],
  ["products", "Produtos"],
  ["kits", "Kits"],
  ["sections", "Seções"],
  ["share", "Divulgar"],
  ["metrics", "Métricas"],
] as const;
type TabId = (typeof TABS)[number][0];

function DesktopIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

function MobileIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function Editor({
  published: initialPublished,
  draft: initialDraft,
  today,
  email,
}: {
  published: VitrineContent;
  draft: VitrineContent | null;
  today: string;
  email: string;
}) {
  const [draft, setDraft] = useState(initialDraft ?? initialPublished);
  const [published, setPublished] = useState(initialPublished);
  // O que já está guardado no servidor (rascunho ou, sem rascunho, a versão publicada).
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initialDraft ?? initialPublished));
  const [saveFailed, setSaveFailed] = useState(false);
  const [tab, setTab] = useState<TabId>(draft.coupons.length ? "look" : "coupons");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const draftJson = JSON.stringify(draft);
  const dirty = draftJson !== JSON.stringify(published);
  const unsaved = draftJson !== savedJson;
  const update: Update = (fn) => setDraft((d) => fn(d));

  // Autosave: cada mudança vira rascunho no servidor logo depois que a pessoa para de mexer.
  useEffect(() => {
    if (!unsaved) return;
    const t = setTimeout(async () => {
      const res = await saveDraftAction(dirty ? draft : null);
      setSaveFailed(!res.ok);
      if (res.ok) setSavedJson(draftJson);
    }, 800);
    return () => clearTimeout(t);
  }, [draft, draftJson, dirty, unsaved]);

  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  const publish = () => {
    const snapshot = draft;
    setError(null);
    startSaving(async () => {
      const res = await publishVitrine(snapshot);
      if (res.ok) {
        setPublished(snapshot);
        // publicar apaga o rascunho no servidor
        setSavedJson(JSON.stringify(snapshot));
      }
      else setError(res.error);
    });
  };

  const panelProps = { draft, update };
  const alerts = couponAlerts(draft.coupons, today).length;

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink lg:h-dvh">
      <header className="border-b border-[#E0DCD3] bg-white">
        <div className="flex flex-wrap items-center gap-3.5 px-5 py-3">
          <Link href="/" className="font-display text-[26px] font-extrabold tracking-[-0.04em] text-ink no-underline">
            vitri<span className="text-coral">.</span>
          </Link>
          <span className="h-6 w-px bg-[#E0DCD3]" />
          <span className="text-[15px] font-semibold">Personalizar vitrine</span>
          <div className="flex-1" />
          <div role="group" aria-label="Tamanho da prévia" className="flex gap-0.5 rounded-xl bg-[#F2F0EB] p-[3px] max-sm:hidden">
            {(
              [
                ["desktop", "Computador", <DesktopIcon key="d" />],
                ["mobile", "Celular", <MobileIcon key="m" />],
              ] as const
            ).map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                aria-pressed={device === id}
                onClick={() => setDevice(id)}
                className={`flex min-h-10 items-center gap-1.5 rounded-[9px] border-0 px-3.5 text-[13px] ${
                  device === id ? "bg-white font-bold shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "bg-transparent font-semibold text-[#3A3A3A]"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
          {dirty ? (
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#8A3B12]">
              <span aria-hidden="true" className="size-2 rounded-full bg-[#E8590C]" />
              Não publicado
              <span className={`font-medium ${saveFailed ? "text-[#A3361B]" : "text-[#5E5A52]"}`}>
                · {saveFailed ? "erro ao salvar rascunho" : unsaved ? "salvando…" : "rascunho salvo"}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#1F6B3A]">
              <span aria-hidden="true" className="size-2 rounded-full bg-[#1F9D55]" />
              Publicado
            </span>
          )}
          <button
            type="button"
            onClick={publish}
            disabled={saving || !dirty}
            className="min-h-11 rounded-full border-0 bg-ink px-5 text-sm font-bold text-white"
          >
            {saving ? "Publicando…" : "Publicar"}
          </button>
          <form action={signOutAction}>
            <button
              type="submit"
              title={email ? `Sair de ${email}` : "Sair"}
              onClick={(e) => {
                if (unsaved && !confirm("Ainda estamos salvando suas alterações. Sair mesmo assim?")) e.preventDefault();
              }}
              className="min-h-11 border-0 bg-transparent px-2 text-sm font-semibold text-[#5E5A52] underline-offset-4 hover:underline"
            >
              Sair
            </button>
          </form>
        </div>
        {error && (
          <div role="alert" className="flex items-center gap-3 border-t border-[#F1C9BC] bg-[#FFF1EC] px-5 py-2.5 text-sm font-semibold text-[#A3361B]">
            <span className="flex-1">Não deu para publicar: {error}</span>
            <button type="button" onClick={() => setError(null)} className="border-0 bg-transparent text-sm font-bold text-[#A3361B] underline">
              Fechar
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1 flex-wrap items-stretch lg:min-h-0 lg:flex-nowrap">
        <aside className="flex max-w-full min-w-0 flex-[1_1_400px] flex-col border-r border-[#E0DCD3] bg-white lg:max-w-[440px] lg:overflow-y-auto">
          <div role="tablist" aria-label="Opções" className="sticky top-0 z-10 grid grid-cols-4 border-b border-[#E0DCD3] bg-white">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`min-h-12 border-0 border-b-[3px] bg-white text-[13px] ${
                  tab === id ? "border-ink font-bold text-ink" : "border-transparent font-semibold text-[#5E5A52]"
                }`}
              >
                {label}
                {id === "coupons" && alerts > 0 && (
                  <span
                    aria-label={`${alerts} ${alerts === 1 ? "cupom vencendo" : "cupons vencendo"}`}
                    className="ml-1.5 inline-flex size-[18px] items-center justify-center rounded-full bg-[#E8590C] align-[1px] text-[11px] font-bold text-white"
                  >
                    {alerts}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="flex flex-col gap-[26px] p-5">
            {tab === "look" && <LookPanel {...panelProps} />}
            {tab === "profile" && <ProfilePanel {...panelProps} />}
            {tab === "coupons" && <CouponsPanel {...panelProps} today={today} />}
            {tab === "products" && <ProductsPanel {...panelProps} today={today} />}
            {tab === "kits" && <KitsPanel {...panelProps} />}
            {tab === "sections" && <SectionsPanel {...panelProps} />}
            {tab === "share" && <SharePanel {...panelProps} publishedHandle={published.handle} />}
            {tab === "metrics" && <MetricsPanel draft={draft} today={today} />}
          </div>
        </aside>

        <main className="box-border flex min-w-0 flex-[999_1_560px] flex-col items-center p-6 max-sm:p-3 lg:overflow-y-auto">
          {/* flex-none: a prévia cresce com a vitrine e quem rola é o <main> (sem isso ela encolhia e cortava) */}
          <div
            className="w-full flex-none overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_20px_50px_rgba(17,17,17,0.12)] transition-[max-width] duration-300"
            style={{ maxWidth: device === "mobile" ? 400 : 1100 }}
          >
            <div className="flex items-center justify-center border-b border-[#E8E5DF] bg-[#F7F6F3] px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 rounded-full border border-[#E8E5DF] bg-white px-3.5 py-1.5 text-xs text-[#3A3A3A]">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                vitri.me/{draft.handle}
              </span>
            </div>
            {/* A prévia é interativa, mas links não podem tirar a pessoa do editor. */}
            <div
              onClickCapture={(e) => {
                const a = (e.target as HTMLElement).closest("a");
                if (a && !a.getAttribute("href")?.startsWith("#")) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              <Storefront content={draft} today={today} preview />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
