import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import type { HomePost } from "@/lib/vitrine/data";

/**
 * Card de post da home logada (carrossel da aba Para você e grade da aba Outfits): a foto em 4:5, como no outfit da
 * vitrine, quantas peças e quem postou. Leva aos outfits da vitrine de quem postou.
 */
export function PostCard({ p }: { p: HomePost }) {
  const t = useTranslations("home.post");
  return (
    <Link href={`/${p.handle}#outfits`} className="group flex min-w-0 flex-col text-ink no-underline">
      <div className="relative aspect-[4/5] overflow-hidden bg-cream">
        {/* eslint-disable-next-line @next/next/no-img-element -- foto enviada pela creator para o bucket */}
        <img src={p.photoUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none" />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 pt-3 text-[15px] leading-snug max-md:text-sm">
        <span className="truncate text-[13px] text-mute">{t("items", { count: p.items.length })}</span>
        <span className="mt-1 truncate text-[13px] text-mute group-hover:text-ink">
          {t.rich("by", { name: p.creator, strong: (chunks) => <span className="font-medium text-ink underline underline-offset-2">{chunks}</span> })}
        </span>
      </div>
    </Link>
  );
}
