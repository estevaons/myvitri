import { uploadImageAction, type ImageKind } from "@/app/actions";

/**
 * Maior lado depois de reduzir: a capa ocupa a largura da vitrine; o perfil aparece pequeno; o produto fica no meio;
 * a foto do post é vertical e abre grande (o quadro 4:5 chega a ~720×900 px de tela, o dobro em tela retina), mas precisa
 * caber nos 2 MiB do bucket: se passar, o envio baixa a qualidade (`MAX_BYTES`).
 */
export const MAX_SIDE: Record<ImageKind, number> = { cover: 1600, avatar: 512, product: 1000, post: 1800 };

/** O limite do bucket `vitrine-photos` (2 MiB) com folga: acima disso o envio tenta de novo com menos qualidade. */
const MAX_BYTES = 2_000_000;

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((done) => canvas.toBlob(done, type, quality));

/**
 * Reduz a imagem no navegador e converte para webp antes de enviar. Onde o navegador não gera webp,
 * as fotos viram jpeg (bem menores que png).
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
    // jpeg não tem transparência: fundo branco em vez de preto
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let blob = await encode(canvas, "image/webp", 0.85);
    const type = blob && blob.type !== "image/webp" ? "image/jpeg" : blob?.type;
    if (type === "image/jpeg") blob = await encode(canvas, "image/jpeg", 0.85);
    // foto muito detalhada no tamanho cheio pode passar do limite: a mesma foto, com menos qualidade, até caber
    for (const q of [0.75, 0.65, 0.55]) {
      if (!blob || blob.size <= MAX_BYTES) break;
      blob = await encode(canvas, type ?? "image/webp", q);
    }
    if (!blob) throw new Error("imagem inválida");
    return blob;
  } finally {
    URL.revokeObjectURL(src);
  }
}

const EXT: Record<string, string> = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" };

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,image/gif";

/**
 * Reduz e envia; devolve a URL pública ou a mensagem de erro para mostrar. `unreadable` é a mensagem
 * (no idioma da página) para imagem que o navegador não consegue abrir: `errors.imageUnreadable`.
 */
export async function uploadImage(kind: ImageKind, file: File, unreadable: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  let blob: Blob;
  try {
    blob = await shrinkImage(file, kind);
  } catch {
    return { ok: false, error: unreadable };
  }
  const form = new FormData();
  form.set("file", new File([blob], `imagem.${EXT[blob.type] ?? "webp"}`, { type: blob.type }));
  return uploadImageAction(kind, form);
}
