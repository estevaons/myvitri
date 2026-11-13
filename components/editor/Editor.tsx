"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import { publishVitrine, saveDraftAction, updateAvatarAction } from "@/app/actions";
import { BackLink } from "@/components/brand/BackLink";
import { Wordmark } from "@/components/brand/Logo";
import { AccountMenu, type Account } from "@/components/home/AccountMenu";
import { CoverPicker } from "@/components/home/CoverPicker";
import { Link, useRouter, vitrineHref } from "@/lib/i18n/navigation";
import { BRAND } from "@/lib/brand";
import { Storefront, type StorefrontEdit } from "@/components/storefront/Storefront";
import { vitrineAddress } from "@/lib/vitrine/links";
import { pickProfile, type Coupon, type Product, type VitrineContent } from "@/lib/vitrine/types";
import { CouponForm, isBlankCoupon, newCoupon } from "./CouponForm";
import { useImageCrop } from "./ImageCrop";
import { IMAGE_ACCEPT, uploadImage } from "./upload";
import { isBlankPost, OutfitsEditor } from "./OutfitsEditor";
import { isBlankProduct, newProduct, ProductForm, ProductImport } from "./ProductForm";
import { SocialsForm } from "./SocialsForm";
import { Sheet, SheetFooter } from "./Sheet";
import { reorder, type Update } from "./ui";

/** O que está aberto na janela de edição. `isNew`: o item acabou de ser criado e sai do rascunho se fechar em branco. */
type Open =
  | { kind: "coupon"; id: string; isNew: boolean }
  | { kind: "product"; id: string; isNew: boolean; notice?: string }
  | { kind: "productNew" }
  | { kind: "socials" }
  | { kind: "cover" };

/** `?tab=` (links das métricas e de versões antigas do editor) → a seção da vitrine para onde o editor rola ao abrir. */
const SECTION_OF: Record<string, string> = { coupons: "cupons", products: "produtos", outfits: "outfits" };

/** Listas da vitrine que a janela de edição reordena. */
const dropBlanks = (c: VitrineContent): VitrineContent => ({
  ...c,
  coupons: c.coupons.filter((x) => !isBlankCoupon(x)),
  products: c.products.filter((x) => !isBlankProduct(x)),
  posts: c.posts.filter((x) => !isBlankPost(x)),
});

type ListKey = "coupons" | "products" | "posts";

/**
 * O editor é a própria vitrine: tocar em qualquer parte (capa, foto, textos, cupom, produto, outfit) abre a janela de
 * edição dela, e cada seção tem o card "+" para adicionar. As mudanças vão para o rascunho (salvo sozinho no servidor) e
 * só chegam à vitrine pública ao Publicar, que só aparece quando há o que publicar.
 */
