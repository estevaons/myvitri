import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link, type Href } from "@/lib/i18n/navigation";
import { kicker, pad, pillLight } from "../chrome";
import { FilterMenu } from "./FilterMenu";
import { hrefWith, PAGE, TABS, type TabId, type TabParams } from "./params";

/**
 * Peças comuns das abas do /inicio. Tudo é link que muda a URL (no cliente, só o abrir e fechar dos
 * menus): o servidor monta a aba de novo com os filtros. `scroll={false}` mantém a pessoa onde estava.
 */

/**
 * A barra presa no topo ao rolar: a busca (`search`) em cima e as abas embaixo. O perfil acima dela rola junto
 * com a página. Precisa ser filha direta de um bloco que vá até o fim da página, ou deixa de ficar presa.
 */
export function HomeBar({ current, search }: { current?: TabId; search: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 border-y border-sand bg-white/95 backdrop-blur-sm">
      <div className={`mx-auto max-w-[1440px] pt-3 ${pad}`}>{search}</div>
      <TabNav current={current} />
    </div>
  );
}

/** As abas. Trocar de aba limpa os filtros da aba anterior. Sem `current` (tela de espera), nenhuma fica marcada. */
function TabNav({ current }: { current?: TabId }) {
  const t = useTranslations("catalog.tabs");
  return (
    <nav aria-label={t("label")}>
      <div className={`no-scrollbar mx-auto flex max-w-[1440px] gap-7 overflow-x-auto md:gap-10 ${pad}`}>
        {TABS.map((id) => (
          <Link
            key={id}
            href={hrefWith({}, { tab: id })}
            scroll={false}
            aria-current={id === current ? "page" : undefined}
            className={`${kicker} -mb-px flex min-h-13 flex-none items-center border-b-2 whitespace-nowrap no-underline ${id === current ? "border-ink text-ink" : "border-transparent text-mute hover:text-ink"}`}
          >
            {t(id)}
          </Link>
        ))}
      </div>
    </nav>
  );
}

const chip = "flex min-h-10 flex-none items-center gap-2 border px-3.5 text-[13px] whitespace-nowrap no-underline";
const chipOn = `${chip} border-ink bg-ink text-white`;
const chipOff = `${chip} border-sand bg-white text-ink hover:border-ink`;

const option = "flex min-h-11 items-center justify-between gap-6 px-5 text-[14px] whitespace-nowrap text-ink no-underline hover:bg-cream md:px-4";

/** Uma linha da lista de um `FilterMenu`; a escolhida vem em destaque e com o sinal de marcado. */
function MenuOption({ href, on, children }: { href: Href; on: boolean; children: ReactNode }) {
  return (
    <Link href={href} scroll={false} aria-current={on ? "true" : undefined} className={`${option} ${on ? "font-medium" : ""}`}>
      {children}
      {on && (
        <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 flex-none" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="m2 6.5 2.5 2.5L10 3.5" />
        </svg>
      )}
    </Link>
  );
}

/**
 * Um filtro de valor único (`?param=valor`): um menu com as opções. Com um filtro escolhido, o botão mostra
 * o valor e ganha um × ao lado, que tira o filtro num clique só; clicar na opção escolhida também tira.
 * Com menos de duas opções não aparece, para não mostrar filtro que não filtra nada.
 */
export function FilterChips({ label, param, options, params }: { label: string; param: string; options: [value: string, label: string][]; params: TabParams }) {
  const t = useTranslations("catalog");
  if (options.length < 2) return null;
  const activeText = options.find(([value]) => value === params[param])?.[1];
  return (
    <div className="flex flex-none">
      <FilterMenu
        title={label}
        ariaLabel={activeText ? `${label}: ${activeText}` : label}
        className={`${activeText ? chipOn : chipOff} cursor-pointer`}
        options={options.map(([value, text]) => {
          const on = text === activeText;
          return (
            <MenuOption key={value} href={hrefWith(params, { [param]: on ? null : value })} on={on}>
              {text}
            </MenuOption>
          );
        })}
      >
        {activeText ?? label}
      </FilterMenu>
      {activeText && (
        <Link
          href={hrefWith(params, { [param]: null })}
          scroll={false}
          aria-label={t("removeFilter", { label, value: activeText })}
          className="flex w-8 items-center justify-center border-l border-white/25 bg-ink text-[15px] text-white no-underline hover:bg-[#2b2925]"
        >
          ×
        </Link>
      )}
    </div>
  );
}

