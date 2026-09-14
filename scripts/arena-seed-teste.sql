-- ============================================================
-- EDICAO DE TESTE DA ARENA, para o Fundador validar no localhost.
--
-- Cria uma edicao marcada como TESTE e os 11 projetos nela, publicados, para a
-- votacao poder ser exercitada de ponta a ponta. NAO e' a edicao de verdade:
-- quando a Arena for a serio, cria-se outra, com a conferencia feita de fato e
-- com a regra do resultado escrita.
--
-- POR QUE OS CAMPOS DE CONFERENCIA VAO PREENCHIDOS AQUI. A restricao do banco
-- exige conferencia registrada para um projeto ficar publicado, e isso e'
-- proposital. Nesta edicao eles vao preenchidos com o id do Fundador porque a
-- edicao inteira se chama TESTE e vai ser apagada. Em edicao real, preencher
-- isso sem ter conferido seria falsificar registro de auditoria.
--
-- A MIDIA continua apontando para o bucket vivo 'arena-2fase', porque o bucket
-- derivado com a copia sanitizada ainda nao existe. E' mais um motivo para esta
-- edicao nao virar a de verdade.
--
-- COMO RODAR, da raiz do projeto:
--   supabase db query --linked -f scripts/arena-seed-teste.sql
-- COMO DESFAZER:
--   supabase db query --linked -f scripts/arena-seed-teste-apagar.sql
-- ============================================================

with inst as (
  select institution_id from public.missoes
   where id = 'ddaf54d2-7781-4ab6-b3e7-2a54749329a5'
),
nova as (
  insert into public.arena_edicao
    (institution_id, nome, ano, estado, abre_em, fecha_em, regra_resultado, criado_por)
  select inst.institution_id,
         'TESTE — Arena Arboria 2026', 2026, 'aberta',
         now() - interval '1 hour', now() + interval '30 days',
         'EDICAO DE TESTE. A regra do resultado da edicao real ainda nao foi decidida pelo Fundador.',
         '7471ae85-6f72-4810-bb57-c59600de47db'
    from inst
  returning id
),
-- A mesma juncao que o site faz: um projeto por (turma, papel, grupo), vencendo
-- a entrega mais completa e, no empate, a mais recente.
base as (
  select a.turma_id, a.papel_id, a.grupo, e.id as entrega_id, e.created_at,
         row_number() over (
           partition by a.turma_id, a.papel_id, a.grupo
           order by (select count(*) from public.entrega_arquivos x where x.entrega_id = e.id) desc,
                    e.created_at desc) as rn
    from public.entregas e
    join public.capitulo_alocacoes a on a.aluno_id = e.aluno_id
   where e.missao_id = 'ddaf54d2-7781-4ab6-b3e7-2a54749329a5'
),
vencedoras as (select * from base where rn = 1),
fichas(entrega_id, numero, titulo) as (values
  ('9224884e-15a1-4f5e-8c70-a51579910be6'::uuid,  1::smallint, 'Empire Box'),
  ('b22a1bf4-31ed-429d-9cc7-31b10d450165'::uuid,  2::smallint, 'Caixa de Som Ecológica'),
  ('3e2f6da9-d51f-4266-9ae2-cd23380eba80'::uuid,  3::smallint, 'Decoder: Terminal Lógico'),
  ('bc3c4687-8877-40d3-bded-f34004cc7880'::uuid,  4::smallint, 'Metrô Sustentável'),
  ('58c15371-af5d-4293-9982-eccf129c1685'::uuid,  5::smallint, 'ReMember'),
  ('f96e6023-9bbe-4811-aaa9-e09bf562fe8a'::uuid,  6::smallint, 'O Caso do Policial Billy'),
  ('474821f0-b13f-4ac2-a009-c9c6a7d774e4'::uuid,  7::smallint, 'PulsePay'),
  ('0ff2ae29-0289-4991-949f-de458dd4d55f'::uuid,  8::smallint, 'Chacina na Fazenda'),
  ('ae187cce-14b1-44bb-aaca-528639754fbe'::uuid,  9::smallint, 'Global Trade Coin'),
  ('40578b2f-08b1-4d93-8aa4-ea66910d22d1'::uuid, 10::smallint, 'Projeto Pirólise'),
  ('85eb8a94-b5f8-4c2b-8337-23fa444d6ac9'::uuid, 11::smallint, 'Song Maker')
)
insert into public.arena_projeto
  (edicao_id, numero, titulo, estado, publicado_em,
   conferido_por, conferido_em, segundo_par_por, segundo_par_em,
   entrega_origem_id, entrega_origem_em, turma_id, papel_id, grupo)
select nova.id, f.numero, f.titulo, 'publicado', now(),
       '7471ae85-6f72-4810-bb57-c59600de47db', now(),
       '7471ae85-6f72-4810-bb57-c59600de47db', now(),
       v.entrega_id, v.created_at, v.turma_id, v.papel_id, v.grupo
  from vencedoras v
  join fichas f on f.entrega_id = v.entrega_id
 cross join nova;

-- O que ficou de pe'.
select e.id as edicao_id, e.nome, e.estado, e.abre_em, e.fecha_em,
       (select count(*) from public.arena_projeto p where p.edicao_id = e.id) as projetos
  from public.arena_edicao e
 where e.nome like 'TESTE%';
