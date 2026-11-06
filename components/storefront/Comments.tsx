"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useOptimistic, useRef, useState, useSyncExternalStore, useTransition, type FormEvent } from "react";
import { addCommentAction, deleteCommentAction } from "@/app/actions";
import { LoginButton } from "@/components/auth/forms";
import { COMMENT_MAX, reachServer, type CommentList, type Viewer, type VitrineComment } from "@/lib/vitrine/social";

/** Quantos comentários aparecem de início e a cada "Ver mais". */
const STEP = 10;
/** A partir de quantos caracteres restantes o campo avisa. */
const WARN_LEFT = 100;

const send =
  "flex min-h-10 flex-none cursor-pointer items-center justify-center border-0 bg-ink px-5 text-[11px] font-medium tracking-[0.16em] text-white uppercase hover:bg-[#2b2925]";
const more =
  "flex min-h-12 cursor-pointer items-center justify-center border border-ink bg-transparent px-7 text-[12px] font-medium tracking-[0.18em] text-ink uppercase hover:bg-ink hover:text-white";
const quiet = "cursor-pointer border-0 bg-transparent p-0 text-[13px] text-mute underline underline-offset-2 hover:text-ink";
const errorText = "m-0 text-sm font-semibold text-[#A3361B]";

/** O que estava sendo escrito e, depois de abrir o login, para onde voltar. Vale só nesta aba do navegador. */
const draftKey = (handle: string) => `vitri:comentario:${handle}`;
const RETURNING = "vitri:comentar";

function readStored(key: string) {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function store(key: string, value: string) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    // sessionStorage bloqueado: só o rascunho não sobrevive ao login
  }
}

const noop = () => () => {};

type WhenT = ReturnType<typeof useTranslations<"comments.when">>;

/** "há 5 min" até uma semana; depois disso, a data. No servidor vai a data pronta, igual para todos. */
function relative(iso: string, fallback: string, t: WhenT) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return t("now");
  if (minutes < 60) return t("minutes", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hours", { n: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t("yesterday");
  return days < 7 ? t("days", { n: days }) : fallback;
}

function When({ comment }: { comment: VitrineComment }) {
  const t = useTranslations("comments.when");
  const text = useSyncExternalStore(
    noop,
    () => relative(comment.createdAt, comment.dateLabel, t),
    () => comment.dateLabel,
  );
  return (
    <time dateTime={comment.createdAt} title={comment.dateLabel} className="text-[13px] whitespace-nowrap text-mute">
      {text}
    </time>
  );
}

function Avatar({ name, url, className }: { name: string; url: string; className: string }) {
  // foto do Google pode sair do ar: aí ficam as iniciais
  const [broken, setBroken] = useState(false);
  const box = `${className} flex-none rounded-full bg-cream`;
  if (url && !broken) {
    // eslint-disable-next-line @next/next/no-img-element -- a foto vem do Google, e sem referrer ele não recusa o pedido
    return <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={`${box} object-cover`} />;
  }
  return (
    <span aria-hidden="true" className={`${box} flex items-center justify-center text-[13px] font-semibold`}>
      {name[0]?.toUpperCase()}
    </span>
  );
}

/**
 * Campo de comentar, igual para todos: quem não entrou escreve primeiro e o login vem só na hora de
 * publicar. O texto fica guardado e, na volta do Google, a pessoa cai de novo aqui para confirmar o envio
 * (nada é publicado sozinho: o comentário sai com o nome e a foto dela). Só monta no navegador, depois de
 * se saber quem está vendo, por isso pode ler o rascunho ao iniciar.
 */
