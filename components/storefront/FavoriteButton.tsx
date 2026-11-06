"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { setFavoriteAction } from "@/app/actions";
import { LoginButton } from "@/components/auth/forms";
import { reachServer } from "@/lib/vitrine/social";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const SHAPE = {
  // por cima da capa: área de toque de 44px, com o círculo visível de 32px alinhado ao selo de desconto do outro canto
  card: "group/heart absolute top-1 right-1 flex size-11 items-center justify-center border-0 bg-transparent p-0 outline-none",
  // na vitrine, embaixo do nome de quem indica: coração e texto (largura fixa: a troca do texto não mexe no resto)
  profile: `flex min-h-10 min-w-[9.5rem] items-center justify-center gap-2 border px-4 text-[11px] font-medium tracking-[0.18em] uppercase ${focus}`,
};
const PROFILE_LOOK = { on: "border-ink bg-ink text-white", off: "border-sand bg-transparent text-ink hover:border-ink" };
// a capa pode ser clara ou escura: o círculo translúcido garante o contraste nas duas
const CARD_LOOK = { on: "bg-white text-ink shadow-sm", off: "bg-black/45 text-white backdrop-blur-sm group-hover/heart:bg-black/70" };

/** Vitrine que a pessoa ia favoritar quando o login abriu: o coração termina o pedido na volta do Google. */
const INTENT = "vitri:favoritar";
function remember(handle: string | null) {
  try {
    if (handle) sessionStorage.setItem(INTENT, handle);
    else sessionStorage.removeItem(INTENT);
  } catch {
    // sessionStorage bloqueado: depois do login a pessoa toca de novo
  }
}
function remembered() {
  try {
    return sessionStorage.getItem(INTENT);
  } catch {
    return null;
  }
}

function Heart({ on, pop, className }: { on: boolean; pop: boolean; className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${className} flex-none ${pop ? "motion-safe:animate-heart-pop" : ""}`}
      fill={on ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

/** O coração de cada variante: no card, dentro do círculo; no perfil, solto ao lado do texto. */
function Icon({ variant, on, pop }: { variant: keyof typeof SHAPE; on: boolean; pop: boolean }) {
  if (variant === "profile") return <Heart on={on} pop={pop} className="size-[18px]" />;
  return (
    <span className={`flex size-8 items-center justify-center rounded-full transition-colors group-focus-visible/heart:outline-2 group-focus-visible/heart:outline-offset-2 group-focus-visible/heart:outline-white ${CARD_LOOK[on ? "on" : "off"]}`}>
      <Heart on={on} pop={pop} className="size-[18px] translate-y-px" />
    </span>
  );
}

/** O carrossel renderiza a lista duas vezes: todos os corações da mesma vitrine mudam juntos. */
const hearts = new Set<(handle: string, on: boolean) => void>();
const announce = (handle: string, on: boolean) => hearts.forEach((heart) => heart(handle, on));

/** Só um aviso por vez: ao abrir outro (outro card, por exemplo), o anterior fecha. */
let closeOpenToast: (() => void) | null = null;

/** Aviso de erro no rodapé da tela, que some sozinho. Fica no <body> para nada da página cortá-lo. */
function ErrorToast({ text, onClose }: { text: string; onClose: () => void }) {
  const close = useEffectEvent(onClose);
  useEffect(() => {
    const dismiss = () => close();
    closeOpenToast?.();
    closeOpenToast = dismiss;
    const timer = setTimeout(dismiss, 5000);
    return () => {
      clearTimeout(timer);
      if (closeOpenToast === dismiss) closeOpenToast = null;
    };
  }, []);
  return createPortal(
    <div role="alert" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-[26rem] bg-ink px-5 py-3.5 text-[14px] text-white shadow-lg motion-safe:animate-rise-in">
      {text}
    </div>,
    document.body,
  );
}

/**
 * Coração de favoritar. Muda na hora, sem aviso: desfazer é tocar nele de novo. Se o servidor recusar, volta
 * atrás e explica. Quem não entrou vê o mesmo coração: o toque abre o login e, na volta, a vitrine já
 * fica favoritada.
 */
export function FavoriteButton({
  variant,
  handle,
  name,
  favorited,
  guest,
  loading = false,
  stay = false,
}: {
  variant: keyof typeof SHAPE;
  handle: string;
  name: string;
  favorited: boolean;
  guest: boolean;
  /** ainda não se sabe quem está vendo: aparece igual, mas o toque não faz nada */
  loading?: boolean;
  /** aba Favoritas: o card fica no lugar ao tirar o coração */
  stay?: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(favorited);
  const [pop, setPop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const heart = (other: string, value: boolean) => {
      if (other === handle) setOn(value);
    };
    hearts.add(heart);
    return () => {
      hearts.delete(heart);
    };
  }, [handle]);

  const change = (next: boolean) => {
    if (loading || pending) return;
    announce(handle, next);
    setPop(next);
    // uma nova tentativa fecha o erro anterior, inclusive o de outro card
    closeOpenToast?.();
    start(async () => {
      const result = await reachServer(setFavoriteAction(handle, next));
      if (!result.ok) {
        announce(handle, !next);
        setPop(false);
        setError(result.error);
      } else if (variant === "card" && !stay) {
        // a página do catálogo traz o estado do servidor: mantém certo para quem voltar a ela
        router.refresh();
      }
    });
  };

  const finishAfterLogin = useEffectEvent(() => {
    if (remembered() !== handle) return;
    remember(null);
    if (!favorited) change(true);
  });
  useEffect(() => {
    if (loading) return;
    if (guest) {
      // voltou da tela de entrar sem entrar: esquece o pedido
      if (remembered() === handle) remember(null);
      return;
    }
    const timer = setTimeout(finishAfterLogin);
    return () => clearTimeout(timer);
  }, [guest, loading, handle]);

  const label = variant === "profile" && <span>{on ? "Favorita" : "Favoritar"}</span>;

  if (guest && !loading) {
    return (
      <LoginButton
        className={`${SHAPE[variant]} ${variant === "profile" ? PROFILE_LOOK.off : ""} transition-colors`}
        onOpen={() => remember(handle)}
      >
        <Icon variant={variant} on={false} pop={false} />
        <span className="sr-only">Favoritar a vitrine de {name}</span>
        {label}
      </LoginButton>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => change(!on)}
        aria-pressed={on}
        aria-busy={loading || pending}
        aria-label={`Favoritar a vitrine de ${name}`}
        className={`${SHAPE[variant]} ${variant === "profile" ? PROFILE_LOOK[on ? "on" : "off"] : ""} transition-colors ${loading ? "cursor-default" : "cursor-pointer"}`}
      >
        <Icon variant={variant} on={on} pop={pop} />
        {label}
      </button>
      {error && <ErrorToast text={error} onClose={() => setError(null)} />}
    </>
  );
}
