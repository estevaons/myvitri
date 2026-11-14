import { useTranslations } from "next-intl";
import { Link, vitrineHref } from "@/lib/i18n/navigation";
import type { HomePost } from "@/lib/vitrine/data";

/**
 * Card de outfit da aba Outfits da home logada: a foto em 4:5, como no outfit da vitrine, quantas peças e quem postou.
 * `when` ("há 2 horas") aparece num selo sobre a foto. Leva aos outfits da vitrine de quem postou.
 */
export function PostCard({ p, when }: { p: HomePost; when?: string }) {
  const t = useTranslations("home.post");
  return (
    <Link href={vitrineHref(p.handle, "outfits")} className="group flex min-w-0 flex-col text-ink no-underline">
      <div className="relative aspect-[4/5] overflow-hidden bg-cream">
        {/* eslint-disable-next-line @next/next/no-img-element -- foto enviada pela creator para o bucket */}
        <img src={p.photoUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none" />
        {when && <span className="absolute top-2 right-2 bg-ink px-2 py-1 text-[11px] leading-none text-white">{when}</span>}
        {/* galeria: o play diz que tem vídeo para assistir na vitrine; as folhas, que há mais fotos */}
        {(p.video || p.media > 1) && (
          <span className="absolute bottom-2 left-2 flex gap-1.5">
            {p.video && (
              <span role="img" aria-label={t("video")} className="flex size-8 items-center justify-center rounded-full bg-white/90 pl-0.5 text-ink shadow-[0_2px_10px_rgba(17,17,17,0.18)]">
                <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 4.5v15l13-7.5z" />
                </svg>
              </span>
            )}
            {p.media > 1 && (
              <span role="img" aria-label={t("media", { count: p.media })} className="flex size-8 items-center justify-center rounded-full bg-white/90 text-ink shadow-[0_2px_10px_rgba(17,17,17,0.18)]">
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                  <rect x="8" y="8" width="12" height="12" rx="1.5" />
                  <path d="M16 5H5.5A1.5 1.5 0 0 0 4 6.5V16" />
                </svg>
              </span>
            )}
          </span>
        )}
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
