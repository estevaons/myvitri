import { useTranslations } from "next-intl";
import { AccountMenu, type Account } from "./AccountMenu";
import { pad, SiteFooter, SiteHeader } from "./chrome";
import { HomeSearch } from "./HomeSearch";
import { NotificationBell } from "./NotificationBell";
import { ProfileHeader, type WeekStats } from "./ProfileHeader";
import type { TabId, TabParams } from "./catalog/params";
import { NavPending } from "./catalog/NavPending";
import { HomeBar } from "./catalog/ui";
import { FavoritasTab } from "./tabs/FavoritasTab";
import { MarcasTab } from "./tabs/MarcasTab";
import { PostsTab } from "./tabs/PostsTab";
import { ProdutosTab } from "./tabs/ProdutosTab";
import { VitrinesTab } from "./tabs/VitrinesTab";

/**
 * O título do feed, entre o perfil e a barra presa: marca que dali para baixo é para explorar o que os outros indicam.
 * De propósito em outro estilo que o título de cada aba: uma palavra só, sans em semibold, contra a serifa grande das
 * abas. Rola junto com o perfil; não entra na barra, para ela não ficar mais alta.
 */
function ExploreHead() {
  const t = useTranslations("home");
  return (
    <div className={`mx-auto max-w-[1440px] pt-4 pb-4 md:pt-6 ${pad}`}>
      <h2 className="m-0 text-[24px] leading-none font-semibold tracking-[-0.02em] text-ink md:text-[28px]">{t("explore")}</h2>
    </div>
  );
}

/** Canto direito do cabeçalho de quem entrou: o sino (só com vitrine, que é quem recebe notificações) e o menu da conta. */
function HeaderActions({ account, unread }: { account: Account; unread: number }) {
  return (
    <div className="flex items-center gap-2">
      {account.vitrine && <NotificationBell count={unread} />}
      <AccountMenu account={account} />
    </div>
  );
}

/**
 * Home de quem entrou, como um perfil do Instagram: em cima o perfil (foto, nome, endereço, métricas da semana e os
 * atalhos da vitrine, ou o convite para criar uma); embaixo o feed, com a busca e as abas presas no topo ao rolar.
 * A aba padrão é Favoritas. Cada aba busca os próprios dados a partir dos filtros da URL.
 */
export function HomeView({
  account,
  stats,
  tab,
  params,
  favorites = [],
  unread = 0,
}: {
  /** quem entrou: o topo e o menu da conta saem daqui */
  account: Account;
  /** números da semana; null sem vitrine ou se a leitura falhou */
  stats: WeekStats | null;
  tab: TabId;
  params: TabParams;
  /** endereços das favoritas; só vêm nas abas que mostram o coração */
  favorites?: string[];
  /** notificações ainda não vistas; o sino só aparece para quem tem vitrine */
  unread?: number;
}) {
  return (
    // clip, e não hidden: hidden faz desta div a área de rolagem e a barra para de ficar presa no topo
    <div className="overflow-x-clip bg-white text-ink">
      <SiteHeader links={[]} home="/inicio" action={<HeaderActions account={account} unread={unread} />} />
      <ProfileHeader account={account} stats={stats} />
      <ExploreHead />

      {/* o pai da barra vai até o rodapé, então ela continua presa no topo a página toda */}
      <NavPending>
        <HomeBar current={tab} search={<HomeSearch />} />

        <div className="transition-opacity duration-200 group-aria-busy:opacity-50 group-aria-busy:delay-100">
          {tab === "saved" && <FavoritasTab params={params} favorites={favorites} />}
          {tab === "storefronts" && <VitrinesTab params={params} favorites={favorites} />}
          {tab === "products" && <ProdutosTab params={params} />}
          {tab === "outfits" && <PostsTab params={params} />}
          {tab === "brands" && <MarcasTab params={params} />}
        </div>

        <SiteFooter signedIn />
      </NavPending>
    </div>
  );
}
