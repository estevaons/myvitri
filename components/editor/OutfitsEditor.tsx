"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type DragEvent, type ReactNode } from "react";
import { importProductAction } from "@/app/actions";
import { InlineText } from "@/components/storefront/Storefront";
import { ProductArt } from "@/components/storefront/ProductIcon";
import { POST_MAX_ITEMS, postItems, type Post, type Product } from "@/lib/vitrine/types";
import { newProduct } from "./ProductForm";
import { FilePick } from "./ImageField";
import { inputCls, newId, reorder, type Update } from "./ui";
import { uploadImage } from "./upload";

export const newPost = (): Post => ({ id: newId(), photoUrl: "", caption: "", productIds: [] });

/** Outfit sem foto, legenda nem peças: não fica no rascunho. */
export const isBlankPost = (p: Post) => !p.photoUrl && !p.caption.trim() && p.productIds.length === 0;

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
  // fotos subindo, por outfit: a imagem do aparelho aparece na hora, antes de chegar ao servidor
  const [uploading, setUploading] = useState<Record<string, string>>({});
  const [photoError, setPhotoError] = useState("");

  const current = posts.find((p) => p.id === selected) ?? posts[0] ?? null;
  const index = current ? posts.indexOf(current) : -1;

  const setPosts = (fn: (ps: Post[]) => Post[]) => update((d) => ({ ...d, posts: fn(d.posts) }));
  const patchPost = (id: string, patch: Partial<Post>) => setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
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
  const select = (id: string) => {
    if (current && current.id !== id && isBlankPost(current) && !uploading[current.id]) setPosts((ps) => ps.filter((p) => p.id !== current.id));
    setSelected(id);
    setPhotoError("");
  };
  const create = () => {
    if (current && isBlankPost(current)) return;
    const p = newPost();
    setPosts((ps) => [p, ...ps]);
    setSelected(p.id);
    setPhotoError("");
  };
  const removeCurrent = () => {
    if (!current) return;
    const next = posts[index + 1] ?? posts[index - 1] ?? null;
    setPosts((ps) => ps.filter((p) => p.id !== current.id));
    setSelected(next?.id ?? null);
  };

  const sendPhoto = async (file: File) => {
    const id = ensure();
    setPhotoError("");
    const preview = URL.createObjectURL(file);
    setUploading((u) => ({ ...u, [id]: preview }));
    // sem rede a Server Action rejeita: a foto não pode ficar presa em "Enviando"
    const res = await uploadImage("post", file, tErrors("imageUnreadable")).catch(() => ({ ok: false as const, error: tErrors("offline") }));
    setUploading((u) => {
      const rest = { ...u };
      delete rest[id];
      return rest;
    });
    URL.revokeObjectURL(preview);
    if (!res.ok) return setPhotoError(res.error);
    patchPost(id, { photoUrl: res.url });
  };

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
  const missing = current && !isBlankPost(current) ? (!current.photoUrl && !uploading[current.id] ? t("missingPhoto") : items.length === 0 ? t("missingPieces") : null) : null;

  return (
    <div className="flex flex-col gap-4">
      {posts.length > 0 && (
        <div role="tablist" aria-label={t("list")} className="no-scrollbar flex items-end gap-2 overflow-x-auto pb-1">
          {posts.map((p, i) => {
            const on = p.id === current?.id;
            const photo = uploading[p.id] || p.photoUrl;
            const incomplete = !isBlankPost(p) && (!p.photoUrl || p.productIds.length === 0);
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
        <OutfitPhoto
          key={current?.id ?? "new"}
          url={current ? uploading[current.id] || current.photoUrl : ""}
          busy={Boolean(current && uploading[current.id])}
          error={photoError}
          onFile={sendPhoto}
        />

        <div className="flex min-w-0 flex-col gap-7 p-5 pb-6 @3xl:p-12 @6xl:p-16">
          <InlineText
            value={current?.caption ?? ""}
            onChange={(caption) => change({ caption })}
            maxLength={300}
            placeholder={t("captionPlaceholder")}
            label={t("caption")}
            className="-mx-2 rounded-[10px] px-2 py-1 text-left font-display! text-[clamp(24px,2.6cqw,36px)] leading-[1.15] font-normal transition-colors hover:bg-ink/[0.035] focus:bg-white"
          />

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

/**
 * A foto do outfit, no recorte 4:5 da vitrine. Sem foto, o quadro todo escolhe (ou recebe a imagem arrastada), com as
 * marcas de enquadramento nos cantos; com foto, "Trocar foto" aparece no hover (no toque, sempre).
 */
function OutfitPhoto({ url, busy, error, onFile }: { url: string; busy: boolean; error: string; onFile: (f: File) => void }) {
  const t = useTranslations("editor.posts");
  const [dragging, setDragging] = useState(false);
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
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) onFile(file);
    },
  };

  return (
    <div {...drop} className={`group/photo relative aspect-[4/5] overflow-hidden bg-sand/60 ${dragging ? "ring-2 ring-ink ring-inset" : ""}`}>
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- foto do aparelho (subindo) ou do bucket */}
          <img src={url} alt="" className={`absolute inset-0 size-full object-cover ${busy ? "opacity-70" : ""}`} />
          {busy ? (
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-ink/70 to-transparent px-4 pt-12 pb-5 text-[13px] font-semibold text-white">
              <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {t("sending")}
            </span>
          ) : (
            <FilePick
              onFile={onFile}
              disabled={false}
              className="absolute right-4 bottom-4 flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-ink opacity-0 shadow-[0_2px_10px_rgba(17,17,17,0.18)] transition-opacity group-hover/photo:opacity-100 has-focus-visible:opacity-100 has-focus-visible:ring-2 has-focus-visible:ring-ink pointer-coarse:opacity-100"
            >
              <CameraIcon size={16} />
              {t("changePhoto")}
            </FilePick>
          )}
        </>
      ) : (
        <FilePick
          onFile={onFile}
          disabled={false}
          className="group/pick absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 px-8 text-center has-focus-visible:ring-2 has-focus-visible:ring-ink has-focus-visible:ring-inset"
        >
          {/* as marcas de enquadramento, como no visor de uma câmera */}
          {(["top-5 left-5 border-t-2 border-l-2", "top-5 right-5 border-t-2 border-r-2", "bottom-5 left-5 border-b-2 border-l-2", "bottom-5 right-5 border-r-2 border-b-2"] as const).map((c) => (
            <span key={c} aria-hidden="true" className={`absolute size-7 border-ink/25 transition-colors group-hover/pick:border-ink/60 ${c}`} />
          ))}
          <span className="flex size-16 items-center justify-center rounded-full bg-ink text-white shadow-[0_6px_20px_rgba(17,17,17,0.22)] transition-transform group-hover/pick:scale-105">
            <CameraIcon size={26} />
          </span>
          <span className="text-[15px] font-semibold text-ink">{t("pickPhoto")}</span>
          <span className="max-w-[18rem] text-[13px] leading-snug text-mute">{t("photoHint")}</span>
        </FilePick>
      )}
      {error && (
        <span role="alert" className="absolute inset-x-4 top-4 rounded-[10px] bg-white px-3 py-2 text-center text-xs font-medium text-[#A3361B] shadow-[0_2px_10px_rgba(17,17,17,0.12)]">
          {error}
        </span>
      )}
    </div>
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
    const url = link.trim();
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
  const [armed, setArmed] = useState(false);
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
          onClick={() => {
            if (armed) return onRemove();
            setArmed(true);
            setTimeout(() => setArmed(false), 4000);
          }}
          onBlur={() => setArmed(false)}
          className={`min-h-10 cursor-pointer rounded-full border-0 px-3.5 text-[13px] font-medium text-[#A3361B] ${armed ? "bg-[#FFF1EC] font-semibold" : "bg-transparent hover:bg-[#FFF1EC]"}`}
        >
          {armed ? tSheet("confirmRemove") : t("remove")}
        </button>
      </div>
    </div>
  );
}
