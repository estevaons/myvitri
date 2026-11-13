"use client";

import { useTranslations } from "next-intl";
import { useConfirm } from "@/components/brand/ConfirmDialog";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * A janela de edição de um item da vitrine: um <dialog> nativo (Esc fecha e o foco fica dentro). No celular sobe de
 * baixo e ocupa quase a tela toda, com o rodapé (Concluir, Excluir) fixo perto do polegar; do `sm` em diante fica no
 * centro. Abre quando monta e avisa `onClose` quando a pessoa fecha (X, Esc, fundo escuro ou o botão do rodapé).
 */
export function Sheet({
  title,
  onClose,
  footer,
  wide = false,
  children,
}: {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  /** do `sm` em diante, a janela larga (o produto, em duas colunas, cabe sem rolar) */
  wide?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("editor");
  const ref = useRef<HTMLDialogElement>(null);
  // o onClose muda a cada render; o efeito só deve abrir uma vez
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) {
      d.showModal();
      // o showModal() põe o foco no primeiro botão (o X); o campo que o formulário marcou com data-autofocus ganha o
      // foco no lugar dele, e sem campo marcado o foco fica na própria janela (o autoFocus do React chega cedo demais)
      (d.querySelector<HTMLElement>("[data-autofocus]") ?? d).focus();
    }
    // o evento "close" chega depois, numa tarefa à parte: o de um fechamento antigo (o React em desenvolvimento monta,
    // desmonta e monta de novo) não pode fechar a janela que já reabriu
    const done = () => {
      if (!d.open) close.current();
    };
    d.addEventListener("close", done);
    return () => {
      d.removeEventListener("close", done);
      if (d.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      tabIndex={-1}
      // clique no fundo escurecido (fora da caixa) fecha
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className={`box-border flex max-h-[92dvh] outline-none w-full max-w-none flex-col overflow-hidden rounded-t-[20px] border-0 bg-white p-0 text-ink backdrop:bg-ink/45 max-sm:mt-auto max-sm:mb-0 motion-safe:animate-sheet-up sm:m-auto sm:max-h-[min(88dvh,820px)] sm:w-[calc(100%-32px)] ${wide ? "sm:max-w-[760px]" : "sm:max-w-[520px]"} sm:rounded-[20px] [&:not([open])]:hidden`}
    >
      <header className="flex flex-none items-center justify-between gap-3 border-b border-[#EEEBE5] py-2 pr-2 pl-5">
        <h2 className="m-0 truncate text-[17px] font-semibold">{title}</h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label={t("close")}
          className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink hover:bg-[#F4F2EE]"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pt-5 pb-6">{children}</div>
      {footer && <footer className="flex-none border-t border-[#EEEBE5] bg-white px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</footer>}
    </dialog>
  );
}

/** Rodapé padrão, numa linha só: excluir (confirma numa janela), posição na lista com as setas e Concluir. */
export function SheetFooter({
  onDone,
  onRemove,
  removeLabel,
  removeAsk,
  move,
}: {
  onDone: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  /** a pergunta da janela de confirmação de excluir ("Excluir este produto?") e o que mais acontece */
  removeAsk?: { title: string; text?: string };
  /** posição atual (1…total) e quem troca de lugar; sem isso, não mostra as setas */
  move?: { pos: number; total: number; onMove: (to: number) => void };
}) {
  const t = useTranslations("editor.sheet");
  const [confirmDialog, ask] = useConfirm();
  const arrow =
    "flex size-10 flex-none cursor-pointer items-center justify-center rounded-full border border-[#E6E2DA] bg-white p-0 text-ink transition-colors hover:border-[#B9B2A6] disabled:cursor-default disabled:opacity-35";
  const remove = async () => {
    if (!onRemove) return;
    if (await ask({ title: removeAsk?.title ?? `${removeLabel}?`, text: removeAsk?.text, confirm: t("remove"), danger: true })) onRemove();
  };
  return (
    <div className="flex items-center gap-2">
      {confirmDialog}
      {onRemove && (
        // no celular só a lixeira (o nome vai para o leitor de tela), para tudo caber numa linha
        <button
          type="button"
          onClick={remove}
          aria-label={removeLabel}
          title={removeLabel}
          className="-ml-2 flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full border-0 bg-transparent px-2.5 text-sm font-medium text-[#A3361B] hover:bg-[#FFF1EC]"
        >
          <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
          <span aria-hidden="true" className="max-sm:hidden">
            {removeLabel}
          </span>
        </button>
      )}
      {move && move.total > 1 && (
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label={t("moveBefore")} title={t("moveBefore")} disabled={move.pos <= 1} onClick={() => move.onMove(move.pos - 2)} className={arrow}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="min-w-8 text-center text-[13px] text-[#5E5A52] tabular-nums">
            <span aria-hidden="true">
              {move.pos}/{move.total}
            </span>
            <span className="sr-only">{t("position", { pos: move.pos, total: move.total })}</span>
          </span>
          <button type="button" aria-label={t("moveAfter")} title={t("moveAfter")} disabled={move.pos >= move.total} onClick={() => move.onMove(move.pos)} className={arrow}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
      <button type="button" onClick={onDone} className="ml-auto min-h-11 cursor-pointer rounded-full border-0 bg-ink px-7 text-sm font-semibold text-white hover:opacity-85">
        {t("done")}
      </button>
    </div>
  );
}
