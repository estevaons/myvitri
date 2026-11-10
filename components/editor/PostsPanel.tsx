"use client";

import { useTranslations } from "next-intl";
import { useState, type DragEvent } from "react";
import { ProductArt } from "@/components/storefront/ProductIcon";
import { POST_MAX_ITEMS, postItems, type Post, type VitrineContent } from "@/lib/vitrine/types";
import { FilePick, UploadIcon } from "./ImageField";
import type { Update } from "./panels";
import { AddButton, Empty, FormActions, H, Hint, Row, labelCls, newId, reorder, useDragSort } from "./ui";
import { uploadImage } from "./upload";

/** Miniatura do post na lista: a própria foto. */
function PostThumb({ url }: { url: string }) {
  return (
    <span aria-hidden="true" className="relative flex size-10 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-cream text-[#8F897E]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto enviada para o bucket
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <UploadIcon />
      )}
    </span>
  );
}

/**
 * Foto do post: sem foto, a área toda recebe o clique ou a imagem solta; com foto, ela aparece no recorte 4:5
 * da vitrine, com o botão de trocar.
 */
function PostPhoto({ url, onChange }: { url: string; onChange: (url: string) => void }) {
  const t = useTranslations("editor.image");
  const tPosts = useTranslations("editor.posts");
  const tErrors = useTranslations("errors");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const send = async (file: File) => {
    setError("");
    setUploading(true);
    const res = await uploadImage("post", file, tErrors("imageUnreadable"));
    setUploading(false);
    if (!res.ok) return setError(res.error);
    onChange(res.url);
  };

  const drop = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    // passar por cima de um texto de dentro também dispara o evento: só conta sair da área
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) send(file);
    },
  };

  return (
    <div className="flex flex-col gap-2">
      {url ? (
        <div {...drop} className="flex items-end gap-4">
          <span
            aria-hidden="true"
            className={`relative block aspect-[4/5] w-36 flex-none overflow-hidden rounded-[12px] bg-cream ${uploading ? "animate-pulse" : ""} ${dragging ? "ring-2 ring-ink ring-offset-2" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- foto enviada para o bucket */}
            <img src={url} alt="" className="size-full object-cover" />
          </span>
          <FilePick
            onFile={send}
            disabled={uploading}
            className="flex min-h-9 cursor-pointer items-center rounded-[10px] border border-[#E6E2DA] bg-white px-3.5 text-[13px] font-semibold text-ink transition-colors hover:border-[#D6D0C5] hover:bg-[#FAF9F7] has-focus-visible:ring-2 has-focus-visible:ring-ink"
          >
            {uploading ? t("sending") : t("change")}
          </FilePick>
        </div>
      ) : (
        <div {...drop}>
          <FilePick
            onFile={send}
            disabled={uploading}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-[12px] border-[1.5px] border-dashed px-4 py-8 text-center transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ink ${
              dragging ? "border-ink bg-[#F4F2EE]" : "border-[#DDD8CF] bg-[#FAF9F7] hover:border-ink"
            } ${uploading ? "animate-pulse" : ""}`}
          >
            <span className="mb-1.5 flex size-10 items-center justify-center rounded-full bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
              <UploadIcon />
            </span>
            <span className="text-sm font-semibold text-ink">{uploading ? t("sending") : dragging ? t("drop") : t("send")}</span>
            <span className="text-[13px] leading-snug text-[#5E5A52] md:hidden">{t("tap")}</span>
            <span className="text-[13px] leading-snug text-[#5E5A52] max-md:hidden">{t("click")}</span>
            <span className="mt-1 text-xs leading-snug text-[#8F897E]">{tPosts("photoHint")}</span>
          </FilePick>
        </div>
      )}
      {error && (
        <span role="alert" className="text-xs font-medium text-[#A3361B]">
          {error}
        </span>
      )}
    </div>
  );
}

