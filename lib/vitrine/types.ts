import { z } from "zod";

export const ICONS = ["Bikini", "Glasses", "Jar", "Bottle", "Shoe", "Hat", "Nuts", "Bag"] as const;
export const THEME_IDS = ["vibrante", "clean", "noite", "pastel", "personalizado"] as const;
export const FONT_IDS = ["moderna", "elegante", "classica"] as const;
export const RADIUS_IDS = ["arredondado", "suave", "reto"] as const;
export const SECTION_IDS = ["ticker", "products", "coupons", "kits", "cta"] as const;

export const RESERVED_HANDLES = new Set([
  "editor", "api", "admin", "login", "entrar", "sair", "cadastro", "app", "www",
  "vitri", "ajuda", "termos", "privacidade", "_next", "favicon.ico",
]);

export const HANDLE_RE = /^[a-z0-9_.]{3,30}$/;

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Use um link que comece com https://");

const text = (max: number) => z.string().trim().max(max);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
/** Cor de fundo de um card: "auto" (cor da vez), "accent" (cor de destaque), índice das cores do tema ou uma cor livre. */
export const colorChoice = z.union([z.enum(["auto", "accent"]), z.number().int().min(0).max(11), hex]);
export type ColorChoice = z.infer<typeof colorChoice>;

export const couponSchema = z
  .object({
    id: z.uuid(),
    brand: text(60).min(1, "Informe a marca"),
    code: text(40).min(1, "Informe o código").transform((v) => v.toUpperCase()),
    kind: z.enum(["percent", "fixed"]),
    /** percent: 1–100; fixed: valor em centavos */
    value: z.number().int().positive(),
    condition: text(120),
    /** AAAA-MM-DD ou null quando não expira */
    expiresAt: date.nullable(),
    storeUrl: httpUrl,
    logoUrl: httpUrl,
    /** passo a passo, um por linha */
    howTo: text(400),
    /** AAAA-MM-DD: antes disso o cupom fica escondido; null = já vale */
    startsAt: date.nullable(),
    color: colorChoice,
  })
  .refine((c) => !c.startsAt || !c.expiresAt || c.startsAt <= c.expiresAt, { message: "O cupom vence antes de começar", path: ["startsAt"] });

export const productSchema = z.object({
  id: z.uuid(),
  name: text(80).min(1, "Informe o nome do produto"),
  brand: text(60),
  category: text(30),
  /** preço cheio em centavos */
  price: z.number().int().nonnegative(),
  couponId: z.uuid().nullable(),
  url: httpUrl,
  imageUrl: httpUrl,
  icon: z.enum(ICONS),
  /** quando preenchido, é para onde o botão de compra leva (no lugar do link do produto) */
  affiliateUrl: httpUrl,
  /** review em vídeo (Reels, TikTok, YouTube) */
  videoUrl: httpUrl,
  soldOut: z.boolean(),
  /** ISO; última vez que o preço foi conferido na loja */
  priceCheckedAt: z.string().max(40).nullable(),
});

/** Visual do card do kit. */
export const kitStyleSchema = z.object({
  color: colorChoice,
  layout: z.enum(["espalhado", "alinhado"]),
  label: text(30),
});
export const KIT_STYLE: z.infer<typeof kitStyleSchema> = { color: "auto", layout: "espalhado", label: "" };

export const kitSchema = z.object({
  id: z.uuid(),
  name: text(60).min(1, "Dê um nome ao kit"),
  description: text(240),
  signature: text(80),
  productIds: z.array(z.uuid()).max(4),
  style: kitStyleSchema,
});

export const vitrineContentSchema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(HANDLE_RE, "Use de 3 a 30 letras minúsculas, números, ponto ou _")
    .refine((h) => !RESERVED_HANDLES.has(h), "Esse nome é reservado"),
  name: text(60).min(1, "Informe seu nome"),
  avatarUrl: httpUrl,
  headline: text(90),
  sub: text(240),
  look: z.object({
    theme: z.enum(THEME_IDS),
    accent: hex,
    /** fundo do tema "personalizado" */
    bg: hex,
    /** foto de capa no topo da vitrine */
    bannerUrl: httpUrl,
    font: z.enum(FONT_IDS),
    radius: z.enum(RADIUS_IDS),
    layout: z.enum(["grade", "lista"]),
    /** O que ocupa o lado direito do topo da vitrine. */
    hero: z.enum(["produtos", "cupons"]),
  }),
  show: z.record(z.enum(SECTION_IDS), z.boolean()),
  /** UTM nos links das lojas, para a marca ver de onde veio a venda */
  tracking: z.object({ utm: z.boolean(), campaign: text(60) }),
  coupons: z.array(couponSchema).max(100),
  products: z.array(productSchema).max(200),
  kits: z.array(kitSchema).max(20),
});

/** Campos que chegaram depois: completam rascunhos e linhas antigas. */
export const COUPON_EXTRA = { logoUrl: "", howTo: "", startsAt: null, color: "auto" } satisfies Partial<z.infer<typeof couponSchema>>;
export const PRODUCT_EXTRA = { affiliateUrl: "", videoUrl: "", soldOut: false, priceCheckedAt: null } satisfies Partial<z.infer<typeof productSchema>>;
export const TRACKING: z.infer<typeof vitrineContentSchema>["tracking"] = { utm: true, campaign: "" };

export type Coupon = z.infer<typeof couponSchema>;
export type Product = z.infer<typeof productSchema>;
export type Kit = z.infer<typeof kitSchema>;
export type VitrineContent = z.infer<typeof vitrineContentSchema>;
export type IconId = (typeof ICONS)[number];
export type SectionId = (typeof SECTION_IDS)[number];

export function emptyContent(handle: string, name: string): VitrineContent {
  return {
    handle,
    name,
    avatarUrl: "",
    headline: "Tudo que eu uso, com o meu desconto.",
    sub: "Escolha o produto, copie o cupom e economize direto na loja oficial da marca.",
    look: { theme: "vibrante", accent: "#FF5A36", bg: "#FFFFFF", bannerUrl: "", font: "moderna", radius: "arredondado", layout: "grade", hero: "produtos" },
    show: { ticker: true, products: true, coupons: true, kits: true, cta: true },
    tracking: TRACKING,
    coupons: [],
    products: [],
    kits: [],
  };
}
