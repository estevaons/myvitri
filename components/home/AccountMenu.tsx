"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { requestPasswordResetAction, signOutAction, updateProfileAction, type FormState } from "@/app/actions";
import { DeleteAccount } from "@/components/editor/DeleteAccount";
import { FilePick } from "@/components/editor/ImageField";
import { useImageCrop } from "@/components/editor/ImageCrop";
import { uploadImage } from "@/components/editor/upload";
import { HOST } from "@/lib/brand";
import { kicker, pillDark, pillLight } from "./chrome";

/**
 * O que a home sabe de quem entrou. `providers` vem do Supabase: "email" (senha) e/ou "google". `avatarUrl` é a foto da
 * vitrine ou, sem ela, `googlePhoto`; vazio quando não há nenhuma.
 */
export type Account = { name: string; email: string; avatarUrl: string; googlePhoto: string; providers: string[]; vitrine: { handle: string; name: string; avatarUrl: string } | null };

const initials = (text: string) =>
  text
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/** A foto de quem entrou; sem foto, ou se ela não carregar (a do Google pode sair do ar), as iniciais. */
function Avatar({ url, label, className }: { url: string; label: string; className: string }) {
  const [broken, setBroken] = useState(false);
  return url && !broken ? (
    // eslint-disable-next-line @next/next/no-img-element -- foto vem de URL arbitrária (Storage ou Google)
    <img
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      // no topo da página a foto carrega antes de o React assumir, e um erro nesse intervalo não chega ao onError
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setBroken(true);
      }}
      className={`${className} rounded-full bg-sand object-cover`}
    />
  ) : (
    <span aria-hidden="true" className={`${className} flex items-center justify-center rounded-full bg-sand font-display text-ink`}>
      {initials(label) || "?"}
    </span>
  );
}

const item =
  "flex min-h-11 w-full cursor-pointer items-center border-0 bg-transparent px-4 text-left text-[14px] text-ink no-underline hover:bg-cream focus-visible:bg-cream focus-visible:outline-none";

/**
 * Chamado ao clicar no que tira a pessoa da página. Para seguir normalmente, não faz nada; para perguntar antes, chama
 * `e.preventDefault()` e, se a pessoa confirmar, `go()` faz a saída (o clique original já foi cancelado).
 */
export type LeaveGuard = (e: MouseEvent, go: () => void) => void;

/**
 * Canto direito do cabeçalho da home e do editor: um ícone de pessoa abre um menu (com a foto, o nome e o e-mail no topo) com Configurações e Sair. Fecha com Esc, com um
 * clique fora ou quando o foco sai dele. `onLeave` roda ao clicar no que tira a pessoa da página (veja `LeaveGuard`): o editor
 * pergunta numa janela se ainda há alterações sendo salvas.
 */
export function AccountMenu({ account, onLeave }: { account: Account; onLeave?: LeaveGuard }) {
  const t = useTranslations("account");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

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

  const label = account.vitrine?.name || account.name || account.email;

  return (
    <div ref={box} className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="menu-da-conta"
        aria-label={t("label", { email: account.email })}
        onClick={() => setOpen((v) => !v)}
        // um ícone de pessoa, e não a foto: a foto já aparece grande no topo da home e, aqui, dentro do menu aberto
        className={`flex size-11 cursor-pointer items-center justify-center rounded-full border bg-transparent text-ink transition-colors hover:border-ink ${open ? "border-ink" : "border-sand"}`}
      >
        {/* "user-round" do Lucide (lucide.dev, licença ISC) */}
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="5" />
          <path d="M20 21a8 8 0 0 0-16 0" />
        </svg>
      </button>

      {open && (
        <div
          id="menu-da-conta"
          className="absolute top-[calc(100%+8px)] right-0 z-30 flex w-64 flex-col border border-sand bg-white py-2 shadow-[0_24px_60px_-28px_rgba(17,17,17,0.45)] motion-safe:animate-rise-in"
        >
          <div className="flex min-w-0 items-center gap-3 border-b border-sand px-4 pt-2 pb-3">
            <Avatar url={account.avatarUrl} label={label} className="size-10 flex-none text-[15px]" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[15px] font-medium">{label}</span>
              <span className="truncate text-[13px] text-mute">{account.email}</span>
            </span>
          </div>
          <div className="flex flex-col pt-2">
            <button
              type="button"
              className={item}
              onClick={() => {
                setOpen(false);
                dialog.current?.showModal();
              }}
            >
              {t("settings")}
            </button>
            <form action={signOutAction}>
              {/* confirmada a saída, o menu já fechou (a janela levou o foco): sai chamando a ação direto */}
              <button type="submit" onClick={(e) => onLeave?.(e, () => void signOutAction())} className={item}>
                {t("signOut")}
              </button>
            </form>
          </div>
        </div>
      )}

      <SettingsDialog ref={dialog} account={account} onLeave={onLeave} />
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-sand pt-5">
      <h3 className={`${kicker} m-0 text-[11px] text-gold`}>{title}</h3>
      {children}
    </section>
  );
}

