-- Cota e ritmo de upload por pessoa no Storage (buckets brand-logos e vitrine-photos).
--
-- Antes, a policy de insert só conferia a pasta ({uid}/arquivo): qualquer conta logada podia subir arquivos
-- sem limite, inclusive chamando a API do Storage direto (sem passar pelo app), e lotar o Storage do projeto.
-- Agora cada pessoa tem, somando os dois buckets:
--   * até 500 arquivos (a exclusão de conta lista até 1000 por bucket, então tudo continua sendo apagado);
--   * até 100 MiB no total (soma de metadata.size dos arquivos já enviados);
--   * até 40 envios a cada 10 minutos.
-- A checagem roda antes do arquivo entrar, então o envio que passa do limite de tamanho é o último aceito.
--
-- A função é security invoker de propósito: conta só o que a própria pessoa enxerga pelas policies de select
-- ("dono lista logos"/"dono lista fotos", que liberam a própria pasta). As policies de select não chamam a
-- função, então não há recursão.

create or replace function public.storage_upload_allowed()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*) < 500
     and coalesce(sum((o.metadata ->> 'size')::bigint), 0) < 100 * 1024 * 1024
     and count(*) filter (where o.created_at > now() - interval '10 minutes') < 40
  from storage.objects o
  where o.bucket_id in ('brand-logos', 'vitrine-photos')
    and (storage.foldername(o.name))[1] = (select auth.uid())::text;
$$;

revoke all on function public.storage_upload_allowed() from public, anon;
grant execute on function public.storage_upload_allowed() to authenticated;

drop policy if exists "dono envia logos" on storage.objects;
create policy "dono envia logos" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.storage_upload_allowed())
  );

drop policy if exists "dono envia fotos" on storage.objects;
create policy "dono envia fotos" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vitrine-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.storage_upload_allowed())
  );
