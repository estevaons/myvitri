"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type DragEvent, type ReactNode } from "react";
import { importProductAction, importVideoAction } from "@/app/actions";
import { InlineText, PencilBadge } from "@/components/storefront/Storefront";
import { ProductArt } from "@/components/storefront/ProductIcon";
import { withHttps } from "@/lib/vitrine/links";
import { POST_MAX_ITEMS, POST_MAX_MEDIA, postCover, postItems, type Post, type PostMedia, type Product } from "@/lib/vitrine/types";
import { isTikTokShortLink, parseVideo, VIDEO_LABELS } from "@/lib/vitrine/video";
import { newProduct } from "./ProductForm";
import { FilePick } from "./ImageField";
import { inputCls, newId, reorder, type Update } from "./ui";
import { useConfirm } from "@/components/brand/ConfirmDialog";
import { useImageCrop } from "./ImageCrop";
import { uploadImage } from "./upload";

export const newPost = (): Post => ({ id: newId(), media: [], caption: "", productIds: [] });

/** Outfit sem foto nem vídeo, legenda ou peças: não fica no rascunho. */
export const isBlankPost = (p: Post) => p.media.length === 0 && !p.caption.trim() && p.productIds.length === 0;

/** Foto subindo: a imagem do aparelho aparece na hora, antes de chegar ao servidor. `replace`: troca a foto (ou capa) dessa mídia. */
type Pending = { post: string; preview: string; replace: boolean };

