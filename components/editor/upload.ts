import { uploadImageAction, type ImageKind } from "@/app/actions";

/** Maior lado depois de reduzir: a capa ocupa a largura da vitrine; logo e perfil aparecem pequenos. */
const MAX_SIDE: Record<ImageKind, number> = { logo: 512, cover: 1600, avatar: 512 };

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((done) => canvas.toBlob(done, type, quality));

/**
 * Reduz a imagem no navegador e converte para webp antes de enviar. Onde o navegador não gera webp,
 * o logo vira png (mantém o fundo transparente) e as fotos viram jpeg (bem menores).
 */
async function shrinkImage(file: File, kind: ImageKind): Promise<Blob> {
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    // SVG sem width/height vem com 0: desenha no tamanho máximo
    const w = img.naturalWidth || MAX_SIDE[kind];
    const h = img.naturalHeight || MAX_SIDE[kind];
    const scale = Math.min(1, MAX_SIDE[kind] / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d")!;
    if (kind !== "logo") {
      // jpeg não tem transparência: fundo branco em vez de preto
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let blob = await encode(canvas, "image/webp", kind === "logo" ? 0.9 : 0.85);
    if (blob && blob.type !== "image/webp" && kind !== "logo") blob = await encode(canvas, "image/jpeg", 0.85);
    if (!blob) throw new Error("imagem inválida");
    return blob;
  } finally {
    URL.revokeObjectURL(src);
  }
}

const EXT: Record<string, string> = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" };

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,image/gif";

/** Reduz e envia; devolve a URL pública ou a mensagem de erro para mostrar. */
export async function uploadImage(kind: ImageKind, file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  let blob: Blob;
  try {
    blob = await shrinkImage(file, kind);
  } catch {
    return { ok: false, error: "Não conseguimos abrir essa imagem. Tente outra." };
  }
  const form = new FormData();
  form.set("file", new File([blob], `imagem.${EXT[blob.type] ?? "webp"}`, { type: blob.type }));
  return uploadImageAction(kind, form);
}
