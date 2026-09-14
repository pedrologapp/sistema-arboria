-- Apaga a edicao de TESTE e tudo que pende dela: projetos, midia, votos,
-- recusas e eventos. A ordem importa porque o voto trava a exclusao do projeto
-- de proposito (ON DELETE RESTRICT), para que ninguem apague resultado por
-- descuido. Aqui a remocao e' explicita e so' alcanca a edicao de teste.
with alvo as (select id from public.arena_edicao where nome like 'TESTE%')
delete from public.arena_voto where edicao_id in (select id from alvo);

with alvo as (select id from public.arena_edicao where nome like 'TESTE%')
delete from public.arena_recusa where edicao_id in (select id from alvo);

with alvo as (select id from public.arena_edicao where nome like 'TESTE%')
delete from public.arena_resultado where edicao_id in (select id from alvo);

delete from public.arena_projeto_evento
 where projeto_id in (
   select p.id from public.arena_projeto p
    where p.edicao_id in (select id from public.arena_edicao where nome like 'TESTE%'));

delete from public.arena_projeto_midia
 where projeto_id in (
   select p.id from public.arena_projeto p
    where p.edicao_id in (select id from public.arena_edicao where nome like 'TESTE%'));

delete from public.arena_projeto
 where edicao_id in (select id from public.arena_edicao where nome like 'TESTE%');

delete from public.arena_edicao where nome like 'TESTE%';

select count(*) as edicoes_de_teste_restantes
  from public.arena_edicao where nome like 'TESTE%';
