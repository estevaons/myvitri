-- Categoria de produto passa de texto livre para uma lista fixa de chaves (lib/vitrine/categories.ts).
-- Com texto livre, "Relogio" e "Relógio" viravam duas categorias nos filtros. O rótulo de cada chave
-- fica nas traduções (`productCategories`); aqui só a chave. "" continua sendo "sem categoria".
--
-- Para criar uma categoria: incluir a chave em CATEGORIES, nas traduções e numa nova migração que troca
-- a constraint `products_category_check`.

-- Grafia antiga → chave: sem acento, minúsculas, hífen no lugar do resto. Mesmo mapa de `toCategory`.
create function pg_temp.category_key(raw text) returns text
language sql immutable as $$
  with s as (
    select trim(both '-' from regexp_replace(
      lower(translate(coalesce(raw, ''),
        'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')),
      '[^a-z0-9]+', '-', 'g')) as k
  ),
  keys(k) as (
    values ('roupas'), ('moda-praia'), ('calcados'), ('bolsas'), ('acessorios'), ('joias'), ('relogios'), ('oculos'),
           ('maquiagem'), ('skincare'), ('cabelo'), ('perfumes'), ('esporte'), ('suplementos'), ('eletronicos'),
           ('casa'), ('infantil'), ('pets')
  ),
  legacy(k, v) as (
    values ('roupa', 'roupas'), ('moda', 'roupas'), ('vestuario', 'roupas'), ('camisa', 'roupas'), ('camisas', 'roupas'),
           ('camiseta', 'roupas'), ('camisetas', 'roupas'),
           ('praia', 'moda-praia'), ('biquini', 'moda-praia'), ('biquinis', 'moda-praia'),
           ('calcado', 'calcados'), ('tenis', 'calcados'), ('sapato', 'calcados'), ('sapatos', 'calcados'),
           ('bolsa', 'bolsas'), ('acessorio', 'acessorios'),
           ('joia', 'joias'), ('bijuteria', 'joias'), ('bijuterias', 'joias'),
           ('relogio', 'relogios'), ('make', 'maquiagem'),
           ('skin-care', 'skincare'), ('pele', 'skincare'), ('cuidados-com-a-pele', 'skincare'),
           ('cabelos', 'cabelo'), ('perfume', 'perfumes'), ('fragrancia', 'perfumes'), ('fragrancias', 'perfumes'),
           ('esportes', 'esporte'), ('corrida', 'esporte'), ('fitness', 'esporte'), ('academia', 'esporte'), ('treino', 'esporte'),
           ('suplemento', 'suplementos'), ('eletronico', 'eletronicos'), ('tecnologia', 'eletronicos'),
           ('decoracao', 'casa'), ('kids', 'infantil'), ('pet', 'pets')
  )
  select coalesce(
    (select keys.k from keys, s where keys.k = s.k),
    (select legacy.v from legacy, s where legacy.k = s.k),
    ''
  );
$$;

-- Produtos publicados. O que não está no mapa fica sem categoria.
update public.products set category = pg_temp.category_key(category)
where category is distinct from pg_temp.category_key(category);

-- Rascunhos do editor (o JSON da vitrine guarda a categoria de cada produto).
update public.vitrine_drafts d
set content = jsonb_set(d.content, '{products}', (
  select jsonb_agg(
    case when jsonb_typeof(p->'category') = 'string'
      then jsonb_set(p, '{category}', to_jsonb(pg_temp.category_key(p->>'category')))
      else p end
    order by i)
  from jsonb_array_elements(d.content->'products') with ordinality as t(p, i)
))
where jsonb_typeof(d.content->'products') = 'array' and jsonb_array_length(d.content->'products') > 0;

-- A lista substitui o limite de tamanho do texto livre.
alter table public.products drop constraint if exists products_category_len;
alter table public.products add constraint products_category_check check (category in (
  '', 'roupas', 'moda-praia', 'calcados', 'bolsas', 'acessorios', 'joias', 'relogios', 'oculos', 'maquiagem', 'skincare',
  'cabelo', 'perfumes', 'esporte', 'suplementos', 'eletronicos', 'casa', 'infantil', 'pets'
));
