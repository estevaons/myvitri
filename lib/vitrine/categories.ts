/**
 * Categorias de produto: lista fixa. A chave é o que fica no banco (`products.category`) e na URL dos filtros
 * (`?category=relogios`); o rótulo vem das traduções (`productCategories.<chave>`). Antes era texto livre, e
 * "Relogio" e "Relógio" viravam duas categorias. "" é "sem categoria".
 *
 * Para criar uma categoria: a chave aqui, o rótulo nos dois `messages/*.json` e uma migração que troca a
 * constraint `products_category_check`. A mesma lista está nela.
 */
export const CATEGORIES = [
  "roupas",
  "moda-praia",
  "calcados",
  "bolsas",
  "acessorios",
  "joias",
  "relogios",
  "oculos",
  "maquiagem",
  "skincare",
  "cabelo",
  "perfumes",
  "esporte",
  "suplementos",
  "eletronicos",
  "casa",
  "infantil",
  "pets",
] as const;

export type CategoryId = (typeof CATEGORIES)[number];
/** Categoria de um produto: uma da lista ou "" (sem categoria). */
export type ProductCategory = CategoryId | "";

const IDS = new Set<string>(CATEGORIES);
export const isCategory = (s: string): s is CategoryId => IDS.has(s);

/**
 * Grafias do texto livre de antes (já sem acento, minúsculas, com hífen no lugar de espaço) → chave.
 * A migração `20261118000000_product_category_enum.sql` usa o mesmo mapa.
 */
const LEGACY: Record<string, CategoryId> = {
  roupa: "roupas",
  moda: "roupas",
  vestuario: "roupas",
  camisa: "roupas",
  camisas: "roupas",
  camiseta: "roupas",
  camisetas: "roupas",
  praia: "moda-praia",
  biquini: "moda-praia",
  biquinis: "moda-praia",
  calcado: "calcados",
  tenis: "calcados",
  sapato: "calcados",
  sapatos: "calcados",
  bolsa: "bolsas",
  acessorio: "acessorios",
  joia: "joias",
  bijuteria: "joias",
  bijuterias: "joias",
  relogio: "relogios",
  make: "maquiagem",
  "skin-care": "skincare",
  pele: "skincare",
  "cuidados-com-a-pele": "skincare",
  cabelos: "cabelo",
  perfume: "perfumes",
  fragrancia: "perfumes",
  fragrancias: "perfumes",
  esportes: "esporte",
  corrida: "esporte",
  fitness: "esporte",
  academia: "esporte",
  treino: "esporte",
  suplemento: "suplementos",
  eletronico: "eletronicos",
  tecnologia: "eletronicos",
  decoracao: "casa",
  kids: "infantil",
  pet: "pets",
};

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Lê a categoria vinda do banco ou de um rascunho: a chave como está, uma grafia antiga convertida, o resto vira
 * "" (sem categoria). Garante o tipo mesmo antes da migração rodar.
 */
export function toCategory(raw: unknown): ProductCategory {
  if (typeof raw !== "string") return "";
  if (isCategory(raw)) return raw;
  const s = slug(raw);
  return isCategory(s) ? s : (LEGACY[s] ?? "");
}
