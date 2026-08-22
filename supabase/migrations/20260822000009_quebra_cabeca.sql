-- ============================================================
-- O QUEBRA-CABEÇA, E O CONTEXTO DA CENA
--
-- CORREÇÃO DE DOUTRINA, pedida pelo Fundador em 22/08:
--
--   "Eu acho que queremos encurtar muito o caminho, chegar a uma resposta o
--    mais rápido possível. Não precisamos ser tão ligeiros, a mente da criança
--    é um mundo. O Arboria precisa ser calmo também. É como juntar um
--    quebra-cabeça, só que a gente vai procurando as peças. Quando você me traz
--    'pode ser a cabeça que narra' ou 'pode ser a que organiza', e não pode ser
--    as duas?"
--
-- Ele está certo, e o erro era meu. Eu importei um método de laboratório:
-- hipótese contra rival, uma prova que mata uma das duas. Esse desenho serve
-- para impedir rótulo, e eu o transformei numa disputa que precisa de vencedor.
--
-- E olhando o caso #1 de novo com o "e se forem as duas": nas QUATRO cenas os
-- dois aparecem JUNTOS. O campeonato tem cronograma e tem participantes com
-- auxiliar. O gibi é história e é coleção numerada numa sacola. O argumento da
-- filosofia é cadeia de razões dita a alguém. O "sabia?" é narrativa
-- verificando a plateia. Em nenhuma cena aparece um sem o outro. A pergunta
-- binária estava cega para o padrão mais forte do caso.
--
-- O QUE MUDA NO MODELO:
--
--  1. A aposta ganha o estado 'convivem'. Duas leituras podem valer ao mesmo
--     tempo, e aí a pergunta boa deixa de ser "qual das duas" e passa a ser
--     como elas se combinam.
--
--  2. O rival PARA de ser candidato a morrer. Ele continua obrigatório, e o
--     trabalho dele muda: não é competir, é impedir que a primeira leitura
--     feche. Segurar duas leituras abertas protege mais do que escolher uma.
--
--  3. Entra `pecas_soltas`: o que a gente tem e ainda não sabe onde encaixa.
--     Num quebra-cabeça isso não é fracasso, é o estado normal da mesa. Sem
--     esse campo, tudo que não vira mecanismo desaparece da leitura.
--
--  4. Entra `proxima_peca`: o que a gente procura em seguida. Note a diferença
--     de "o que derrubaria": aquilo era um teste que decide, isto é uma peça
--     que se procura. As duas convivem, e o tom é outro.
--
-- E O CONTEXTO DA CENA (segundo pedido do Fundador): o acervo mostrava a frase
-- solta. Quem lê precisa saber POR QUE aquela frase existe: qual aula gerou o
-- registro, qual pergunta a mãe estava respondendo. Sem isso, o leitor de daqui
-- a dois anos não tem como julgar o peso do que está lendo.
-- ============================================================

-- ------------------------------------------------------- o contexto da cena
alter table public.caso_cena add column if not exists contexto text;

comment on column public.caso_cena.contexto is
  'Por que esta frase existe: a pergunta que a mae respondia, ou a aula/fase em que a professora registrou. Sem isso a cena e frase solta e ninguem consegue pesar o que le.';

-- o que a família estava respondendo
update public.caso_cena ce
   set contexto = 'Respondendo: ' || r.pergunta_texto
  from public.questionario_pais_resposta r
 where ce.origem_tipo = 'questionario_pais_resposta'
   and ce.origem_id = r.id
   and ce.contexto is null;

-- em que aula a professora registrou
update public.caso_cena ce
   set contexto = trim(both ' ·' from
         coalesce('Fase ' || o.fase_numero::text, '')
      || coalesce(' · ' || o.inteligencia_fase_nome, '')
      || coalesce(' · ' || o.turma_completa, ''))
  from public.arboria_observacoes o
 where ce.origem_tipo = 'arboria_observacoes'
   and ce.origem_id = o.id
   and ce.contexto is null
   and coalesce(o.inteligencia_fase_nome, o.turma_completa) is not null;

