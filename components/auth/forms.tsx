"use client";

import { useActionState, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { claimAction, createVitrineAction, requestPasswordResetAction, signInAction, signInWithPasswordAction, updatePasswordAction, type FormState } from "@/app/actions";
import { BackLink } from "@/components/brand/BackLink";
import { Wordmark } from "@/components/brand/Logo";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { HOST } from "@/lib/brand";

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
  const { pending, data } = useFormStatus();
  return (
    <button type="submit" name="via" value="google" disabled={pending} className={`${secondary} flex items-center justify-center gap-3 pl-3`}>
      <GoogleLogo />
      {pending && data?.get("via") === "google" ? "Abrindo o Google…" : label}
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
  return (
    <label className={label}>
      E-mail
      {/* defaultValue: depois de um erro o formulário é reiniciado, e o e-mail digitado continua lá */}
      <input name="email" type="email" defaultValue={value} placeholder="voce@email.com" autoComplete="email" autoCapitalize="none" spellCheck={false} className={field} />
    </label>
  );
}

function PasswordField({ title = "Senha", isNew = false }: { title?: string; isNew?: boolean }) {
  return (
    <label className={label}>
      {title}
      <input
        name="password"
        type="password"
        autoComplete={isNew ? "new-password" : "current-password"}
        minLength={isNew ? PASSWORD_MIN : undefined}
        placeholder={isNew ? `Pelo menos ${PASSWORD_MIN} caracteres` : undefined}
        className={field}
      />
    </label>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-mute">
      <span aria-hidden="true" className="h-px flex-1 bg-sand" />
      ou
      <span aria-hidden="true" className="h-px flex-1 bg-sand" />
    </div>
  );
}

/** Aviso de aceite no fim dos formulários de acesso, com os links que a verificação do Google pede. */
function Consent() {
  return (
    <p className="m-0 text-center text-[13px] leading-snug text-mute">
      Ao continuar, você concorda com os{" "}
      <Link href="/termos" className="text-inherit underline underline-offset-2">
        Termos de Uso
      </Link>{" "}
      e a{" "}
      <Link href="/privacidade" className="text-inherit underline underline-offset-2">
        Política de Privacidade
      </Link>
      .
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

/** Deu certo e agora é com o e-mail da pessoa. */
function NoticeText({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="status" className="m-0 bg-cream p-4 text-[15px] leading-relaxed text-ink">
      {children}
    </p>
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
  return (
    <>
      <label className={label}>
        Seu nome
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como aparece na vitrine"
          autoComplete="name"
          maxLength={60}
          className={field}
        />
      </label>
      <label className={label}>
        Seu link
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
            placeholder="seunome"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            pattern="[a-z0-9_.]{3,30}"
            title="De 3 a 30 letras, números, ponto ou _"
            className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink outline-none placeholder:text-[#B5B5B5]"
          />
        </span>
      </label>
      <span className="-mt-2.5 pl-5 text-left text-[13px] text-mute">É o endereço que vai na sua bio.</span>
    </>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/** Esboço da vitrine com o nome e o link que a pessoa está digitando: mostra o que ela vai criar sem precisar explicar. */
function VitrinePreview({ name, handle }: { name: string; handle: string }) {
  const shown = name.trim() || "Seu nome";
  return (
    <figure className="m-0 flex w-full max-w-[400px] flex-col gap-5">
      <div aria-hidden="true" className="flex flex-col overflow-hidden bg-white shadow-[0_24px_60px_-30px_rgba(17,17,17,0.35)]">
        <div className="relative h-32 bg-cream">
          <span className="absolute -bottom-8 left-6 flex size-16 items-center justify-center rounded-full border-4 border-white bg-sand font-display text-[22px]">
            {initials(shown) || "?"}
          </span>
        </div>
        <div className="flex flex-col gap-1 px-6 pt-11 pb-5">
          <span className="truncate font-display text-[28px] leading-[1.1]">{shown}</span>
          <span className="truncate text-[14px] text-mute">
            {HOST}/{handle || "seunome"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 px-6 pb-6">
          {["20% OFF", "15% OFF"].map((off) => (
            <div key={off} className="flex flex-col gap-2 border border-sand bg-cream p-3">
              <span className="text-[11px] font-medium tracking-[0.18em] text-gold uppercase">Marca parceira</span>
              <span className="font-display text-[26px] leading-none lining-nums">{off}</span>
              <span className="border border-dashed border-gold/50 py-1 text-center font-mono text-[11px] font-bold tracking-[0.08em]">CUPOM</span>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="text-center text-[15px] text-ink/70">É assim que sua vitrine aparece para o seu público.</figcaption>
    </figure>
  );
}

/** Para onde a seta de /entrar leva: a página de origem, menos as que exigem login, que trariam de volta para cá. */
const backFrom = (next: string) => (/^\/(inicio|editor|metricas|nova-senha)(?![^/?#])/.test(next) ? "/" : next);

/**
 * As telas de acesso: formulário à esquerda e, no desktop, um painel à direita. O painel é o esboço da vitrine, que acompanha o que
 * a pessoa digita; com `photo`, para quem não tem o que digitar ali, é a foto do look. A seta volta para `back` ou, com `onBack`, para o passo anterior da própria tela.
 */
function AuthShell({
  name = "",
  handle = "",
  photo = false,
  back = "/",
  onBack,
  children,
}: {
  name?: string;
  handle?: string;
  photo?: boolean;
  back?: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh grid-cols-[minmax(0,1fr)] bg-white text-ink md:grid-cols-2">
      <div className="flex flex-col gap-10 px-5 py-6 md:px-12 md:py-8">
        <div className="flex items-center gap-3">
          <BackLink href={onBack ? undefined : back} onClick={onBack} divider />
          <Link href="/" aria-label="MyVitri — início" className="flex text-ink no-underline">
            <Wordmark label="" className="h-[19px] w-auto" />
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center gap-4 pb-10">{children}</div>
      </div>
      {photo ? (
        <div className="relative overflow-hidden bg-sand max-md:hidden">
          <Image
            src="/hero/retrato.webp"
            alt=""
            fill
            preload
            quality={90}
            // o painel é mais estreito que a foto, deitada: ela aparece mais larga que ele. No celular o painel some e o 1px evita baixar a foto grande
            sizes="(min-width: 1024px) 90vw, (min-width: 768px) 180vw, 1px"
            className="object-cover object-[50%_66%]"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center bg-sand p-12 max-md:hidden">
          <VitrinePreview name={name} handle={handle} />
        </div>
      )}
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
 * Criar conta: nome + link e, depois, e-mail e senha ou Google. A prévia ao lado acompanha a digitação.
 * Os dois botões enviam o mesmo formulário: e-mail e senha não têm `required` para o do Google poder seguir
 * sem eles (a ação confere). O de e-mail vem primeiro porque é o que o Enter aciona.
 */
export function SignupForm() {
  const [state, action] = useActionState<FormState, FormData>(claimAction, {});
  const claim = useClaim();
  return (
    <AuthShell name={claim.name} handle={claim.handle}>
      <form action={action} className="flex flex-col gap-3">
        <AuthTitle title="Crie sua vitrine" text="Grátis, pronta em 2 minutos." />
        <div className={box}>
          <ClaimFields claim={claim} />
          <EmailField value={state.email} />
          <PasswordField isNew />
          <SubmitButton label="Criar conta" busy="Criando…" via="email" />
          <ErrorText>{state.error}</ErrorText>
          <NoticeText>{state.notice}</NoticeText>
          <OrDivider />
          <GoogleButton label="Criar com Google" />
        </div>
        <Consent />
      </form>
      <p className="m-0 text-center text-[15px] text-mute">
        Já tem conta?{" "}
        <Link href="/entrar" className={textLink}>
          Entrar
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

/** A página atual, sem o aviso de erro do login, para voltar a ela depois de entrar. */
function herePath() {
  const url = new URL(location.href);
  url.searchParams.delete("erro");
  return url.pathname + url.search;
}

function PasswordSignIn({ next, onForgot }: { next: string; onForgot: () => void }) {
  const [state, action] = useActionState<FormState, FormData>(signInWithPasswordAction, {});
  return (
    <form action={action} className={box}>
      <input type="hidden" name="next" value={next} />
      <EmailField value={state.email} />
      <PasswordField />
      <button type="button" onClick={onForgot} className="-mt-2 cursor-pointer self-end border-0 bg-transparent p-0 text-[13px] text-mute underline underline-offset-2 hover:text-ink">
        Esqueci minha senha
      </button>
      <SubmitButton label="Entrar" busy="Entrando…" />
      <ErrorText>{state.error}</ErrorText>
    </form>
  );
}

function GoogleSignIn({ next, loginError }: { next: string; loginError: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(signInAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <GoogleButton label="Entrar com Google" />
      <ErrorText>{state.error ?? (loginError ? "O login não foi concluído. Tente de novo." : undefined)}</ErrorText>
      <Consent />
    </form>
  );
}

function ForgotPassword() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordResetAction, {});
  return (
    <>
      <AuthTitle title="Crie uma senha nova" text="Enviamos um link para o seu e-mail. Também serve se você só entrava com o Google." />
      <form action={action} className={box}>
        <EmailField value={state.email} />
        <SubmitButton label="Enviar link" busy="Enviando…" />
        <ErrorText>{state.error}</ErrorText>
        <NoticeText>{state.notice}</NoticeText>
      </form>
    </>
  );
}

/** /entrar: e-mail e senha ou Google. `next` é a página para onde voltar depois. */
export function SignInScreen({ next, loginError }: { next: string; loginError: boolean }) {
  const [forgot, setForgot] = useState(false);
  return (
    <AuthShell photo back={backFrom(next)} onBack={forgot ? () => setForgot(false) : undefined}>
      {forgot ? (
        <ForgotPassword />
      ) : (
        <>
          <AuthTitle title="Entre na sua conta" text="Com seu e-mail e senha ou com o Google." />
          <PasswordSignIn next={next} onForgot={() => setForgot(true)} />
          <OrDivider />
          <GoogleSignIn next={next} loginError={loginError} />
          <p className="m-0 text-center text-[15px] text-mute">
            Ainda não tem conta?{" "}
            <Link href="/criar-vitrine" className={textLink}>
              Criar conta
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}

/** /nova-senha: quem chegou pelo link do e-mail escolhe a senha. */
export function NewPasswordScreen() {
  const [state, action] = useActionState<FormState, FormData>(updatePasswordAction, {});
  return (
    <AuthShell>
      <AuthTitle title="Crie uma senha nova" text="Depois de salvar, você já entra na sua conta." />
      <form action={action} className={box}>
        <PasswordField title="Nova senha" isNew />
        <SubmitButton label="Salvar senha" busy="Salvando…" />
        <ErrorText>{state.error}</ErrorText>
      </form>
    </AuthShell>
  );
}

/**
 * "Entrar" de qualquer página: leva a /entrar, que devolve à página em que a pessoa estava (com aba e
 * filtros), lida no clique. `onOpen` guarda o que ela ia fazer (favoritar, comentar) para terminar na volta.
 */
export function LoginButton({ className, children = "Entrar", onOpen }: { className?: string; children?: ReactNode; onOpen?: () => void }) {
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
      {children}
    </button>
  );
}

export function CreateVitrinePanel({ suggestedName }: { suggestedName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createVitrineAction, {});
  const claim = useClaim(suggestedName);
  return (
    <Panel title="Escolha o link da sua vitrine" text="É o endereço que vai na sua bio. Dá para trocar depois.">
      <form action={action} className="flex flex-col gap-3">
        <div className={box}>
          <ClaimFields claim={claim} />
          <button type="submit" disabled={pending} className={submit}>
            {pending ? "Criando…" : "Criar vitrine"}
          </button>
        </div>
        <ErrorText>{state.error}</ErrorText>
      </form>
    </Panel>
  );
}