export function PostsPanel({ draft, update }: { draft: VitrineContent; update: Update }) {
  const t = useTranslations("editor.posts");
  const [openId, setOpenId] = useState<string | null>(null);
  // a lista para escolher as peças: aberta enquanto o post não tem nenhuma, e depois fica como a pessoa deixar
  const [picking, setPicking] = useState(true);
  const sort = useDragSort((from, to) => update((d) => ({ ...d, posts: reorder(d.posts, from, to) })));

  const setPost = (id: string, patch: Partial<Post>) => update((d) => ({ ...d, posts: d.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const add = () => {
    const p: Post = { id: newId(), photoUrl: "", caption: "", productIds: [] };
    update((d) => ({ ...d, posts: [...d.posts, p] }));
    setOpenId(p.id);
    setPicking(true);
  };

  const toggleOpen = (post: Post) => {
    setOpenId(openId === post.id ? null : post.id);
    setPicking(post.productIds.length === 0);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <H>{t("title")}</H>
      <Hint>{t("hint", { max: POST_MAX_ITEMS })}</Hint>
      {draft.products.length === 0 ? <Empty>{t("needProducts")}</Empty> : draft.posts.length === 0 && <Empty>{t("empty")}</Empty>}
      {draft.posts.map((post, i) => {
        const items = postItems(post, draft.products);
        return (
          <Row
            key={post.id}
            pos={i + 1}
            title={t("postN", { n: i + 1 })}
            sub={post.photoUrl ? t("items", { count: items.length }) : t("noPhoto")}
            thumb={<PostThumb url={post.photoUrl} />}
            open={openId === post.id}
            onOpen={() => toggleOpen(post)}
            sort={sort}
            total={draft.posts.length}
          >
            <div className="flex flex-col gap-1.5">
              <span className={labelCls}>{t("photo")}</span>
              <PostPhoto url={post.photoUrl} onChange={(photoUrl) => setPost(post.id, { photoUrl })} />
            </div>

            <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
              <legend className={`mb-1.5 ${labelCls}`}>{t("items", { count: items.length })}</legend>
              {items.length === 0 ? (
                <Hint>{t("pickFirst")}</Hint>
              ) : (
                <ol className="m-0 flex list-none flex-col gap-1 p-0">
                  {items.map((p) => (
                    <li key={p.id} className="flex min-h-11 items-center gap-2.5 rounded-[10px] px-2 text-sm">
                      <span aria-hidden="true" className="relative flex size-9 flex-none items-center justify-center overflow-hidden rounded-lg bg-cream">
                        <ProductArt product={p} iconClassName="w-[70%]" strokeWidth={4} />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium" title={p.name}>
                        {p.name || t("unnamed")}
                      </span>
                      <button
                        type="button"
                        aria-label={t("untag", { name: p.name || t("unnamed") })}
                        title={t("untag", { name: p.name || t("unnamed") })}
                        onClick={() => setPost(post.id, { productIds: post.productIds.filter((id) => id !== p.id) })}
                        className="flex size-8 flex-none items-center justify-center rounded-lg border-0 bg-transparent p-0 text-[#8F897E] hover:bg-[#FFF1EC] hover:text-[#A3361B]"
                      >
                        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ol>
              )}

              <details className="group mt-1 rounded-[12px] border border-[#EEEBE5]" open={picking} onToggle={(e) => setPicking(e.currentTarget.open)}>
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  {t("addProducts", { n: post.productIds.length, max: POST_MAX_ITEMS })}
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="transition-transform group-open:rotate-180">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <div className="flex flex-col gap-1 px-1 pb-2">
                  {draft.products.map((p) => {
                    const checked = post.productIds.includes(p.id);
                    const full = !checked && post.productIds.length >= POST_MAX_ITEMS;
                    return (
                      <label key={p.id} className={`flex min-h-11 items-center gap-2.5 rounded-[10px] px-2 text-sm ${full ? "opacity-40" : "cursor-pointer hover:bg-[#F7F6F3]"}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={full}
                          onChange={() =>
                            setPost(post.id, { productIds: checked ? post.productIds.filter((id) => id !== p.id) : [...post.productIds, p.id] })
                          }
                          className="size-[18px] flex-none accent-ink"
                        />
                        <span aria-hidden="true" className="relative flex size-9 flex-none items-center justify-center overflow-hidden rounded-lg bg-cream">
                          <ProductArt product={p} iconClassName="w-[70%]" strokeWidth={4} />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium" title={p.name}>
                          {p.name || t("unnamed")}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </details>
            </fieldset>

            <FormActions
              onDone={() => toggleOpen(post)}
              onRemove={() => {
                update((d) => ({ ...d, posts: d.posts.filter((x) => x.id !== post.id) }));
                setOpenId(null);
              }}
              removeLabel={t("remove")}
            />
          </Row>
        );
      })}
      {draft.products.length > 0 && <AddButton onClick={add}>{t("add")}</AddButton>}
    </div>
  );
}
