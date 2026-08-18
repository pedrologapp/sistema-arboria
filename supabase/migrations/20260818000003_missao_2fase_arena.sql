-- ============================================================
-- MISSAO DA 2a FASE DA ARENA, so para os 17 grupos selecionados
--
-- Por que FORA do capitulo (capitulo_id NULL): missao de capitulo so aparece
-- para quem tem papel alocado naquele capitulo, e a 2a fase nao se organiza
-- por papel, se organiza por grupo selecionado.
--
-- Por que fase_id NULL: get_missoes_do_aluno exige que a fase da missao esteja
-- DENTRO do intervalo de datas de hoje. A Logico-Matematica terminou em 05/07,
-- entao amarrar a missao a ela a esconderia de todo mundo.
--
-- O escopo vem de missao_destinatarios: quando essa tabela tem linhas para a
-- missao, SO os alunos listados a enxergam. Sao os 56 integrantes dos 17
-- projetos do cartaz, casados um a um pelo nome completo.
--
-- entrega_coletiva fica FALSE de proposito: a trava coletiva descobre o grupo
-- pelas alocacoes do capitulo, e esta missao nao tem capitulo. Ligada, ela
-- quebraria. O "um envia pelo grupo" e' combinado no texto e garantido na tela
-- de envio da 2a fase.
-- ============================================================

with inst as (
  select p.institution_id
    from public.profiles p
   where p.id = '6ab50249-ce94-4d19-a018-8593a7e090e0'   -- um aluno do F2, so' para herdar a instituicao
)
insert into public.missoes (
  institution_id, criado_por, titulo, descricao, contexto,
  tipo, tipo_missao, pontos_base,
  data_liberacao, data_prazo,
  requer_texto, requer_arquivo,
  status, serie_filtro, turma_filtro, casa_id, capitulo_id,
  para_todos_da_casa, entrega_coletiva, layout_palco
)
select
  inst.institution_id,
  '7471ae85-6f72-4810-bb57-c59600de47db',
  'Arena Arboria: 2ª fase',
  'Voces passaram. O projeto de voces foi escolhido entre os 36 para disputar a Arena Arboria.

Agora ele precisa sair da sala e ficar de pe sozinho, para quem nunca viu. E isso que voces vao reunir:

A foto principal, que e a que as pessoas vao ver na hora de votar.
De tres a cinco fotos de portfolio, com outros angulos e os detalhes.
Um video do projeto funcionando, de ate dois minutos.
E a descricao, de no minimo 150 palavras, contando o projeto para quem nunca viu.

Nas fotos e no video aparece o projeto, nunca voces. Sem rosto e sem ninguem em cena, porque isso vai para fora da escola.

Um envio vale pelo grupo inteiro. Combinem quem envia.',
  'A 2ª fase e onde o projeto vira candidato. O que voces enviarem aqui e o que o publico vai ver.',
  'principal', 'geral', 100,
  now(), '2026-08-22 02:59:59+00',
  true, false,
  'liberada', null, null, null, null,
  true, false, false
from inst
returning id, titulo, data_prazo;
