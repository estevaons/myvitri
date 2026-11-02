-- Vitrine de demonstração (/marinacosta). Sem owner_id: pública e não editável.
with v as (
  insert into public.vitrines (handle, name, headline, sub)
  values ('marinacosta', 'Marina Costa', 'Tudo que eu uso, com o meu desconto.',
          'Moda praia, treino e rotina saudável. Escolha o produto, copie o cupom e economize direto na loja oficial da marca.')
  on conflict (handle) do nothing
  returning id
),
c as (
  insert into public.coupons (id, vitrine_id, position, brand, code, kind, value, condition, expires_at)
  select gen_random_uuid(), v.id, x.pos, x.brand, x.code, x.kind, x.value, x.cond, x.exp
  from v, (values
    (1, 'Maré Moda Praia', 'COSTA15', 'percent', 15, 'Em todo o site', current_date + 28),
    (2, 'Pulse Suplementos', 'PULSEMARINA', 'percent', 12, 'Exceto kits promocionais', current_date + 43),
    (3, 'Nutri Nuts', 'MARINA10', 'percent', 10, 'Na primeira compra', current_date + 59),
    (4, 'Solar Óculos', 'MARINA', 'percent', 10, 'Óculos de sol e armações', null),
    (5, 'Passo Calçados', 'MARINA', 'fixed', 3000, 'Em compras acima de R$ 200', current_date + 18),
    (6, 'Gota Garrafas', 'COSTA10', 'percent', 10, 'Garrafas e copos térmicos', current_date + 3)
  ) as x(pos, brand, code, kind, value, cond, exp)
  returning id, position
),
p as (
  insert into public.products (id, vitrine_id, position, name, brand, category, price, coupon_id, icon)
  select gen_random_uuid(), v.id, x.pos, x.name, x.brand, x.cat, x.price, c.id, x.icon
  from v, (values
    (1, 'Óculos Aviador Dourado', 'Solar Óculos', 'Moda', 28990, 4, 'Glasses'),
    (2, 'Biquíni Lagoa', 'Maré Moda Praia', 'Praia', 18990, 1, 'Bikini'),
    (3, 'Whey Baunilha 900 g', 'Pulse Suplementos', 'Saúde', 17990, 2, 'Jar'),
    (4, 'Garrafa térmica 750 ml', 'Gota Garrafas', 'Casa', 12990, 6, 'Bottle'),
    (5, 'Tênis Corrida Leve', 'Passo Calçados', 'Moda', 34990, 5, 'Shoe'),
    (6, 'Chapéu de palha Brisa', 'Maré Moda Praia', 'Praia', 11990, 1, 'Hat'),
    (7, 'Mix de castanhas 500 g', 'Nutri Nuts', 'Saúde', 6990, 3, 'Nuts'),
    (8, 'Bolsa de praia Coral', 'Maré Moda Praia', 'Praia', 14990, 1, 'Bag')
  ) as x(pos, name, brand, cat, price, coupon_pos, icon)
  join c on c.position = x.coupon_pos
  returning id, position
)
insert into public.kits (id, vitrine_id, position, tab, title, description, signature, product_ids)
select gen_random_uuid(), v.id, x.pos, x.tab, x.title, x.descr, x.sig,
       array(select p.id from unnest(x.items) with ordinality as u(item, ord) join p on p.position = u.item order by u.ord)
from v, (values
  (1, 'Kit praia', 'O kit praia da Marina', 'Os 3 itens que levo para toda praia. Um cupom só, COSTA15, vale para os três.',
   'Uso esse combo todo fim de semana', array[2, 6, 8]),
  (2, 'Kit treino', 'O kit treino da Marina', 'Meu combo para correr de manhã. Cada item usa o cupom da própria marca.',
   'O que não sai da minha mochila', array[5, 3, 4])
) as x(pos, tab, title, descr, sig, items);
