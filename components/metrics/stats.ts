/** Tipos de evento da vitrine pública (tabela `events`, gravados por POST /api/t). */
/** "kit" só aparece em eventos antigos, de quando a vitrine tinha kits. */
export type EventKind = "view" | "buy" | "copy" | "kit" | "video" | "post";

/** O que a RPC `vitrine_stats(days)` devolve. */
export type Stats = {
  totals: Partial<Record<EventKind, number>>;
  days: { day: string; views: number; clicks: number }[];
  items: { id: string; kind: string; n: number }[];
  /**
   * Totais dos `days` dias anteriores à janela atual.
   * Só existe depois da migração 20261105000000_metrics_previous; sem ela, a página não mostra a variação.
   */
  previous?: Partial<Record<EventKind, number>>;
};

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

/** `?periodo=7|30|90`; qualquer outra coisa vira o padrão, 30. */
export const parsePeriod = (v: string | string[] | undefined): Period => PERIODS.find((p) => String(p) === v) ?? 30;

/** Hoje (AAAA-MM-DD) no horário de Brasília, o mesmo fuso em que a RPC agrupa os dias. */
export const todaySP = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