function Composer({
  handle,
  firstName,
  user,
  onSend,
}: {
  handle: string;
  firstName: string;
  user: { name: string; avatarUrl: string } | null;
  /** Devolve a mensagem de erro, ou null se publicou. */
  onSend: (body: string) => Promise<string | null>;
}) {
  const t = useTranslations("comments");
  const key = draftKey(handle);
  const [text, setText] = useState(() => readStored(key));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const field = useRef<HTMLTextAreaElement>(null);
  const left = COMMENT_MAX - text.length;
  const hasText = text.trim().length > 0;

  const type = (value: string) => {
    setText(value);
    store(key, value);
  };

  const backFromLogin = useEffectEvent(() => {
    if (!user || readStored(RETURNING) !== handle) return;
    store(RETURNING, "");
    field.current?.scrollIntoView({ block: "center" });
    field.current?.focus({ preventScroll: true });
  });
  useEffect(() => backFromLogin(), []);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || pending) return;
    setError(null);
    type(""); // o comentário já aparece na lista; se o servidor recusar, o texto volta para o campo
    start(async () => {
      const failure = await onSend(body);
      if (failure) {
        type(body);
        setError(failure);
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="border border-sand transition-colors focus-within:border-ink">
        <label>
          <span className="sr-only">{t("field")}</span>
          <textarea
            ref={field}
            value={text}
            onChange={(e) => type(e.target.value)}
            onKeyDown={(e) => {
              if (user && e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            maxLength={COMMENT_MAX}
            placeholder={t("placeholder", { name: firstName })}
            className="field-sizing-content box-border block max-h-80 min-h-24 w-full resize-none border-0 bg-transparent p-4 text-base leading-relaxed text-ink outline-none placeholder:text-mute"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-sand py-2 pr-2 pl-3">
          {user ? (
            <div className="flex min-w-0 flex-1 basis-40 items-center gap-2 text-[13px] text-mute">
              <Avatar name={user.name} url={user.avatarUrl} className="size-6" />
              <span className="truncate">
                {t.rich("commentingAs", { name: user.name || t("you"), b: (s) => <span className="font-medium text-ink">{s}</span> })}
              </span>
            </div>
          ) : (
            <span className="min-w-0 flex-1 basis-40 text-[13px] leading-snug text-mute">{t("guestHint")}</span>
          )}
          <div className="ml-auto flex items-center gap-3">
            {left <= WARN_LEFT && (
              <span className={`text-[13px] whitespace-nowrap lining-nums ${left === 0 ? "font-semibold text-[#A3361B]" : "text-mute"}`}>
                {t("left", { count: left })}
              </span>
            )}
            {user ? (
              <button type="submit" disabled={!hasText} className={send}>
                {t("submit")}
              </button>
            ) : (
              <LoginButton
                className={send}
                onOpen={() => store(RETURNING, handle)}
              >
                {hasText ? t("signInAndPost") : t("signInToComment")}
              </LoginButton>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className={errorText}>
          {error}
        </p>
      )}
    </form>
  );
}

function CommentItem({ comment, sending, mine, canDelete, onDelete }: { comment: VitrineComment; sending: boolean; mine: boolean; canDelete: boolean; onDelete: () => void }) {
  const t = useTranslations("comments");
  const [confirming, setConfirming] = useState(false);
  const tag = mine ? t("you") : comment.byOwner ? t("owner") : null;
  return (
    <li className={`flex gap-3.5 border-b border-sand py-5 ${sending ? "opacity-60 motion-safe:animate-rise-in" : ""}`}>
      <Avatar name={comment.authorName} url={comment.authorAvatarUrl} className="size-10" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="min-w-0 text-[15px] font-medium break-words">{comment.authorName}</span>
          {tag && <span className="text-[10px] font-medium tracking-[0.16em] text-gold uppercase">{tag}</span>}
          {sending ? <span className="text-[13px] text-mute">{t("sending")}</span> : <When comment={comment} />}
          {canDelete && !sending && (
            <span className="ml-auto flex gap-3 pl-3">
              {confirming ? (
                <>
                  <button type="button" onClick={onDelete} className={`${quiet} font-medium text-ink`}>
                    {t("confirmDelete")}
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className={quiet}>
                    {t("cancel")}
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} aria-label={t("deleteLabel", { name: comment.authorName })} className={quiet}>
                  {t("delete")}
                </button>
              )}
            </span>
          )}
        </div>
        <p className="m-0 text-[15px] leading-relaxed break-words whitespace-pre-line">{comment.body}</p>
      </div>
    </li>
  );
}

type Change = { add: VitrineComment } | { remove: string };

/** Comentários da vitrine: o título, o campo e, abaixo, a lista. */
export function Comments({
  handle,
  firstName,
  comments,
  viewer,
  className,
}: {
  handle: string;
  firstName: string;
  comments: CommentList;
  /** null: ainda não se sabe quem está vendo */
  viewer: Viewer | null;
  className: string;
}) {
  const t = useTranslations("comments");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  // aparece na hora; a lista de verdade chega junto com a resposta da ação, que invalida o cache
  const [items, change] = useOptimistic(comments.items, (list, c: Change) => ("add" in c ? [c.add, ...list] : list.filter((x) => x.id !== c.remove)));
  const [shown, setShown] = useState(STEP);
  const [listError, setListError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [, startDelete] = useTransition();
  const user = viewer?.user ?? null;
  const owner = Boolean(viewer?.user && viewer.owner);
  const total = comments.total + items.length - comments.items.length;
  const remaining = items.length - shown;

  const onSend = async (body: string) => {
    if (user) {
      const now = new Date().toISOString();
      change({ add: { id: `enviando:${now}`, authorId: user.id, authorName: user.name || t("you"), authorAvatarUrl: user.avatarUrl, body, byOwner: owner, dateLabel: "", createdAt: now } });
    }
    const result = await reachServer(addCommentAction(handle, body), tErrors("offline"));
    setStatus(result.ok ? t("posted") : "");
    return result.ok ? null : result.error;
  };

  const onDelete = (id: string) => {
    setListError(null);
    startDelete(async () => {
      change({ remove: id });
      const result = await reachServer(deleteCommentAction(id), tErrors("offline"));
      setStatus(result.ok ? t("deleted") : "");
      if (!result.ok) setListError(result.error);
    });
  };

  return (
    <section id="comentarios" className={`mx-auto max-w-[1440px] scroll-mt-4 pt-16 @3xl:pt-24 ${className}`}>
      {/* uma coluna só, na margem das outras seções; a largura limitada mantém o texto confortável de ler */}
      <div className="flex max-w-[760px] flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 className="m-0 font-display text-[clamp(32px,4cqw,44px)] leading-[1.05] font-normal lining-nums">
            {t("title")} {total > 0 && <span className="text-mute">({format.number(total)})</span>}
          </h2>
          <p className="m-0 text-[15px] leading-relaxed text-mute">{t("intro", { name: firstName })}</p>
        </div>
        {viewer ? <Composer handle={handle} firstName={firstName} user={user} onSend={onSend} /> : <div aria-hidden="true" className="h-[154px] bg-cream motion-safe:animate-pulse" />}

        {listError && (
          <p role="alert" className={errorText}>
            {listError}
          </p>
        )}
        {items.length === 0 ? (
          <p className="m-0 text-[15px] leading-relaxed text-mute">{t("empty")}</p>
        ) : (
          <ul className="m-0 mt-3 list-none border-t border-sand p-0">
            {items.slice(0, shown).map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                sending={c.id.startsWith("enviando:")}
                mine={user?.id === c.authorId}
                canDelete={owner || user?.id === c.authorId}
                onDelete={() => onDelete(c.id)}
              />
            ))}
          </ul>
        )}
        {remaining > 0 && (
          <button type="button" onClick={() => setShown((n) => n + STEP)} className={`${more} mt-1 self-start`}>
            {t("more", { n: Math.min(remaining, STEP) })}
          </button>
        )}
        <span role="status" className="sr-only">
          {status}
        </span>
      </div>
    </section>
  );
}
