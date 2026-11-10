"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useOptimistic, useRef, useState, useSyncExternalStore, useTransition, type FormEvent, type ReactNode } from "react";
import { addCommentAction, deleteCommentAction } from "@/app/actions";
import { LoginButton } from "@/components/auth/forms";
import { COMMENT_MAX, reachServer, type CommentList, type CommentThread, type Viewer, type VitrineComment } from "@/lib/vitrine/social";

/** Quantos comentários aparecem de início e a cada "Ver mais". */
const STEP = 10;
/** A partir de quantos caracteres restantes o campo avisa. */
const WARN_LEFT = 100;
/** Conversas com mais respostas que isto começam fechadas, só com o botão "Ver N respostas". */
const REPLIES_OPEN = 2;
/**
 * Quantos níveis abaixo do comentário original a lista recua. Uma resposta mais funda fica no último nível,
 * com o "@Nome" de quem ela responde, para a coluna de texto não ficar estreita demais no celular.
 */
const MAX_DEPTH = 3;

const send =
  "flex min-h-10 flex-none cursor-pointer items-center justify-center border-0 bg-ink px-5 text-[11px] font-medium tracking-[0.16em] text-white uppercase hover:bg-[#2b2925]";
const more =
  "flex min-h-12 cursor-pointer items-center justify-center border border-ink bg-transparent px-7 text-[12px] font-medium tracking-[0.18em] text-ink uppercase hover:bg-ink hover:text-white";
const quiet = "cursor-pointer border-0 bg-transparent p-0 text-[13px] text-mute underline underline-offset-2 hover:text-ink";
const errorText = "m-0 text-sm font-semibold text-[#A3361B]";

/**
 * O que estava sendo escrito e, depois de abrir o login, para onde voltar: o campo da vitrine (`handle`) ou a
 * resposta numa conversa (`handle#id`, e `handle#id>resposta` quando era a resposta a uma resposta). O rascunho
 * é um por conversa. Vale só nesta aba do navegador.
 */
const draftKey = (target: string) => `vitri:comentario:${target}`;
const RETURNING = "vitri:comentar";
const replyTarget = (handle: string, id: string) => `${handle}#${id}`;

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

const resumeTarget = (handle: string, thread: string, to: string | null) => replyTarget(handle, thread) + (to ? `>${to}` : "");

