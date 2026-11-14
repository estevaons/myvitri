"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Link, vitrineHref } from "@/lib/i18n/navigation";
import { ProductArt } from "@/components/storefront/ProductIcon";
import type { SearchResults } from "@/lib/vitrine/data";
import { couponOff } from "@/lib/vitrine/pricing";
import { kicker } from "./chrome";
import { Avatar } from "./CreatorCard";

// o banco só busca a partir de 2 letras
const MIN = 2;
const WAIT = 250;

type State = { q: string } & ({ status: "ok"; results: SearchResults } | { status: "error" });

// as colunas acompanham quantos grupos vieram: nada de coluna vazia espremendo os nomes
const COLS = ["", "md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3"];

const groupTitle = `${kicker} text-[11px] text-mute`;
const row = "flex min-w-0 items-center gap-3 py-2.5 text-ink no-underline hover:text-gold";

/**
 * Busca de creators, marcas e produtos enquanto a pessoa digita (via /api/busca). Fica na barra presa no topo, junto
 * das abas: os resultados abrem num painel por cima do conteúdo, que fecha com um clique fora (volta ao focar o campo);
 * Esc limpa. Cada resultado leva à vitrine de quem indica.
 */
export function HomeSearch() {
  const t = useTranslations("search");
  const tCount = useTranslations("counts");
  const [q, setQ] = useState("");
  const [state, setState] = useState<State | null>(null);
  const [open, setOpen] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inFlight = useRef<AbortController>(undefined);
  const id = useId();
  const term = q.trim();
  // o "@" do começo não conta para o mínimo: a API o tira antes de buscar, e "@b" sozinho voltaria vazio
  const active = term.replace(/^@+/, "").trim().length >= MIN;

  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    inFlight.current?.abort();
    if (!active) return;
    timer.current = setTimeout(async () => {
      const ctrl = new AbortController();
      inFlight.current = ctrl;
      try {
        const res = await fetch(`/api/busca?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        setState({ q: term, status: "ok", results: (await res.json()) as SearchResults });
      } catch {
        // abortada porque a pessoa continuou digitando: a próxima resposta assume
        if (!ctrl.signal.aborted) setState({ q: term, status: "error" });
      }
    }, WAIT);
    return () => clearTimeout(timer.current);
  }, [term, active]);

  useEffect(() => () => inFlight.current?.abort(), []);

  // resposta de um termo anterior continua na tela até a do atual chegar, para a lista não piscar
  const shown = active ? state : null;
  const loading = active && state?.q !== term;
  const r = shown?.status === "ok" ? shown.results : null;
  const groups = r ? [r.creators, r.brands, r.products].filter((g) => g.length > 0).length : 0;
  const empty = r && groups === 0;
  const status = loading && !shown ? t("searching") : shown?.status === "error" ? t("error") : empty ? t("empty", { q: shown?.q ?? "" }) : "";

  return (
    <div ref={root} className="relative">
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        {/* o placeholder já diz o que dá para buscar: o rótulo fica só para leitor de tela */}
        <label htmlFor={id} className="sr-only">
          {t("label")}
        </label>
        <div className="flex min-h-12 items-center gap-3 border border-sand bg-cream px-4 focus-within:border-ink">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px] flex-none text-mute" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id={id}
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => e.key === "Escape" && setQ("")}
            placeholder={t("placeholder")}
            autoComplete="off"
            enterKeyHint="search"
            spellCheck={false}
            maxLength={60}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 [&::-webkit-search-cancel-button]:appearance-none text-base text-ink outline-none placeholder:text-mute"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className={`${kicker} min-h-11 flex-none border-0 bg-transparent p-0 text-[11px] text-mute hover:text-ink`}>
              {t("clear")}
            </button>
          )}
        </div>
      </form>

      {/* o painel abre por cima da página: a barra é presa no topo e não pode crescer */}
      <div className={`absolute inset-x-0 top-full z-30 mt-2 max-h-[min(70dvh,36rem)] overflow-y-auto bg-white shadow-[0_16px_40px_rgba(17,17,17,0.12)] ${open && (status || (r && !empty)) ? "" : "hidden"}`}>
        <p aria-live="polite" className={`m-0 text-[15px] text-mute ${status ? "border border-sand p-5" : "sr-only"}`}>
          {status}
        </p>

      {r && !empty && (
        <div className={`grid gap-8 border border-sand p-5 md:p-6 ${COLS[groups]} ${loading ? "opacity-60" : ""}`}>
          {r.creators.length > 0 && (
            <section aria-label={t("vitrines")} className="flex min-w-0 flex-col">
              <h2 className={`m-0 mb-1 ${groupTitle}`}>{t("vitrines")}</h2>
              {r.creators.map((c) => (
                <Link key={c.handle} href={vitrineHref(c.handle)} className={row}>
                  <Avatar name={c.name} url={c.avatarUrl} className="box-border size-10 flex-none rounded-full border border-sand text-xs" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-medium">{c.name}</span>
                    <span className="truncate text-[13px] text-mute">@{c.handle}</span>
                  </span>
                </Link>
              ))}
            </section>
          )}
          {r.brands.length > 0 && (
            <section aria-label={t("brands")} className="flex min-w-0 flex-col">
              <h2 className={`m-0 mb-1 ${groupTitle}`}>{t("brands")}</h2>
              {r.brands.map((b) => (
                <Link key={b.brand} href={vitrineHref(b.handle, "cupons")} className={row}>
                  {b.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária
                    <img src={b.logoUrl} alt="" loading="lazy" className="size-10 flex-none rounded-full border border-sand bg-white object-contain" />
                  ) : (
                    <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-full bg-cream text-xs font-semibold">
                      {b.brand.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-medium">{b.brand}</span>
                    <span className="truncate text-[13px] text-mute">
                      {/* a busca só traz marcas pelos cupons: `best` sempre vem */}
                      {t("brandLine", { off: b.best ? couponOff(b.best) : "", where: b.creators > 1 ? tCount("inVitrines", { count: b.creators }) : tCount("with", { name: b.creator }) })}
                    </span>
                  </span>
                </Link>
              ))}
            </section>
          )}
          {r.products.length > 0 && (
            <section aria-label={t("products")} className="flex min-w-0 flex-col">
              <h2 className={`m-0 mb-1 ${groupTitle}`}>{t("products")}</h2>
              {r.products.map((p) => (
                <Link key={`${p.handle}:${p.id}`} href={vitrineHref(p.handle, "produtos")} className={row}>
                  <span aria-hidden="true" className="relative flex size-12 flex-none items-center justify-center overflow-hidden bg-cream">
                    <ProductArt product={p} iconClassName="w-[60%]" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-medium">{p.name}</span>
                    <span className="truncate text-[13px] text-mute">{tCount("by", { name: p.creator })}</span>
                  </span>
                </Link>
              ))}
            </section>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
