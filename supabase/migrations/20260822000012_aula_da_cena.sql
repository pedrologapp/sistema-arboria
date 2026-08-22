-- ============================================================
-- A AULA DE ONDE A CENA VEIO, E A FOLHA QUE AINDA NÃO FOI ENTREGUE
--
-- PARTE 1 · Pedido do Fundador: "se a observação foi feita dentro do administrar
-- aula, é importante que no acervo venha qual aula aquela observação está
-- relacionada, não só a fase".
--
-- Está certo, e a cadeia existe. A cena aponta para `arboria_observacoes`, que
-- é o espelho e não guarda a aula. A canônica é `observacoes`, que tem
-- `atividade_id` e `origem_captura`, e `atividades` tem `nome`. Conferido nas
-- quatro cenas de escola do #1: todas casam por aluno, data e texto, todas com
-- atividade, todas capturadas em aula.
--
-- Isso muda a leitura do acervo mais do que parece. "Fase 2 · Linguística" diz
-- o assunto do bimestre; "Dada a instrução do convite, os alunos começaram a
-- confeccionar" ganha outro peso quando se sabe que a aula era sobre convite e
-- que ele devolveu um campeonato. O que o Ayrton fez só é notável CONTRA o que
-- foi pedido.
--
-- PARTE 2 · A folha das três atividades NÃO foi entregue. O Fundador vai levar
-- na segunda, uma para cada professora. "Escrita e não entregue" é um estado
-- diferente de "enviada e sem volta", e o painel não pode confundir os dois:
-- um espera a professora, o outro espera ele.
-- ============================================================

-- --------------------------------------------------------- 1. a aula da cena
alter table public.caso_cena add column if not exists aula text;

comment on column public.caso_cena.aula is
  'A atividade em que a professora registrou. O que a crianca fez so e notavel CONTRA o que foi pedido.';

update public.caso_cena ce
   set aula = a.nome
  from public.casos c,
       public.observacoes ob
  join public.atividades a on a.id = ob.atividade_id
 where c.id = ce.caso_id
   and ce.fonte = 'escola'
   and ce.aula is null
   and ob.aluno_id = c.aluno_id
   and ob.data_observacao = ce.quando
   and regexp_replace(ob.observacao_texto, '\s+', ' ', 'g')
     = regexp_replace(coalesce(ce.citacao, ''), '\s+', ' ', 'g');

-- ------------------------------------------- 2. escrita nao e entregue
alter table public.caso_sondagem add column if not exists entregue_em date;

comment on column public.caso_sondagem.enviada_em is
  'Quando a sondagem foi ESCRITA. Nao e a data de entrega: para isso existe entregue_em.';
comment on column public.caso_sondagem.entregue_em is
  'Quando a folha chegou na mao da professora. Nulo = escrita e ainda nao entregue, que e um estado diferente de "sem volta": um espera a professora, o outro espera o Fundador.';

-- O #1 volta para 'aberto': nada foi perguntado a ninguem ainda.
update public.casos set estado = 'aberto' where numero = 1;

-- --------------------------------------------------------------- conferência
select ce.quando::text as quando, coalesce(ce.aula, '(sem aula ligada)') as aula,
       left(regexp_replace(ce.citacao, '\s+', ' ', 'g'), 46) as trecho
  from public.caso_cena ce
  join public.casos c on c.id = ce.caso_id
 where c.numero = 1 and ce.fonte = 'escola'
 order by ce.quando;
