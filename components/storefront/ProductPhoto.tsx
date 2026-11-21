"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Quanto a proporção da foto pode diferir da do quadro antes de ela passar a ser cortada.
// Foto de loja "quadrada" às vezes vem 1000×1050; essas continuam inteiras.
const TOLERANCE = 0.1;

/** A parte da foto com conteúdo, em frações da foto (0 a 1). */
type Box = { x: number; y: number; w: number; h: number };

/** Fotos enviadas pela vitrine (o bucket do Supabase responde com CORS, então dá para ler os pixels). */
const isUpload = (src: string) => src.includes("/storage/v1/object/public/vitrine-photos/");

// Cada foto é analisada uma vez por página (a mesma foto aparece na grade, nos favoritos e nos outfits).
const boxes = new Map<string, Promise<Box | null>>();

/**
 * Faixas brancas gravadas na foto. Até a correção do recorte (`ImageCrop`, `trim`), a foto de produto afastada subia quadrada,
 * com a sobra em branco: um look 3:4 virava 1000×1000 com faixas dos lados. Devolve a parte com a foto, ou `null` se não
 * houver faixas. Foto de loja em fundo branco também tem bordas brancas, mas a primeira coluna (ou linha) com conteúdo é só
 * uma lasca da peça; numa faixa gravada, é a borda inteira de uma foto, quase toda colorida.
 */
function findBars(src: string): Promise<Box | null> {
  let found = boxes.get(src);
  if (!found) {
    found = (async () => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      await img.decode();
      const scale = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const white = (x: number, y: number) => {
        const i = (y * w + x) * 4;
        return Math.min(data[i], data[i + 1], data[i + 2]) >= 245;
      };
      // fração de pixels coloridos numa coluna (ou linha)
      const col = (x: number) => {
        let n = 0;
        for (let y = 0; y < h; y++) if (!white(x, y)) n++;
        return n / h;
      };
      const row = (y: number) => {
        let n = 0;
        for (let x = 0; x < w; x++) if (!white(x, y)) n++;
        return n / w;
      };
      // a faixa: colunas (ou linhas) quase todas brancas a partir da borda
      const run = (size: number, line: (i: number) => number, from: number, step: number) => {
        let n = 0;
        while (n < size / 2 && line(from + n * step) < 0.02) n++;
        return n;
      };
      const left = run(w, col, 0, 1);
      const right = run(w, col, w - 1, -1);
      const top = run(h, row, 0, 1);
      const bottom = run(h, row, h - 1, -1);
      const min = 0.02;
      // a primeira coluna (ou linha) depois da faixa tem de ser a borda de uma foto: quase toda colorida
      const edge = (n: number, size: number, line: (i: number) => number, at: number) => n === 0 || (n >= size * min && line(at) >= 0.6);
      const sides = (left >= w * min || right >= w * min) && top === 0 && bottom === 0;
      const ends = (top >= h * min || bottom >= h * min) && left === 0 && right === 0;
      // uma linha a mais para dentro: o limite da faixa no arquivo comprimido não é nítido e não pode sobrar um fio branco
      if (sides && edge(left, w, col, left) && edge(right, w, col, w - 1 - right)) {
        const a = left ? left + 1 : 0;
        const b = right ? right + 1 : 0;
        return { x: a / w, y: 0, w: (w - a - b) / w, h: 1 };
      }
      if (ends && edge(top, h, row, top) && edge(bottom, h, row, h - 1 - bottom)) {
        const a = top ? top + 1 : 0;
        const b = bottom ? bottom + 1 : 0;
        return { x: 0, y: a / h, w: 1, h: (h - a - b) / h };
      }
      return null;
    })().catch(() => null);
    boxes.set(src, found);
  }
  return found;
}

/**
 * Posição e tamanho (em % do quadro) que fazem a parte `box` da foto cobrir o quadro, centrada. `frame` é altura/largura do
 * quadro; `photo`, largura/altura da foto. Em %, o encaixe acompanha o quadro quando a tela muda de largura.
 */
function coverBox(box: Box, photo: number, frame: number): CSSProperties {
  // unidade: a largura do quadro. A foto tem 1 de largura e 1/photo de altura antes da escala.
  const cw = box.w;
  const ch = box.h / photo;
  const k = Math.max(1 / cw, frame / ch);
  const width = k;
  const height = k / photo;
  const left = 0.5 - (box.x + box.w / 2) * k;
  const top = frame / 2 - (box.y + box.h / 2) * height;
  return {
    position: "absolute",
    maxWidth: "none",
    width: `${width * 100}%`,
    height: `${(height / frame) * 100}%`,
    left: `${left * 100}%`,
    top: `${(top / frame) * 100}%`,
  };
}

