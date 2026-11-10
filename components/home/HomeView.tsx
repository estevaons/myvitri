import { useTranslations } from "next-intl";
import { Link, vitrineHref } from "@/lib/i18n/navigation";
import { HOST } from "@/lib/brand";
import { summarizeVitrine, type HomeCreator, type HomeKit } from "@/lib/vitrine/data";
import type { VitrineContent } from "@/lib/vitrine/types";
import { AccountMenu, type Account } from "./AccountMenu";
import { kicker, pad, pillDark, pillLight, SectionHead, SiteFooter, SiteHeader } from "./chrome";
import { VitrineLinkBar } from "./CopyLinkButton";
import { CoverPicker } from "./CoverPicker";
import { CreatorCard, CreatorCover } from "./CreatorCard";
import { HomeSearch } from "./HomeSearch";
import { KitCard } from "./KitCard";
import { Marquee } from "./Marquee";
import type { TabId, TabParams } from "./catalog/params";
import { NavPending } from "./catalog/NavPending";
import { TabNav } from "./catalog/ui";
import { FavoritasTab } from "./tabs/FavoritasTab";
import { KitsTab } from "./tabs/KitsTab";
import { MarcasTab } from "./tabs/MarcasTab";
import { ProdutosTab } from "./tabs/ProdutosTab";
import { VitrinesTab } from "./tabs/VitrinesTab";

/** Espaço entre as seções, o mesmo da landing; a primeira fica mais perto das abas, logo acima dela. */
const section = `mx-auto flex max-w-[1440px] flex-col pt-24 first:pt-10 md:pt-32 md:first:pt-14`;

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className={`${kicker} order-2 text-[11px] text-mute`}>{label}</dt>
      <dd className="order-1 m-0 font-display text-[clamp(40px,4.4vw,60px)] leading-[0.95] lining-nums">{n}</dd>
    </div>
  );
}

/**
 * A própria vitrine como uma matéria de revista: a capa à esquerda (é aqui que ela é definida) e, ao lado, o nome, o endereço (que abre e copia),
 * os números com o atalho das métricas e os botões de editar e de ver a vitrine.
 */
