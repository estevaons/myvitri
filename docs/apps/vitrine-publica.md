# Módulo: Vitrine pública (`/{handle}`)

## Visão geral (sem jargão)

É a página que o seguidor abre ao tocar no link da bio, por exemplo `myvitri.com/marinacosta`. Ela funciona como a **vitrine de uma loja de rua**, só que de uma pessoa:

- no topo, uma faixa com o maior desconto ("Até 15% OFF com os cupons de Marina");
- a foto de capa (ou, se não houver, as fotos dos primeiros produtos) e uma frase de destaque;
- os **cupons** num carrossel, cada um com o botão "Copiar e ir para a loja";
- os **produtos** numa grade, já com o preço calculado com o cupom e o preço cheio riscado;
- os **kits** (combos), com o total e quanto a pessoa economiza;
- um convite para outras creators criarem a própria vitrine.

O visual é **fixo** (branco, cinza claro, títulos em caixa alta) — a creator só escolhe o conteúdo e a capa. Cupons vencidos ou ainda não iniciados **somem sozinhos**.

## Responsabilidades

- Resolver o `handle` da URL para uma vitrine publicada (ou 404).
- Renderizar a vitrine com preços calculados apenas com cupons **ativos hoje**.
- Copiar códigos de cupom, abrir a loja com UTM/afiliado e registrar eventos anônimos.
- Gerar `<title>`/`description` da página (a imagem de prévia fica no módulo [divulgação](divulgacao.md)).
- Servir como **prévia** dentro do editor (modo `preview`).

## Estrutura de arquivos

| Arquivo | Papel |
|---|---|
| [`app/[handle]/page.tsx`](../../app/%5Bhandle%5D/page.tsx) | `generateMetadata`, `<Suspense>` e `VitrinePage` (busca e `notFound()`) |
| [`components/storefront/Storefront.tsx`](../../components/storefront/Storefront.tsx) | A vitrine inteira (Client Component): seções, carrossel, busca, filtros, kits, métricas |
| [`components/storefront/ProductIcon.tsx`](../../components/storefront/ProductIcon.tsx) | `ProductIcon` (8 ilustrações SVG), `ProductArt` (foto ou ilustração), `ICON_LABELS` |
| [`lib/vitrine/data.ts`](../../lib/vitrine/data.ts) | `getPublicVitrine(handle)` com `"use cache"` |
| [`lib/vitrine/pricing.ts`](../../lib/vitrine/pricing.ts), [`lib/vitrine/links.ts`](../../lib/vitrine/links.ts) | Preço com cupom, selos, validade, UTM |

## Entidades

Lê `vitrines`, `coupons`, `products` e `kits` (somente leitura, pela policy pública). Grava em `events` indiretamente via `/api/t`. Ver [database.md](../database.md).

## Rotas

| Rota | Handler | Nome | O que faz |
|---|---|---|---|
| `GET /{handle}` | `app/[handle]/page.tsx:25` | `Page` → `VitrinePage` | `decodeURIComponent(handle).toLowerCase()` → `getPublicVitrine` → `Storefront` ou `notFound()` |
| metadata | `app/[handle]/page.tsx:7` | `generateMetadata` | `title: "Vitrine de {name}"` (o layout acrescenta " · MyVitri"), `description: sub` ou texto padrão; sem vitrine: "Vitrine não encontrada" |
| `GET /{handle}/opengraph-image` | `app/[handle]/opengraph-image.tsx` | — | Ver [divulgacao.md](divulgacao.md) |
| `GET /{handle}/story` | `app/[handle]/story/route.ts` | — | Ver [divulgacao.md](divulgacao.md) |
| `POST /api/t` | `app/api/t/route.ts` | — | Chamado pela vitrine; ver [metricas.md](metricas.md) |

## Estrutura da página

| Seção | Aparece quando | Conteúdo | `Storefront.tsx` |
|---|---|---|---|
| Faixa de desconto | há cupom ativo | "Até {maior %}% OFF com os cupons de {primeiro nome}" (ou "Cupons de desconto de…" só com cupons fixos) + "Ver cupons" | 245-252 |
| Cabeçalho | sempre | Avatar (ou iniciais), nome, `@handle`, navegação para as seções que existem (escondida em contêiner estreito) | 254-271 |
| Capa | sempre | `look.bannerUrl` em 21:9 (4:3 no estreito); sem capa, até 3 fotos dos primeiros produtos **em estoque** | 273-287 |
| Destaque | sempre | `headline` sem `*` (marcação antiga) ou "A vitrine de {primeiro nome}"; `sub`; botões "Ver produtos"/"Ver cupons" | 288-305 |
| Cupons (`#cupons`) | há cupom ativo | Carrossel com setas (somem quando tudo cabe); card com logo, marca (link para a loja com UTM), validade, desconto, condição, "Como usar" (lista), código e botão | 308-365 |
| Produtos (`#produtos`) | há produto | Contagem; **busca** se houver mais de 8; **chips de categoria** se houver mais de 1; grade 2 ou 3 colunas; esgotados no fim | 367-438 |
| Kits (`#kits`) | há kit com ao menos 1 produto encontrado | Abas se houver mais de 1; mosaico de fotos; lista com preço; total e economia; botão para copiar os códigos; "3 passos" | 440-547 |
| Chamada para creators | sempre | "Você também cria conteúdo?" → `/para-creators` | 549-557 |
| Rodapé | sempre | "Feito com MyVitri" + aviso de que preços podem mudar | 559-565 |

