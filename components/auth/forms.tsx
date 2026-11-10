"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { claimAction, createVitrineAction, requestPasswordResetAction, signInAction, signInWithPasswordAction, updatePasswordAction, type FormState } from "@/app/actions";
import { BackLink } from "@/components/brand/BackLink";
import { Wordmark } from "@/components/brand/Logo";
import { AuthPhoto } from "@/components/auth/AuthPhoto";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { withoutLocale } from "@/lib/i18n/routing";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { BRAND, HOST } from "@/lib/brand";

/** Campos retos com contorno areia, como a busca da vitrine; no foco o contorno escurece. */
const field = "box-border flex h-12 w-full min-w-0 items-center border border-sand bg-white px-4 text-base text-ink outline-none placeholder:text-mute focus:border-ink";
const label = "flex flex-col gap-1.5 text-left text-[13px] font-medium";
const box = "flex flex-col gap-4";
const submit = "min-h-12 cursor-pointer border-0 bg-ink px-6 text-[12px] font-medium tracking-[0.18em] text-white uppercase hover:bg-[#2b2925]";
const secondary = "min-h-12 cursor-pointer border border-sand bg-white px-6 text-[12px] font-medium tracking-[0.18em] text-ink uppercase hover:border-ink";
const textLink = "font-medium text-ink underline underline-offset-2";

function GoogleLogo() {
  return (
    <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-full bg-white">
      <svg viewBox="0 0 48 48" className="size-[18px]">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    </span>
  );
}

/** O botão diz o que acontece só quando foi ele o clicado: em /criar-vitrine, dois botões enviam o mesmo formulário (`via`). */
function GoogleButton({ label }: { label: string }) {
  const t = useTranslations("auth");
  const { pending, data } = useFormStatus();
  return (
    <button type="submit" name="via" value="google" disabled={pending} className={`${secondary} flex items-center justify-center gap-3 pl-3`}>
      <GoogleLogo />
      {pending && data?.get("via") === "google" ? t("openingGoogle") : label}
    </button>
  );
}

function SubmitButton({ label, busy, via }: { label: string; busy: string; via?: string }) {
  const { pending, data } = useFormStatus();
  return (
    <button type="submit" name={via && "via"} value={via} disabled={pending} className={submit}>
      {pending && (!via || data?.get("via") === via) ? busy : label}
    </button>
  );
}

function EmailField({ value }: { value?: string }) {
  const t = useTranslations("auth");
  return (
    <label className={label}>
      {t("email")}
      {/* defaultValue: depois de um erro o formulário é reiniciado, e o e-mail digitado continua lá */}
      <input name="email" type="email" defaultValue={value} placeholder={t("emailPlaceholder")} autoComplete="email" autoCapitalize="none" spellCheck={false} className={field} />
    </label>
  );
}

function PasswordField({ title, isNew = false }: { title?: string; isNew?: boolean }) {
  const t = useTranslations("auth");
  return (
    <label className={label}>
      {title ?? t("password")}
      <input
        name="password"
        type="password"
        autoComplete={isNew ? "new-password" : "current-password"}
        minLength={isNew ? PASSWORD_MIN : undefined}
        placeholder={isNew ? t("passwordMin", { min: PASSWORD_MIN }) : undefined}
        className={field}
      />
    </label>
  );
}

function OrDivider() {
  const t = useTranslations("auth");
  return (
    <div className="flex items-center gap-3 text-[13px] text-mute">
      <span aria-hidden="true" className="h-px flex-1 bg-sand" />
      {t("or")}
      <span aria-hidden="true" className="h-px flex-1 bg-sand" />
    </div>
  );
}

/** Aviso de aceite no fim dos formulários de acesso, com os links que a verificação do Google pede. */
function Consent() {
  const t = useTranslations("auth");
  return (
    <p className="m-0 text-center text-[13px] leading-snug text-mute">
      {t.rich("consent", {
        terms: (s) => (
          <Link href="/termos" className="text-inherit underline underline-offset-2">
            {s}
          </Link>
        ),
        privacy: (s) => (
          <Link href="/privacidade" className="text-inherit underline underline-offset-2">
            {s}
          </Link>
        ),
      })}
    </p>
  );
}

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="m-0 text-sm font-semibold text-[#A3361B]">
      {children}
    </p>
  );
}

/**
 * Deu certo e agora é com o e-mail da pessoa: modal com o endereço em destaque. Um <dialog> nativo (Esc ou
 * clique no fundo fecham, o foco fica dentro). Abre a cada envio, mesmo que o e-mail seja o mesmo (`state` muda).
 */
