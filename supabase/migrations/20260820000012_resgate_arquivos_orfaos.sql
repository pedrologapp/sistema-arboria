-- ============================================================
-- OS ARQUIVOS ORFAOS DA 2a FASE
--
-- Ate' hoje a entrega so' nascia quando o aluno tocava em Enviar, e o Enviar so'
-- destravava com capa, tres fotos, video e 150 palavras juntos. Antes disso o
-- material vivia apenas na memoria da pagina: salvo no bucket, e sem nenhuma
-- linha no banco apontando para ele. Recarregou a aba, a tela voltou vazia.
--
-- Tres alunos ficaram assim:
--
--   Dhavi (8o), 17/08  capa + 6 fotos + video. Fez a coisa INTEIRA e perdeu.
--   Theo (6o),  19/08  tres capas, mais nada.
--   Ana Clara (9o), 20/08  subiu 11 arquivos em seis minutos, sempre os mesmos
--                          cinco, alternando video e capa, porque a cada volta
--                          a tela aparecia limpa.
--
-- O arquivo deles nunca se perdeu: esta' no bucket desde a primeira vez. O que
-- faltava era a linha. Isto cria a entrega e amarra o que cada um mandou, para
-- que ao abrir a pagina eles encontrem o proprio material em vez de tela em
-- branco. Nenhum arquivo novo e' inventado e nada e' apagado.
--
-- O QUE ISTO NAO FAZ: nao conclui a entrega de ninguem. A descricao continua
-- em branco e as 150 palavras continuam obrigatorias. Isto devolve o ponto de
-- partida, nao o ponto de chegada.
-- ============================================================

with candidatos as (
  select
    (storage.foldername(o.name))[1]::uuid            as aluno_id,
    (storage.foldername(o.name))[2]                  as slot,
    o.name                                           as caminho,
    coalesce((o.metadata->>'size')::bigint, 0)       as bytes,
    o.created_at,
    -- Capa e video sao um so': fica o ultimo que a crianca escolheu.
    -- No portfolio, o mesmo arquivo subiu varias vezes; agrupar por tamanho
    -- junta as repeticoes e deixa uma linha por foto de verdade.
    row_number() over (
      partition by (storage.foldername(o.name))[1],
                   (storage.foldername(o.name))[2],
                   case when (storage.foldername(o.name))[2] = 'portfolio'
                        then (o.metadata->>'size') else '' end
      order by o.created_at desc
    ) as recencia
  from storage.objects o
  where o.bucket_id = 'arena-2fase'
    and not exists (
      select 1 from public.entrega_arquivos ea where ea.nome_storage = o.name)
),
unicos as (
  select * from candidatos where recencia = 1
),
-- No portfolio o limite da tela sao 5 fotos. Amarrar 6 deixaria o aluno acima do
-- proprio limite e sem conseguir trocar nenhuma.
numerados as (
  select u.*,
    row_number() over (partition by aluno_id, slot order by created_at) as ordem
  from unicos u
),
escolhidos as (
  select * from numerados
   where slot <> 'portfolio' or ordem <= 5
),
-- A entrega existe ou nasce. Nasce sem texto, de proposito: a descricao e' da
-- crianca, e escrever qualquer coisa no lugar dela seria colocar palavra na boca
-- de quem o Arboria existe para escutar.
nascidas as (
  insert into public.entregas
    (missao_id, aluno_id, status, entregue_no_prazo, numero_tentativa)
  select distinct 'ddaf54d2-7781-4ab6-b3e7-2a54749329a5'::uuid, e.aluno_id,
         'pendente', true, 1
    from escolhidos e
   where not exists (
     select 1 from public.entregas en
      where en.missao_id = 'ddaf54d2-7781-4ab6-b3e7-2a54749329a5'
        and en.aluno_id = e.aluno_id)
  returning id, aluno_id
),
todas as (
  select id, aluno_id from nascidas
  union all
  select en.id, en.aluno_id from public.entregas en
   where en.missao_id = 'ddaf54d2-7781-4ab6-b3e7-2a54749329a5'
     and en.aluno_id in (select aluno_id from escolhidos)
)
insert into public.entrega_arquivos
  (entrega_id, nome_original, nome_storage, tipo_arquivo, tamanho_bytes, url)
select t.id,
       split_part(e.caminho, '/', 3),
       e.caminho,
       e.slot,
       e.bytes,
       'arena-2fase/' || e.caminho
  from escolhidos e
  join todas t on t.aluno_id = e.aluno_id
 where not exists (
   select 1 from public.entrega_arquivos ea where ea.nome_storage = e.caminho);

-- --------------------------------------------------------------- conferencia
select p.full_name, p.serie,
       count(*) filter (where ea.tipo_arquivo = 'capa')      as capa,
       count(*) filter (where ea.tipo_arquivo = 'portfolio') as portfolio,
       count(*) filter (where ea.tipo_arquivo = 'video')     as video,
       coalesce(length(en.texto_resposta), 0)                as tamanho_descricao
  from public.entregas en
  join public.profiles p on p.id = en.aluno_id
  left join public.entrega_arquivos ea on ea.entrega_id = en.id
 where en.missao_id = 'ddaf54d2-7781-4ab6-b3e7-2a54749329a5'
 group by p.full_name, p.serie, en.texto_resposta
 order by p.full_name;
