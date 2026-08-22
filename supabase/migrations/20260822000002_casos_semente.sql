-- ============================================================
-- OS PRIMEIROS OITO CASOS
--
-- Abertos em 22/08/2026, a partir do cruzamento entre o questionário dos pais e
-- as observações dos professores. De 338 crianças, só 22 tinham os dois lados, e
-- destas saíram sete. O oitavo é o próprio Fundador.
--
-- AS CENAS ENTRAM APONTANDO PARA O CRU. A citação vem junto por conforto de
-- leitura, mas origem_tipo e origem_id são o que vale: se a etiqueta estiver
-- errada daqui a dois anos, a frase original continua no acervo.
--
-- A etiqueta (descricao) nasce PROVISÓRIA, igual à citação. Etiquetar de verdade
-- é trabalho de leitura, não de SQL, e é o que o Fundador e o CEO vão fazer caso
-- a caso. O que não é provisório é o vínculo com a fonte.
-- ============================================================

-- ---------------------------------------------------------------- os casos
insert into public.casos (numero, aluno_id, quem, titulo, pergunta, estado)
select v.numero, p.id, null, v.titulo, v.pergunta, 'aberto'
  from (values
    (1, 'Ayrton Cassio da Cunha Vieira',
        'Ele recebe estrutura, ou produz?',
        'A hipótese de julho dizia que ele organiza quando a estrutura vem de fora. A casa sugere o contrário.'),
    (2, 'Joshua Alan da Silva Batista',
        'Em casa fala demais, na escola trava',
        'O que trava: o público, ou a ordem que a tarefa exige?'),
    (3, 'Maria Cecilia Oliveira de Lima',
        'As duas fontes discordam',
        'A mãe diz que ela fala tudo e não é tímida. A professora diz que ela não se sobressai perto de personalidade forte.'),
    (4, 'Maria Helena Nascimento de Lima',
        'A escola vê o produto, a casa vê o raciocínio',
        'Ela monta cadeia de causa e consequência em casa. Na escola a produção sai "simples".'),
    (5, 'Luiz Miguel Almeida da Silva',
        'Narra em casa, repete na escola',
        'Por que ele copia o colega, se em casa narra com marcador de tempo e detalhe?'),
    (6, 'Gael Silva Soares',
        'Cuidado com os outros, ou regra sendo vigiada?',
        'Ele verifica se os colegas estão bem. É leitura do estado do outro, ou cumprimento de norma?'),
    (7, 'Thalles Santos Nepomuceno de Lima',
        'Sem interesse na atividade, inventando no futsal',
        'O canal é o corpo, ou a atividade é que não convida?')
  ) as v(numero, nome, titulo, pergunta)
  join public.profiles p on p.full_name = v.nome
 where not exists (select 1 from public.casos c where c.numero = v.numero);

insert into public.casos (numero, aluno_id, quem, titulo, pergunta, estado)
select 0, null, 'Pedro Luciano, fundador do Arboria',
       'Por qual porta ele entra',
       'Estrutura abstrata só fecha depois de virar cena com sujeito e ganhar nome. É porta, ou é explicação boa?',
       'sondando'
 where not exists (select 1 from public.casos where numero = 0);

-- ---------------------------------- as cenas vindas do questionário dos pais
insert into public.caso_cena (caso_id, tipo, descricao, citacao, fonte, quem, quando,
                              origem_tipo, origem_id)
select c.id, 'cena',
       left(regexp_replace(r.texto, '\s+', ' ', 'g'), 110),
       r.texto, 'casa',
       coalesce(e.respondente, 'não disse'),
       e.iniciado_em::date,
       'questionario_pais_resposta', r.id
  from public.casos c
  join public.questionario_pais_envio e on e.aluno_id = c.aluno_id
  join public.questionario_pais_resposta r on r.envio_id = e.id
 where c.aluno_id is not null
   and length(coalesce(r.texto,'')) >= 40
   and not exists (select 1 from public.caso_cena x
                    where x.origem_id = r.id and x.caso_id = c.id);

-- ------------------------------------- as cenas vindas das observações da escola
insert into public.caso_cena (caso_id, tipo, descricao, citacao, fonte, quem, quando,
                              origem_tipo, origem_id)
select distinct on (c.id, o.observacao_texto)
       c.id, 'cena',
       left(regexp_replace(o.observacao_texto, '\s+', ' ', 'g'), 110),
       o.observacao_texto, 'escola', 'a professora', o.data_observacao,
       'arboria_observacoes', o.id
  from public.casos c
  join public.arboria_observacoes o on o.lovable_aluno_id = c.aluno_id
 where c.aluno_id is not null
   and length(coalesce(o.observacao_texto,'')) >= 25
   and not exists (select 1 from public.caso_cena x
                    where x.caso_id = c.id and x.citacao = o.observacao_texto);

