-- ============================================================
-- BUCKET DA 2a FASE DA ARENA
--
-- Bucket proprio, e nao o 'entregas', por tres razoes:
--  1. o 'entregas' esta em 25 MB e nao aceita video. Subir o limite dele
--     mudaria o comportamento do fluxo de entrega que ja' roda em producao.
--  2. a 2a fase recebe video de celular, que e' outra ordem de grandeza.
--  3. se o prototipo for abandonado, some o bucket e nao sobra sujeira.
--
-- REGRAS herdadas do guia em privado/arena/README.md:
--  - bucket PRIVADO. Midia de crianca nunca em bucket publico.
--  - leitura por signed URL de prazo curto, nunca url publica.
--  - o caminho NAO carrega nome de crianca: e' {aluno_id}/{missao_id}/{arquivo},
--    e aluno_id e' uuid.
--  - upload grande vai direto do navegador para o Storage, nunca atraves de
--    Edge Function (base64 infla 33% e derruba a funcao).
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'arena-2fase', 'arena-2fase', false,
  209715200,  -- 200 MB: video de celular de 1 minuto cabe com folga
  array[
    'image/jpeg','image/png','image/webp','image/heic','image/heif',
    'video/mp4','video/quicktime','video/webm','video/x-matroska','video/3gpp'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- --------------------------------------------------------- quem pode escrever
-- O aluno so' mexe na propria pasta. A primeira parte do caminho e' o id dele,
-- entao a regra e' uma comparacao direta e nao depende de nenhuma outra tabela.
drop policy if exists "Aluno envia na propria pasta da arena" on storage.objects;
create policy "Aluno envia na propria pasta da arena"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'arena-2fase'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Aluno troca o proprio arquivo da arena" on storage.objects;
create policy "Aluno troca o proprio arquivo da arena"
on storage.objects for update to authenticated
using (
  bucket_id = 'arena-2fase'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Trocar de ideia faz parte: enquanto o prazo estiver aberto, o aluno apaga a
-- foto que ficou ruim e manda outra.
drop policy if exists "Aluno apaga o proprio arquivo da arena" on storage.objects;
create policy "Aluno apaga o proprio arquivo da arena"
on storage.objects for delete to authenticated
using (
  bucket_id = 'arena-2fase'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ------------------------------------------------------------ quem pode ler
drop policy if exists "Aluno le o proprio arquivo da arena" on storage.objects;
create policy "Aluno le o proprio arquivo da arena"
on storage.objects for select to authenticated
using (
  bucket_id = 'arena-2fase'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_role(auth.uid(), 'professor'::public.app_role)
    or public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

select id, public, file_size_limit,
       array_length(allowed_mime_types, 1) as tipos_aceitos
from storage.buckets where id = 'arena-2fase';
