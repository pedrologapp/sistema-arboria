-- ============================================================
-- A PONTE ENTRE CONHECER E ENTENDER
--
-- O Fundador leu a folha e achou o buraco: entre "o que estamos vendo" e "a
-- pergunta do caso" não havia ligação nenhuma. A pergunta caía do céu. Nas
-- palavras dele: "a gente vai sair do conhecer para o entender, mas o entender
-- necessita do por quê, entender o quê".
--
-- Estava certo, e o que falta é UMA coisa: o que NÃO FECHA.
--
-- Ninguém abre investigação porque a criança é interessante. Abre porque alguma
-- coisa no que se está vendo não encaixa. A tensão é que gera a pergunta, e não
-- o contrário. Sem ela, "quem é" e "o que perguntamos" ficam como dois cartazes
-- pendurados lado a lado, sem fio entre um e outro.
--
-- E entra uma segunda peça, que é a regra do próprio Fundador de que nem tudo
-- precisa ser investigado: O QUE MUDA SE A GENTE ENTENDER. Se ninguém consegue
-- escrever o que muda, o caso não deveria existir. É o freio que impede a
-- coleção de curiosidades sobre crianças.
--
-- ATENÇÃO À DOUTRINA: "o que não fecha" é sempre uma tensão entre FONTES,
-- CONTEXTOS ou TEMPO. Nunca uma falta na criança. "Ele não consegue X" não é
-- tensão, é laudo. "Em casa sobra e na escola some" é tensão.
-- ============================================================

alter table public.casos add column if not exists o_que_nao_fecha text;
alter table public.casos add column if not exists o_que_muda text;
alter table public.casos add column if not exists tipo_tensao text
  check (tipo_tensao is null or tipo_tensao in (
    'fontes_discordam',   -- casa diz uma coisa, escola diz outra
    'some_de_um_lado',    -- aparece num contexto e desaparece no outro
    'nao_bate_mais',      -- o que a gente achava não cabe no que chegou
    'fora_da_idade',      -- forte demais para a idade, e ninguém explicou
    'silencio',           -- deveria aparecer e não aparece
    'fonte_unica'         -- uma pessoa só viu, e é grande demais para ficar assim
  ));

comment on column public.casos.o_que_nao_fecha is
  'A tensao que fez o caso existir. SEMPRE entre fontes, contextos ou tempo. Nunca uma falta na crianca: "ele nao consegue X" e laudo, nao tensao.';
comment on column public.casos.o_que_muda is
  'O que muda na pratica se a pergunta for respondida. Se ninguem consegue escrever isto, o caso nao deveria existir.';

update public.casos c set
  o_que_nao_fecha = v.nao_fecha, tipo_tensao = v.tipo, o_que_muda = v.muda
  from (values
    (1, 'nao_bate_mais',
     'Em julho a gente achava que ele organiza quando a estrutura vem de fora. O que chegou de casa diz o contrário: ninguém pediu nada, e ele criou a sacola das revistinhas e a maletinha do Lego que viaja entre as casas. E na escola, quando a tarefa pedia um convite, ele entregou um campeonato com cronograma e auxiliar. A explicação de julho não cabe mais no que a gente tem na mão.',
     'Se ele produz estrutura em vez de receber, a escola para de dar molde e passa a dar assunto. São coisas opostas: uma poupa justamente o esforço que ele quer fazer, a outra dá matéria para ele organizar.'),

    (2, 'some_de_um_lado',
     'É a mesma criança nos dois lugares, com resultado oposto. Em casa a fala sobra: ele aumenta as histórias e conta por partes fora de ordem. Na escola travou duas vezes na mesma aula, e quando a professora pediu que mostrasse o que sentia, ele não soube. Alguma coisa entre a casa e a sala apaga uma capacidade que ele claramente tem.',
     'Se o que trava é o público, basta diminuir a plateia e ele destrava sem mais nada. Se o que trava é a ordem que a tarefa exige, a saída é aceitar a bagunça da sequência e cobrar outra coisa. As duas custam quase nada, e são diferentes: fazer a errada não ajuda e ainda ensina a ele que não consegue.'),

    (3, 'fontes_discordam',
     'A mãe diz que ela explica tim tim por tim tim e não é tímida. A professora viu que perto de personalidade forte ela não se sobressai. As duas viram a mesma criança e nenhuma está mentindo, então a diferença não está nela: está em alguma coisa que muda entre a casa e a sala.',
     'Se for o contexto, mexer na composição do grupo devolve a menina que a mãe descreve, e não é preciso mexer nela. Se não for, trocar de grupo não vai adiantar e a escola vai passar o ano mudando ela de mesa achando que está ajudando.'),

    (6, 'fonte_unica',
     'Uma coisa notável numa idade em que ela é rara, e uma pessoa só viu. Não existe registro escrito, não existe data do episódio, e a família ainda não respondeu. E o exemplo mais citado, o da água, é justamente o que menos separa: beber água é norma, então ele pode estar lendo a pessoa ou fiscalizando a regra, e os dois produzem exatamente o mesmo gesto.',
     'Se ele lê o estado do outro, a escola só precisa dar espaço, sem ensinar nada. Se ele está cumprindo regra, dar esse espaço vira cobrança e faz mal a ele. E enquanto a professora não escrever um episódio com data, isto aqui nem começou.')
  ) as v(numero, tipo, nao_fecha, muda)
 where c.numero = v.numero;

-- --------------------------------------------------------------- conferência
select numero,
       coalesce(tipo_tensao,'—') as tensao,
       (o_que_nao_fecha is not null) as tem_ponte,
       (o_que_muda is not null) as tem_freio
  from public.casos order by numero;
