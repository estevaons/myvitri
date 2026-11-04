"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { publishVitrine, saveDraftAction, signOutAction } from "@/app/actions";
import { Wordmark } from "@/components/brand/Logo";
import { HOST } from "@/lib/brand";
import { Storefront } from "@/components/storefront/Storefront";
import type { VitrineContent } from "@/lib/vitrine/types";
import { couponAlerts, CouponsPanel } from "./CouponsPanel";
import { DeleteAccount } from "./DeleteAccount";
import { KitsPanel } from "./KitsPanel";
import { ProfilePanel, type Update } from "./panels";
import { ProductsPanel } from "./ProductsPanel";
import { SharePanel } from "./SharePanel";

/** [id, rótulo, nome na URL (?aba=…)] */
const TABS = [
  ["profile", "Perfil", "perfil"],
  ["coupons", "Cupons", "cupons"],
  ["products", "Produtos", "produtos"],
  ["kits", "Kits", "kits"],
  ["share", "Divulgar", "divulgar"],
] as const;
type TabId = (typeof TABS)[number][0];

/** Ícones das abas: traços do Lucide (lucide.dev, licença ISC). */
const TAB_ICONS: Record<TabId, ReactNode> = {
  profile: (
    <>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </>
  ),
  coupons: (
    <>
      <path d="M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M9 9h.01M15 15h.01M15 9l-6 6" />
    </>
  ),
  products: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  kits: (
    <>
      <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
      <path d="M12 22V12M3.3 7l7.7 4.73a2 2 0 0 0 2 0L20.7 7M7.5 4.27l9 5.15" />
    </>
  ),
  share: (
    <>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>
  ),
};

/** Gráfico de barras do Lucide, o mesmo da antiga aba Métricas. */
function ChartIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v16a2 2 0 0 0 2 2h16M18 17V9M13 17V5M8 17v-3" />
    </svg>
  );
}

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
  initialTab,
}: {
  published: VitrineContent;
  draft: VitrineContent | null;
  today: string;
  email: string;
  /** valor de ?aba= na URL, para voltar à mesma aba ao recarregar */
  initialTab?: string;
}) {
  const [draft, setDraft] = useState(initialDraft ?? initialPublished);
  const [published, setPublished] = useState(initialPublished);
  // O que já está guardado no servidor (rascunho ou, sem rascunho, a versão publicada).
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initialDraft ?? initialPublished));
  const [saveFailed, setSaveFailed] = useState(false);
  const [tab, setTab] = useState<TabId>(() => TABS.find(([, , slug]) => slug === initialTab)?.[0] ?? (draft.coupons.length ? "profile" : "coupons"));
  const openTab = (id: TabId, slug: string) => {
    setTab(id);
    const url = new URL(window.location.href);
    url.searchParams.set("aba", slug);
    window.history.replaceState(null, "", url);
  };
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
          <Link href="/" aria-label="MyVitri — início" className="flex text-ink no-underline">
            <Wordmark label="" className="h-[17px] w-auto" />
          </Link>
          <span className="h-6 w-px bg-[#E0DCD3]" />
          <span className="text-[15px] font-semibold">Editar vitrine</span>
          <div className="flex-1" />
          {/* as métricas ganharam página própria, no visual da home */}
          <Link
            href="/metricas"
            onClick={(e) => {
              // a navegação é no cliente: sem isso, o rascunho que ainda não foi salvo se perderia sem aviso
              if (unsaved && !confirm("Ainda estamos salvando suas alterações. Sair mesmo assim?")) e.preventDefault();
            }}
            className="flex min-h-10 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-semibold text-[#3A3A3A] no-underline hover:bg-[#F2F0EB] hover:text-ink"
          >
            <ChartIcon />
            Métricas
          </Link>
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
        <aside className="flex max-w-full min-w-0 flex-[1_1_400px] flex-col border-r border-[#EEEBE5] bg-white lg:max-w-[440px] lg:overflow-y-auto">
          <div
            role="tablist"
            aria-label="Opções"
            className="sticky top-0 z-10 grid grid-cols-5 gap-1 border-b border-[#EEEBE5] bg-white/95 px-3 py-2.5 backdrop-blur"
          >
            {TABS.map(([id, label, slug]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => openTab(id, slug)}
                className={`relative flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-[10px] border-0 px-0.5 text-[11.5px] transition-colors ${
                  tab === id ? "bg-[#F4F2EE] font-semibold text-ink" : "bg-transparent font-medium text-[#8F897E] hover:bg-[#FAF9F7] hover:text-ink"
                }`}
              >
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tab === id ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
                  {TAB_ICONS[id]}
                </svg>
                <span className="max-w-full truncate">{label}</span>
                {id === "coupons" && alerts > 0 && (
                  <span
                    aria-label={`${alerts} ${alerts === 1 ? "cupom vencendo" : "cupons vencendo"}`}
                    className="absolute top-0.5 right-[calc(50%-24px)] inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E8590C] px-1 text-[10px] font-bold text-white ring-2 ring-white"
                  >
                    {alerts}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="flex flex-col gap-8 px-5 pt-6 pb-10">
            {tab === "profile" && (
              <>
                <ProfilePanel {...panelProps} />
                <DeleteAccount handle={published.handle} />
              </>
            )}
            {tab === "coupons" && <CouponsPanel {...panelProps} today={today} />}
            {tab === "products" && <ProductsPanel {...panelProps} />}
            {tab === "kits" && <KitsPanel {...panelProps} />}
            {tab === "share" && <SharePanel {...panelProps} publishedHandle={published.handle} publishedJson={JSON.stringify(published)} />}
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
                {HOST}/{draft.handle}
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