-- ------------------------------------------------------- os mecanismos visíveis
-- Escritos à mão. É o cruzamento, e cruzar é leitura.
insert into public.caso_mecanismo (caso_id, descricao, ordem)
select c.id, m.descricao, m.ordem
  from public.casos c
  join (values
    (1, 'Cria estrutura e povoa com gente', 1),
    (1, 'Narra checando se a plateia continua junto', 2),
    (1, 'Argumenta por cadeia de razões', 3),
    (1, 'Insiste por repetição, não por outro jeito', 4),

    (2, 'Interesse fixo em máquina em operação', 1),
    (2, 'Narra sem ordem e amplia a história', 2),
    (2, 'Trava na hora de mostrar para alguém', 3),
    (2, 'Sente antes de ter canal para mostrar', 4),

    (3, 'Entra em mundos inteiros, um de cada vez', 1),
    (3, 'Repara em incoerência de adulto', 2),
    (3, 'Pergunta causa física das coisas', 3),
    (3, 'Expõe em detalhe quando o canal está aberto', 4),

    (4, 'Monta cadeia de causa e consequência em voz alta', 1),
    (4, 'Corrige adulto com argumento, não com birra', 2),
    (4, 'Refaz até conseguir sozinha, para mostrar', 3),
    (4, 'Dois canais ao mesmo tempo: desenha vendo TV', 4),

    (5, 'Narra com marcador de tempo e pede confirmação', 1),
    (5, 'Resolve alcance com objeto, sem pedir', 2),
    (5, 'Lê o rosto e insiste na leitura', 3),
    (5, 'Memória longa de fato que não estava atento', 4),

    (6, 'Narra a própria brincadeira em voz alta', 1),
    (6, 'Verifica o estado dos outros e aciona o adulto', 2),

    (7, 'Inventa variação dentro do jogo com o corpo', 1),
    (7, 'Conta o dia inteiro quando chega', 2),
    (7, 'Lê o humor da mãe e pergunta', 3)
  ) as m(numero, descricao, ordem) on m.numero = c.numero
 where not exists (select 1 from public.caso_mecanismo x
                    where x.caso_id = c.id and x.descricao = m.descricao);

-- ------------------------------------------------------------------ as apostas
insert into public.caso_aposta (caso_id, hipotese, rival, o_que_derrubaria, estado)
select c.id, a.hipotese, a.rival, a.derruba, a.estado
  from public.casos c
  join (values
    (1, 'Ele não recebe estrutura: ele PRODUZ estrutura e a povoa com personagens. O campeonato tem cronograma e auxiliar; o gibi tem gente de quem ele fala como se fossem reais.',
        'Ele organiza porque a tarefa da escola pedia organização, e em casa o gibi é só entretenimento repetido.',
        'Se, numa tarefa aberta sem nenhum pedido de organização, ele não criar estrutura nenhuma.',
        'aberta'),
    (2, 'O que trava não é a fala, é o PÚBLICO. Em casa a plateia é conhecida e não avalia.',
        'O que trava é a ORDEM que a tarefa exigia. Em casa ele conta por partes aleatórias, sem ordem, e a escola pediu justamente a sequência.',
        'Se ele destravar contando para uma pessoa só, em voz baixa, mantendo a bagunça da ordem. Aí é público, e não ordem.',
        'aberta'),
    (3, 'Ela compara o que vê com um modelo do que deveria ser, e aponta o desvio.',
        'Ela repete regra aprendida (suco leva açúcar, pijama é de dormir) sem comparar nada.',
        'Se ela nunca apontar desvio em coisa nova, só em regra que já conhecia.',
        'aberta'),
    (6, 'Ele lê o estado do outro: percebe a cara, o tom, o corpo, e responde ao que percebeu.',
        'Ele aplica uma regra que internalizou (todo mundo tem que beber água) e vigia o cumprimento. Parece cuidado e é norma.',
        'Se ele reparar numa criança quieta que não violou regra nenhuma, a rival cai. Se ele acionar do mesmo jeito diante de regra quebrada com a criança visivelmente bem, a hipótese cai.',
        'aberta')
  ) as a(numero, hipotese, rival, derruba, estado) on a.numero = c.numero
 where not exists (select 1 from public.caso_aposta x
                    where x.caso_id = c.id and x.hipotese = a.hipotese);

-- ---------------------------------------------------------------- conferência
select c.numero,
       coalesce(p.full_name, c.quem) as sujeito,
       (select count(*) from public.caso_cena x where x.caso_id=c.id) as cenas,
       (select count(*) from public.caso_mecanismo x where x.caso_id=c.id) as mecanismos,
       (select count(*) from public.caso_aposta x where x.caso_id=c.id) as apostas
  from public.casos c
  left join public.profiles p on p.id = c.aluno_id
 order by c.numero;
