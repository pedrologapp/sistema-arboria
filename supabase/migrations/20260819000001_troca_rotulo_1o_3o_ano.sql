-- ============================================================
-- TROCA O ROTULO ENTRE 1o E 3o ANO
--
-- Em 19/08 o Fundador conduziu as duas entrevistas e gravou trocado: a conversa
-- do 1o ano foi digitada na ficha do 3o, e a do 3o na ficha do 1o.
--
-- Nao se move NENHUMA resposta. O que se troca e' o rotulo, que viaja junto com
-- a serie e a idade de referencia. Mexer no texto seria arriscar perder relato
-- que a professora deu uma vez so; mexer no rotulo e' reversivel e nao encosta
-- no conteudo.
--
-- A ordem tambem troca, para a lista continuar saindo 1o, 2o, 3o na tela.
-- As duas fichas usam a versao 3, o mesmo conjunto de perguntas, entao nao
-- existe resposta orfa apontando para pergunta que nao existe na outra.
-- ============================================================

create table if not exists public._bkp_coleta_20260819 as
select *, now() as salvo_em from public.coleta_descoberta;

-- Passo intermediario: sem ele, a troca direta esbarraria em qualquer restricao
-- de unicidade por segmento e serie no meio do caminho.
update public.coleta_descoberta
   set serie = 'TROCA_TEMP'
 where segmento = 'fundamental1' and serie = '1º Ano';

update public.coleta_descoberta
   set serie = '1º Ano', idade_referencia = '6 anos', ordem = 11
 where segmento = 'fundamental1' and serie = '3º Ano';

update public.coleta_descoberta
   set serie = '3º Ano', idade_referencia = '8 anos', ordem = 13
 where segmento = 'fundamental1' and serie = 'TROCA_TEMP';

select serie, ordem, idade_referencia, status,
       (select count(*) from jsonb_each_text(coalesce(respostas,'{}'::jsonb)) e where trim(e.value) <> '') as respondidas,
       left(coalesce(respostas->>'f1b_01',''), 90) as comeco_da_primeira
  from public.coleta_descoberta
 where segmento = 'fundamental1'
 order by ordem;