## Fluxos principais

### Montagem dos dados

```mermaid
graph TD
    A["getPublicVitrine(handle)"] --> B["content + today (UTC, cacheado)"]
    B --> C["coupons = só isActive(c, today)"]
    C --> D["products = priceProducts(products, coupons ativos), esgotados no fim"]
    D --> E["kits = kitTotals(kit, products), sem kits vazios"]
    D --> F["categories = categorias distintas"]
    D --> G["strip = 3 primeiros em estoque (se não há capa)"]
```

Consequência importante: se o cupom vinculado a um produto **venceu**, o produto aparece com preço cheio e sem selo — o vínculo continua no banco.

### Interações do visitante

| Ação | O que acontece | Evento (`/api/t`) |
|---|---|---|
| Abrir a página | Registra 1 visita por aba (`sessionStorage["vitri:visto:{handle}"]`) | `view` |
| Cupom → "Copiar e ir para a loja" / "Copiar código" | Copia o código, mostra "Copiado!" por 2,5 s e abre `storeUrl` + UTM em nova aba (se houver) | `copy` (id do cupom) |
| Nome da marca no cupom | Link comum para `storeUrl` + UTM | — |
| Foto ou botão do produto ("Comprar com cupom"/"Ver na loja") | Copia o código do cupom (se houver), mostra "Cupom copiado!" e abre `productHref` (afiliado como veio, ou link + UTM) | `buy` (id do produto) |
| "Ver meu review" | Abre `videoUrl` | `video` (id do produto) |
| Kit → "Copiar {código} e montar o kit" / "Copiar os N cupons do kit" | Copia os códigos únicos separados por espaço | `kit` (id do kit) |
| Nome de um item do kit | Link comum para `productHref` | — |
| Busca | Filtra por nome + marca + categoria, sem acento e sem diferenciar maiúsculas (`fold`) | — |

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitante
    participant S as Storefront
    participant API as /api/t
    participant L as Loja da marca
    V->>S: toca "Comprar com cupom"
    S->>S: copyText(cupom.code)
    S->>S: flash("p:{id}")
    S-)API: sendBeacon { h: handle, k: "buy", i: produto.id }
    S->>L: window.open(productHref, "_blank", "noopener,noreferrer")
    V->>L: cola o cupom no checkout
```

### Modo prévia (`preview`)

Dentro do editor, `Storefront` recebe `preview` e: não registra visita nem cliques (`send` não chama `track`) e não abre lojas (`openStore` não é chamado). O editor ainda bloqueia cliques em links (ver [editor](editor.md#prévia)).

### Layout responsivo

O componente raiz tem `@container` (`Storefront.tsx:244`) e as variações usam *container queries* (`@3xl:`, `@max-2xl:`, `@max-md:`). Assim a mesma vitrine se adapta tanto à janela do visitante quanto à caixa de prévia do editor.

## Integração com outros módulos

```mermaid
graph LR
    PAGE["app/[handle]/page.tsx"] -->|getPublicVitrine| DOM[Domínio]
    SF[Storefront] -->|pricing, links| DOM
    SF -->|track → /api/t| MET[Métricas]
    SF -->|Wordmark| BRAND[Marca]
    SF -->|Link /para-creators| HOME[Home]
    ED[Editor] -->|prévia com preview| SF
    HOME -->|ProductArt / ProductIcon| PI[ProductIcon.tsx]
    DIV[Divulgação] -->|getPublicVitrine| DOM
```

## Pegadinhas e dívidas técnicas

1. **Metadados e página tratam o handle de forma diferente:** `generateMetadata` usa o `handle` cru (`page.tsx:8-9`), enquanto a página faz `decodeURIComponent(...).toLowerCase()` (`page.tsx:20`). Em `/MarinaCosta` a vitrine abre, mas o título é "Vitrine não encontrada".
2. **`window.open` sem checagem de protocolo** em `openStore` (`Storefront.tsx:43-45`). Hoje as URLs só entram validadas pelo Zod na publicação, mas a RLS permite escrita direta pela dona da vitrine (ver [domínio](dominio.md#pegadinhas-e-dívidas-técnicas)). Os `<a href>` são protegidos pelo React contra `javascript:`, o `window.open` não.
3. **Imagens externas sem fallback:** fotos de produto e logos são *hotlink* das lojas; se a loja bloquear ou mudar a URL, aparece imagem quebrada (não há `onError` na vitrine, ao contrário do editor).
4. **Produto com cupom e sem link**: o botão copia o código, não abre nada e mesmo assim conta como `buy`.
5. **Copiar vários códigos do kit** junta tudo com espaço (`"COSTA15 PULSEMARINA"`); o visitante precisa separar na hora de colar em cada loja.
6. **Validade dos cupons depende do cache e do UTC** (ver [arquitetura](../architecture.md#datas-e-fuso-horário)).
7. **Sem página 404 própria, sem `sitemap`/`robots`** e sem `canonical`: `/MarinaCosta` e `/marinacosta` são URLs distintas para buscadores.
8. **`show` é ignorado**: cada seção aparece só pelo conteúdo, apesar da coluna existir.
9. **Fallback do Suspense é uma tela branca** (`page.tsx:27`), sem esqueleto.