function CameraIcon({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

const XIcon = ({ size = 14 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/**
 * Os outfits configurados ali mesmo na vitrine, sem janela: o mesmo desenho do outfit publicado (a foto 4:5 e, ao lado,
 * a legenda e as peças), só que cada parte já é editável. Em cima, a fileira dos outfits para trocar qual está aberto e
 * criar outro. Sem nenhum outfit, o primeiro toque (foto, legenda ou peça) já cria o primeiro.
 */
export function OutfitsEditor({ posts, products, update }: { posts: Post[]; products: Product[]; update: Update }) {
  const t = useTranslations("editor.posts");
  const tErrors = useTranslations("errors");
  const [selected, setSelected] = useState<string | null>(posts[0]?.id ?? null);
  // a mídia aberta no quadro do outfit; "add" (ou nenhuma) é o quadro de adicionar
  const [open, setOpen] = useState<string | null>(null);
  // fotos subindo, pelo id da mídia
  const [uploading, setUploading] = useState<Record<string, Pending>>({});
  const [photoError, setPhotoError] = useState("");
  const [cropper, crop] = useImageCrop();

  const current = posts.find((p) => p.id === selected) ?? posts[0] ?? null;
  const index = current ? posts.indexOf(current) : -1;

  const setPosts = (fn: (ps: Post[]) => Post[]) => update((d) => ({ ...d, posts: fn(d.posts) }));
  const patchPost = (id: string, patch: Partial<Post>) => setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const setMedia = (postId: string, fn: (ms: PostMedia[]) => PostMedia[]) => setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, media: fn(p.media) } : p)));
  // o outfit aberto; sem nenhum, cria agora (entra na frente, como num feed)
  const ensure = () => {
    if (current) return current.id;
    const p = newPost();
    setPosts((ps) => [p, ...ps]);
    setSelected(p.id);
    return p.id;
  };
  const change = (patch: Partial<Post>) => patchPost(ensure(), patch);

  // trocar de outfit descarta o aberto se ele ficou em branco
  const busyIn = (postId: string) => Object.values(uploading).some((u) => u.post === postId);
  const select = (id: string) => {
    if (current && current.id !== id && isBlankPost(current) && !busyIn(current.id)) setPosts((ps) => ps.filter((p) => p.id !== current.id));
    setSelected(id);
    setOpen(null);
    setPhotoError("");
  };
  const create = () => {
    if (current && isBlankPost(current)) return;
    const p = newPost();
    setPosts((ps) => [p, ...ps]);
    setSelected(p.id);
    setOpen(null);
    setPhotoError("");
  };
  const removeCurrent = () => {
    if (!current) return;
    const next = posts[index + 1] ?? posts[index - 1] ?? null;
    setPosts((ps) => ps.filter((p) => p.id !== current.id));
    setSelected(next?.id ?? null);
    setOpen(null);
  };

  const media = current?.media ?? [];
  const pendingNew = Object.entries(uploading).filter(([id, u]) => u.post === current?.id && !u.replace && !media.some((m) => m.id === id));
  const room = POST_MAX_MEDIA - media.length - pendingNew.length;

  /**
   * Recorta e envia uma foto. Sem `replace`, ela entra no fim da galeria do outfit `postId`; com, vira a foto (ou a
   * capa do vídeo) da mídia `replace`. `postId` vem de quem chama: o `current` deste render pode não conhecer um outfit
   * que acabou de ser criado.
   */
  const sendPhoto = async (picked: File, postId: string, replace?: string, shape: "post" | "postVideo" = "post") => {
    const file = await crop(picked, shape);
    if (!file) return;
    const id = replace ?? newId();
    setPhotoError("");
    const preview = URL.createObjectURL(file);
    setUploading((u) => ({ ...u, [id]: { post: postId, preview, replace: Boolean(replace) } }));
    setOpen(id);
    // sem rede a Server Action rejeita: a foto não pode ficar presa em "Enviando"
    const res = await uploadImage("post", file, tErrors("imageUnreadable")).catch(() => ({ ok: false as const, error: tErrors("offline") }));
    setUploading((u) => {
      const rest = { ...u };
      delete rest[id];
      return rest;
    });
    URL.revokeObjectURL(preview);
    if (!res.ok) return setPhotoError(res.error);
    setMedia(postId, (ms) =>
      replace ? ms.map((m) => (m.id === id ? { ...m, photoUrl: res.url } : m)) : ms.length >= POST_MAX_MEDIA ? ms : [...ms, { id, photoUrl: res.url, videoUrl: "" }],
    );
  };

  // o recorte (e o "Enviando") de cada foto, uma depois da outra, na ordem escolhida; o que passar do limite fica de fora
  const addPhotos = async (files: File[]) => {
    const postId = ensure();
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length > room) setPhotoError(t("mediaFull", { max: POST_MAX_MEDIA }));
    for (const f of images.slice(0, Math.max(room, 0))) await sendPhoto(f, postId);
  };

  // vídeo já postado: entra na galeria, o texto vira a legenda (se ainda não há) e a capa passa pelo mesmo recorte e
  // envio da foto. Sem capa (o Instagram às vezes não deixa), o quadro daquele vídeo pede uma foto.
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState("");
  const sendVideo = async (link: string) => {
    setVideoError("");
    if (room <= 0) return setVideoError(t("mediaFull", { max: POST_MAX_MEDIA }));
    if (!parseVideo(link) && !isTikTokShortLink(link)) return setVideoError(tErrors("videoLink"));
    setVideoBusy(true);
    const res = await importVideoAction(link).catch(() => ({ ok: false as const, error: tErrors("offline") }));
    setVideoBusy(false);
    if (!res.ok) return setVideoError(res.error);
    const { url, caption, cover } = res.video;
    const postId = ensure();
    const id = newId();
    setPosts((ps) =>
      ps.map((p) => (p.id === postId ? { ...p, media: [...p.media, { id, photoUrl: "", videoUrl: url }], caption: p.caption.trim() ? p.caption : caption } : p)),
    );
    setOpen(id);
    setPhotoError("");
    const file = cover ? dataUrlFile(cover) : null;
    if (file) await sendPhoto(file, postId, id, "postVideo");
  };

  const removeMedia = (id: string) => {
    if (!current) return;
    const at = media.findIndex((m) => m.id === id);
    setMedia(current.id, (ms) => ms.filter((m) => m.id !== id));
    setOpen(media[at + 1]?.id ?? media[at - 1]?.id ?? null);
  };
  // a primeira mídia é a capa do outfit (cards da home e métricas)
  const makeCover = (id: string) => current && setMedia(current.id, (ms) => [...ms.filter((m) => m.id === id), ...ms.filter((m) => m.id !== id)]);

  // o quadro mostra a mídia aberta (ou subindo); sem ela, o de adicionar
  const shown = open === "add" ? null : (media.find((m) => m.id === open) ?? (open && uploading[open] ? null : (media[0] ?? null)));
  const shownPending = open && open !== "add" && uploading[open] ? uploading[open] : null;
  const shownIndex = shown ? media.indexOf(shown) : -1;

  const tagged = current?.productIds ?? [];
  const full = tagged.length >= POST_MAX_ITEMS;
  const toggle = (productId: string) => change({ productIds: tagged.includes(productId) ? tagged.filter((x) => x !== productId) : [...tagged, productId] });
  // a peça nova vira produto da vitrine e já entra no outfit aberto
  const addPiece = (patch: Partial<Product>) => {
    const id = ensure();
    const p = newProduct(patch);
    update((d) => ({ ...d, products: [...d.products, p], posts: d.posts.map((x) => (x.id === id ? { ...x, productIds: [...x.productIds, p.id] } : x)) }));
  };

  const items = current ? postItems(current, products) : [];
  const missing =
    current && !isBlankPost(current)
      ? media.length === 0 && pendingNew.length === 0
        ? t("missingPhoto")
        : media.some((m) => !m.photoUrl && !uploading[m.id])
          ? t("missingCover")
          : items.length === 0
            ? t("missingPieces")
            : null
      : null;

  return (
    <div className="flex flex-col gap-4">
      {cropper}
      {posts.length > 0 && (
        <div role="tablist" aria-label={t("list")} className="no-scrollbar flex items-end gap-2 overflow-x-auto pb-1">
          {posts.map((p, i) => {
            const on = p.id === current?.id;
            const photo = postCover(p) || Object.values(uploading).find((u) => u.post === p.id)?.preview;
            const incomplete = !isBlankPost(p) && (p.media.length === 0 || p.media.some((m) => !m.photoUrl) || p.productIds.length === 0);
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={t("outfitN", { n: i + 1 })}
                onClick={() => select(p.id)}
                className={`relative aspect-[4/5] w-12 flex-none cursor-pointer overflow-hidden border-0 bg-cream p-0 transition-[box-shadow,opacity] ${on ? "shadow-[0_0_0_2px_white,0_0_0_4px_var(--color-ink)]" : "opacity-60 hover:opacity-100"}`}
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- foto do outfit (do aparelho, subindo, ou do bucket)
                  <img src={photo} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center font-display text-[17px] text-ink/40">{i + 1}</span>
                )}
                {incomplete && <span aria-hidden="true" className="absolute top-1 right-1 size-2 rounded-full bg-[#E8590C] ring-2 ring-white" />}
              </button>
            );
          })}
          <button
            type="button"
            onClick={create}
            className="flex h-[60px] flex-none cursor-pointer items-center gap-1.5 border border-dashed border-ink/25 bg-transparent px-3.5 text-[12px] font-semibold tracking-[0.1em] text-ink uppercase hover:border-ink"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("newOutfit")}
          </button>
        </div>
      )}

      <div className="flex flex-col bg-cream @3xl:grid @3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col">
          <MediaFrame
            key={`${current?.id ?? "new"}:${shown?.id ?? shownPending?.preview ?? "add"}`}
            media={shown}
            preview={shownPending?.preview ?? (shown && uploading[shown.id]?.preview) ?? ""}
            first={shownIndex === 0}
            count={media.length + pendingNew.length}
            room={room}
            videoBusy={videoBusy}
            error={photoError || videoError}
            onFiles={addPhotos}
            onReplace={(f) => shown && current && sendPhoto(f, current.id, shown.id)}
            onVideo={sendVideo}
            onRemove={() => shown && removeMedia(shown.id)}
            onMakeCover={() => shown && makeCover(shown.id)}
            onClearError={() => setVideoError("")}
          />
          {(media.length > 0 || pendingNew.length > 0) && (
            <MediaStrip
              media={media}
              pending={pendingNew.map(([id, u]) => ({ id, preview: u.preview }))}
              uploading={uploading}
              open={shown?.id ?? (shownPending ? open : "add")}
              canAdd={room > 0}
              onOpen={(id) => {
                setOpen(id);
                setPhotoError("");
                setVideoError("");
              }}
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-7 p-5 pb-6 @3xl:p-12 @6xl:p-16">
          {/* o lápis no canto diz que a legenda é editável; some com o cursor dentro */}
          <div className="group/caption relative">
            <InlineText
              value={current?.caption ?? ""}
              onChange={(caption) => change({ caption })}
              maxLength={300}
              placeholder={t("captionPlaceholder")}
              label={t("caption")}
              className="-mx-2 rounded-[10px] py-1 pr-12 pl-2 text-left font-display! text-[clamp(24px,2.6cqw,36px)] leading-[1.15] font-normal transition-colors hover:bg-ink/[0.035] focus:bg-white"
            />
            <PencilBadge className="absolute top-0.5 -right-1 group-has-focus/caption:opacity-0" />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-medium tracking-[0.22em] text-gold uppercase">{t("pieces", { n: tagged.length, max: POST_MAX_ITEMS })}</span>
            {items.length > 0 && (
              <ul className="m-0 flex list-none flex-col p-0">
                {items.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 border-b border-ink/10 py-3 last:border-0">
                    <PieceThumb product={p} className="size-14 bg-white @3xl:size-16" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {p.brand && <span className="truncate text-[11px] font-medium tracking-[0.18em] text-mute uppercase">{p.brand}</span>}
                      <span className="truncate text-[15px] leading-snug font-medium">{p.name || t("unnamed")}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={t("untag", { name: p.name || t("unnamed") })}
                      title={t("untag", { name: p.name || t("unnamed") })}
                      onClick={() => toggle(p.id)}
                      className="flex size-10 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-mute hover:bg-white hover:text-[#A3361B]"
                    >
                      <XIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex flex-col gap-2.5">
              <PieceByLink full={full} onAdd={addPiece} />
              {/* as já marcadas estão na lista acima, com o X para tirar */}
              {!full && products.some((p) => !tagged.includes(p.id)) && <ProductPicker products={products.filter((p) => !tagged.includes(p.id))} onPick={toggle} />}
            </div>
          </div>

          {current && (
            <OutfitFooter
              missing={missing}
              pos={index + 1}
              total={posts.length}
              onMove={(to) => setPosts((ps) => reorder(ps, index, to))}
              onRemove={removeCurrent}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** A capa que a Server Action devolve (data URL) como arquivo, para o recorte e o envio de sempre. */
function dataUrlFile(dataUrl: string) {
  const m = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], `capa.${m[1].split("/")[1]}`, { type: m[1] });
}

const PlayIcon = ({ size = 22 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);

/**
 * O quadro 4:5 do outfit, com a mídia aberta. Sem mídia (o "+"), o quadro todo escolhe fotos (várias de uma vez) ou
 * recebe as arrastadas, com as marcas de enquadramento nos cantos, e embaixo dá para colar o link de um vídeo já
 * postado. Com mídia, no hover (no toque, sempre): trocar a foto ou a capa, usar como capa do outfit e tirar.
 * Vídeo sem capa (a rede não deixou puxar) pede uma foto no lugar.
 */
function MediaFrame({
  media,
  preview,
  first,
  count,
  room,
  videoBusy,
  error,
  onFiles,
  onReplace,
  onVideo,
  onRemove,
  onMakeCover,
  onClearError,
}: {
  media: PostMedia | null;
  /** a foto do aparelho subindo (nova ou trocando a desta mídia) */
  preview: string;
  first: boolean;
  /** quantas fotos e vídeos o outfit já tem */
  count: number;
  /** quantas mídias ainda cabem */
  room: number;
  videoBusy: boolean;
  error: string;
  onFiles: (fs: File[]) => void;
  onReplace: (f: File) => void;
  onVideo: (link: string) => Promise<void>;
  onRemove: () => void;
  onMakeCover: () => void;
  onClearError: () => void;
}) {
  const t = useTranslations("editor.posts");
  const [dragging, setDragging] = useState(false);
  const ref = media?.videoUrl ? parseVideo(media.videoUrl) : null;
  const url = preview || media?.photoUrl || "";
  const busy = Boolean(preview);
  const many = count > 1;
  const adding = !media && !busy;
  const drop = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    // passar por cima de um elemento de dentro também dispara o evento: só conta sair da área
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
      if (files.length) return media ? onReplace(files[0]) : onFiles(files);
      // link arrastado (da barra de endereço ou de outra aba) vira vídeo novo
      const link = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
      if (link.trim() && room > 0) void onVideo(link.trim().split("\n")[0]);
    },
  };
  const pill =
    "flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-white px-4 text-[13px] font-semibold text-ink shadow-[0_2px_10px_rgba(17,17,17,0.18)] focus-visible:ring-2 focus-visible:ring-ink";

  return (
    <div {...drop} className={`group/photo relative aspect-[4/5] overflow-hidden bg-sand/60 ${dragging ? "ring-2 ring-ink ring-inset" : ""}`}>
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- foto do aparelho (subindo) ou do bucket */}
          <img src={url} alt="" className={`absolute inset-0 size-full object-cover ${busy ? "opacity-70" : ""}`} />
          {ref && !busy && (
            <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 flex size-16 -translate-1/2 items-center justify-center rounded-full bg-white/90 pl-1 text-ink shadow-[0_6px_20px_rgba(17,17,17,0.22)]">
              <PlayIcon size={26} />
            </span>
          )}
          {busy ? (
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-ink/70 to-transparent px-4 pt-12 pb-5 text-[13px] font-semibold text-white">
              <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {t("sending")}
            </span>
          ) : (
            <div className="absolute inset-x-4 bottom-4 flex flex-wrap justify-end gap-2 opacity-0 transition-opacity group-hover/photo:opacity-100 has-focus-visible:opacity-100 pointer-coarse:opacity-100">
              {many && !first && (
                <button type="button" onClick={onMakeCover} className={pill}>
                  {t("makeCover")}
                </button>
              )}
              <FilePick onFile={onReplace} disabled={false} className={`${pill} has-focus-visible:ring-2 has-focus-visible:ring-ink`}>
                <CameraIcon size={16} />
                {t(ref ? "changeCover" : "changePhoto")}
              </FilePick>
              <button type="button" onClick={onRemove} aria-label={t(ref ? "removeVideo" : "removePhoto")} title={t(ref ? "removeVideo" : "removePhoto")} className={`${pill} px-3 text-[#A3361B]`}>
                <TrashIcon />
              </button>
            </div>
          )}
          {first && many && !busy && (
            <span className="absolute top-4 right-4 rounded-full bg-ink px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-white uppercase">{t("cover")}</span>
          )}
        </>
      ) : (
        <>
          <FilePick
            onFile={media ? onReplace : undefined}
            onFiles={media ? undefined : onFiles}
            disabled={false}
            className={`group/pick absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 px-8 text-center has-focus-visible:ring-2 has-focus-visible:ring-ink has-focus-visible:ring-inset ${adding ? "pb-36" : ""}`}
          >
            {/* as marcas de enquadramento, como no visor de uma câmera */}
            {(["top-5 left-5 border-t-2 border-l-2", "top-5 right-5 border-t-2 border-r-2", "bottom-5 left-5 border-b-2 border-l-2", "bottom-5 right-5 border-r-2 border-b-2"] as const).map((c) => (
              <span key={c} aria-hidden="true" className={`absolute size-7 border-ink/25 transition-colors group-hover/pick:border-ink/60 ${c}`} />
            ))}
            <span className="flex size-16 items-center justify-center rounded-full bg-ink text-white shadow-[0_6px_20px_rgba(17,17,17,0.22)] transition-transform group-hover/pick:scale-105">
              <CameraIcon size={26} />
            </span>
            <span className="text-[15px] font-semibold text-ink">{t(ref ? "pickCover" : count > 0 ? "pickMore" : "pickPhoto")}</span>
            <span className="max-w-[18rem] text-[13px] leading-snug text-mute">{t(ref ? "coverHint" : "photoHint")}</span>
          </FilePick>
          {/* fora do <label> da foto: tocar no campo não abre a galeria */}
          {adding && (
            <div className="absolute inset-x-8 bottom-14 flex flex-col gap-2.5 @3xl:inset-x-12">
              <span className="flex items-center gap-3 text-[11px] font-medium tracking-[0.18em] text-mute uppercase">
                <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
                {t("videoOr")}
                <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
              </span>
              <VideoLink busy={videoBusy} onVideo={onVideo} onType={onClearError} />
            </div>
          )}
          {ref && (
            <button type="button" onClick={onRemove} className="absolute right-4 bottom-4 min-h-10 cursor-pointer rounded-full border-0 bg-transparent px-3.5 text-[13px] font-medium text-[#A3361B] hover:bg-[#FFF1EC]">
              {t("removeVideo")}
            </button>
          )}
        </>
      )}
      {ref && !busy && (
        <span className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ink shadow-[0_2px_10px_rgba(17,17,17,0.12)]">
          <PlayIcon size={10} />
          {t("videoOn", { network: VIDEO_LABELS[ref.network] })}
        </span>
      )}
      {error && (
        <span role="alert" className={`absolute inset-x-4 ${ref ? "top-16" : "top-4"} rounded-[10px] bg-white px-3 py-2 text-center text-xs font-medium text-[#A3361B] shadow-[0_2px_10px_rgba(17,17,17,0.12)]`}>
          {error}
        </span>
      )}
    </div>
  );
}

const TrashIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

/**
 * As fotos e vídeos do outfit, embaixo do quadro, na ordem da galeria (a primeira é a capa): tocar abre no quadro; o
 * "+" volta ao quadro de adicionar. Vídeo tem o play; vídeo sem capa, o ponto laranja de "falta".
 */
function MediaStrip({
  media,
  pending,
  uploading,
  open,
  canAdd,
  onOpen,
}: {
  media: PostMedia[];
  pending: { id: string; preview: string }[];
  uploading: Record<string, Pending>;
  open: string | null;
  canAdd: boolean;
  onOpen: (id: string) => void;
}) {
  const t = useTranslations("editor.posts");
  const tiles = [...media.map((m) => ({ id: m.id, src: uploading[m.id]?.preview || m.photoUrl, video: Boolean(m.videoUrl) })), ...pending.map((p) => ({ id: p.id, src: p.preview, video: false }))];
  return (
    <div className="flex flex-col gap-2 px-4 pt-3 pb-1 @3xl:px-5">
      <span className="text-[12px] font-medium tracking-[0.22em] text-gold uppercase">{t("media", { n: tiles.length, max: POST_MAX_MEDIA })}</span>
      <div role="tablist" aria-label={t("mediaList")} className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1.5">
        {tiles.map((m, i) => {
          const on = m.id === open;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={t(m.video ? "videoN" : "photoN", { n: i + 1 })}
              onClick={() => onOpen(m.id)}
              className={`relative aspect-[4/5] w-12 flex-none cursor-pointer overflow-hidden border-0 bg-sand p-0 transition-[box-shadow,opacity] ${on ? "shadow-[0_0_0_2px_var(--color-cream),0_0_0_4px_var(--color-ink)]" : "opacity-70 hover:opacity-100"}`}
            >
              {m.src && (
                // eslint-disable-next-line @next/next/no-img-element -- foto do outfit (do aparelho, subindo, ou do bucket)
                <img src={m.src} alt="" className="size-full object-cover" />
              )}
              {m.video && (
                <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-white [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.5))]">
                  <PlayIcon size={16} />
                </span>
              )}
              {!m.src && <span aria-hidden="true" className="absolute top-1 right-1 size-2 rounded-full bg-[#E8590C] ring-2 ring-white" />}
            </button>
          );
        })}
        {canAdd && (
          <button
            type="button"
            role="tab"
            aria-selected={open === "add"}
            aria-label={t("addMedia")}
            title={t("addMedia")}
            onClick={() => onOpen("add")}
            className={`flex aspect-[4/5] w-12 flex-none cursor-pointer items-center justify-center border border-dashed bg-transparent p-0 text-ink ${open === "add" ? "border-ink" : "border-ink/30 hover:border-ink"}`}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * O campo para colar o link do vídeo. Colar já busca (no celular é o gesto todo: copiar no app da rede, colar aqui);
 * digitar pede o "Usar".
 */
function VideoLink({ busy, onVideo, onType }: { busy: boolean; onVideo: (link: string) => Promise<void>; onType: () => void }) {
  const t = useTranslations("editor.posts");
  const [link, setLink] = useState("");
  const submit = (value: string) => {
    if (!value.trim() || busy) return;
    void onVideo(value.trim());
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(link);
      }}
      className="flex gap-2"
    >
      <input
        value={link}
        onChange={(e) => {
          setLink(e.target.value);
          onType();
        }}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData("text").trim();
          if (!pasted) return;
          e.preventDefault();
          setLink(pasted);
          submit(pasted);
        }}
        disabled={busy}
        placeholder={t("videoPlaceholder")}
        aria-label={t("videoLabel")}
        inputMode="url"
        className={`${inputCls} min-w-0 flex-1 bg-white disabled:opacity-70`}
      />
      <button
        type="submit"
        disabled={busy || !link.trim()}
        className="flex min-h-11 flex-none cursor-pointer items-center gap-2 rounded-[10px] border-0 bg-ink px-4 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-40"
      >
        {busy && <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {busy ? t("videoBusy") : t("videoUse")}
      </button>
    </form>
  );
}

