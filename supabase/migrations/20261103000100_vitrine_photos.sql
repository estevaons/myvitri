-- Foto de capa e foto de perfil enviadas pelo editor. O navegador já reduz a imagem
-- (capa até 1600px, perfil até 512px; webp, ou jpeg onde o navegador não gera webp).
-- Leitura pública pela URL do bucket; cada usuário só mexe na própria pasta ({uid}/arquivo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vitrine-photos', 'vitrine-photos', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "dono envia fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'vitrine-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- listar e apagar a própria pasta (usado ao excluir a conta)
create policy "dono lista fotos" on storage.objects for select to authenticated
  using (bucket_id = 'vitrine-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "dono remove fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'vitrine-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
