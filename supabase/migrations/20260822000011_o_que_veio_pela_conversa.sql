-- ============================================================
-- O QUE O FUNDADOR CONTA TAMBÉM É DADO
--
-- Falha de processo apontada por ele em 22/08: "você esquece de acrescentar
-- essas informações do Ayrton que coloquei aqui, por isso a IA não está fazendo
-- tal qual o PDF. O que eu escrevo aqui também pode entrar como observação".
--
-- Está certo, e é falha minha. Durante dias ele descreveu o Ayrton em conversa,
-- e nada daquilo virou cena. O "atropela" só entrou porque ele colou o PDF
-- inteiro. Informação sobre criança não pode depender de eu lembrar de anotar.
--
-- O CAMINHO EXISTE E TEM NOME: o professor tem uma aba de diário onde escreve
-- observação. É por ali que isto deveria entrar de verdade. Enquanto não está
-- ligado, entra aqui com `quem` dizendo o caminho, e SEM origem_id, que é o
-- aviso permanente de que aquilo é relato e não registro.
--
-- E FALTAVA A SONDAGEM. O caso dizia "nada foi perguntado ainda", mas as três
-- atividades da folha da professora são exatamente uma sondagem, escrita em
-- 19/08. Ela estava fora do sistema, então o painel mentia sobre o próprio
-- estado.
-- ============================================================

-- ------------------------------------ o que a escola já sabia e não estava aqui
insert into public.caso_cena (caso_id, tipo, descricao, citacao, fonte, quem,
                              quando, contexto)
select c.id, 'interesse',
       'Passa o dia desenhando, faz gibi, ama contar',
       'Ele passa o dia desenhando, faz gibi, ama contar.',
       'escola', 'a professora, pelo Fundador', date '2026-07-01',
       'Descrição de sala, sem episódio datado. É o pano de fundo contra o qual o "atropela" faz sentido.'
  from public.casos c
 where c.numero = 1
   and not exists (select 1 from public.caso_cena x
                    where x.caso_id = c.id and x.descricao like 'Passa o dia desenhando%');

-- --------------------------------------------- a sondagem que já tinha sido feita
insert into public.caso_sondagem (caso_id, aposta_id, pedido, pergunta, para_quem, enviada_em)
select c.id,
       (select a.id from public.caso_aposta a where a.caso_id = c.id limit 1),
$$Três atividades curtas, na mesma semana. Nas três ele conta alguma coisa em voz alta, e muda só o que ele teve na mão ANTES de falar.

A · Sem nada na mão. Ele conta direto.
B · Seis quadros desenhados por ele antes, e só então conta.
C · Uma lista escrita por ele antes, e só então conta.

Um pedido, e ele é o mais importante de todos: não escolha a que você acha que vai funcionar melhor com ele. Faça as três. Se você já apostar numa, sem querer você ajuda um pouco mais naquela, e aí não se descobre nada.

A atividade A é a régua. Sem ela, as outras duas não querem dizer nada.$$,
       'Em qual das três a história sai inteira, e em qual quem ouve perde o fio?',
       'a professora do 5º Ano A',
       date '2026-08-19'
  from public.casos c
 where c.numero = 1
   and not exists (select 1 from public.caso_sondagem s
                    where s.caso_id = c.id and s.enviada_em = date '2026-08-19');

update public.casos set estado = 'sondando' where numero = 1;

-- ============================================================
-- A CALIBRAGEM: UM CASO POR TURMA
--
-- Decisão do Fundador em 22/08: "o que estamos fazendo aqui é tentar calibrar o
-- Arboria para depois replicarmos isso para todos os alunos, por isso quero
-- pegar um caso de cada turma. Com isso teremos como ir estudando as coisas com
-- calma e pedir aos professores para responder perguntas que nos ajudem a
-- investigar."
--
-- Isso muda o critério de escolha dos casos. Não é "quem tem mais material":
-- é UM POR TURMA, para que cada professora receba uma pergunta e nenhuma receba
-- duas. A cobertura por turma passa a ser o que se olha.
-- ============================================================
create or replace view public.vw_casos_por_turma as
select t.serie, t.nome as turma,
       count(distinct p.id) as alunos,
       count(distinct c.id) as casos_abertos
  from public.turmas t
  join public.aluno_turma at on at.turma_id = t.id and at.ativo and at.ano_letivo = 2026
  join public.profiles p on p.id = at.aluno_id
  left join public.casos c on c.aluno_id = p.id
 where t.serie in ('Maternal 2','Maternal 3','Grupo IV','Grupo V',
                   '1º Ano','2º Ano','3º Ano','4º Ano','5º Ano')
 group by t.serie, t.nome;

-- --------------------------------------------------------------- conferência
select serie, turma, alunos, casos_abertos
  from public.vw_casos_por_turma
 order by case serie
   when 'Maternal 2' then 1 when 'Maternal 3' then 2 when 'Grupo IV' then 3
   when 'Grupo V' then 4 when '1º Ano' then 5 when '2º Ano' then 6
   when '3º Ano' then 7 when '4º Ano' then 8 else 9 end, turma;