function EmailSentDialog({ state }: { state: FormState }) {
  const t = useTranslations("auth.emailSent");
  const ref = useRef<HTMLDialogElement>(null);
  const kind = state.sent;
  useEffect(() => {
    if (kind) ref.current?.showModal();
  }, [state, kind]);
  if (!kind) return null;
  return (
    <dialog
      ref={ref}
      aria-labelledby="titulo-email-enviado"
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto box-border w-[calc(100%-32px)] max-w-[420px] border-0 bg-white p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="flex flex-col items-center gap-5 px-6 pt-8 pb-6 text-center md:px-8">
        <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-cream text-ink">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="1.5" />
            <path d="M3.5 6l8.5 7 8.5-7" />
          </svg>
        </span>
        <div className="flex w-full flex-col items-center gap-3">
          <h2 id="titulo-email-enviado" className="m-0 font-display text-[28px] leading-none font-normal whitespace-nowrap sm:text-[34px]">
            {t("title")}
          </h2>
          <p className="m-0 text-[16px] leading-relaxed text-mute">{t(kind)}</p>
          {/* o endereço numa linha própria: quebra só se não couber, e nunca no meio da frase */}
          <p className="m-0 max-w-full bg-cream px-3 py-2 text-[15px] font-medium text-ink [overflow-wrap:anywhere]">{state.email}</p>
        </div>
        {kind === "reset" && <p className="m-0 text-[14px] leading-snug text-mute">{t("resetHint")}</p>}
        <form method="dialog" className="w-full">
          <button type="submit" autoFocus className={`${submit} w-full`}>
            {t("ok")}
          </button>
        </form>
      </div>
    </dialog>
  );
}

/** "Ana Souza" → "anasouza": sem acento, só o que o link aceita. */
function toHandle(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 30);
}

type Claim = { name: string; setName: (v: string) => void; handle: string; setCustom: (v: string | null) => void };

/**
 * Nome + link. O link acompanha o nome enquanto a pessoa não mexe nele;
 * se ela apagar o link, volta a acompanhar.
 */
function useClaim(initialName = ""): Claim {
  const [name, setName] = useState(initialName);
  const [custom, setCustom] = useState<string | null>(null);
  return { name, setName, handle: custom ?? toHandle(name), setCustom };
}