-- ------------------------------------------------- a mesa do quebra-cabeça
alter table public.casos add column if not exists pecas_soltas text[] not null default '{}';
alter table public.casos add column if not exists proxima_peca text;

comment on column public.casos.pecas_soltas is
  'O que a gente tem e ainda nao sabe onde encaixa. Num quebra-cabeca isso nao e fracasso, e o estado normal da mesa.';
comment on column public.casos.proxima_peca is
  'A peca que a gente procura em seguida. Diferente de "o que derrubaria": aquilo decide, isto procura.';

alter table public.caso_aposta drop constraint if exists caso_aposta_estado_check;
alter table public.caso_aposta add constraint caso_aposta_estado_check
  check (estado in ('aberta','sustentada','derrubada','convivem'));

comment on column public.caso_aposta.rival is
  'NAO e candidato a morrer. O trabalho dele e impedir que a primeira leitura feche. Segurar duas leituras abertas protege mais do que escolher uma.';

-- ============================================================
-- O #1 REESCRITO SEM PRESSA
-- ============================================================
update public.casos set
  titulo = 'Ele narra e organiza ao mesmo tempo. Um consegue existir sem o outro?',
  pergunta = 'Nas quatro cenas que a gente tem, os dois sempre aparecem juntos. Nenhuma mostra um sozinho.',
  o_que_nao_fecha =
    'Tudo que chegou mostra ele montando arranjos com gente dentro, e em nenhuma das cenas os dois vêm separados. O campeonato tem cronograma E participantes com auxiliar nomeado. O gibi é história E coleção que anda numerada numa sacola. O argumento pela filosofia é cadeia de razões E é dito a alguém para convencer. O "sabia?" depois de cada frase é narrativa E é verificação de plateia. O que não fecha não é qual dos dois ele é: é que a gente não tem nenhuma cena em que ele use um sem o outro, e por isso não dá para saber se são duas coisas ou uma só.',
  o_que_muda =
    'Se forem duas coisas separadas, a escola pode oferecer uma de cada vez e ele vai bem nas duas. Se uma só funcionar com a outra junto, oferecer separado apaga ele, e ninguém vai entender por quê. E existe uma terceira possibilidade que a gente não pode descartar: que o personagem seja o que faz a estrutura funcionar para ele, e aí não são duas peças, é uma peça com duas faces.',
  proxima_peca =
    'Uma cena em que ele tenha que fazer só um dos dois. Não é teste montado: é reparar quando acontecer naturalmente, numa tarefa que peça só sequência, ou numa que peça só história.',
  pecas_soltas = array[
    'Ele insiste por repetição para conseguir o que quer, "vencendo pelo cansaço". Não se sabe se isso tem a ver com o resto.',
    'Ele aponta contradição no que os pais combinaram. Pode ser a mesma cabeça que monta cadeia de razões, pode ser outra coisa.',
    'Os objetos viajam com ele entre a casa e a casa da avó. Não se sabe se é a organização, se é apego, ou se é a história que precisa continuar.'
  ]
 where numero = 1;

update public.caso_aposta set
  hipotese = 'Narrar e organizar são a mesma coisa nele: ele pensa montando um arranjo E povoando com gente, e os dois vêm juntos porque são um movimento só.',
  rival = 'São duas capacidades separadas que ele tem as duas, e aparecem juntas só porque as situações até agora permitiram as duas. Separadas, cada uma funcionaria sozinha.',
  o_que_derrubaria = 'Uma cena em que ele faça só um dos dois e vá bem. Se ele organizar uma coisa sem personagem nenhum, e gostar, a primeira leitura cai. Se ele contar uma história sem nenhuma estrutura por baixo, e ficar satisfeito, cai também.',
  estado = 'convivem'
 where caso_id = (select id from public.casos where numero = 1);

-- --------------------------------------------------------------- conferência
select
  (select count(*) from public.caso_cena where contexto is not null) as cenas_com_contexto,
  (select count(*) from public.caso_cena) as cenas_total,
  (select coalesce(array_length(pecas_soltas,1),0) from public.casos where numero=1) as pecas_soltas_do_1,
  (select a.estado from public.caso_aposta a join public.casos c on c.id=a.caso_id where c.numero=1) as estado_da_leitura;