type Fit = { kind: "contain" } | { kind: "cover" } | { kind: "box"; style: CSSProperties };

/** Só o recorte antigo gravava faixas, e ele sempre subia o produto quadrado. */
const mayHaveBars = (src: string, photo: number) => isUpload(src) && Math.abs(photo - 1) <= 0.01;

/** Foto com cenário: `ratio` é largura/altura da parte com foto (sem as faixas gravadas). `null`: foto de loja. */
export type Scene = { ratio: number } | null;

const scenes = new Map<string, Promise<Scene>>();

function sceneOf(src: string): Promise<Scene> {
  let found = scenes.get(src);
  if (!found) {
    found = (async () => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const photo = img.naturalWidth / img.naturalHeight;
      if (mayHaveBars(src, photo)) {
        const bars = await findBars(src);
        if (bars) return { ratio: (photo * bars.w) / bars.h };
      }
      // a mesma regra do card (quadrado): proporção bem diferente de 1 é foto com cenário
      return Math.abs(Math.log(photo)) > Math.log(1 + TOLERANCE) ? { ratio: photo } : null;
    })().catch(() => null);
    scenes.set(src, found);
  }
  return found;
}

/**
 * Se a foto é de cenário (um look) ou de loja, com a mesma regra dos cards. `undefined` enquanto a foto carrega.
 * O produto ampliado usa para mostrar a foto de cenário de ponta a ponta, na proporção dela, em vez de dentro do quadrado creme.
 */
export function usePhotoScene(src: string): Scene | undefined {
  const [scene, setScene] = useState<{ src: string; scene: Scene }>();
  useEffect(() => {
    if (!src) return;
    let live = true;
    sceneOf(src).then((s) => {
      if (live) setScene({ src, scene: s });
    });
    return () => {
      live = false;
    };
  }, [src]);
  return scene?.src === src ? scene.scene : undefined;
}

/**
 * Foto do produto dentro do quadro da vitrine. O card fica sempre cheio, sem faixas vazias dos lados:
 * - foto de loja (quase quadrada, fundo branco): inteira e com multiply, o fundo dela se funde ao do card;
 * - foto de proporção bem diferente da do quadro (um look vertical): preenche o quadro e corta o excesso (cortar não reduz a
 *   nitidez: a foto só fica maior que o quadro);
 * - foto enviada com faixas brancas gravadas (o recorte antigo): as faixas ficam de fora e a foto preenche o quadro.
 * A foto inteira continua no produto ampliado (`ProductModal`).
 */
export function ProductPhoto({ src, extraClassName = "" }: { src: string; extraClassName?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [fit, setFit] = useState<Fit>({ kind: "contain" });

  const measure = () => {
    const img = ref.current;
    const box = img?.parentElement;
    if (!img || !box || !img.naturalWidth || !img.naturalHeight || !box.clientWidth || !box.clientHeight) return;
    const photo = img.naturalWidth / img.naturalHeight;
    const frame = box.clientHeight / box.clientWidth;
    setFit(Math.abs(Math.log(photo * frame)) > Math.log(1 + TOLERANCE) ? { kind: "cover" } : { kind: "contain" });
    // só o recorte antigo gravava faixas, e ele sempre subia o produto quadrado. Achando faixas, só a parte com foto cobre
    // o quadro, qualquer que seja a forma dele (o quadro do produto ampliado já tem a proporção dessa parte).
    if (!mayHaveBars(src, photo)) return;
    findBars(src).then((bars) => {
      if (bars && ref.current?.src === img.src) setFit({ kind: "box", style: coverBox(bars, photo, frame) });
    });
  };

  // Mede de novo quando o quadro muda de tamanho: a página anterior fica guardada escondida (display: none, quadro 0×0) e
  // volta ao navegar de volta. O observador também dispara ao começar, o que cobre a foto que terminou de carregar antes
  // da hidratação, quando o onLoad ainda não estava ligado.
  useEffect(() => {
    const box = ref.current?.parentElement;
    if (!box) return;
    const observer = new ResizeObserver(() => {
      if (ref.current?.complete) measure();
    });
    observer.observe(box);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mede de novo só quando a foto muda
  }, [src]);

  const look = fit.kind === "contain" ? "size-full object-contain mix-blend-multiply" : fit.kind === "cover" ? "size-full object-cover" : "";
  return (
    // eslint-disable-next-line @next/next/no-img-element -- imagens vêm de lojas arbitrárias
    <img
      ref={ref}
      src={src}
      alt=""
      loading="lazy"
      onLoad={measure}
      className={`${look} ${extraClassName}`}
      style={fit.kind === "box" ? fit.style : undefined}
    />
  );
}