/**
 * Colar o link de uma peça e ela entra no outfit: a gente puxa nome, marca e foto (`importProductAction`) e cria o produto
 * na vitrine. Se a busca falhar, dá para adicionar só com o link e completar depois em Produtos.
 */
function PieceByLink({ full, onAdd }: { full: boolean; onAdd: (patch: Partial<Product>) => void }) {
  const t = useTranslations("editor.posts");
  const tProducts = useTranslations("editor.products");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, start] = useTransition();

  const add = (patch: Partial<Product>) => {
    onAdd(patch);
    setLink("");
    setError(null);
    setFailed(false);
  };

  const search = () => {
    // "nike.com.br/camiseta" também vale: o campo mostra o link completo que vai ser buscado
    const url = withHttps(link);
    setLink(url);
    if (!/^https?:\/\//i.test(url)) return setError(tProducts("fullLink"));
    setError(null);
    start(async () => {
      const res = await importProductAction(url);
      if (!res.ok) {
        setError(t("importFailed"));
        return setFailed(true);
      }
      const { name, brand, imageUrl, available } = res.product;
      // o link fica como foi colado: trocá-lo pelo endereço final da loja poderia perder a comissão do afiliado
      add({ name, brand, imageUrl, url, soldOut: available === false });
    });
  };

  if (full) return <span className="text-[13px] text-mute">{t("full", { max: POST_MAX_ITEMS })}</span>;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        search();
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <input
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            setFailed(false);
          }}
          placeholder={t("piecePlaceholder")}
          aria-label={t("pieceLink")}
          inputMode="url"
          className={`${inputCls} min-w-0 flex-1 bg-white`}
        />
        <button
          type="submit"
          disabled={busy || !link.trim()}
          className="min-h-11 flex-none cursor-pointer rounded-[10px] border-0 bg-ink px-4 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-40"
        >
          {busy ? t("adding") : t("addPiece")}
        </button>
      </div>
      {error ? (
        <span role="alert" className="text-[13px] leading-snug font-medium text-[#A3361B]">
          {error}{" "}
          {failed && (
            <button
              type="button"
              onClick={() => add({ url: link.trim(), name: hostOf(link.trim()) })}
              className="border-0 bg-transparent p-0 font-semibold text-ink underline underline-offset-2"
            >
              {t("addAnyway")}
            </button>
          )}
        </span>
      ) : (
        <span className="text-[12px] leading-snug text-mute">{t("pieceHint")}</span>
      )}
    </form>
  );
}

