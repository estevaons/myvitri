-- "for all" também cobre SELECT e duplica a policy pública; separar por ação.
drop policy "dono gerencia cupons" on public.coupons;
drop policy "dono gerencia produtos" on public.products;
drop policy "dono gerencia kits" on public.kits;

create policy "dono insere cupons" on public.coupons for insert to authenticated with check (public.owns_vitrine(vitrine_id));
create policy "dono edita cupons" on public.coupons for update to authenticated using (public.owns_vitrine(vitrine_id)) with check (public.owns_vitrine(vitrine_id));
create policy "dono remove cupons" on public.coupons for delete to authenticated using (public.owns_vitrine(vitrine_id));

create policy "dono insere produtos" on public.products for insert to authenticated with check (public.owns_vitrine(vitrine_id));
create policy "dono edita produtos" on public.products for update to authenticated using (public.owns_vitrine(vitrine_id)) with check (public.owns_vitrine(vitrine_id));
create policy "dono remove produtos" on public.products for delete to authenticated using (public.owns_vitrine(vitrine_id));

create policy "dono insere kits" on public.kits for insert to authenticated with check (public.owns_vitrine(vitrine_id));
create policy "dono edita kits" on public.kits for update to authenticated using (public.owns_vitrine(vitrine_id)) with check (public.owns_vitrine(vitrine_id));
create policy "dono remove kits" on public.kits for delete to authenticated using (public.owns_vitrine(vitrine_id));