/** Filtro liga/desliga (`?param=1`), na mesma linha dos menus. */
export function ToggleChip({ label, param, params }: { label: string; param: string; params: TabParams }) {
  const on = params[param] === "1";
  return (
    <Link href={hrefWith(params, { [param]: on ? null : "1" })} scroll={false} aria-current={on ? "true" : undefined} className={on ? chipOn : chipOff}>
      {label}
      {on && <span aria-hidden="true">×</span>}
    </Link>
  );
}

/** Ordenação num menu, com a atual à vista; a primeira opção é a padrão (não vai para a URL). */
export function SortMenu({ options, params, param = "sort" }: { options: [value: string, label: string][]; params: TabParams; param?: string }) {
  const t = useTranslations("catalog");
  const active = params[param] ?? options[0]?.[0];
  const activeText = options.find(([value]) => value === active)?.[1] ?? options[0]?.[1];
  return (
    <FilterMenu
      title={t("sortBy")}
      ariaLabel={t("sortByValue", { value: activeText ?? "" })}
      align="end"
      className="flex min-h-10 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-[14px] whitespace-nowrap text-ink hover:text-gold"
      options={options.map(([value, text], i) => (
        <MenuOption key={value} href={hrefWith(params, { [param]: i === 0 ? null : value })} on={value === active}>
          {text}
        </MenuOption>
      ))}
    >
      <span>
        <span className="text-mute max-md:hidden">{t("sortBy")} </span>
        <span className="font-medium">{activeText}</span>
      </span>
    </FilterMenu>
  );
}

/**
 * Moldura de uma aba de catálogo: título, uma barra só com os filtros à esquerda (no celular, rolam de lado)
 * e contador, "Limpar filtros" e ordenação à direita, e a grade. `filters`, `sort` e `clearHref` são
 * opcionais; `clearHref` só vem com algum filtro ligado.
 */
export function CatalogFrame({
  title,
  filters,
  sort,
  count,
  clearHref,
  children,
}: {
  title: string;
  filters?: ReactNode;
  sort?: ReactNode;
  count: string;
  clearHref?: Href;
  children: ReactNode;
}) {
  const t = useTranslations("catalog");
  return (
    <section className={`mx-auto flex max-w-[1440px] flex-col gap-5 pt-8 md:gap-6 md:pt-10 ${pad}`}>
      {/* só o título, sem texto de apoio: a aba já diz o que é */}
      <h2 className="m-0 font-display text-[clamp(30px,3.2vw,44px)] leading-[1] font-normal">{title}</h2>
      <div className="flex flex-col gap-2 border-y border-sand py-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-8">
        {/* empty: os filtros com menos de duas opções não aparecem e a lista pode ficar sem nenhum */}
        {filters && <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 empty:hidden md:mx-0 md:flex-wrap md:overflow-visible md:px-0">{filters}</div>}
        <div className="flex min-h-10 items-center justify-between gap-5 text-[14px] md:ml-auto md:justify-end">
          <div className="flex items-center gap-4">
            {clearHref && (
              <Link href={clearHref} scroll={false} className="whitespace-nowrap text-mute underline underline-offset-4 hover:text-ink">
                {t("clear")}
              </Link>
            )}
            <p aria-live="polite" className="m-0 whitespace-nowrap text-mute">
              {count}
            </p>
          </div>
          {sort}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Grade padrão das abas: 2 colunas no celular, 4 no computador. */
export const catalogGrid = "grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-4 md:gap-y-12 lg:grid-cols-4";

/** "Ver mais": mais uma página de itens, mantendo filtros e ordem. */
export function LoadMore({ params, shown, total }: { params: TabParams; shown: number; total: number }) {
  const t = useTranslations("catalog");
  if (shown >= total) return null;
  return (
    <div className="flex justify-center pt-4">
      <Link href={hrefWith(params, { limit: String(shown + PAGE) })} scroll={false} className={pillLight}>
        {t("more")}
      </Link>
    </div>
  );
}

/** Nada com esses filtros: convite para limpar, não um pedido de desculpas. */
export function CatalogEmpty({ title, text, clearHref, action }: { title: string; text: string; clearHref?: Href; action?: ReactNode }) {
  const t = useTranslations("catalog");
  return (
    <div className="flex flex-col items-center gap-4 bg-cream px-6 py-16 text-center">
      <span className="font-display text-[clamp(28px,3vw,40px)] leading-[1.1]">{title}</span>
      <p className="m-0 max-w-[28rem] text-[15px] leading-relaxed text-mute">{text}</p>
      {clearHref && (
        <Link href={clearHref} scroll={false} className={pillLight}>
          {t("clear")}
        </Link>
      )}
      {action}
    </div>
  );
}