const fieldLabel = "flex flex-col gap-1.5 text-[14px] text-mute";
const fieldBox = "box-border flex h-11 w-full items-center border border-sand bg-white text-[15px] text-ink focus-within:border-ink";

/**
 * Nome, link e foto de quem tem vitrine: ao salvar, mudam na hora na vitrine pública. Sem foto própria, vale a do Google:
 * é o que remover mostra e, por isso, ela mesma não tem o que remover.
 */
function ProfileBlock({ vitrine, googlePhoto }: { vitrine: NonNullable<Account["vitrine"]>; googlePhoto: string }) {
  const t = useTranslations("account");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [name, setName] = useState(vitrine.name);
  const [handle, setHandle] = useState(vitrine.handle);
  const [avatarUrl, setAvatarUrl] = useState(vitrine.avatarUrl || googlePhoto);
  const [uploading, setUploading] = useState(false);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [cropper, crop] = useImageCrop();

  const changedLink = handle !== vitrine.handle;
  const changed = name !== vitrine.name || changedLink || avatarUrl !== vitrine.avatarUrl;

  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setSaved(false);
    setError("");
  };

  const pick = async (picked: File) => {
    const file = await crop(picked, "avatar");
    if (!file) return;
    setError("");
    setSaved(false);
    setUploading(true);
    const res = await uploadImage("avatar", file, tErrors("imageUnreadable"));
    setUploading(false);
    if (!res.ok) return setError(res.error);
    setAvatarUrl(res.url);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startSaving(async () => {
      const res = await updateProfileAction({ handle, name, avatarUrl });
      if (!res.ok) return setError(res.error);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <Block title={t("profile")}>
      <form onSubmit={save} className="flex flex-col gap-4">
        {cropper}
        <div className="flex items-center gap-4">
          <Avatar key={avatarUrl} url={avatarUrl} label={name} className={`size-16 flex-none text-[20px] ${uploading ? "animate-pulse" : ""}`} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <FilePick onFile={pick} disabled={uploading} className={`${pillLight} min-h-10 cursor-pointer px-5 text-[11px] has-focus-visible:ring-2 has-focus-visible:ring-ink`}>
              {uploading ? t("sending") : avatarUrl ? t("changePhoto") : t("sendPhoto")}
            </FilePick>
            {avatarUrl && avatarUrl !== googlePhoto && !uploading && (
              <button type="button" onClick={() => edit(setAvatarUrl)(googlePhoto)} className="cursor-pointer border-0 bg-transparent p-0 text-[13px] text-mute underline underline-offset-2 hover:text-ink">
                {t("remove")}
              </button>
            )}
          </div>
        </div>
        <label className={fieldLabel}>
          {t("name")}
          <span className={fieldBox}>
            <input value={name} onChange={(e) => edit(setName)(e.target.value)} maxLength={60} className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-inherit outline-none" />
          </span>
        </label>
        <label className={fieldLabel}>
          {t("link")}
          <span className={fieldBox}>
            <span className="pl-3 text-mute">{HOST}/@</span>
            <input
              value={handle}
              onChange={(e) => edit(setHandle)(e.target.value.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_.]/g, ""))}
              maxLength={30}
              autoCapitalize="none"
              spellCheck={false}
              className="h-full min-w-0 flex-1 border-0 bg-transparent pr-3 text-inherit outline-none"
            />
          </span>
          {changedLink && <span className="text-[13px] leading-snug">{t("linkWarning")}</span>}
        </label>
        {error && (
          <p role="alert" className="m-0 text-sm font-semibold text-[#A3361B]">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={!changed || saving || uploading} className={`${pillDark} min-h-10 cursor-pointer border-0 px-5 text-[11px] disabled:cursor-default disabled:opacity-40`}>
            {saving ? t("saving") : t("save")}
          </button>
          {saved && !changed && (
            <span role="status" className="text-[14px] text-mute">
              {t("saved")}
            </span>
          )}
        </div>
      </form>
    </Block>
  );
}

/** Link para criar ou trocar a senha, pelo mesmo e-mail do "Esqueci minha senha"; quem só usa o Google ganha uma senha também. */
function PasswordBlock({ account }: { account: Account }) {
  const t = useTranslations("account");
  const [state, send, pending] = useActionState<FormState, FormData>(requestPasswordResetAction, {});
  const hasPassword = account.providers.includes("email");
  return (
    <Block title={t("password")}>
      <p className="m-0 text-[15px] leading-relaxed text-mute">{hasPassword ? t("passwordChange") : t("passwordCreate")}</p>
      {state.sent ? (
        <p role="status" className="m-0 bg-cream p-3 text-[14px] leading-relaxed">
          {t("linkSent", { email: account.email })}
        </p>
      ) : (
        <form action={send}>
          <input type="hidden" name="email" value={account.email} />
          <button type="submit" disabled={pending} className={`${pillLight} min-h-10 cursor-pointer px-5 text-[11px] disabled:opacity-50`}>
            {pending ? t("sending") : hasPassword ? t("sendChange") : t("sendCreate")}
          </button>
        </form>
      )}
      {state.error && (
        <p role="alert" className="m-0 text-sm font-semibold text-[#A3361B]">
          {state.error}
        </p>
      )}
    </Block>
  );
}

const providerKey = (providers: string[]) =>
  providers.includes("google") && providers.includes("email") ? "both" : providers.includes("google") ? "google" : "email";

/** Configurações da conta: um <dialog> nativo (Esc fecha e o foco fica dentro). */
function SettingsDialog({ ref, account, onLeave }: { ref: React.RefObject<HTMLDialogElement | null>; account: Account; onLeave?: LeaveGuard }) {
  const t = useTranslations("account");
  const router = useRouter();
  return (
    <dialog
      ref={ref}
      aria-labelledby="titulo-configuracoes"
      // clique no fundo escurecido (fora da caixa) fecha
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto box-border max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[520px] overflow-y-auto border-0 bg-white p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-5 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id="titulo-configuracoes" className="m-0 font-display text-[36px] leading-none font-normal">
            {t("settings")}
          </h2>
          <form method="dialog">
            <button type="submit" aria-label={t("close")} className="-mt-1 -mr-2 flex size-10 cursor-pointer items-center justify-center border-0 bg-transparent text-ink hover:bg-cream">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </form>
        </div>

        {account.vitrine && <ProfileBlock vitrine={account.vitrine} googlePhoto={account.googlePhoto} />}

        <Block title={t("account")}>
          <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-[15px]">
            <dt className="text-mute">{t("email")}</dt>
            <dd className="m-0 truncate">{account.email}</dd>
            <dt className="text-mute">{t("signsInWith")}</dt>
            <dd className="m-0">{t(`providers.${providerKey(account.providers)}`)}</dd>
          </dl>
        </Block>

        <PasswordBlock account={account} />

        {!account.vitrine && (
          <Block title={t("yourVitrine")}>
            <p className="m-0 text-[15px] leading-relaxed text-mute">{t("noVitrine")}</p>
            <Link href="/criar-vitrine" className={`${pillLight} min-h-10 self-start px-5 text-[11px]`}>
              {t("createVitrine")}
            </Link>
          </Block>
        )}

        <Block title={t("delete")}>
          <DeleteAccount handle={account.vitrine?.handle} />
        </Block>

        <p className="m-0 flex gap-4 border-t border-sand pt-5 text-[13px] text-mute">
          <Link href="/termos" onClick={(e) => onLeave?.(e, () => router.push("/termos"))} className="text-inherit underline underline-offset-2">
            {t("terms")}
          </Link>
          <Link href="/privacidade" onClick={(e) => onLeave?.(e, () => router.push("/privacidade"))} className="text-inherit underline underline-offset-2">
            {t("privacy")}
          </Link>
        </p>
      </div>
    </dialog>
  );
}
