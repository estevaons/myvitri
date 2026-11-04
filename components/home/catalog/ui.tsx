import Link from "next/link";
import type { ReactNode } from "react";
import { kicker, pad, pillLight } from "../chrome";
import { hrefWith, PAGE, TABS, type TabId, type TabParams } from "./params";

/**
 * Peças comuns das abas do /inicio. Tudo é link que muda a URL (sem estado no cliente): o servidor
 * monta a aba de novo com os filtros. `scroll={false}` mantém a pessoa onde estava.
 */

/** As abas, presas no topo ao rolar. Trocar de aba limpa os filtros da aba anterior. */
export function TabNav({ current }: { current: TabId }) {
  return (
    <nav aria-label="Abas da home" className="sticky top-0 z-20 border-b border-sand bg-white/95 backdrop-blur-sm">
      <div className={`no-scrollbar mx-auto flex max-w-[1440px] gap-7 overflow-x-auto md:gap-10 ${pad}`}>
        {TABS.map(([id, label]) => (
          <Link
            key={id}
            href={hrefWith({}, { aba: id })}
            scroll={false}
            aria-current={id === current ? "page" : undefined}
            className={`${kicker} -mb-px flex min-h-13 flex-none items-center border-b whitespace-nowrap no-underline ${id === current ? "border-ink text-ink" : "border-transparent text-mute hover:text-ink"}`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

const chip = "flex min-h-9 flex-none items-center gap-1.5 border px-3.5 text-[13px] whitespace-nowrap no-underline";
const chipOn = `${chip} border-ink bg-ink text-white`;
const chipOff = `${chip} border-sand text-ink hover:border-ink`;

/**
 * Um filtro de valor único (`?param=valor`): os chips das opções; clicar no ativo tira o filtro.
 * Com menos de duas opções não aparece, para não mostrar filtro que não filtra nada.
 */
export function FilterChips({ label, param, options, params }: { label: string; param: string; options: [value: string, label: string][]; params: TabParams }) {
  if (options.length < 2) return null;
  const active = params[param];
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span className={`${kicker} flex-none text-[11px] text-mute max-md:hidden`}>{label}</span>
      {options.map(([value, text]) => {
        const on = value === active;
        return (
          <Link key={value} href={hrefWith(params, { [param]: on ? null : value })} scroll={false} aria-pressed={on} className={on ? chipOn : chipOff}>
            {text}
            {on && <span aria-hidden="true">×</span>}
          </Link>
        );
      })}
    </div>
  );
}

/** Filtro liga/desliga (`?param=1`). */
export function ToggleChip({ label, param, params }: { label: string; param: string; params: TabParams }) {
  const on = params[param] === "1";
  return (
    <Link href={hrefWith(params, { [param]: on ? null : "1" })} scroll={false} aria-pressed={on} className={on ? chipOn : chipOff}>
      {label}
      {on && <span aria-hidden="true">×</span>}
    </Link>
  );
}

/** Ordenação como links em linha; a primeira opção é a padrão (não vai para a URL). */
export function SortLinks({ options, params, param = "ordem" }: { options: [value: string, label: string][]; params: TabParams; param?: string }) {
  const active = params[param] ?? options[0]?.[0];
  return (
    <div role="group" aria-label="Ordenar" className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className={`${kicker} text-[11px] text-mute`}>Ordenar</span>
      {options.map(([value, text], i) => (
        <Link
          key={value}
          href={hrefWith(params, { [param]: i === 0 ? null : value })}
          scroll={false}
          aria-current={value === active ? "true" : undefined}
          className={`text-[14px] no-underline ${value === active ? "text-ink underline underline-offset-4" : "text-mute hover:text-ink"}`}
        >
          {text}
        </Link>
      ))}
    </div>
  );
}

/**
 * Moldura de uma aba de catálogo: título, filtros (rolam de lado no celular), ordenação,
 * contador e a grade. `filters` e `sort` são opcionais.
 */
export function CatalogFrame({
  title,
  text,
  filters,
  sort,
  count,
  children,
}: {
  title: string;
  text: string;
  filters?: ReactNode;
  sort?: ReactNode;
  count: string;
  children: ReactNode;
}) {
  return (
    <section className={`mx-auto flex max-w-[1440px] flex-col gap-8 pt-14 md:pt-20 ${pad}`}>
      <div className="flex flex-col gap-3">
        <h2 className="m-0 font-display text-[clamp(36px,4.4vw,60px)] leading-[1] font-normal">{title}</h2>
        <p className="m-0 max-w-[36rem] text-[16px] leading-relaxed text-mute">{text}</p>
      </div>
      {(filters || sort) && (
        <div className="flex flex-col gap-4 border-y border-sand py-4">
          {filters && <div className="no-scrollbar -mx-5 flex gap-x-6 gap-y-3 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">{filters}</div>}
          {sort}
        </div>
      )}
      <p aria-live="polite" className="m-0 text-[14px] text-mute">
        {count}
      </p>
      {children}
    </section>
  );
}

/** Grade padrão das abas: 2 colunas no celular, 4 no computador. */
export const catalogGrid = "grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-4 md:gap-y-12 lg:grid-cols-4";

/** "Ver mais": mais uma página de itens, mantendo filtros e ordem. */
export function LoadMore({ params, shown, total }: { params: TabParams; shown: number; total: number }) {
  if (shown >= total) return null;
  return (
    <div className="flex justify-center pt-4">
      <Link href={hrefWith(params, { limite: String(shown + PAGE) })} scroll={false} className={pillLight}>
        Ver mais
      </Link>
    </div>
  );
}

/** Nada com esses filtros: convite para limpar, não um pedido de desculpas. */
export function CatalogEmpty({ title, text, clearHref }: { title: string; text: string; clearHref?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 bg-cream px-6 py-16 text-center">
      <span className="font-display text-[clamp(28px,3vw,40px)] leading-[1.1]">{title}</span>
      <p className="m-0 max-w-[28rem] text-[15px] leading-relaxed text-mute">{text}</p>
      {clearHref && (
        <Link href={clearHref} scroll={false} className={pillLight}>
          Limpar filtros
        </Link>
      )}
    </div>
  );
}

/** Contador com plural: "1 produto", "24 produtos". */
export const countLabel = (n: number, one: string, many: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;
