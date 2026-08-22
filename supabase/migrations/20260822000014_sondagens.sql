-- ============================================================
-- AS SEIS SONDAGENS QUE FALTAVAM
--
-- A página 2 da folha é o que faz a professora FAZER alguma coisa. Sem ela a
-- folha vira carta bonita: ela lê, concorda e não age.
--
-- TRÊS REGRAS QUE VALEM PARA TODAS, e cada uma existe porque a alternativa
-- fracassa:
--
--  1. CABE NO DIA NORMAL. Nenhuma pede atividade nova. No instante em que o
--     pedido exige planejamento, a taxa de resposta vai a zero, porque
--     planejamento é o recurso que ela não tem.
--
--  2. UMA COISA POR VEZ. Um pedido, uma pergunta. Duas perguntas fazem ela
--     escolher, e ela escolhe a mais fácil.
--
--  3. A PERGUNTA TEM QUE PODER DAR ERRADO. Pergunta que só confirma não entra.
--     "Deu certo?" seria confirmada por qualquer resposta, e o sistema viraria
--     profecia que se cumpre sozinha.
--
-- E nenhuma delas leva a hipótese. A professora precisa reparar sem saber o que
-- a gente espera encontrar, senão a volta dela não vale nada.
-- ============================================================

insert into public.caso_sondagem (caso_id, aposta_id, pedido, pergunta, para_quem, enviada_em)
select c.id,
       (select a.id from public.caso_aposta a where a.caso_id = c.id limit 1),
       v.pedido, v.pergunta, v.para_quem, date '2026-08-22'
  from public.casos c
  join (values

  -- ============================================== #2 · JOSHUA · 3º ANO A
  (2,
$$Nas próximas semanas ele vai ter que contar alguma coisa em voz alta várias vezes, e isso já ia acontecer de qualquer jeito. O pedido é só mudar duas coisas, uma de cada vez, e anotar.

A · Ele conta **para você sozinha**, do jeito que vier, sem ordem nenhuma exigida.
B · Ele conta **para a turma**, do mesmo jeito, sem ordem exigida.
C · Ele conta **para a turma** e a tarefa pede começo, meio e fim.

Não precisa ser na mesma semana e não precisa ser nessa ordem. O que não pode é juntar as duas mudanças de uma vez, porque aí não dá para saber qual delas pesou.$$,
   'Ele trava quando muda o público, ou quando a tarefa passa a exigir ordem?',
   'a professora do 3º Ano A'),

  -- ======================================= #3 · MARIA CECÍLIA · 4º ANO A
  (3,
$$Nas próximas três vezes que houver trabalho em grupo, anotar duas coisas só, e nada além disso:

· com quem ela ficou
· se ela falou ou ficou quieta

Não precisa montar grupo diferente de propósito nem mudar nada do que você já ia fazer. É só olhar e anotar depois.

Três vezes bastam. Com uma só não dá para separar o dia da pessoa.$$,
   'Tem alguém específico perto de quem ela some, ou ela some em qualquer grupo?',
   'a professora do 4º Ano A'),

  -- ======================================= #4 · MARIA HELENA · 2º ANO A
  (4,
$$Nas próximas duas produções dela, depois que ela entregar, fazer uma pergunta só, e anotar a resposta com as palavras dela:

**"Por que você fez assim?"**

Sem sugerir nada, sem completar a frase por ela, e sem perguntar se ela quis dizer alguma coisa. Só a pergunta, e esperar.

Se ela responder curto, tudo bem: anote curto. O que importa é o tamanho do que vem, e não fazer vir mais.$$,
   'O que ela diz quando explica é maior ou menor do que aquilo que ela entregou?',
   'a professora do 2º Ano A'),

  -- ====================================== #5 · LUIZ MIGUEL · GRUPO IV A
  (5,
$$Nas próximas três rodas de conversa, dar a vez a ele em posições diferentes:

· uma vez **primeiro**, antes de qualquer colega falar
· uma vez **no meio**
· uma vez **por último**

E anotar o que ele disse nas três, com as palavras dele, mesmo que seja pouco.

É a mesma roda que você já faz. Muda só quando chega a vez dele.$$,
   'O que ele fala muda conforme a posição na roda?',
   'a professora do Grupo IV A'),

  -- ======================================== #6 · GAEL · MATERNAL 3 A
  (6,
$$Antes de qualquer coisa, um pedido que vem primeiro: **escreva um episódio, com data**. Uma vez só que tenha acontecido, do jeito que aconteceu. O que você me contou é muito bom e não está escrito em lugar nenhum, e sem um episódio datado não dá para acompanhar o que muda.

Depois disso, três situações para reparar quando acontecerem. Não precisa provocar nenhuma delas:

A · Uma criança quieta num canto, **sem nada de errado acontecendo**. Ele repara sozinho?
B · Alguém deixou de fazer o que devia (não bebeu água, não guardou), mas está **visivelmente bem e ocupado**. Ele aciona do mesmo jeito?
C · Um dia em que **você** esteja cansada e não tenha dito nada. Ele pergunta?

A C é a que mais decide, e é a mais barata: é só reparar.$$,
   'Ele repara em quem está mal, ou em quem está fora da regra?',
   'a professora do Maternal 3 A'),

  -- ======================================== #7 · THALLES · GRUPO V B
  (7,
$$Nas próximas duas vezes que ele encontrar uma dificuldade em qualquer atividade, anotar o que ele fez **nos trinta segundos seguintes**. Não o que ele fez no fim: os trinta segundos seguintes.

Se uma dessas duas puder ser numa atividade com corpo e movimento, melhor ainda, mas não force: vale o que acontecer.

E anote também quando ele **não** desistiu, se acontecer. O que ele faz quando dá certo é tão informativo quanto o resto.$$,
   'O que ele faz diante da dificuldade muda conforme o tipo de atividade?',
   'a professora do Grupo V B')

  ) as v(numero, pedido, pergunta, para_quem) on v.numero = c.numero
 where not exists (select 1 from public.caso_sondagem s
                    where s.caso_id = c.id and s.enviada_em = date '2026-08-22');

-- --------------------------------------------------------------- conferência
select c.numero, coalesce(p.full_name,'') as quem,
       (select count(*) from public.caso_sondagem s where s.caso_id=c.id) as sondagens,
       (select left(s.pergunta, 62) from public.caso_sondagem s
         where s.caso_id=c.id order by s.enviada_em desc limit 1) as pergunta
  from public.casos c
  left join public.profiles p on p.id=c.aluno_id
 where c.numero between 1 and 7
 order by c.numero;
