-- ============================================================
-- OS DOIS MECANISMOS SEM LASTRO, E A LEITURA DO CASO
--
-- PARTE 1: as duas cenas que faltavam.
--
-- #4 "desenha vendo TV": a mãe escreveu "Desenhar e pintar vendo TV", 25
-- caracteres. A semente só trouxe respostas com 40 ou mais, e um número
-- arbitrário derrubou uma cena boa. O piso existia para cortar "sim" e "não",
-- não para cortar frase curta que diz alguma coisa. Corrigido aqui só para o
-- caso #4; a regra geral fica como dívida.
--
-- #6 "verifica o estado dos outros": é o que a professora contou de viva voz ao
-- Fundador, e nunca foi escrito em lugar nenhum. A aposta inteira do Gael
-- repousa nisso. Entra como cena SEM origem_id, e essa ausência é o aviso: é
-- relato de segunda mão, não registro. Enquanto a professora não escrever, o
-- caso #6 não tem prova.
--
-- PARTE 2: as três seções que fecham a leitura, desenhadas pelo Fundador em
-- 22/08: o que estamos vendo, a análise, e os próximos passos.
-- ============================================================

-- ------------------------------------------------ a cena perdida pelo piso
insert into public.caso_cena (caso_id, tipo, descricao, citacao, fonte, quem,
                              quando, origem_tipo, origem_id)
select c.id, 'cena', 'Desenhar e pintar vendo TV', r.texto, 'casa',
       coalesce(e.respondente, 'não disse'), e.iniciado_em::date,
       'questionario_pais_resposta', r.id
  from public.casos c
  join public.questionario_pais_envio e on e.aluno_id = c.aluno_id
  join public.questionario_pais_resposta r on r.envio_id = e.id
 where c.numero = 4 and r.texto ilike '%pintar vendo TV%'
   and not exists (select 1 from public.caso_cena x where x.origem_id = r.id);

-- ------------------------------------- a cena que existe só na fala da professora
insert into public.caso_cena (caso_id, tipo, descricao, citacao, fonte, quem, quando)
select c.id, 'cena',
       'A professora diz que ele é o único da turma que olha para os outros',
       'Numa idade em que as crianças ainda estão muito voltadas para si, ele pede para a professora ver se um colega está bem, e se preocupa quando alguém não bebe água.',
       'escola', 'a professora, em conversa com o Fundador', date '2026-08-22'
  from public.casos c
 where c.numero = 6
   and not exists (select 1 from public.caso_cena x
                    where x.caso_id = c.id and x.quem like 'a professora, em conversa%');

-- ------------------------------------------------- amarra as duas ao mecanismo
insert into public.caso_mecanismo_cena (mecanismo_id, cena_id, papel)
select m.id, ce.id, 'sustenta'
  from public.caso_mecanismo m
  join public.casos c on c.id = m.caso_id
  join public.caso_cena ce on ce.caso_id = c.id
 where (c.numero = 4 and m.descricao like 'Dois canais%' and ce.citacao ilike '%pintar vendo TV%')
    or (c.numero = 6 and m.descricao like 'Verifica o estado%' and ce.quem like 'a professora, em conversa%')
on conflict do nothing;

-- ============================================================
-- PARTE 2 · A LEITURA
-- ============================================================
alter table public.casos add column if not exists o_que_estamos_vendo text;
alter table public.casos add column if not exists analise text;
alter table public.casos add column if not exists proximos_passos text[] not null default '{}';

comment on column public.casos.o_que_estamos_vendo is
  'O que as tres coletas, juntas, mostram. Descreve o padrao, nunca a crianca.';
comment on column public.casos.analise is
  'O que isso ajuda a entender, e o que ainda nao da para afirmar. Sempre diz o que NAO se sabe.';

