import { safeUrl } from "@/lib/vitrine/links";

/**
 * Copia na hora, ainda dentro do clique, e diz se deu certo. Usa o caminho antigo (textarea + execCommand) porque
 * ele responde sem esperar: assim a loja pode abrir no mesmo clique, e o Safari não a trata como pop-up.
 * É também o que costuma funcionar nos navegadores internos do Instagram e do TikTok.
 */
export function copyNow(text: string): boolean {
  const before = document.activeElement as HTMLElement | null;
  const area = document.createElement("textarea");
  try {
    area.value = text;
    area.readOnly = true; // não abre o teclado no celular
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    // com uma janela modal (<dialog>) aberta, o resto da página fica inerte e não dá para selecionar ali: o campo vai
    // para dentro da janela de cima (no Safari o botão tocado nem ganha o foco, então não dá para partir dele)
    (Array.from(document.querySelectorAll("dialog[open]")).pop() ?? document.body).append(area);
    area.select();
    area.setSelectionRange(0, text.length); // iOS ignora o select() sozinho
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    before?.focus({ preventScroll: true });
  }
}

/** Segunda tentativa, pela API moderna. Só responde depois do clique, então quem chama não abre a loja. */
export async function copyLater(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** O React bloqueia `javascript:` no href, mas não no window.open: só abre http(s). */
export function openStore(url: string) {
  const safe = safeUrl(url);
  if (safe) window.open(safe, "_blank", "noopener,noreferrer");
}