export function Editor({
  published: initialPublished,
  draft: initialDraft,
  account,
  initialTab,
}: {
  published: VitrineContent;
  draft: VitrineContent | null;
  account: Account;
  /** valor de ?tab= na URL: a seção para onde rolar ao abrir */
  initialTab?: string;
}) {
  const t = useTranslations("editor");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  // um item novo em branco que ficou no rascunho (a página recarregou com a janela dele aberta) some ao abrir o editor,
  // como sumiria ao fechar a janela; o autosave grava a limpeza
  const [draft, setDraft] = useState(() => dropBlanks(initialDraft ?? initialPublished));
  const [published, setPublished] = useState(initialPublished);
  // O que já está guardado no servidor (rascunho ou, sem rascunho, a versão publicada).
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initialDraft ?? initialPublished));
  const [saveFailed, setSaveFailed] = useState(false);
  const [open, setOpen] = useState<Open | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [saving, startSaving] = useTransition();
  const [sendingPhoto, startPhoto] = useTransition();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [cropper, crop] = useImageCrop();

  // O estado acima só lê as props ao montar, e o Next mantém a tela viva ao navegar: nome, link, foto e capa, que mudam nas
  // Configurações, na home e aqui mesmo (salvos na hora, com router.refresh), entram sem tocar no que a pessoa está editando.
  const profileJson = JSON.stringify(pickProfile(initialPublished));
  const [seenProfile, setSeenProfile] = useState(profileJson);
  if (profileJson !== seenProfile) {
    const profile = pickProfile(initialPublished);
    setSeenProfile(profileJson);
    setDraft((d) => ({ ...d, ...profile }));
    setPublished((p) => ({ ...p, ...profile }));
    setSavedJson((s) => JSON.stringify({ ...JSON.parse(s), ...profile }));
  }

  const draftJson = JSON.stringify(draft);
  const dirty = draftJson !== JSON.stringify(published);
  const unsaved = draftJson !== savedJson;
  const update: Update = (fn) => setDraft((d) => fn(d));

  // Autosave: cada mudança vira rascunho no servidor logo depois que a pessoa para de mexer.
  useEffect(() => {
    if (!unsaved) return;
    const t = setTimeout(async () => {
      const res = await saveDraftAction(dirty ? draft : null);
      setSaveFailed(!res.ok);
      if (res.ok) setSavedJson(draftJson);
    }, 800);
    return () => clearTimeout(t);
  }, [draft, draftJson, dirty, unsaved]);

  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  // ?tab=coupons (vindo das métricas): rola até a seção, descontando o cabeçalho preso no topo
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = initialTab && SECTION_OF[initialTab] ? document.getElementById(SECTION_OF[initialTab]) : null;
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (header.current?.offsetHeight ?? 0) - 8 });
  }, [initialTab]);

  const publish = () => {
    const snapshot = draft;
    setError(null);
    startSaving(async () => {
      const res = await publishVitrine(snapshot);
      if (res.ok) {
        setPublished(snapshot);
        // publicar apaga o rascunho no servidor
        setSavedJson(JSON.stringify(snapshot));
      } else setError(res.error);
    });
  };

  // A foto de perfil não passa pelo rascunho: salva na hora, como na home (o perfil novo chega pelo router.refresh).
  const sendAvatar = async (picked: File) => {
    const file = await crop(picked, "avatar");
    if (!file) return;
    setPhotoError("");
    startPhoto(async () => {
      const up = await uploadImage("avatar", file, tErrors("imageUnreadable"));
      const res = up.ok ? await updateAvatarAction(up.url) : up;
      if (!res.ok) return setPhotoError(res.error);
      router.refresh();
    });
  };

  /* Itens: criar, mudar, mover, excluir. */
  const add = <K extends ListKey>(key: K, item: VitrineContent[K][number]) => update((d) => ({ ...d, [key]: [...d[key], item] }));
  const patch = <K extends ListKey>(key: K, id: string, p: Partial<VitrineContent[K][number]>) =>
    update((d) => ({ ...d, [key]: (d[key] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const move = (key: ListKey, from: number, to: number) => update((d) => ({ ...d, [key]: reorder(d[key] as { id: string }[], from, to) }));
  const remove = (key: ListKey, id: string) => {
    update((d) => ({
      ...d,
      coupons: key === "coupons" ? d.coupons.filter((c) => c.id !== id) : d.coupons,
      // o cupom some dos produtos ligados a ele, e o produto some dos outfits
      products: key === "products" ? d.products.filter((p) => p.id !== id) : key === "coupons" ? d.products.map((p) => (p.couponId === id ? { ...p, couponId: null } : p)) : d.products,
      posts: key === "posts" ? d.posts.filter((p) => p.id !== id) : key === "products" ? d.posts.map((p) => ({ ...p, productIds: p.productIds.filter((x) => x !== id) })) : d.posts,
    }));
    setOpen(null);
  };

  // Fechar um item novo ainda em branco desfaz a criação: tocar no "+" e desistir não deixa card vazio na vitrine.
  const close = () => {
    if (open && "isNew" in open && open.isNew) {
      const key = open.kind === "coupon" ? "coupons" : "products";
      const item = (draft[key] as { id: string }[]).find((x) => x.id === open.id);
      const blank = item && (open.kind === "coupon" ? isBlankCoupon(item as Coupon) : isBlankProduct(item as Product));
      if (blank) update((d) => ({ ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== open.id) }));
    }
    setOpen(null);
  };

  const edit: StorefrontEdit = {
    cover: () => setOpen({ kind: "cover" }),
    avatar: () => avatarInput.current?.click(),
    avatarBusy: sendingPhoto,
    text: (patch) => update((d) => ({ ...d, ...patch })),
    socials: () => setOpen({ kind: "socials" }),
    coupon: (id) => {
      if (id) return setOpen({ kind: "coupon", id, isNew: false });
      const c = newCoupon();
      add("coupons", c);
      setOpen({ kind: "coupon", id: c.id, isNew: true });
    },
    product: (id) => setOpen(id ? { kind: "product", id, isNew: false } : { kind: "productNew" }),
    favorite: (id, on) => patch("products", id, { favorite: on }),
    outfits: <OutfitsEditor posts={draft.posts} products={draft.products} update={update} />,
  };

  // a navegação é no cliente: sem isso, o rascunho que ainda não foi salvo se perderia sem aviso
  const confirmLeave = (e: MouseEvent) => {
    if (unsaved && !confirm(t("leaveConfirm"))) e.preventDefault();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header ref={header} className="sticky top-0 z-30 border-b border-[#E0DCD3] bg-white">
        {/* a barra vai de ponta a ponta, mas o conteúdo segue a mesma largura do /inicio e da vitrine (1440px, px-5 / md:px-12) */}
        <div className="mx-auto box-border flex w-full max-w-[1440px] items-center gap-3.5 px-5 py-3 md:px-12 max-sm:gap-2.5 max-sm:px-3">
          <BackLink href="/inicio" onClick={confirmLeave} label="home" labelClass="max-sm:hidden" divider />
          <Link href="/inicio" onClick={confirmLeave} aria-label={tCommon("brandHome", { brand: BRAND })} className="flex text-ink no-underline max-sm:hidden">
            <Wordmark label="" className="h-[17px] w-auto" />
          </Link>
          <div className="flex-1" />
          {/* só com alterações: o aviso e o botão de publicar. No celular vira uma barra presa embaixo da tela, perto do polegar. */}
          {dirty && (
            <div className="flex items-center gap-3.5 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-30 max-sm:justify-between max-sm:border-t max-sm:border-[#E0DCD3] max-sm:bg-white max-sm:px-4 max-sm:pt-2.5 max-sm:pb-[max(10px,env(safe-area-inset-bottom))] max-sm:shadow-[0_-4px_16px_rgba(17,17,17,0.06)]">
              <span role="status" className={`flex items-center gap-2 text-[13px] font-medium ${saveFailed ? "text-[#A3361B]" : "text-ink"}`}>
                <span aria-hidden="true" className={`size-2 flex-none rounded-full ${saveFailed ? "bg-[#A3361B]" : "bg-[#E8590C]"}`} />
                {saveFailed ? t("draftFailed") : t("unpublished")}
              </span>
              <button type="button" onClick={publish} disabled={saving} className="min-h-11 flex-none cursor-pointer rounded-full border-0 bg-ink px-6 text-sm font-bold text-white transition-opacity hover:opacity-85 disabled:cursor-default disabled:opacity-60">
                {saving ? t("publishing") : t("publish")}
              </button>
            </div>
          )}
          {/* sem alterações pendentes (ou logo depois de publicar), o que está aqui é o que está no ar: dá para ir ver a vitrine pública */}
          {!dirty && (
            <Link
              href={vitrineHref(published.handle)}
              onClick={confirmLeave}
              className="flex min-h-11 flex-none items-center gap-2 rounded-full border border-ink px-5 text-sm font-bold text-ink no-underline transition-colors hover:bg-ink hover:text-white max-sm:min-h-10 max-sm:px-4"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {t("viewVitrine")}
            </Link>
          )}
          <AccountMenu account={account} onLeave={confirmLeave} />
        </div>
        {(error || photoError) && (
          <div role="alert" className="border-t border-[#F1C9BC] bg-[#FFF1EC] text-sm font-semibold text-[#A3361B]">
            <div className="mx-auto box-border flex w-full max-w-[1440px] items-center gap-3 px-5 py-2.5 md:px-12">
              <span className="flex-1">{error ? t("publishError", { error }) : photoError}</span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPhotoError("");
                }}
                className="border-0 bg-transparent text-sm font-bold text-[#A3361B] underline"
              >
                {t("close")}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className={`mx-auto box-border flex w-full max-w-[1440px] flex-1 flex-col items-center gap-4 px-5 py-6 md:px-12 max-sm:px-0 max-sm:pt-0 ${dirty ? "max-sm:pb-24" : "max-sm:pb-6"}`}>
        <p className="m-0 w-full text-[13px] leading-snug text-[#5E5A52] max-sm:px-4 max-sm:pt-3">{t("editHint")}</p>
        {/* flex-none: a vitrine cresce com o conteúdo e quem rola é a página */}
        <div
          className="w-full flex-none overflow-hidden bg-white sm:rounded-2xl sm:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_20px_50px_rgba(17,17,17,0.12)]"
        >
          <div className="flex items-center justify-center border-b border-[#E8E5DF] bg-[#F7F6F3] px-3.5 py-2.5 max-sm:hidden">
            <span className="flex items-center gap-1.5 rounded-full border border-[#E8E5DF] bg-white px-3.5 py-1.5 text-xs text-[#3A3A3A]">
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              {vitrineAddress(draft.handle)}
            </span>
          </div>
          {/* A prévia é interativa, mas links não podem tirar a pessoa do editor. */}
          <div
            onClickCapture={(e) => {
              const a = (e.target as HTMLElement).closest("a");
              if (a && !a.getAttribute("href")?.startsWith("#")) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <Storefront content={draft} preview edit={edit} />
          </div>
        </div>
      </main>

      <input
        ref={avatarInput}
        type="file"
        accept={IMAGE_ACCEPT}
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) sendAvatar(file);
        }}
      />

      {cropper}
      {open && <EditSheet open={open} draft={draft} update={update} close={close} setOpen={setOpen} patch={patch} move={move} remove={remove} />}
    </div>
  );
}

/** A janela de edição do que está aberto: o formulário certo, com o rodapé de mover, excluir e concluir. */
function EditSheet({
  open,
  draft,
  update,
  close,
  setOpen,
  patch,
  move,
  remove,
}: {
  open: Open;
  draft: VitrineContent;
  update: Update;
  close: () => void;
  setOpen: (o: Open) => void;
  patch: <K extends ListKey>(key: K, id: string, p: Partial<VitrineContent[K][number]>) => void;
  move: (key: ListKey, from: number, to: number) => void;
  remove: (key: ListKey, id: string) => void;
}) {
  const t = useTranslations("editor");
  const tSheet = useTranslations("editor.sheet");
  const done = <SheetFooter onDone={close} />;

  if (open.kind === "cover") {
    const cover = draft.look.bannerUrl;
    return (
      <Sheet title={tSheet("cover")} onClose={close} footer={done}>
        <p className="m-0 text-[13px] leading-snug text-[#5E5A52]">{t("profile.coverHint")}</p>
        <CoverPicker hasCover={Boolean(cover)} name={draft.name}>
          {/* eslint-disable-next-line @next/next/no-img-element -- capa enviada pela creator para o bucket */}
          <img src={cover} alt="" className="block aspect-[4/3] w-full bg-sand object-cover" />
        </CoverPicker>
      </Sheet>
    );
  }

  if (open.kind === "socials")
    return (
      <Sheet title={tSheet("socials")} onClose={close} footer={done}>
        <SocialsForm draft={draft} update={update} />
      </Sheet>
    );

  if (open.kind === "productNew")
    return (
      <Sheet title={tSheet("newProduct")} onClose={close}>
        <ProductImport
          onAdd={(p, error) => {
            const product = newProduct(p);
            update((d) => ({ ...d, products: [...d.products, product] }));
            setOpen({ kind: "product", id: product.id, isNew: true, notice: error });
          }}
        />
      </Sheet>
    );

  const key = open.kind === "coupon" ? "coupons" : "products";
  const list = draft[key] as { id: string }[];
  const index = list.findIndex((x) => x.id === open.id);
  if (index < 0) return null;
  const footer = (
    <SheetFooter
      onDone={close}
      onRemove={() => remove(key, open.id)}
      removeLabel={t(`${key}.remove`)}
      move={{ pos: index + 1, total: list.length, onMove: (to) => move(key, index, to) }}
    />
  );

  if (open.kind === "coupon")
    return (
      <Sheet title={open.isNew ? tSheet("newCoupon") : tSheet("coupon")} onClose={close} footer={footer}>
        <CouponForm coupon={draft.coupons[index]} onChange={(p) => patch("coupons", open.id, p)} />
      </Sheet>
    );

  return (
      <Sheet title={open.isNew ? tSheet("newProduct") : tSheet("product")} onClose={close} footer={footer}>
        <ProductForm
          product={draft.products[index]}
          categories={[...new Set(draft.products.map((p) => p.category).filter(Boolean))]}
          notice={open.notice}
          onChange={(p) => patch("products", open.id, p)}
        />
      </Sheet>
    );

}
