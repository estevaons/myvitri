import type { IconId } from "@/lib/vitrine/types";

export const ICON_LABELS: Record<IconId, string> = {
  Bikini: "Moda praia",
  Glasses: "Óculos",
  Jar: "Pote",
  Bottle: "Garrafa",
  Shoe: "Tênis",
  Hat: "Chapéu",
  Nuts: "Pacote",
  Bag: "Bolsa",
};

function Paths({ icon }: { icon: IconId }) {
  switch (icon) {
    case "Glasses":
      return (
        <>
          <path d="M12 54h96" />
          <rect x="16" y="52" width="38" height="28" rx="12" fill="#111111" />
          <rect x="66" y="52" width="38" height="28" rx="12" fill="#111111" />
          <path d="M54 60q6-6 12 0" />
          <path d="M16 54l-8-10M104 54l8-10" />
        </>
      );
    case "Bikini":
      return (
        <>
          <path d="M32 34 L40 18 M88 34 L80 18" />
          <path d="M32 34 L58 50 L36 58 Z" fill="#FFFFFF" />
          <path d="M88 34 L62 50 L84 58 Z" fill="#FFFFFF" />
          <path d="M36 58 L84 58" />
          <path d="M36 74 H84 L66 98 H54 Z" fill="#FFFFFF" />
        </>
      );
    case "Jar":
      return (
        <>
          <rect x="34" y="40" width="52" height="62" rx="8" fill="#FFFFFF" />
          <rect x="38" y="24" width="44" height="16" rx="4" fill="#111111" />
          <rect x="42" y="58" width="36" height="24" rx="3" />
        </>
      );
    case "Bottle":
      return (
        <>
          <rect x="44" y="34" width="32" height="70" rx="12" fill="#FFFFFF" />
          <rect x="48" y="18" width="24" height="16" rx="4" fill="#111111" />
          <path d="M44 60h32M44 70h32" />
        </>
      );
    case "Shoe":
      return (
        <>
          <path d="M18 80 L22 52 Q34 56 46 50 L58 62 Q80 66 100 70 Q106 72 104 84 Z" fill="#FFFFFF" />
          <path d="M16 90 H106" strokeWidth="6" />
          <path d="M34 56 l6 8 M44 54 l6 8" />
        </>
      );
    case "Hat":
      return (
        <>
          <ellipse cx="60" cy="76" rx="48" ry="14" fill="#FFFFFF" />
          <path d="M34 74 Q36 40 60 38 Q84 40 86 74" fill="#FFFFFF" />
          <path d="M35 64 H85" strokeWidth="6" />
        </>
      );
    case "Nuts":
      return (
        <>
          <path d="M36 34 H84 L90 104 H30 Z" fill="#FFFFFF" />
          <path d="M36 34 l4 -10 h40 l4 10" />
          <ellipse cx="52" cy="70" rx="8" ry="11" fill="#111111" />
          <ellipse cx="70" cy="80" rx="8" ry="11" />
        </>
      );
    case "Bag":
      return (
        <>
          <path d="M24 50 H96 L88 102 H32 Z" fill="#FFFFFF" />
          <path d="M42 50 Q42 24 60 24 Q78 24 78 50" />
          <path d="M28 68 H92" />
        </>
      );
  }
}

export function ProductIcon({ icon, className, strokeWidth = 2.6 }: { icon: IconId; className?: string; strokeWidth?: number }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      stroke="#111111"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Paths icon={icon} />
    </svg>
  );
}

/** Foto do produto quando houver; senão a ilustração. Feita para ficar sobre o cinza claro da vitrine. */
export function ProductArt({
  product,
  className,
  iconClassName,
  strokeWidth,
}: {
  product: { imageUrl: string; icon: IconId; name: string };
  className?: string;
  iconClassName?: string;
  strokeWidth?: number;
}) {
  if (product.imageUrl) {
    // Foto de loja é quase sempre quadrada, com o produto centrado em fundo branco ou cinza claro.
    // Sem margem e com multiply, o fundo da foto se funde ao cinza do card e não aparece uma "caixa" dentro dele.
    return (
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagens vêm de lojas arbitrárias */}
        <img src={product.imageUrl} alt="" loading="lazy" className={className ?? "size-full object-contain mix-blend-multiply"} />
      </div>
    );
  }
  return <ProductIcon icon={product.icon} className={iconClassName} strokeWidth={strokeWidth} />;
}
