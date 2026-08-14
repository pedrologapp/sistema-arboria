-- ============================================================
-- FICHA DE DESCOBERTA v2, E AS FICHAS DO FUNDAMENTAL 1
--
-- Pedido do Fundador em 14/08. A ficha v1 foi escrita quando o objetivo era
-- montar um instrumento de CLASSIFICACAO, entao ela pede a' professora que
-- caracterize a faixa etaria e produz teoria. O questionario dos pais mudou de
-- principio em 14/08 (a opcao virou isca de memoria, quem le' o mecanismo e' a
-- IA no relato), e agora o que a gente precisa das professoras e' outra coisa:
-- EXEMPLO CONCRETO de crianca daquela idade, na palavra delas.
--
-- Prova disso nas duas fichas ja' respondidas: o que rendeu foram as perguntas
-- que pediam comportamento (como a crianca mostra que entendeu; como pede sem
-- palavra; se repara quando algo muda; o que os pais nao veem em casa). As que
-- pediam caracterizacao da serie nao renderam dado nenhum.
--
-- Maternal 2 e Grupo IV FICAM NA v1: elas ja' foram respondidas, e trocar as
-- perguntas embaixo de respostas existentes deixaria texto orfao apontando para
-- pergunta que nao existe mais. As duas continuam legiveis como foram feitas.
-- ============================================================

alter table coleta_descoberta
  add column if not exists versao smallint not null default 2;

comment on column coleta_descoberta.versao is
  'Qual conjunto de perguntas esta ficha usa. 1 = ficha original de 12/08 (caracterizacao da faixa), mantida nas fichas ja respondidas. 2 = ficha de 14/08, que colhe episodio concreto por isca.';

-- as duas ja' respondidas ficam onde estao
update coleta_descoberta
set versao = 1
where serie in ('Maternal 2', 'Grupo IV');

-- as do Fundamental 1 nascem na v2. A entrevista com as professoras do F1 e' na
-- semana de 18/08, e a espinha das iscas e' a mesma do Infantil: o que muda de
-- faixa para faixa e' o exemplo dentro da cena, nao a pergunta.
insert into coleta_descoberta (institution_id, segmento, serie, ordem, idade_referencia, status, versao)
select i.id, 'fundamental1', v.serie, v.ordem, v.idade, 'nao_iniciada', 2
from institutions i
cross join (values
  ('1º Ano', 11, '6 anos'),
  ('2º Ano', 12, '7 anos'),
  ('3º Ano', 13, '8 anos'),
  ('4º Ano', 14, '9 anos'),
  ('5º Ano', 15, '10 anos')
) as v(serie, ordem, idade)
where not exists (
  select 1 from coleta_descoberta c
  where c.institution_id = i.id and c.serie = v.serie
);

select serie, segmento, ordem, versao, status,
       (select count(*) from jsonb_object_keys(respostas)) as respostas_guardadas
from coleta_descoberta
order by ordem;
