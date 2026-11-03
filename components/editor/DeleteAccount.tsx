"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/actions";
import { HOST } from "@/lib/brand";
import { H, Hint, inputCls } from "./ui";

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
    <section className="flex flex-col gap-2.5 border-t border-[#E0DCD3] pt-6">
      <H>Excluir conta</H>
      <Hint>
        Apaga sua conta, a vitrine {HOST}/{handle}, os cupons, produtos, kits e métricas. Não dá para desfazer.
      </Hint>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-11 self-start rounded-full border-[1.5px] border-[#E3B4A5] bg-white px-4 text-sm font-bold text-[#A3361B]"
        >
          Excluir minha conta
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (matches) remove();
          }}
          className="flex flex-col gap-3 rounded-xl border-[1.5px] border-[#F1C9BC] bg-[#FFF1EC] p-4"
        >
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Para confirmar, digite {handle}
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className={inputCls}
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
              className="min-h-11 rounded-full border-0 bg-[#B42318] px-4 text-sm font-bold text-white disabled:opacity-40"
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
              className="min-h-11 rounded-full border-0 bg-transparent px-3 text-sm font-semibold text-[#5E5A52]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
