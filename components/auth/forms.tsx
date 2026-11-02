"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { claimAction, createVitrineAction, signInAction, type FormState } from "@/app/actions";

const field = "h-12 min-w-0 rounded-full border-0 bg-[#F2F0EB] px-4 text-base outline-none focus:ring-2 focus:ring-ink";
const submit = "min-h-12 rounded-full border-0 bg-ink px-6 text-base font-bold text-white";

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

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="m-0 pl-4 text-sm font-semibold text-[#A3361B]">
      {children}
    </p>
  );
}

/** "Marina Costa" → "marinacosta": sem acento, só o que o link aceita. */
function toHandle(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 30);
}

/**
 * Link + nome. O link acompanha o nome enquanto a pessoa não mexe nele;
 * se ela apagar o link, volta a acompanhar.
 */
function ClaimFields({ initialName = "" }: { initialName?: string }) {
  const [name, setName] = useState(initialName);
  const [custom, setCustom] = useState<string | null>(null);
  const handle = custom ?? toHandle(name);
  return (
    <>
      <label className="flex min-w-0 flex-1 items-center pl-4 text-lg">
        <span className="font-semibold text-[#5E5A52]">vitri.me/</span>
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
          aria-label="Seu link"
          pattern="[a-z0-9_.]{3,30}"
          title="De 3 a 30 letras, números, ponto ou _"
          className="h-12 min-w-0 flex-1 border-0 bg-transparent text-lg font-bold outline-none"
        />
      </label>
      <input
        name="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Seu nome"
        aria-label="Seu nome"
        maxLength={60}
        className={field}
      />
    </>
  );
}

/** Landing: link + nome → login com o Google. */
export function ClaimForm() {
  const [state, action] = useActionState<FormState, FormData>(claimAction, {});
  return (
    <form action={action} className="flex w-full max-w-[560px] flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-[28px] border-2 border-ink bg-white p-2">
        <ClaimFields />
        <GoogleButton label="Criar com Google" />
      </div>
      <ErrorText>{state.error}</ErrorText>
    </form>
  );
}

function Panel({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-paper p-6">
      <div className="flex w-full max-w-[460px] flex-col gap-5">
        <h1 className="font-display m-0 text-4xl leading-none font-extrabold tracking-[-0.04em]">{title}</h1>
        <p className="m-0 text-[17px] leading-normal text-[#3A3A3A]">{text}</p>
        {children}
      </div>
    </div>
  );
}

export function SignInPanel({ loginError }: { loginError?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(signInAction, {});
  return (
    <Panel title="Entrar na sua vitrine" text="Use sua conta Google. Sem senha nova para lembrar.">
      <form action={action} className="flex flex-col gap-3">
        <GoogleButton label="Entrar com Google" />
        <ErrorText>{state.error ?? (loginError ? "O login com o Google não foi concluído. Tente de novo." : undefined)}</ErrorText>
      </form>
    </Panel>
  );
}

export function CreateVitrinePanel({ suggestedName }: { suggestedName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createVitrineAction, {});
  return (
    <Panel title="Escolha o link da sua vitrine" text="É o endereço que vai na sua bio. Dá para trocar depois.">
      <form action={action} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-[28px] border-2 border-ink bg-white p-2">
          <ClaimFields initialName={suggestedName} />
          <button type="submit" disabled={pending} className={submit}>
            {pending ? "Criando…" : "Criar vitrine"}
          </button>
        </div>
        <ErrorText>{state.error}</ErrorText>
      </form>
    </Panel>
  );
}
