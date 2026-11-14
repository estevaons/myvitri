/**
 * Vídeos já publicados no Instagram, TikTok ou YouTube que a creator junta a um outfit. Daqui sai a rede e o id do
 * vídeo, o endereço canônico que fica gravado e o endereço do player oficial, que a vitrine abre ali mesmo (iframe).
 * Sem acesso à rede: serve ao editor, à vitrine e à Server Action que busca a capa (`lib/vitrine/video-import.ts`).
 */

export const VIDEO_NETWORKS = ["instagram", "tiktok", "youtube"] as const;
export type VideoNetwork = (typeof VIDEO_NETWORKS)[number];

export type VideoRef = {
  network: VideoNetwork;
  /** Instagram: o código do post (`DAbc123`); TikTok: o número do vídeo; YouTube: o id de 11 caracteres */
  id: string;
  /** Instagram: reel ou post (o player é o mesmo, o caminho muda) */
  kind?: "reel" | "p";
  /** o endereço limpo, sem rastreio (`igsh`, `utm_*`, `is_from_webapp`…): é o que fica gravado no post */
  url: string;
};

/** Os domínios dos players, para a CSP (`frame-src` em next.config.ts) e para conferir o iframe. */
export const VIDEO_FRAME_ORIGINS = ["https://www.instagram.com", "https://www.tiktok.com", "https://www.youtube-nocookie.com"];

/** Links curtos do TikTok (`vm.tiktok.com/ZM…`, `tiktok.com/t/ZT…`): só o servidor descobre o vídeo, seguindo o redirect. */
export function isTikTokShortLink(raw: string) {
  const url = toUrl(raw);
  if (!url) return false;
  const host = url.hostname.replace(/^www\./, "");
  return host === "vm.tiktok.com" || host === "vt.tiktok.com" || (host === "tiktok.com" && /^\/t\/[\w-]+\/?$/.test(url.pathname));
}

function toUrl(raw: string) {
  const s = raw.trim();
  if (!s) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

const YT_ID = /^[\w-]{11}$/;

/** O vídeo de um link colado, ou null quando não é um vídeo das três redes (perfil, link curto do TikTok, outro site). */
export function parseVideo(raw: string): VideoRef | null {
  const url = toUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "instagram.com" || host === "instagr.am") {
    // /reel/X, /reels/X, /p/X, /tv/X e também /fulana/reel/X (link copiado do perfil)
    const at = parts.findIndex((p) => ["reel", "reels", "p", "tv"].includes(p));
    const id = at >= 0 ? parts[at + 1] : undefined;
    if (!id || !/^[\w-]{5,40}$/.test(id)) return null;
    const kind = parts[at] === "p" ? "p" : "reel";
    return { network: "instagram", id, kind, url: `https://www.instagram.com/${kind}/${id}/` };
  }

  if (host === "tiktok.com") {
    // /@fulana/video/123 (e /@fulana/photo/123 não é vídeo); /embed/v2/123 e /player/v1/123 também valem
    const at = parts.findIndex((p) => p === "video" || p === "v2" || p === "v1");
    const id = at >= 0 ? parts[at + 1] : undefined;
    if (!id || !/^\d{8,25}$/.test(id)) return null;
    const user = parts[0]?.startsWith("@") ? parts[0] : null;
    return { network: "tiktok", id, url: user ? `https://www.tiktok.com/${user}/video/${id}` : `https://www.tiktok.com/video/${id}` };
  }

  let yt: string | undefined;
  if (host === "youtu.be") yt = parts[0];
  else if (host === "youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") yt = url.searchParams.get("v") ?? undefined;
    else if (["shorts", "embed", "live", "v"].includes(parts[0])) yt = parts[1];
  }
  if (yt && YT_ID.test(yt)) {
    const short = parts[0] === "shorts";
    return { network: "youtube", id: yt, url: short ? `https://www.youtube.com/shorts/${yt}` : `https://www.youtube.com/watch?v=${yt}` };
  }
  return null;
}

/**
 * O player oficial, para tocar dentro da vitrine. TikTok e YouTube começam a tocar ao abrir (a pessoa acabou de tocar
 * no play); o do Instagram não aceita autoplay e tem o próprio play, por isso a vitrine o mostra direto no lugar da
 * capa, sem o play dela (`OutfitGallery` em components/storefront/Storefront.tsx).
 */
export function videoEmbedUrl(v: VideoRef) {
  switch (v.network) {
    case "instagram":
      return `https://www.instagram.com/${v.kind ?? "reel"}/${v.id}/embed/`;
    case "tiktok":
      return `https://www.tiktok.com/player/v1/${v.id}?autoplay=1&music_info=0&description=0&rel=0&native_context_menu=0`;
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
  }
}

export const VIDEO_LABELS: Record<VideoNetwork, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" };
