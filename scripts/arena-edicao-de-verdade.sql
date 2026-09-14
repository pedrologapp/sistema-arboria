-- ============================================================
-- A EDICAO DE TESTE VIRA A EDICAO DE VERDADE.
--
-- Ela nao e' recriada, e' convertida: os onze projetos publicados, a midia
-- conferida e os textos ja' estao pendurados nela, e recriar significaria
-- refazer tudo isso sem necessidade. O que muda e' o nome, a janela, a regra
-- do resultado e o teto por rede. Os votos de teste saem.
--
-- A JANELA fecha em 20/09/2026 as 23h59 de Brasilia, que e' 21/09 as 02h59 em
-- UTC. A data vem do comunicado enviado as familias: o sistema tem que fechar
-- quando o comunicado disse que fecha, e nao um dia depois.
--
-- A REGRA DO RESULTADO e' exatamente a frase publicada no comunicado. Ela
-- precisa existir aqui porque a restricao do banco exige regra escrita para a
-- edicao poder ficar aberta, e porque decidir como o voto pesa depois de ver
-- os votos e' o que torna um resultado contestavel.
--
-- O TETO POR REDE sobe muito. Ele existe so' para barrar robo, e no valor
-- antigo (60 por hora) uma familia grande num mesmo provedor, ou uma turma
-- votando na escola, ja' esbarraria nele. Recusar voto legitimo e' invisivel e
-- irrecuperavel; aceitar voto suspeito e' recuperavel na apuracao, que devolve
-- quantas redes distintas votaram em cada projeto.
-- ============================================================

-- Os votos de teste saem antes, senao contam como voto de gente.
delete from public.arena_voto
 where edicao_id = (select id from public.arena_edicao where nome like 'TESTE%');
delete from public.arena_recusa
 where edicao_id = (select id from public.arena_edicao where nome like 'TESTE%');

update public.arena_edicao
   set nome = 'Arena Arboria 2026',
       abre_em = now(),
       fecha_em = timestamptz '2026-09-21 02:59:59+00',
       regra_resultado =
         'O vencedor nao sai so do voto do publico: ele combina esse voto com a '
         || 'avaliacao feita pelos professores. Regra publicada as familias no '
         || 'comunicado de 14/09/2026, antes da abertura da votacao.',
       teto_por_rede = 5000,
       teto_por_rede_hora = 800,
       updated_at = now()
 where nome like 'TESTE%';

select nome, estado, abre_em, fecha_em, teto_por_rede, teto_por_rede_hora,
       (select count(*) from public.arena_voto v where v.edicao_id = e.id) as votos,
       (select count(*) from public.arena_projeto p
         where p.edicao_id = e.id and p.estado = 'publicado') as projetos_publicados
  from public.arena_edicao e;
