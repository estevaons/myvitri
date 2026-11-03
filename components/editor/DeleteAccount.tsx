"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/actions";
import { HOST } from "@/lib/brand";
import { Hint, inputCls, labelCls } from "./ui";

/** Fim do painel Perfil: apaga conta e vitrine de vez, pedindo o link digitado como confirmação. */
export function DeleteAccount({ handle }: { handle: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();
  const matches = typed.trim().toLowerCase().replace(/^@/, "") === handle;

  const remove = () => {
    setError(null);
    startDeleting(async () => {
      const res = await deleteAccountAction(typed);
      setError(res.error);
    });
  };

  return (
    <section className="flex flex-col gap-2.5 border-t border-[#EEEBE5] pt-6">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-9 self-start rounded-lg border-0 bg-transparent px-0 text-[13px] font-medium text-[#A3361B] underline-offset-4 hover:underline"
        >
          Excluir minha conta
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (matches) remove();
          }}
          className="flex flex-col gap-3 rounded-[12px] border border-[#F4D5CB] bg-[#FFF6F2] p-4"
        >
          <Hint>
            Apaga sua conta, a vitrine {HOST}/{handle}, os cupons, produtos, kits e métricas. Não dá para desfazer.
          </Hint>
          <label className={`flex flex-col gap-1.5 ${labelCls}`}>
            Para confirmar, digite {handle}
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className={`${inputCls} bg-white`}
            />
          </label>
          {error && (
            <p role="alert" className="m-0 text-[13px] font-semibold text-[#A3361B]">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!matches || deleting}
              className="min-h-10 rounded-[10px] border-0 bg-[#B42318] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {deleting ? "Excluindo…" : "Excluir para sempre"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
                setError(null);
              }}
              className="min-h-10 rounded-[10px] border-0 bg-transparent px-3 text-sm font-medium text-[#5E5A52]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