function YourVitrine({ vitrine }: { vitrine: VitrineContent }) {
  const t = useTranslations("home.yourVitrine");
  const card = summarizeVitrine(vitrine);
  return (
    <section aria-labelledby="sua-vitrine" className={`${section} ${pad}`}>
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-16 lg:gap-24">
        <CoverPicker hasCover={Boolean(vitrine.look.bannerUrl)} name={vitrine.name}>
          <Link href={vitrineHref(vitrine.handle)} target="_blank" rel="noopener" aria-label={t("openLabel", { name: vitrine.name })} className="group block">
            <CreatorCover c={card} caption={false} />
          </Link>
        </CoverPicker>
        <div className="flex min-w-0 flex-col items-start gap-8">
          <div className="flex min-w-0 flex-col gap-4">
            <span className={`${kicker} text-gold`}>{t("kicker")}</span>
            <h2 id="sua-vitrine" className="m-0 font-display text-[clamp(44px,5.6vw,84px)] leading-[1] font-normal break-words text-balance">
              {vitrine.name}
            </h2>
          </div>
          {/* abrir e copiar ficam no próprio endereço; ver métricas, junto dos números; sobra um botão principal */}
          <VitrineLinkBar handle={vitrine.handle} />
          <div className="flex w-full flex-wrap items-end justify-between gap-x-8 gap-y-5 border-y border-sand py-6">
            <dl className="m-0 grid flex-1 basis-[22rem] grid-cols-3 gap-6">
              <Stat n={card.products} label={t("statProducts", { count: card.products })} />
              <Stat n={card.coupons} label={t("statCoupons", { count: card.coupons })} />
              <Stat n={vitrine.kits.length} label={t("statKits", { count: vitrine.kits.length })} />
            </dl>
            <Link href="/metricas" className={`${kicker} group flex items-center gap-2 pb-1 text-[11px] whitespace-nowrap text-ink no-underline hover:text-gold`}>
              {t("metrics")}
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
          {/* abrir a vitrine precisa de um botão com nome: o endereço clicável sozinho não deixava claro onde ir */}
          <div className="flex flex-wrap gap-2">
            <Link href="/editor" className={pillDark}>
              {t("edit")}
            </Link>
            <Link href={vitrineHref(vitrine.handle)} target="_blank" rel="noopener" className={`${pillLight} group gap-2`}>
              {t("view")}
              <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Quem ainda não tem vitrine: o mesmo bloco areia da landing, com o convite. */
function CreateVitrine() {
  const t = useTranslations("home.create");
  return (
    <section className={`${section} ${pad}`}>
      <div className="flex flex-col items-center gap-5 bg-sand px-6 py-20 text-center max-md:py-14">
        <span className={`${kicker} text-gold`}>{t("kicker")}</span>
        <h2 className="m-0 max-w-[16ch] font-display text-[clamp(40px,5.6vw,76px)] leading-[1.04] font-normal text-balance">
          {t("title")} <em>{t("titleEm")}</em>
        </h2>
        <p className="m-0 max-w-[30rem] text-[17px] leading-relaxed text-ink/70">{t("text")}</p>
        <Link href="/criar-vitrine" className={`${pillDark} mt-2`}>
          {t("button")}
        </Link>
        <span className="text-[15px] text-mute">{t("handle", { host: HOST })}</span>
      </div>
    </section>
  );
}

/** "Para você": a própria vitrine (ou o convite) e os carrosséis. */
export type ForYou = { vitrine: VitrineContent | null; ranked: boolean; creators: HomeCreator[]; kits: HomeKit[] };

/**
 * Home de quem entrou: saudação e busca, as abas e o conteúdo da aba atual. `forYou` só vem
 * carregado na aba "Para você"; as outras buscam os próprios dados a partir dos filtros da URL.
 */
export function HomeView({
  name,
  account,
  tab,
  params,
  forYou,
  favorites = [],
}: {
  name: string;
  /** quem entrou, para o menu da conta e as configurações */
  account: Account;
  tab: TabId;
  params: TabParams;
  forYou: ForYou | null;
  /** endereços das favoritas; só vêm nas abas que mostram o coração */
  favorites?: string[];
}) {
  const t = useTranslations("home");
  return (
    // clip, e não hidden: hidden faz desta div a área de rolagem e as abas param de ficar presas no topo
    <div className="overflow-x-clip bg-white text-ink">
      <SiteHeader links={[]} home="/inicio" action={<AccountMenu account={account} />} />

      <section className={`mx-auto flex max-w-[1440px] flex-col gap-6 pt-8 md:gap-8 md:pt-12 ${pad}`}>
        <div className="flex flex-col gap-3">
          <span className={`${kicker} text-gold`}>{t("kicker")}</span>
          <h1 className="m-0 font-display text-[clamp(40px,4.8vw,68px)] leading-[1] font-normal tracking-[-0.01em]">
            {t.rich("hello", { name, em: (s) => <em>{s}</em> })}
          </h1>
        </div>
        <HomeSearch />
      </section>

      {/* espaço antes das abas como irmão, não em volta: o sticky só prende dentro do próprio pai */}
      <div aria-hidden="true" className="h-5 md:h-6" />
      {/* o pai das abas vai até o rodapé, então elas continuam presas no topo a página toda */}
      <NavPending>
        <TabNav current={tab} />

        <div className="transition-opacity duration-200 group-aria-busy:opacity-50 group-aria-busy:delay-100">
          {tab === "for-you" && forYou && <ForYouTab {...forYou} favorites={favorites} />}
          {tab === "saved" && <FavoritasTab params={params} favorites={favorites} />}
          {tab === "storefronts" && <VitrinesTab params={params} favorites={favorites} />}
          {tab === "products" && <ProdutosTab params={params} />}
          {tab === "kits" && <KitsTab params={params} />}
          {tab === "brands" && <MarcasTab params={params} />}
        </div>

        <SiteFooter signedIn />
      </NavPending>
    </div>
  );
}

function ForYouTab({ vitrine, ranked, creators, kits, favorites }: ForYou & { favorites: string[] }) {
  const t = useTranslations("home.forYou");
  return (
    // div, e não fragmento: é ela que faz da primeira seção a first-child que `section` aproxima das abas
    <div>
      {vitrine ? <YourVitrine vitrine={vitrine} /> : <CreateVitrine />}

      {creators.length > 0 && (
        <section className={`${section} gap-10`}>
          <div className={pad}>
            <SectionHead
              kicker={ranked ? t("rankedKicker") : t("newKicker")}
              title={ranked ? t("rankedTitle") : t("newTitle")}
              text={ranked ? t("rankedText") : t("newText")}
            />
          </div>
          <Marquee label={ranked ? t("rankedTitle") : t("newTitle")} className={pad} itemClassName="w-[220px] md:w-[300px]">
            {creators.map((c) => (
              <CreatorCard key={c.handle} c={c} favorited={favorites.includes(c.handle)} />
            ))}
          </Marquee>
        </section>
      )}

      {kits.length > 0 && (
        <section className={`${section} gap-10`}>
          <div className={pad}>
            <SectionHead kicker={t("kitsKicker")} title={t("kitsTitle")} text={t("kitsText")} />
          </div>
          <Marquee label={t("kitsTitle")} className={pad} itemClassName="w-[220px] md:w-[300px]">
            {kits.map((k) => (
              <KitCard key={k.id} k={k} />
            ))}
          </Marquee>
        </section>
      )}
    </div>
  );
}