update public.casos c set
  o_que_estamos_vendo = v.vendo, analise = v.analise, proximos_passos = v.passos
  from (values
    (1,
     'Casa e escola mostram a mesma coisa por caminhos diferentes. Em casa, ninguém pediu nada: as revistinhas viajam numa sacola e o Lego numa maletinha que vai de casa para a casa da avó. Na escola, a tarefa era fazer um convite, e ele entregou um campeonato com cronograma e um auxiliar nomeado. Nos dois lugares ele monta um arranjo e coloca gente dentro dele.',
     'A hipótese de julho dizia que ele organiza quando a estrutura vem de fora. Isso não se sustenta mais: em casa não havia estrutura nenhuma e ele criou a dele, e na escola ele foi além do que a tarefa pedia. A leitura que resta é que ele PRODUZ estrutura e a povoa com personagens. O que ainda não dá para afirmar é se o desenho é o canal ou só o suporte: ele pode estar contando história por meio do desenho, e não desenhando. As duas coisas se parecem por fora e pedem coisas diferentes da escola.',
     array['Numa tarefa aberta, sem nenhum pedido de organizar, ver se ele cria estrutura assim mesmo',
           'Perguntar à professora o que acontece quando ele conta sem desenhar nada na mão']),
    (2,
     'Os dois lados dizem o oposto um do outro, e é isso que interessa. Em casa ele fala muito, aumenta as histórias e conta por partes fora de ordem. Na escola ele travou duas vezes na mesma aula, na hora de apresentar, e quando a professora pediu que ele mostrasse o que sentia, ele não soube.',
     'Não é a fala que trava, porque em casa ela sobra. Duas leituras concorrem: ou é o PÚBLICO, e em casa a plateia é conhecida e não avalia, ou é a ORDEM, porque a tarefa pedia sequência e é justamente a sequência que ele não usa. A frase da professora sobre o "dó" aponta para uma terceira coisa que não é nem uma nem outra: ele sentiu e não tinha por onde mostrar. Isso é falta de canal, e é diferente de timidez.',
     array['Pedir a mesma coisa em voz baixa, para uma pessoa só, deixando a bagunça da ordem em paz',
           'Oferecer um canal que não seja falar: desenhar, montar, mostrar com objeto']),
    (3,
     'As duas fontes se contradizem, e as duas parecem certas. A mãe diz que ela explica tim tim por tim tim e não é tímida. A professora viu que perto de personalidade forte ela não se sobressai. De casa vieram duas cenas da mesma coisa, ditas por pessoas diferentes: ela aponta quando o adulto sai do padrão, o pijama fora de hora e o açúcar esquecido no suco.',
     'A contradição não é sobre ela, é sobre o contexto, e é o achado do caso. O que ainda não se sabe é qual é o gatilho do que ela aponta: se ela compara com um modelo do que deveria ser, ou se só repete regra que já aprendeu. As duas cenas de casa não separam isso, porque suco com açúcar e pijama à noite são as duas regras conhecidas.',
     array['Numa atividade em grupo, colocar algo fora do padrão que não viole regra nenhuma e ver se ela aponta',
           'Reparar em quem ela está perto quando ela some, e quando ela aparece']),
    (6,
     'Existe uma coisa só, e ela não está escrita em lugar nenhum: a professora conta que ele é o único da turma que olha para os outros, pede para ela ver se um colega está bem, e se preocupa quando alguém não bebe água. O único registro escrito é de julho e diz que ele narrou a própria brincadeira em voz alta. A família ainda não respondeu.',
     'Aqui a gente ainda não está vendo, está ouvindo. E o exemplo mais citado, a água, é o que menos ajuda: beber água é norma, então ele pode estar lendo a pessoa ou pode estar fiscalizando a regra, e os dois produzem exatamente o mesmo gesto. Antes de qualquer conclusão faltam duas coisas: a professora escrever o que viu, com data, e a família responder. Um caso inteiro apoiado num relato de segunda mão não é caso, é intenção.',
     array['Pedir à professora que escreva um episódio, com data, em vez de contar de memória',
           'Ir atrás do questionário desta família em particular',
           'Reparar se ele nota uma criança quieta que não quebrou regra nenhuma'])
  ) as v(numero, vendo, analise, passos)
 where c.numero = v.numero;

-- --------------------------------------------------------------- conferência
select c.numero,
       (select count(*) from public.caso_cena x where x.caso_id=c.id) as cenas,
       (select count(*) from public.caso_mecanismo m
          join public.caso_mecanismo_cena l on l.mecanismo_id=m.id
         where m.caso_id=c.id) as ligacoes,
       (c.o_que_estamos_vendo is not null) as tem_leitura,
       coalesce(array_length(c.proximos_passos,1),0) as passos
  from public.casos c order by c.numero;
