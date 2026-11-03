-- Logos de marca enviados pelo editor do cupom. O navegador já reduz a imagem (até 512px, webp ou png).
-- Leitura pública pela URL do bucket; cada usuário só mexe na própria pasta ({uid}/arquivo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-logos', 'brand-logos', true, 1048576, array['image/webp', 'image/png'])
on conflict (id) do nothing;

create policy "dono envia logos" on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- listar e apagar a própria pasta (usado ao excluir a conta)
create policy "dono lista logos" on storage.objects for select to authenticated
  using (bucket_id = 'brand-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "dono remove logos" on storage.objects for delete to authenticated
  using (bucket_id = 'brand-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
