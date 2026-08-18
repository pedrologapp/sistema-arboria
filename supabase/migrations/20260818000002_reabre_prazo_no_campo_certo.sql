-- ============================================================
-- REABRE AS MISSOES DA ARENA, AGORA NO CAMPO QUE O APP LE
--
-- Em 14/08 a migracao 20260814000001 mexeu em missoes.data_prazo para reabrir
-- ate domingo. Nao teve efeito nenhum: para missao de capitulo, a funcao
-- get_missoes_do_aluno calcula o prazo assim
--
--   COALESCE(capitulo_turma_config.missoes_data_prazo, missoes.data_prazo)
--
-- ou seja, o valor da config por turma VENCE, e ele continuou em 07/08. Foi por
-- isso que as entregas pararam no dia 7 e nao voltaram: a entrega estava
-- fechada o tempo todo.
--
-- Quem ja entregou nao e afetado: a entrega existente continua registrada e a
-- missao aparece como entregue. Reabrir so muda a vida de quem nao fez.
--
-- 2026-08-22 02:59:59+00 = 21/08 as 23:59:59 no horario de Natal, mesmo padrao
-- que as linhas ja existentes usavam.
-- ============================================================

create table if not exists public._bkp_prazo_ctc_20260818 as
select cfg.*, now() as salvo_em
  from public.capitulo_turma_config cfg
  join public.turmas t on t.id = cfg.turma_id
 where t.segmento = 'fundamental2';

update public.capitulo_turma_config cfg
   set missoes_data_prazo = '2026-08-22 02:59:59+00'
  from public.turmas t
 where t.id = cfg.turma_id
   and t.segmento = 'fundamental2'
   and cfg.missoes_data_prazo = '2026-08-07 02:59:59+00';

select t.nome as turma,
       cfg.missoes_data_prazo as prazo,
       (cfg.missoes_data_prazo > now()) as aberto
  from public.capitulo_turma_config cfg
  join public.turmas t on t.id = cfg.turma_id
 where t.segmento = 'fundamental2'
 order by t.nome;
