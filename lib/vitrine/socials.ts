/**
 * Redes sociais da creator, mostradas discretas embaixo do nome na vitrine. No editor ela digita o @, o usuário
 * ou cola o link do perfil; aqui isso vira o link do perfil (ou null, se não der para entender).
 */
export const SOCIAL_NETWORKS = ["instagram", "tiktok", "youtube", "x"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export type Socials = Record<SocialNetwork, string>;

export const SOCIALS: Socials = { instagram: "", tiktok: "", youtube: "", x: "" };

/** Nome de cada rede como a própria rede escreve: não muda com o idioma. */
export const SOCIAL_LABELS: Record<SocialNetwork, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", x: "X" };

const PROFILE: Record<SocialNetwork, string> = {
  instagram: "https://www.instagram.com/",
  tiktok: "https://www.tiktok.com/@",
  youtube: "https://www.youtube.com/@",
  x: "https://x.com/",
};

const HOSTS: Record<SocialNetwork, RegExp> = {
  instagram: /(^|\.)instagram\.com$/,
  tiktok: /(^|\.)tiktok\.com$/,
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/,
  x: /(^|\.)(x\.com|twitter\.com)$/,
};

/** `@usuario`, `usuario`, `instagram.com/usuario` ou `https://…` → link do perfil; vazio ou de outro site → null. */
export function socialUrl(network: SocialNetwork, raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  // link colado sem o https://
  if (!/^https?:\/\//i.test(v) && /^(www\.|m\.)?[a-z0-9-]+\.(com|be)\//i.test(v)) v = `https://${v}`;
  if (/^https?:\/\//i.test(v)) {
    try {
      const url = new URL(v);
      return url.protocol === "https:" || url.protocol === "http:" ? (HOSTS[network].test(url.hostname.toLowerCase()) ? url.toString() : null) : null;
    } catch {
      return null;
    }
  }
  const user = v.replace(/^@/, "");
  return /^[A-Za-z0-9._-]{1,60}$/.test(user) ? PROFILE[network] + user : null;
}

/** Só as redes conhecidas, com texto: o que vem do banco ou de um rascunho antigo pode ter qualquer formato. */
export function pickSocials(raw: unknown): Socials {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, typeof src[n] === "string" ? (src[n] as string) : ""])) as Socials;
}

/** As redes preenchidas e válidas, na ordem de `SOCIAL_NETWORKS`, já como link. */
export const socialLinks = (socials: Socials): [SocialNetwork, string][] =>
  SOCIAL_NETWORKS.flatMap((n) => {
    const url = socialUrl(n, socials[n]);
    return url ? [[n, url] as [SocialNetwork, string]] : [];
  });
