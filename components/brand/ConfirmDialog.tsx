"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ConfirmAsk = {
  /** a pergunta, curta: "Excluir este produto?" */
  title: string;
  /** o que acontece se confirmar, quando não é óbvio */
  text?: string;
  /** o rótulo do botão que confirma: "Excluir", "Remover", "Sair mesmo assim" */
  confirm: string;
  /** botão de confirmar em vermelho (apagar, remover) */
  danger?: boolean;
};

type Job = ConfirmAsk & { done: (ok: boolean) => void };

/**
 * Confirmação na tela, no lugar do `confirm()` do navegador e do "toque de novo": `ask({ title, confirm })` abre uma
 * janela modal e resolve `true` só se a pessoa confirmar (Cancelar, Esc e o fundo escuro resolvem `false`). `dialog` é a
 * janela: renderize-a em qualquer ponto do componente (vai por portal ao body, por cima de outra janela aberta).
 */
export function useConfirm() {
  const [job, setJob] = useState<Job | null>(null);
  const ask = useCallback((a: ConfirmAsk) => new Promise<boolean>((done) => setJob({ ...a, done })), []);
  const dialog = job
    ? createPortal(
        <ConfirmDialog
          {...job}
          onDone={(ok) => {
            setJob(null);
            job.done(ok);
          }}
        />,
        document.body,
      )
    : null;
  return [dialog, ask] as const;
}

function ConfirmDialog({ title, text, confirm, danger = false, onDone }: ConfirmAsk & { onDone: (ok: boolean) => void }) {
  const t = useTranslations("confirm");
  const ref = useRef<HTMLDialogElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) {
      d.showModal();
      // o foco começa no Cancelar: um Enter sem querer não apaga nada
      cancelBtn.current?.focus();
    }
    // Esc (ou o fundo) fecha: é cancelar. O evento chega numa tarefa à parte: o de um fechamento antigo (o React em
    // desenvolvimento monta, desmonta e monta de novo) não pode cancelar a janela que já reabriu
    const closed = () => {
      if (!d.open) done.current(false);
    };
    d.addEventListener("close", closed);
    return () => {
      d.removeEventListener("close", closed);
      if (d.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby="confirmar-titulo"
      aria-describedby={text ? "confirmar-texto" : undefined}
      // clique no fundo escurecido (fora da caixa) cancela
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto box-border w-[calc(100%-32px)] max-w-[400px] rounded-[20px] border-0 bg-white p-0 text-ink backdrop:bg-ink/45 motion-safe:animate-sheet-up"
    >
      <div className="flex flex-col gap-2 px-6 pt-6 pb-5">
        <h2 id="confirmar-titulo" className="m-0 text-[17px] leading-snug font-semibold text-balance">
          {title}
        </h2>
        {text && (
          <p id="confirmar-texto" className="m-0 text-sm leading-relaxed text-[#5E5A52]">
            {text}
          </p>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2 px-5 pb-5">
        <button
          ref={cancelBtn}
          type="button"
          onClick={() => done.current(false)}
          className="min-h-11 cursor-pointer rounded-full border border-[#E6E2DA] bg-white px-5 text-sm font-semibold text-ink hover:border-[#B9B2A6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={() => done.current(true)}
          className={`min-h-11 cursor-pointer rounded-full border-0 px-6 text-sm font-semibold text-white hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${danger ? "bg-[#B42318]" : "bg-ink"}`}
        >
          {confirm}
        </button>
      </div>
    </dialog>
  );
}