function ClaimFields({ claim: { name, setName, handle, setCustom } }: { claim: Claim }) {
  const t = useTranslations("auth.claim");
  return (
    <>
      <label className={label}>
        {t("name")}
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          autoComplete="name"
          maxLength={60}
          className={field}
        />
      </label>
      <label className={label}>
        {t("link")}
        {/* o prefixo fica dentro da pílula; o contorno de foco vale para o conjunto */}
        <span className={`${field} gap-0 focus-within:border-ink focus-within:bg-white`}>
          <span className="flex-none text-mute">{HOST}/</span>
          <input
            name="handle"
            required
            value={handle}
            onChange={(e) => {
              const v = toHandle(e.target.value.replace(/^@/, ""));
              setCustom(v || null);
            }}
            placeholder={t("linkPlaceholder")}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            pattern="[a-z0-9_.]{3,30}"
            title={t("linkRule")}
            className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink outline-none placeholder:text-[#B5B5B5]"
          />
        </span>
      </label>
      <span className="-mt-2.5 pl-5 text-left text-[13px] text-mute">{t("linkHint")}</span>
    </>
  );
}

/** Para onde a seta de /entrar leva: a página de origem (sem idioma), menos as que exigem login, que trariam de volta para cá. */
const backFrom = (next: string) => (/^\/(inicio|editor|metricas|nova-senha)(?![^/?#])/.test(next) ? "/" : next);

/**
 * As telas de acesso: formulário à esquerda e, no desktop, a foto com o logotipo à direita (AuthPhoto). A seta volta para `back` ou,
 * com `onBack`, para o passo anterior da própria tela.
 */
function AuthShell({ back = "/", onBack, children }: { back?: string; onBack?: () => void; children: ReactNode }) {
  const t = useTranslations("common");
  return (
    <main className="grid min-h-dvh grid-cols-[minmax(0,1fr)] bg-white text-ink md:grid-cols-2">
      <div className="flex flex-col gap-10 px-5 py-6 md:px-12 md:py-8">
        <div className="flex items-center gap-3">
          <BackLink href={onBack ? undefined : back} onClick={onBack} divider />
          <Link href="/" aria-label={t("brandHome", { brand: BRAND })} className="flex text-ink no-underline">
            <Wordmark label="" className="h-[19px] w-auto" />
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center gap-4 pb-10">{children}</div>
      </div>
      <AuthPhoto />
    </main>
  );
}

function AuthTitle({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="m-0 font-display text-[clamp(40px,4.6vw,56px)] leading-[1] font-normal">{title}</h1>
      <p className="m-0 text-[17px] text-mute">{text}</p>
    </div>
  );
}

/**
 * Criar conta: nome + link e, depois, e-mail e senha ou Google.
 * Os dois botões enviam o mesmo formulário: e-mail e senha não têm `required` para o do Google poder seguir
 * sem eles (a ação confere). O de e-mail vem primeiro porque é o que o Enter aciona.
 */
export function SignupForm() {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(claimAction, {});
  const claim = useClaim();
  return (
    <AuthShell>
      <form action={action} className="flex flex-col gap-3">
        <AuthTitle title={t("signup.title")} text={t("signup.text")} />
        <div className={box}>
          <ClaimFields claim={claim} />
          <EmailField value={state.email} />
          <PasswordField isNew />
          <SubmitButton label={t("signup.submit")} busy={t("creating")} via="email" />
          <ErrorText>{state.error}</ErrorText>
          <EmailSentDialog state={state} />
          <OrDivider />
          <GoogleButton label={t("signup.google")} />
        </div>
        <Consent />
      </form>
      <p className="m-0 text-center text-[15px] text-mute">
        {t("signup.hasAccount")}{" "}
        <Link href="/entrar" className={textLink}>
          {t("signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}

function Panel({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white p-6">
      <div className="flex w-full max-w-[460px] flex-col gap-5">
        <h1 className="m-0 font-display text-5xl leading-[1] font-normal">{title}</h1>
        <p className="m-0 text-[17px] leading-relaxed text-mute">{text}</p>
        {children}
      </div>
    </div>
  );
}

/** A página atual, sem o aviso de erro do login nem o idioma, para voltar a ela depois de entrar. */
function herePath() {
  const url = new URL(location.href);
  url.searchParams.delete("erro");
  return withoutLocale(url.pathname + url.search);
}

function PasswordSignIn({ next, onForgot }: { next: string; onForgot: () => void }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(signInWithPasswordAction, {});
  return (
    <form action={action} className={box}>
      <input type="hidden" name="next" value={next} />
      <EmailField value={state.email} />
      <PasswordField />
      <button type="button" onClick={onForgot} className="-mt-2 cursor-pointer self-end border-0 bg-transparent p-0 text-[13px] text-mute underline underline-offset-2 hover:text-ink">
        {t("forgot")}
      </button>
      <SubmitButton label={t("signIn")} busy={t("signingIn")} />
      <ErrorText>{state.error}</ErrorText>
    </form>
  );
}

function GoogleSignIn({ next, loginError }: { next: string; loginError: boolean }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(signInAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <GoogleButton label={t("signInGoogle")} />
      <ErrorText>{state.error ?? (loginError ? t("loginFailed") : undefined)}</ErrorText>
      <Consent />
    </form>
  );
}

function ForgotPassword() {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(requestPasswordResetAction, {});
  return (
    <>
      <AuthTitle title={t("newPassword.title")} text={t("forgotText")} />
      <form action={action} className={box}>
        <EmailField value={state.email} />
        <SubmitButton label={t("sendLink")} busy={t("sending")} />
        <ErrorText>{state.error}</ErrorText>
        <EmailSentDialog state={state} />
      </form>
    </>
  );
}

/** /entrar: e-mail e senha ou Google. `next` é a página para onde voltar depois. */
export function SignInScreen({ next, loginError }: { next: string; loginError: boolean }) {
  const t = useTranslations("auth");
  const [forgot, setForgot] = useState(false);
  return (
    <AuthShell back={backFrom(next)} onBack={forgot ? () => setForgot(false) : undefined}>
      {forgot ? (
        <ForgotPassword />
      ) : (
        <>
          <AuthTitle title={t("signInTitle")} text={t("signInText")} />
          <PasswordSignIn next={next} onForgot={() => setForgot(true)} />
          <OrDivider />
          <GoogleSignIn next={next} loginError={loginError} />
          <p className="m-0 text-center text-[15px] text-mute">
            {t("noAccount")}{" "}
            <Link href="/criar-vitrine" className={textLink}>
              {t("signup.submit")}
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}

/** /nova-senha: quem chegou pelo link do e-mail escolhe a senha. */
export function NewPasswordScreen() {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(updatePasswordAction, {});
  return (
    <AuthShell>
      <AuthTitle title={t("newPassword.title")} text={t("newPassword.text")} />
      <form action={action} className={box}>
        <PasswordField title={t("newPassword.field")} isNew />
        <SubmitButton label={t("newPassword.submit")} busy={t("saving")} />
        <ErrorText>{state.error}</ErrorText>
      </form>
    </AuthShell>
  );
}

/**
 * "Entrar" de qualquer página: leva a /entrar, que devolve à página em que a pessoa estava (com aba e
 * filtros), lida no clique. `onOpen` guarda o que ela ia fazer (favoritar, comentar) para terminar na volta.
 */
export function LoginButton({ className, children, onOpen }: { className?: string; children?: ReactNode; onOpen?: () => void }) {
  const t = useTranslations("auth");
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        router.push(`/entrar?next=${encodeURIComponent(herePath())}`);
      }}
      className={`cursor-pointer ${className ?? ""}`}
    >
      {children ?? t("signIn")}
    </button>
  );
}

export function CreateVitrinePanel({ suggestedName }: { suggestedName: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<FormState, FormData>(createVitrineAction, {});
  const claim = useClaim(suggestedName);
  return (
    <Panel title={t("claimPanel.title")} text={t("claimPanel.text")}>
      <form action={action} className="flex flex-col gap-3">
        <div className={box}>
          <ClaimFields claim={claim} />
          <button type="submit" disabled={pending} className={submit}>
            {pending ? t("creating") : t("claimPanel.submit")}
          </button>
        </div>
        <ErrorText>{state.error}</ErrorText>
      </form>
    </Panel>
  );
}
