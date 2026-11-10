import { useTranslations } from "next-intl";
import type { MouseEventHandler } from "react";
import { Link, type Href } from "@/lib/i18n/navigation";

// A margem negativa desconta o padding: a área de toque tem 44px, mas a peça ocupa só o que aparece e
// o ícone fica alinhado à margem da página.
const base = "-m-3 flex w-fit flex-none items-center gap-2 border-0 bg-transparent p-3 text-[12px] font-medium tracking-[0.22em] text-ink uppercase no-underline";
const active = "group/back cursor-pointer transition-colors hover:text-gold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

/**
 * O voltar do app, sempre no canto esquerdo do cabeçalho: seta e rótulo, só a seta no celular.
 * Com `href` é link; só com `onClick`, botão (passo anterior da mesma tela); sem os dois, só a aparência
 * (prévia do editor). `labelClass` troca quando o rótulo some: a vitrine mede o contêiner, não a tela.
 */
export function BackLink({
  href,
  onClick,
  label = "back",
  labelClass = "max-md:hidden",
  divider = false,
}: {
  href?: Href;
  onClick?: MouseEventHandler<HTMLElement>;
  /** back: "Voltar"; home: "Início", que leva para o início */
  label?: "back" | "home";
  labelClass?: string;
  /** fio à direita, para separar do que vem ao lado no cabeçalho */
  divider?: boolean;
}) {
  const t = useTranslations("common");
  const text = t(label);
  const name = label === "home" ? t("backHome") : text;
  const content = (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5 flex-none motion-safe:transition-transform motion-safe:group-hover/back:-translate-x-0.5"
      >
        <path d="M19 12H5m6-6-6 6 6 6" />
      </svg>
      <span className={labelClass}>{text}</span>
    </>
  );

  return (
    <>
      {href ? (
        <Link href={href} onClick={onClick} aria-label={name} className={`${base} ${active}`}>
          {content}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} aria-label={name} className={`${base} ${active}`}>
          {content}
        </button>
      ) : (
        <span aria-hidden="true" className={base}>
          {content}
        </span>
      )}
      {divider && <span aria-hidden="true" className="h-6 w-px flex-none bg-sand" />}
    </>
  );
}
