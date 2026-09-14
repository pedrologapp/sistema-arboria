-- ============================================================
-- OS NOMES SAEM DO TEXTO PUBLICO, e a entrega do aluno fica intacta.
--
-- Dois projetos contam quem fez o que e nomeiam seis criancas. A missao pediu
-- que contassem a divisao do trabalho, entao eles fizeram o que foi pedido: a
-- regra de nao aparecer valia para foto e video, e ninguem falou do texto.
--
-- A EDICAO E' POR SUPRESSAO, que e' o unico tipo permitido sobre texto de
-- crianca: troca-se o nome pela funcao e a frase continua contando exatamente
-- a mesma coisa. Nada e' acrescentado e nenhum merito se perde.
--
-- O texto editado vai para arena_projeto.corpo. A entrega original em
-- public.entregas NAO e' tocada: ela e' o que a crianca escreveu, e isso nao
-- se reescreve.
-- ============================================================

update public.arena_projeto p
   set corpo = replace(replace(replace(
                 e.texto_resposta,
                 'Samuel programou',  'um integrante programou'),
                 'Andrey foi atrás',  'outro integrante foi atrás'),
                 'Ana Clara apoiou',  'a terceira integrante apoiou'),
       updated_at = now()
  from public.entregas e
 where e.id = p.entrega_origem_id
   and p.numero = 2
   and p.edicao_id = (select id from public.arena_edicao where nome like 'TESTE%');

update public.arena_projeto p
   set corpo = replace(replace(replace(
                 e.texto_resposta,
                 'eu(Hevellyn) dei os comandos', 'eu dei os comandos'),
                 'Letícia ficou com os materiais', 'outra integrante ficou com os materiais'),
                 'Beatriz ficou com a história',  'a terceira integrante ficou com a história'),
       updated_at = now()
  from public.entregas e
 where e.id = p.entrega_origem_id
   and p.numero = 8
   and p.edicao_id = (select id from public.arena_edicao where nome like 'TESTE%');

-- Conferencia: nenhum dos seis nomes pode sobrar no corpo publicado.
select p.numero,
       (p.corpo ilike '%Samuel%' or p.corpo ilike '%Andrey%' or p.corpo ilike '%Ana Clara%'
        or p.corpo ilike '%Hevellyn%' or p.corpo ilike '%Letícia%' or p.corpo ilike '%Beatriz%')
         as ainda_tem_nome,
       right(p.corpo, 260) as final_do_texto
  from public.arena_projeto p
 where p.numero in (2, 8)
   and p.edicao_id = (select id from public.arena_edicao where nome like 'TESTE%')
 order by p.numero;
