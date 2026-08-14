-- ============================================================
-- REABRE ATE' DOMINGO (16/08/2026) AS MISSOES DA ARENA E AS INDIVIDUAIS
--
-- Pedido do Fundador em 14/08: liberar as missoes de Theo Henrique Bezerra de
-- Paiva e Joao Lucas Freitas da Silva (6o Ano B), e reabrir ate' domingo as
-- missoes da Arena e as individuais fechadas recentemente.
--
-- Investigacao antes de mexer: os dois alunos nao estavam bloqueados por nada
-- especifico. As missoes deles estao todas com status 'liberada', sem trava por
-- serie (data_liberacao_6ano nula em todas) e sem lista de destinatarios. O
-- unico impedimento era o prazo vencido em 06/08 as 23:59, com
-- permite_entrega_atrasada = false. Ou seja: as duas metades do pedido se
-- resolvem com a mesma mudanca, e nao existe no esquema um prazo por aluno que
-- permitisse liberar so' para eles.
--
-- Alcance: as 41 missoes que compartilham o prazo de 06/08, sendo 40
-- individuais (as de casa, as de papel da Assembleia e a "Missao Individual")
-- e 1 coletiva da Arena ("Apresentem seu projeto").
--
-- Novo prazo: domingo 16/08/2026 as 23:59:59 no horario de Natal (UTC-3), que
-- em UTC e' 17/08 02:59:59, o mesmo padrao de fim de dia ja' usado nos prazos
-- anteriores desta base.
-- ============================================================

-- Backup antes de tocar em qualquer coisa, no mesmo padrao do _bkp de 04/08.
create table if not exists _bkp_prazo_missoes_20260814 as
select id, titulo, casa_id, entrega_coletiva, data_prazo, permite_entrega_atrasada
from missoes
where data_prazo = '2026-08-07 02:59:59+00';

update missoes
set data_prazo = '2026-08-17 02:59:59+00',
    updated_at = now()
where data_prazo = '2026-08-07 02:59:59+00';

-- Conferencia: quantas missoes ficaram com o prazo novo, e se os dois alunos
-- citados tem de fato missoes abertas agora.
select
  (select count(*) from _bkp_prazo_missoes_20260814) as guardadas_no_backup,
  (select count(*) from missoes where data_prazo = '2026-08-17 02:59:59+00') as com_prazo_novo,
  (select count(*) from missoes where data_prazo = '2026-08-07 02:59:59+00') as sobraram_no_prazo_antigo,
  (select count(*) from missoes m
     where m.data_prazo = '2026-08-17 02:59:59+00'
       and (m.casa_id = 2 or m.casa_id is null)) as abertas_para_theo_casa2,
  (select count(*) from missoes m
     where m.data_prazo = '2026-08-17 02:59:59+00'
       and (m.casa_id = 6 or m.casa_id is null)) as abertas_para_joao_casa6;
