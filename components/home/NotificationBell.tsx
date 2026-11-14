"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { openNotificationsAction } from "@/app/actions";
import { Bone } from "@/components/brand/Skeleton";
import { useRouter } from "next/navigation";
import { Link, vitrineHref } from "@/lib/i18n/navigation";
import type { Notification } from "@/lib/vitrine/notifications";
import { Avatar, type LeaveGuard } from "./AccountMenu";
import { kicker } from "./chrome";

type Loaded = { items: Notification[]; at: number } | "failed" | null;

/** "há 5 min" até uma semana; depois disso, a data. As mesmas regras dos comentários da vitrine. */
function useWhen(now: number) {
  const t = useTranslations("comments.when");
  const format = useFormatter();
  return (iso: string) => {
    const date = new Date(iso);
    const minutes = Math.floor((now - date.getTime()) / 60_000);
    if (minutes < 1) return t("now");
    if (minutes < 60) return t("minutes", { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("hours", { n: hours });
    const days = Math.floor(hours / 24);
    if (days === 1) return t("yesterday");
    return days < 7
      ? t("days", { n: days })
      : format.dateTime(date, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };
}

function Item({ n, when, onLeave }: { n: Notification; when: string; onLeave?: LeaveGuard }) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const b = (s: ReactNode) => <strong className="font-semibold">{s}</strong>;
  const text =
    n.kind === "follow"
      ? t.rich("follow", { name: n.actor.name, b })
      : t.rich(n.comment?.reply ? "reply" : "comment", {
          name: n.actor.name,
          b,
        });
  // seguidor: a vitrine de quem seguiu, se tiver; comentário: a conversa na vitrine da dona
  const to = n.kind === "comment" ? { handle: n.handle, hash: "comentarios" } : n.actor.handle ? { handle: n.actor.handle, hash: undefined } : null;

  const body = (
    <>
      <Avatar url={n.actor.avatarUrl} label={n.actor.name} className="size-10 flex-none text-[14px]" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[14px] leading-snug break-words">{text}</span>
        {n.comment && <span className="line-clamp-2 text-[14px] leading-snug break-words text-mute">“{n.comment.body}”</span>}
        <time dateTime={n.createdAt} className="text-[12px] text-mute">
          {when}
        </time>
      </span>
      {!n.read && (
        <span className="mt-1.5 size-2 flex-none rounded-full bg-gold">
          <span className="sr-only">{t("new")}</span>
        </span>
      )}
    </>
  );
  const row = `flex items-start gap-3 px-4 py-3.5 text-ink no-underline ${n.read ? "" : "bg-cream"}`;
  return (
    <li className="border-b border-sand last:border-b-0">
      {to ? (
        <Link
          href={vitrineHref(to.handle, to.hash)}
          onClick={(e) => {
            // o href do link já está no idioma certo e com a âncora (que o router do next-intl não aceita): segue para ele
            const { pathname, hash } = new URL(e.currentTarget.href);
            onLeave?.(e, () => router.push(pathname + hash));
          }}
          className={`${row} hover:bg-sand/60 focus-visible:bg-sand/60 focus-visible:outline-none`}
        >
          {body}
        </Link>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
}

/**
 * Sino ao lado do menu da conta (home e editor), no mesmo formato do botão dele. Mostra quantas notificações não
 * foram vistas; o clique abre um painel com as mais recentes (novos seguidores e comentários na vitrine), buscadas na
 * hora, e marca todas como lidas. Fecha com Esc, com um clique fora ou quando o foco sai dele. `onLeave`: veja
 * `LeaveGuard` (o editor pergunta antes de sair com alterações por salvar).
 */
export function NotificationBell({ count, onLeave }: { count: number; onLeave?: LeaveGuard }) {
  const t = useTranslations("notifications");
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded>(null);
  // abriu o painel: as não lidas já foram marcadas no banco
  const [seen, setSeen] = useState(false);
  const [loading, startLoading] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const when = useWhen(loaded && loaded !== "failed" ? loaded.at : 0);
  const unread = seen ? 0 : count;

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const load = () =>
    startLoading(async () => {
      const res = await openNotificationsAction();
      if (!res.ok) return setLoaded("failed");
      setLoaded({ items: res.items, at: Date.now() });
      setSeen(true);
    });

  const toggle = () => {
    // a cada abertura busca de novo: chegam as novas, e as que estavam em destaque já aparecem como lidas
    if (!open) load();
    setOpen((v) => !v);
  };

  return (
    <div ref={box} className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="painel-notificacoes"
        aria-label={unread ? t("bellUnread", { count: unread }) : t("bell")}
        onClick={toggle}
        className={`relative flex size-11 cursor-pointer items-center justify-center rounded-full border bg-transparent text-ink transition-colors hover:border-ink ${open ? "border-ink" : "border-sand"}`}
      >
        {/* "bell" do Lucide (lucide.dev, licença ISC) */}
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.268 21a2 2 0 0 0 3.464 0" />
          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
        </svg>
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] leading-none font-semibold text-white tabular-nums ring-2 ring-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id="painel-notificacoes"
          aria-busy={loading}
          // no celular o painel ocupa a largura da tela (menos as margens): ancorado no sino, sairia pela esquerda
          className="absolute top-[calc(100%+8px)] right-0 z-30 flex max-h-[min(520px,calc(100dvh-96px))] w-[380px] flex-col border border-sand bg-white text-left shadow-[0_24px_60px_-28px_rgba(17,17,17,0.45)] motion-safe:animate-rise-in max-sm:-right-[52px] max-sm:w-[calc(100vw-40px)]"
        >
          <h2 className={`${kicker} m-0 flex-none border-b border-sand px-4 py-3.5 text-[11px] text-gold`}>{t("title")}</h2>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loaded === null || (loading && loaded === "failed") ? (
              <div className="flex flex-col">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex gap-3 border-b border-sand px-4 py-3.5 last:border-b-0">
                    <Bone className="size-10 flex-none rounded-full" />
                    <div className="flex flex-1 flex-col gap-2 pt-1">
                      <Bone className="h-3.5 w-[85%]" />
                      <Bone className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : loaded === "failed" ? (
              <div className="flex flex-col items-start gap-3 px-4 py-6">
                <p role="alert" className="m-0 text-[14px] leading-relaxed text-mute">
                  {t("failed")}
                </p>
                <button type="button" onClick={load} className="cursor-pointer border-0 bg-transparent p-0 text-[13px] text-ink underline underline-offset-2">
                  {t("retry")}
                </button>
              </div>
            ) : loaded.items.length ? (
              <ul className={`m-0 list-none p-0 transition-opacity ${loading ? "opacity-60" : ""}`}>
                {loaded.items.map((n) => (
                  <Item key={n.id} n={n} when={when(n.createdAt)} onLeave={onLeave} />
                ))}
              </ul>
            ) : (
              <p className="m-0 px-4 py-8 text-center text-[14px] leading-relaxed text-mute">{t("empty")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