/** Conversa (e a resposta dentro dela, se era o caso) cuja resposta ficou pela metade quando a pessoa foi entrar. */
function returningReply(handle: string) {
  const target = readStored(RETURNING);
  if (!target.startsWith(`${handle}#`)) return null;
  const [thread, to = null] = target.slice(handle.length + 1).split(">");
  return { thread, to };
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

type ComposerText = { field: string; placeholder: string; submit: string; signIn: string };

/**
 * Campo de comentar ou de responder, igual para todos: quem não entrou escreve primeiro e o login vem só na
 * hora de publicar. O texto fica guardado e, na volta do Google, a pessoa cai de novo aqui para confirmar o
 * envio (nada é publicado sozinho: o comentário sai com o nome e a foto dela). Só monta no navegador, depois
 * de se saber quem está vendo, por isso pode ler o rascunho ao iniciar.
 */
function Composer({
  target,
  resume = target,
  text: copy,
  user,
  reply = false,
  onSend,
  onCancel,
}: {
  /** O que identifica o rascunho e a volta do login: `handle`, ou `handle#id` numa resposta. */
  target: string;
  /** O que guardar para a volta do login, se for diferente de `target` (a resposta a uma resposta). */
  resume?: string;
  text: ComposerText;
  user: { name: string; avatarUrl: string } | null;
  /** Campo de resposta: menor, com foco ao abrir e com "Cancelar". */
  reply?: boolean;
  /** Devolve a mensagem de erro, ou null se publicou. */
  onSend: (body: string) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const t = useTranslations("comments");
  const key = draftKey(target);
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

  const onMount = useEffectEvent(() => {
    const back = Boolean(user) && readStored(RETURNING) === resume;
    if (back) {
      store(RETURNING, "");
      field.current?.scrollIntoView({ block: "center" });
      field.current?.focus({ preventScroll: true });
    } else if (reply) {
      field.current?.focus();
    }
  });
  useEffect(() => onMount(), []);

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

  const cancel = () => {
    type("");
    onCancel?.();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="border border-sand transition-colors focus-within:border-ink">
        <label>
          <span className="sr-only">{copy.field}</span>
          <textarea
            ref={field}
            value={text}
            onChange={(e) => type(e.target.value)}
            onKeyDown={(e) => {
              if (user && e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              if (reply && e.key === "Escape" && !hasText) cancel();
            }}
            maxLength={COMMENT_MAX}
            placeholder={copy.placeholder}
            className={`field-sizing-content box-border block max-h-80 w-full resize-none border-0 bg-transparent text-base leading-relaxed text-ink outline-none placeholder:text-mute ${reply ? "min-h-16 px-3.5 py-3" : "min-h-24 p-4"}`}
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
            {onCancel && (
              <button type="button" onClick={cancel} className={quiet}>
                {t("cancel")}
              </button>
            )}
            {user ? (
              <button type="submit" disabled={!hasText} className={send}>
                {copy.submit}
              </button>
            ) : (
              <LoginButton className={send} onOpen={() => store(RETURNING, resume)}>
                {hasText ? t("signInAndPost") : copy.signIn}
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

const isSending = (c: VitrineComment) => c.id.startsWith("enviando:");
const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] ?? "";

type RowProps = {
  comment: VitrineComment;
  /** Resposta: foto menor. */
  small?: boolean;
  /** Numa resposta a outra resposta, o nome de quem ela responde: vai no começo do texto. */
  replyingTo?: string;
  mine: boolean;
  canDelete: boolean;
  onDelete: () => void;
  /** null: ainda não se sabe quem está vendo, e o "Responder" fica de fora. */
  onReply: (() => void) | null;
};

function CommentRow({ comment, small = false, replyingTo, mine, canDelete, onDelete, onReply }: RowProps) {
  const t = useTranslations("comments");
  const [confirming, setConfirming] = useState(false);
  const sending = isSending(comment);
  const tag = mine ? t("you") : comment.byOwner ? t("owner") : null;
  return (
    <div className={`flex gap-3.5 ${small ? "gap-3" : ""} ${sending ? "opacity-60 motion-safe:animate-rise-in" : ""}`}>
      <Avatar name={comment.authorName} url={comment.authorAvatarUrl} className={small ? "size-8" : "size-10"} />
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
        <p className="m-0 text-[15px] leading-relaxed break-words whitespace-pre-line">
          {replyingTo && (
            <>
              <span className="font-medium text-gold">@{replyingTo}</span>{" "}
            </>
          )}
          {comment.body}
        </p>
        {onReply && !sending && (
          <button
            type="button"
            onClick={onReply}
            aria-label={t("replyLabel", { name: comment.authorName })}
            className="mt-0.5 cursor-pointer self-start border-0 bg-transparent p-0 text-[13px] font-medium text-mute hover:text-ink"
          >
            {t("reply")}
          </button>
        )}
      </div>
    </div>
  );
}

type Change = { add: VitrineComment } | { remove: string };

function applyChange(list: CommentThread[], c: Change): CommentThread[] {
  if ("remove" in c) return list.filter((x) => x.id !== c.remove).map((x) => (x.replies.some((r) => r.id === c.remove) ? { ...x, replies: x.replies.filter((r) => r.id !== c.remove) } : x));
  const { parentId } = c.add;
  if (!parentId) return [{ ...c.add, replies: [] }, ...list];
  return list.map((x) => (x.id === parentId ? { ...x, replies: [...x.replies, c.add] } : x));
}

/**
 * Recuo das respostas: a foto e o espaço até o texto de quem é respondido, para a resposta começar alinhada ao
 * texto dele (comentário original: 40 + 14; resposta: 32 + 12).
 */
const ROOT_INDENT = 54;
const REPLY_INDENT = 44;

type ReplyNode = { comment: VitrineComment; depth: number; up: ReplyNode | null; kids: ReplyNode[] };

/**
 * A conversa como árvore: cada resposta embaixo da resposta que ela responde (`replyToId`) ou, sem isso, do
 * comentário original. No banco a conversa é plana (um `parent_id` só); o recuo é só na tela.
 */
function replyTree(replies: VitrineComment[]) {
  const byId = new Map<string, ReplyNode>();
  const top: ReplyNode[] = [];
  for (const r of replies) {
    // em ordem cronológica: a resposta respondida já está no mapa (se ainda existe)
    let up = (r.replyToId && byId.get(r.replyToId)) || null;
    while (up && up.depth >= MAX_DEPTH) up = up.up;
    const node: ReplyNode = { comment: r, depth: up ? up.depth + 1 : 1, up, kids: [] };
    byId.set(r.id, node);
    (up ? up.kids : top).push(node);
  }
  return { top, byId };
}

/** O que fica embaixo de um comentário: respostas, o campo de responder ou o "Ver N respostas". */
type Item = { key: string; content: ReactNode };

/** Um comentário e, recuados embaixo dele, as respostas a ele (e o campo de responder, se for ali). */
function Branched({ indent, row, items }: { indent: number; row: ReactNode; items: Item[] }) {
  return (
    <>
      {row}
      {items.length > 0 && (
        <ul className="m-0 mt-4 flex list-none flex-col gap-4 p-0" style={{ paddingLeft: indent }}>
          {items.map((it) => (
            <li key={it.key}>{it.content}</li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Comentários e respostas. */
const countAll = (list: CommentThread[]) => list.reduce((n, x) => n + 1 + x.replies.length, 0);

/**
 * O que a pessoa está respondendo: a conversa (comentário original), a resposta dentro dela (null quando é o
 * próprio comentário original) e o nome de quem ela quer responder.
 */
type ReplyTo = { thread: string; to: string | null; name: string };

/** Comentários da vitrine: o título, o campo e, abaixo, a lista com as respostas. */
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
  const [items, change] = useOptimistic(comments.items, applyChange);
  const [shown, setShown] = useState(STEP);
  const [listError, setListError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  // quem voltou do login no meio de uma resposta encontra o campo dela aberto (só aparece com `viewer`, depois da hidratação)
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(() => {
    const back = returningReply(handle);
    const original = comments.items.find((x) => x.id === back?.thread);
    if (!original) return null;
    // a resposta pode ter sido apagada enquanto a pessoa entrava: aí responde à conversa
    const target = original.replies.find((r) => r.id === back?.to);
    return target ? { thread: original.id, to: target.id, name: target.authorName } : { thread: original.id, to: null, name: original.authorName };
  });
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(replyTo ? [replyTo.thread] : []));
  const [, startDelete] = useTransition();
  const user = viewer?.user ?? null;
  const owner = Boolean(viewer?.user && viewer.owner);
  const total = comments.total + countAll(items) - countAll(comments.items);
  const remaining = items.length - shown;

  const optimistic = (body: string, parentId: string | null, replyToId: string | null = null): VitrineComment | null => {
    if (!user) return null;
    const now = new Date().toISOString();
    return { id: `enviando:${now}`, parentId, replyToId, authorId: user.id, authorName: user.name || t("you"), authorAvatarUrl: user.avatarUrl, body, byOwner: owner, dateLabel: "", createdAt: now };
  };

  const onSend = async (body: string) => {
    const add = optimistic(body, null);
    if (add) change({ add });
    const result = await reachServer(addCommentAction(handle, body), tErrors("offline"));
    setStatus(result.ok ? t("posted") : "");
    return result.ok ? null : result.error;
  };

  // o banco pendura a resposta na conversa e guarda a resposta respondida (`to`), se houver
  const onReply = (thread: string, to: string | null) => async (body: string) => {
    const add = optimistic(body, thread, to);
    if (add) change({ add });
    const result = await reachServer(addCommentAction(handle, body, to ?? thread), tErrors("offline"));
    setStatus(result.ok ? t("replied") : "");
    if (result.ok) setReplyTo((r) => (r?.thread === thread ? null : r));
    return result.ok ? null : result.error;
  };

  const openReply = (thread: string, to: string | null, name: string) => {
    setReplyTo({ thread, to, name });
    setExpanded((s) => new Set(s).add(thread));
  };

  const toggle = (thread: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (!next.delete(thread)) next.add(thread);
      return next;
    });

  const onDelete = (id: string) => {
    setListError(null);
    startDelete(async () => {
      change({ remove: id });
      const result = await reachServer(deleteCommentAction(id), tErrors("offline"));
      setStatus(result.ok ? t("deleted") : "");
      if (!result.ok) setListError(result.error);
    });
  };

  const rowProps = (c: VitrineComment, thread: string, replyingTo?: string) => ({
    comment: c,
    replyingTo,
    mine: user?.id === c.authorId,
    canDelete: owner || user?.id === c.authorId,
    onDelete: () => onDelete(c.id),
    onReply: viewer ? () => openReply(thread, c.id === thread ? null : c.id, c.authorName) : null,
  });

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
        {viewer ? (
          <Composer
            target={handle}
            text={{ field: t("field"), placeholder: t("placeholder", { name: firstName }), submit: t("submit"), signIn: t("signInToComment") }}
            user={user}
            onSend={onSend}
          />
        ) : (
          <div aria-hidden="true" className="h-[154px] bg-cream motion-safe:animate-pulse" />
        )}

        {listError && (
          <p role="alert" className={errorText}>
            {listError}
          </p>
        )}
        {items.length === 0 ? (
          <p className="m-0 text-[15px] leading-relaxed text-mute">{t("empty")}</p>
        ) : (
          <ul className="m-0 mt-3 list-none border-t border-sand p-0">
            {items.slice(0, shown).map((c) => {
              const replying = viewer && !isSending(c) && replyTo?.thread === c.id ? replyTo : null;
              const collapsible = c.replies.length > REPLIES_OPEN;
              const open = !collapsible || expanded.has(c.id);
              const tree = replyTree(c.replies);
              // o campo aparece embaixo de quem está sendo respondido (ou de quem recebe a resposta, no último nível)
              const target = replying?.to ? tree.byId.get(replying.to) : undefined;
              const host = !replying ? null : !target ? c.id : target.depth >= MAX_DEPTH ? (target.up?.comment.id ?? c.id) : target.comment.id;
              const composerAt = (id: string): Item[] =>
                replying && host === id
                  ? [
                      {
                        key: "composer",
                        content: (
                          <Composer
                            key={c.id}
                            target={replyTarget(handle, c.id)}
                            resume={resumeTarget(handle, c.id, replying.to)}
                            text={{
                              field: t("replyField"),
                              placeholder: t("replyPlaceholder", { name: firstNameOf(replying.name) }),
                              submit: t("replySubmit"),
                              signIn: t("signInToReply"),
                            }}
                            user={user}
                            reply
                            onSend={onReply(c.id, replying.to)}
                            onCancel={() => setReplyTo(null)}
                          />
                        ),
                      },
                    ]
                  : [];
              const replyItems = (nodes: ReplyNode[]): Item[] =>
                nodes.map((n) => {
                  const answered = n.comment.replyToId ? tree.byId.get(n.comment.replyToId) : undefined;
                  // o recuo já mostra a quem ela responde; o "@Nome" fica para quando ela não está logo embaixo
                  const mention = answered && answered !== n.up ? answered.comment.authorName : undefined;
                  return {
                    key: n.comment.id,
                    content: (
                      <Branched indent={REPLY_INDENT} row={<CommentRow {...rowProps(n.comment, c.id, mention)} small />} items={[...replyItems(n.kids), ...composerAt(n.comment.id)]} />
                    ),
                  };
                });
              const toggleItem: Item[] = collapsible
                ? [
                    {
                      key: "toggle",
                      content: (
                        <button type="button" onClick={() => toggle(c.id)} aria-expanded={open} className={quiet}>
                          {open ? t("hideReplies") : t("showReplies", { count: c.replies.length })}
                        </button>
                      ),
                    },
                  ]
                : [];
              return (
                <li key={c.id} className="border-b border-sand py-5">
                  <Branched indent={ROOT_INDENT} row={<CommentRow {...rowProps(c, c.id)} />} items={[...toggleItem, ...(open ? replyItems(tree.top) : []), ...composerAt(c.id)]} />
                </li>
              );
            })}
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
