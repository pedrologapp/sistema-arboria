-- ============================================================
-- O CORPO PUBLICADO FALTAVA EM NOVE DOS ONZE PROJETOS.
--
-- A linha de publicacao guarda o proprio texto, e e' dele que o site le'. So'
-- que ele so' tinha sido preenchido nos dois projetos que precisaram ter nomes
-- de crianca suprimidos. Nos outros nove ele ficou nulo, e o site publicou a
-- secao "Nas palavras da equipe" vazia.
--
-- A LICAO, que vale para a proxima edicao: publicar tem que EXIGIR o corpo, do
-- mesmo jeito que ja' exige a conferencia. Enquanto isso nao virar restricao,
-- e' possivel publicar um projeto mudo sem ninguem perceber.
--
-- Este script copia o texto da entrega para as linhas que estao sem, e NAO
-- toca nas duas que ja' foram editadas.
-- ============================================================

update public.arena_projeto p
   set corpo = e.texto_resposta,
       updated_at = now()
  from public.entregas e
 where e.id = p.entrega_origem_id
   and p.corpo is null
   and p.edicao_id = (select id from public.arena_edicao where nome like 'TESTE%');

-- Conferencia: nenhum projeto publicado pode ficar sem corpo, e nenhum dos
-- nove nomes pode ter voltado pela porta dos fundos.
select p.numero, p.titulo,
       (p.corpo is null or length(p.corpo) = 0) as sem_texto,
       (p.corpo ilike '%Samuel%' or p.corpo ilike '%Andrey%' or p.corpo ilike '%Ana Clara%'
        or p.corpo ilike '%Hevellyn%' or p.corpo ilike '%Letícia%' or p.corpo ilike '%Beatriz%'
        or p.corpo ilike '%Maria Eduarda%' or p.corpo ilike '%Anna Antônia%') as tem_nome
  from public.arena_projeto p
 where p.edicao_id = (select id from public.arena_edicao where nome like 'TESTE%')
 order by p.numero;
