"use client";

import { useActionState, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { createPortal, useFormStatus } from "react-dom";
import { claimAction, createVitrineAction, signInAction, type FormState } from "@/app/actions";
import { HOST } from "@/lib/brand";

/** Campos retos com contorno areia, como a busca da vitrine; no foco o contorno escurece. */
const field = "box-border flex h-12 w-full min-w-0 items-center border border-sand bg-white px-4 text-base text-ink outline-none placeholder:text-mute focus:border-ink";
const label = "flex flex-col gap-1.5 text-left text-[13px] font-medium";
const box = "flex flex-col gap-4";
const submit = "min-h-12 border-0 bg-ink px-6 text-[12px] font-medium tracking-[0.18em] text-white uppercase hover:bg-[#2b2925]";

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

function GoogleButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${submit} flex items-center justify-center gap-3 pl-3`}>
      <GoogleLogo />
      {pending ? "Abrindo o Google…" : label}
    </button>
  );
}

/** Aviso de aceite logo abaixo do botão do Google, com os links que a verificação do Google pede. */
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
    <p role="alert" className="m-0 pl-4 text-sm font-semibold text-[#A3361B]">
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

/**
 * Criar conta: formulário (nome + link → login com o Google) e, no desktop, a prévia da vitrine
 * ao lado, atualizada enquanto a pessoa digita. `children` é o topo da coluna do formulário.
 */
export function SignupForm({ children }: { children: ReactNode }) {
  const [state, action] = useActionState<FormState, FormData>(claimAction, {});
  const claim = useClaim();
  return (
    <div className="grid min-h-dvh grid-cols-[minmax(0,1fr)] md:grid-cols-2">
      <div className="flex flex-col gap-10 px-5 py-6 md:px-12 md:py-8">
        {children}
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center gap-4 pb-10">
          <form action={action} className="flex flex-col gap-3">
            <h1 className="m-0 font-display text-[clamp(40px,4.6vw,56px)] leading-[1] font-normal">Crie sua vitrine</h1>
            <p className="m-0 pb-3 text-[17px] text-mute">Grátis, pronta em 2 minutos.</p>
            <div className={box}>
              <ClaimFields claim={claim} />
              <GoogleButton label="Criar com Google" />
            </div>
            <ErrorText>{state.error}</ErrorText>
            <Consent />
          </form>
          {/* fora do formulário: o modal de login tem o próprio formulário, e formulário dentro de formulário não vale */}
          <p className="m-0 text-center text-[15px] text-mute">
            Já tem conta? <LoginButton className="font-medium text-ink underline underline-offset-2" />
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-sand p-12 max-md:hidden">
        <VitrinePreview name={claim.name} handle={claim.handle} />
      </div>
    </div>
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

const noop = () => () => {};

/** A página atual, sem o aviso de erro do login, para voltar a ela depois do Google. */
function herePath() {
  const url = new URL(location.href);
  url.searchParams.delete("erro");
  return url.pathname + url.search;
}

/** Botão do Google para entrar (quem já tem conta). Usado na página e no modal de login. */
function SignInForm({ loginError, next }: { loginError?: boolean; next: string }) {
  const [state, action] = useActionState<FormState, FormData>(signInAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <GoogleButton label="Entrar com Google" />
      <ErrorText>{state.error ?? (loginError ? "O login com o Google não foi concluído. Tente de novo." : undefined)}</ErrorText>
      <Consent />
    </form>
  );
}

/** /inicio sem sessão (e a volta do Google com erro): o login ocupa a página. */
export function SignInPanel({ loginError }: { loginError?: boolean }) {
  // a página que pediu o login (/editor, /metricas…): depois do Google, volta para ela
  const next = useSyncExternalStore(noop, herePath, () => "");
  return (
    <Panel title="Entrar na sua vitrine" text="Use sua conta Google. Sem senha nova para lembrar.">
      <SignInForm loginError={loginError} next={next} />
    </Panel>
  );
}

/**
 * "Entrar" de qualquer página: abre o login num modal (<dialog> nativo: Esc fecha, o foco fica dentro)
 * em vez de levar a outra página. Clicar fora também fecha. Depois do Google, o callback volta para a
 * página em que a pessoa estava (com aba e filtros), lida no clique.
 * O <dialog> vai direto para o <body> (portal): assim o botão pode ficar até dentro de um <p>.
 */
export function LoginButton({ className, children = "Entrar" }: { className?: string; children?: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  // só no navegador: no servidor não há <body> para o portal, e o modal começa fechado de qualquer jeito
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  // lido no clique, e não na renderização: entre uma e outra a pessoa pode ter trocado de aba ou filtro
  const [next, setNext] = useState("");
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNext(herePath());
          dialog.current?.showModal();
        }}
        className={`cursor-pointer ${className ?? ""}`}
      >
        {children}
      </button>
      {mounted &&
        createPortal(
          <dialog
            ref={dialog}
            aria-labelledby={title}
            onClick={(e) => {
              if (e.target === e.currentTarget) dialog.current?.close();
            }}
            className="m-auto w-[calc(100%-40px)] max-w-[440px] bg-white p-0 text-ink transition-[opacity,translate] duration-200 ease-out backdrop:bg-ink/45 starting:open:translate-y-3 starting:open:opacity-0 motion-reduce:transition-none"
          >
            <div className="relative flex flex-col gap-5 p-7 text-left md:p-9">
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => dialog.current?.close()}
                className="absolute top-3 right-3 flex size-10 cursor-pointer items-center justify-center text-[24px] leading-none text-mute hover:text-ink"
              >
                <span aria-hidden="true">×</span>
              </button>
              <h2 id={title} className="m-0 pr-8 font-display text-[40px] leading-[1] font-normal">
                Entrar na sua vitrine
              </h2>
              <p className="m-0 text-[16px] leading-relaxed text-mute">Use sua conta Google. Sem senha nova para lembrar.</p>
              <SignInForm next={next} />
              <p className="m-0 text-center text-[15px] text-mute">
                Ainda não tem conta?{" "}
                <Link href="/criar-vitrine" className="font-medium text-ink underline underline-offset-2">
                  Criar conta
                </Link>
              </p>
            </div>
          </dialog>,
          document.body,
        )}
    </>
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
