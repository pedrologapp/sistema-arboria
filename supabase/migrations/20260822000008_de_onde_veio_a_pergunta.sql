-- ============================================================
-- DE ONDE VEIO A PERGUNTA, E A PERGUNTA AFIADA DO AYRTON
--
-- O Fundador acrescentou em 22/08: o "entender" pode nascer de duas bocas.
-- Pode ser a professora dizendo o que ela gostaria de entender sobre aquela
-- criança, ou pode ser o Arboria enxergando alguma coisa no cruzamento.
--
-- Isso não é detalhe de registro, muda o destino da sondagem. Pergunta que a
-- professora fez já tem leitor garantido: ela quer a resposta. Pergunta que o
-- Arboria levantou precisa CONQUISTAR a atenção dela, e por isso o bilhete tem
-- que abrir dando alguma coisa antes de pedir.
--
-- E o Fundador reancorou a regra: a tensão tem que ser sobre COMO A CRIANÇA
-- PENSA. Não sobre o que ela faz, não sobre o que falta nela, não sobre
-- comportamento. Aplicando isso ao #1, a pergunta antiga ("ele recebe estrutura
-- ou produz?") era sobre a origem do arranjo, e não sobre o mecanismo. As duas
-- respostas possíveis levavam ao mesmo lugar e não mudavam nada na segunda-feira.
--
-- A pergunta afiada separa duas cabeças que, de fora, fazem a mesma coisa:
-- narrar e organizar produzem o mesmo campeonato com cronograma.
-- ============================================================

alter table public.casos add column if not exists pergunta_veio_de text
  check (pergunta_veio_de is null or pergunta_veio_de in ('professora','arboria','familia'));

comment on column public.casos.pergunta_veio_de is
  'Quem levantou a pergunta. Muda o bilhete: a da professora ja tem leitor, a do Arboria precisa conquistar a atencao dela.';

update public.casos set pergunta_veio_de = 'arboria' where numero in (1,2,3,4,5,7);
update public.casos set pergunta_veio_de = 'professora' where numero = 6;

-- --------------------------------------------- a pergunta afiada do Ayrton
update public.casos set
  titulo = 'Ele pensa narrando, ou pensa organizando?',
  pergunta = 'De fora as duas produzem a mesma coisa: um campeonato com cronograma e auxiliar. Por dentro pedem coisas opostas da escola.',
  o_que_nao_fecha =
    'Tudo que chegou mostra ele montando arranjos e colocando gente dentro. Em casa, sem ninguém pedir: as revistinhas numa sacola, o Lego numa maletinha que viaja entre as casas, e personagens que ele criou e sobre os quais fala como se a gente os conhecesse. Na escola, pediram um convite e ele devolveu um campeonato com cronograma e um auxiliar nomeado. O que não fecha é que as duas leituras possíveis desse mesmo gesto são opostas, e nada do que a gente tem separa uma da outra: pode ser uma cabeça que NARRA, e o arranjo é o enredo com seus personagens; ou uma cabeça que ORGANIZA, e a história é só o veículo do sistema.',
  o_que_muda =
    'Se ele pensa narrando, a escola dá a ele coisas para CONTAR, e a organização vem junto de graça. Se ele pensa organizando, a escola dá coisas para ARRUMAR, e a história é o bônus. Dar o errado dos dois não é neutro: dar enredo a quem quer sistema entedia, e dar planilha a quem quer personagem apaga.'
 where numero = 1;

update public.caso_aposta set
  hipotese = 'Ele pensa por narrativa. O arranjo é o enredo, e ele precisa de personagens para pensar: por isso o campeonato ganhou participantes e um auxiliar, e por isso ele fala dos personagens do gibi como se fossem gente conhecida.',
  rival = 'Ele pensa por sistema. Os personagens são o material mais à mão de uma criança de dez anos, mas o que ele faz de verdade é criar papéis, sequência e regra, e a história é só o veículo.',
  o_que_derrubaria = 'Dar a ele algo para organizar SEM personagem nenhum: um material, uma coleção, uma sequência de passos. Se ele resolver e gostar, a hipótese cai e é sistema. Se ele precisar inventar um personagem para conseguir, a rival cai e é narrativa.'
 where caso_id = (select id from public.casos where numero = 1);

-- --------------------------------------------- a tensão do #3, mais afiada
-- A anterior parava no contexto ("alguma coisa muda entre a casa e a sala"), e
-- contexto não é mecanismo. O que interessa é o que dispara o apontar dela.
update public.casos set
  o_que_nao_fecha =
    'As duas fontes descrevem a mesma criança e não combinam. A mãe: explica tim tim por tim tim, não é tímida. A professora: perto de personalidade forte, não se sobressai. Nenhuma das duas está mentindo. E as duas cenas que vieram de casa, ditas por pessoas diferentes, são do mesmo tipo: ela aponta quando o adulto sai do padrão, o pijama fora de hora e o açúcar esquecido no suco. O que não fecha é que essas duas cenas não separam as duas cabeças possíveis: pijama à noite e açúcar no suco são regras que ela já conhecia, então ela pode estar COMPARANDO com um modelo do que deveria ser, ou apenas RECITANDO uma regra aprendida.'
 where numero = 3;

-- --------------------------------------------------------------- conferência
select numero, coalesce(pergunta_veio_de,'—') as veio_de, left(titulo, 52) as titulo
  from public.casos order by numero;
