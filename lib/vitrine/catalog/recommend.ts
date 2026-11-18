import type { CatalogVitrine } from "./vitrines";

/**
 * Recomendação de vitrines ("Você também pode gostar", no fim de cada vitrine). Função pura, sem banco: recebe o
 * catálogo (`getVitrinesCatalog`) e o ranking de hoje (`getTrendingHandles`) e devolve as vitrines mais parecidas
 * com a de `handle`, já sem ela.
 *
 * Pontuação de cada candidata:
 * - `sim` (70%): cosseno entre as marcas (peso 1) e categorias (peso 0,5) das duas vitrines, cada uma ponderada pelo
 *   IDF do catálogo — dividir uma marca rara aproxima mais do que dividir a marca que todo mundo tem;
 * - `pop` (20%): posição no ranking de cliques de hoje (1 para a primeira, caindo até 0 na 50ª);
 * - `fresh` (10%): publicada há pouco (1 hoje, 0 a partir de 30 dias);
 * - mais um desempate pequeno, fixo no dia, para as empatadas se revezarem de um dia para o outro sem bagunçar o cache.
 *
 * A escolha é gulosa e penaliza quem é parecida demais com uma já escolhida (MMR), para a lista não repetir a mesma
 * vitrine quatro vezes. Vitrine fora do catálogo (nada ativo) não tem com quem se parecer: valem o ranking e o frescor.
 */

const W = { sim: 0.7, pop: 0.2, fresh: 0.1, jitter: 0.05, redundancy: 0.3 };
const FEATURE_WEIGHT = { brand: 1, category: 0.5 };
/** Tamanho do ranking de `getTrendingHandles` (o teto da função no banco). */
const TRENDING_SIZE = 50;
const FRESH_DAYS = 30;
const DAY_MS = 86_400_000;

type Vector = Map<string, number>;

const norm = (s: string) => s.trim().toLowerCase();

const features = (v: CatalogVitrine) => [
  ...v.brandKeys.map((k) => ["b:" + k, FEATURE_WEIGHT.brand] as const),
  ...v.categoryKeys.map((k) => ["c:" + k, FEATURE_WEIGHT.category] as const),
];

function cosine(a: Vector, b: Vector) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, x] of a) {
    na += x * x;
    const y = b.get(k);
    if (y) dot += x * y;
  }
  for (const y of b.values()) nb += y * y;
  return dot && na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Hash FNV-1a em [0, 1): o mesmo par no mesmo dia sempre dá o mesmo número. */
function unit(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0) / 2 ** 32;
}

export function recommend(
  handle: string,
  vitrines: CatalogVitrine[],
  trending: string[],
  { limit = 4, today }: { limit?: number; today: string },
): CatalogVitrine[] {
  const self = norm(handle);

  // IDF de cada marca/categoria sobre o catálogo inteiro
  const df = new Map<string, number>();
  for (const v of vitrines) for (const [k] of new Map(features(v))) df.set(k, (df.get(k) ?? 0) + 1);
  const n = vitrines.length;
  const vector = (v: CatalogVitrine): Vector => new Map(features(v).map(([k, w]) => [k, w * Math.log(1 + n / (df.get(k) ?? 1))]));

  const vectors = new Map(vitrines.map((v) => [v, vector(v)]));
  const target = vitrines.find((v) => norm(v.card.handle) === self);
  const targetVec = target ? vectors.get(target)! : new Map<string, number>();

  const position = new Map(trending.map((h, i) => [norm(h), i]));
  const now = Date.parse(today);

  const candidates = vitrines
    .filter((v) => norm(v.card.handle) !== self)
    .map((v) => {
      const at = position.get(norm(v.card.handle));
      const pop = at === undefined ? 0 : Math.max(0, 1 - at / TRENDING_SIZE);
      const days = (now - Date.parse(v.updatedAt)) / DAY_MS;
      const fresh = Number.isFinite(days) ? Math.min(1, Math.max(0, 1 - days / FRESH_DAYS)) : 0;
      const score =
        W.sim * cosine(targetVec, vectors.get(v)!) + W.pop * pop + W.fresh * fresh + W.jitter * unit(`${self}|${norm(v.card.handle)}|${today}`);
      return { v, score };
    });

  // MMR: a cada rodada, a melhor descontada a semelhança com o que já entrou
  const picked: CatalogVitrine[] = [];
  while (picked.length < limit && candidates.length) {
    let best = 0;
    let bestValue = -Infinity;
    candidates.forEach((c, i) => {
      const redundancy = picked.reduce((m, p) => Math.max(m, cosine(vectors.get(c.v)!, vectors.get(p)!)), 0);
      const value = c.score - W.redundancy * redundancy;
      if (value > bestValue) [best, bestValue] = [i, value];
    });
    picked.push(candidates.splice(best, 1)[0].v);
  }
  return picked;
}
