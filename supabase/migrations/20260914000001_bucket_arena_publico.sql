-- ============================================================
-- O BALDE DERIVADO DA ARENA: a copia conferida que vai ao site.
--
-- POR QUE ELE EXISTE, e nao e' capricho. O balde 'arena-2fase' guarda a pasta
-- VIVA do aluno, e as policies de la' deixam ele trocar e apagar arquivo a
-- qualquer momento, sem trava de prazo. Apontar o site publico para la' seria
-- aprovar um endereco, e nao um arquivo: bastava o aluno trocar a foto depois
-- da conferencia para o site publicar o que ninguem revisou. Aqui mora a copia
-- conferida, e o aluno nao escreve nela.
--
-- O QUE MUDA NA COPIA, alem de ser imutavel:
--  - metadado zerado. Foto de celular carrega a coordenada de GPS de onde foi
--    tirada, que na maioria das vezes e' a casa da crianca. Reconverter apaga.
--  - caminho novo e aleatorio, SEM o aluno_id. No balde vivo o caminho comeca
--    pelo id do aluno; aqui nao ha' nada que ligue o arquivo a uma pessoa.
--  - video reduzido para 720p. Os dez originais somavam 578 MB; a copia tem 51.
--
-- CONTINUA PRIVADO. Mesmo sendo a copia aprovada, nada aqui tem endereco
-- publico: a leitura sai por link assinado de prazo curto, emitido na hora.
-- E' isso que permite tirar um projeto do ar de verdade.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'arena-publico', 'arena-publico', false,
  104857600,  -- 100 MB: a copia leve nao chega perto disso, e o teto e' guarda
  array[
    'image/jpeg','image/png','image/webp',
    'video/mp4'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- QUEM ESCREVE: ninguem, pelo cliente. Nenhuma policy de insert, update ou
-- delete e' criada aqui, de proposito. A copia e' escrita pela chave de
-- servico, num passo deliberado de curadoria, e nunca pelo navegador de
-- ninguem. Aluno nao alcanca este balde.

-- QUEM LE': a funcao publica, que usa a chave de servico e ignora RLS, e a
-- curadoria da escola. Sem esta policy, o professor nao consegue conferir no
-- app o que foi publicado.
drop policy if exists "Curadoria le a copia publicada da arena" on storage.objects;
create policy "Curadoria le a copia publicada da arena"
on storage.objects for select to authenticated
using (
  bucket_id = 'arena-publico'
  and (
    public.has_role(auth.uid(), 'professor'::public.app_role)
    or public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

select id, public, file_size_limit,
       array_length(allowed_mime_types, 1) as tipos_aceitos
  from storage.buckets where id = 'arena-publico';
