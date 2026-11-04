"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ProductArt } from "@/components/storefront/ProductIcon";
import type { SearchResults } from "@/lib/vitrine/data";
import { couponBadge, couponOff, formatBRL } from "@/lib/vitrine/pricing";
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
 * Busca de creators, marcas e produtos enquanto a pessoa digita (via /api/busca). Os resultados abrem
 * logo abaixo do campo, empurrando a página; Esc limpa. Cada resultado leva à vitrine de quem indica.
 */
export function HomeSearch() {
  const [q, setQ] = useState("");
  const [state, setState] = useState<State | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inFlight = useRef<AbortController>(undefined);
  const id = useId();
  const term = q.trim();
  const active = term.length >= MIN;

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

  return (
    <div className="flex flex-col gap-4">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-2">
        <label htmlFor={id} className={`${kicker} text-[11px] text-mute`}>
          Buscar creators, marcas e produtos
        </label>
        {/* o campo herda a fonte (globals.css): a serifa vem daqui */}
        <div className="flex items-center gap-3 border-b border-ink pb-2 font-display">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 flex-none" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id={id}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQ("")}
            placeholder="Nike, protetor solar, @marina"
            autoComplete="off"
            enterKeyHint="search"
            spellCheck={false}
            maxLength={60}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 [&::-webkit-search-cancel-button]:appearance-none text-[clamp(24px,2.6vw,34px)] text-ink outline-none placeholder:text-mute/60"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className={`${kicker} flex-none border-0 bg-transparent p-0 text-[11px] text-mute hover:text-ink`}>
              {/* o botão herda a serifa do campo (globals.css): o rótulo volta para a fonte do texto */}
              <span className="font-sans">Limpar</span>
            </button>
          )}
        </div>
      </form>

      <div aria-live="polite" className="contents">
        {loading && !shown && <p className="m-0 text-[15px] text-mute">Buscando…</p>}
        {shown?.status === "error" && <p className="m-0 text-[15px] text-mute">Não deu para buscar agora. Tente de novo em instantes.</p>}
        {empty && (
          <p className="m-0 text-[15px] text-mute">
            Nada encontrado para “{shown?.q}”. Tente o nome da marca, do produto ou de quem indica.
          </p>
        )}
      </div>

      {r && !empty && (
        <div className={`grid gap-8 border border-sand p-5 md:p-6 ${COLS[groups]} ${loading ? "opacity-60" : ""}`}>
          {r.creators.length > 0 && (
            <section aria-label="Creators" className="flex min-w-0 flex-col">
              <h2 className={`m-0 mb-1 ${groupTitle}`}>Creators</h2>
              {r.creators.map((c) => (
                <Link key={c.handle} href={`/${c.handle}`} className={row}>
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
            <section aria-label="Marcas" className="flex min-w-0 flex-col">
              <h2 className={`m-0 mb-1 ${groupTitle}`}>Marcas</h2>
              {r.brands.map((b) => (
                <Link key={b.brand} href={`/${b.handle}#cupons`} className={row}>
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
                      Até {couponOff(b.best)} · {b.creators > 1 ? `em ${b.creators} vitrines` : `com ${b.creator}`}
                    </span>
                  </span>
                </Link>
              ))}
            </section>
          )}
          {r.products.length > 0 && (
            <section aria-label="Produtos" className="flex min-w-0 flex-col">
              <h2 className={`m-0 mb-1 ${groupTitle}`}>Produtos</h2>
              {r.products.map((p) => (
                <Link key={`${p.handle}:${p.id}`} href={`/${p.handle}#produtos`} className={row}>
                  <span aria-hidden="true" className="relative flex size-12 flex-none items-center justify-center overflow-hidden bg-cream">
                    <ProductArt product={p} iconClassName="w-[60%]" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-medium">{p.name}</span>
                    <span className="truncate text-[13px] text-mute">
                      {p.price > 0 && <>{formatBRL(p.final)}{p.coupon && ` (${couponBadge(p.coupon)})`} · </>}
                      por {p.creator}
                    </span>
                  </span>
                </Link>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