/** O domínio da loja ("loja.com"), para a peça só com o link não aparecer sem nome na vitrine; dá para trocar em Produtos. */
function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Miniatura quadrada de uma peça, como na vitrine: a foto inteira sobre o fundo. */
function PieceThumb({ product, className }: { product: Product; className: string }) {
  return (
    <span aria-hidden="true" className={`relative flex flex-none items-center justify-center overflow-hidden ${className}`}>
      <ProductArt product={product} iconClassName="w-[64%]" strokeWidth={4} />
    </span>
  );
}

/** Os produtos da vitrine que ainda não estão no outfit, numa fileira: tocar marca a peça. */
function ProductPicker({ products, onPick }: { products: Product[]; onPick: (id: string) => void }) {
  const t = useTranslations("editor.posts");
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] text-mute">{t("fromProducts", { count: products.length })}</span>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
        {products.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-label={t("tag", { name: p.name || t("unnamed") })}
            title={p.name || t("unnamed")}
            onClick={() => onPick(p.id)}
            className="group/pick relative size-14 flex-none cursor-pointer border-0 bg-white p-0 transition-shadow hover:shadow-[0_0_0_2px_var(--color-ink)]"
          >
            <PieceThumb product={p} className="size-full" />
            <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-white opacity-0 transition-opacity group-hover/pick:opacity-100 pointer-coarse:opacity-100">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Embaixo do outfit aberto: o que falta para ele aparecer, a posição (setas) e excluir (pede um segundo toque). */
function OutfitFooter({
  missing,
  pos,
  total,
  onMove,
  onRemove,
}: {
  missing: string | null;
  pos: number;
  total: number;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("editor.posts");
  const tSheet = useTranslations("editor.sheet");
  const [confirmDialog, ask] = useConfirm();
  const arrow =
    "flex size-9 flex-none cursor-pointer items-center justify-center rounded-full border border-ink/15 bg-transparent p-0 text-ink hover:border-ink disabled:cursor-default disabled:opacity-30";
  const chevron = (d: string): ReactNode => (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
  return (
    <div className="mt-auto flex flex-col gap-3 border-t border-ink/10 pt-4">
      {missing && (
        <span className="flex items-center gap-2 text-[13px] text-[#7A5200]">
          <span aria-hidden="true" className="size-2 flex-none rounded-full bg-[#E8590C]" />
          {missing}
        </span>
      )}
      <div className="flex items-center justify-between gap-3">
        {total > 1 ? (
          <div className="flex items-center gap-2">
            <button type="button" aria-label={tSheet("moveBefore")} title={tSheet("moveBefore")} disabled={pos <= 1} onClick={() => onMove(pos - 2)} className={arrow}>
              {chevron("M15 5l-7 7 7 7")}
            </button>
            <span className="text-[13px] text-mute tabular-nums">
              {pos}/{total}
            </span>
            <button type="button" aria-label={tSheet("moveAfter")} title={tSheet("moveAfter")} disabled={pos >= total} onClick={() => onMove(pos)} className={arrow}>
              {chevron("M9 5l7 7-7 7")}
            </button>
          </div>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={async () => {
            if (await ask({ title: t("removeTitle"), confirm: tSheet("remove"), danger: true })) onRemove();
          }}
          className="min-h-10 cursor-pointer rounded-full border-0 bg-transparent px-3.5 text-[13px] font-medium text-[#A3361B] hover:bg-[#FFF1EC]"
        >
          {t("remove")}
        </button>
        {confirmDialog}
      </div>
    </div>
  );
}
