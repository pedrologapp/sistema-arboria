-- ============================================================
-- QUEM É A CRIANÇA, ANTES DE QUALQUER COISA
--
-- O Fundador abriu o caso #1 e não entendeu nada: a página começava em
-- "6 de casa · 4 da escola" e emendava na pergunta da investigação. Ele leu e
-- disse, com razão: "não houve contexto anterior".
--
-- Estava certo, e o erro é meu de desenho. A folha abria pelo MEIO da conversa.
-- Quem entra num caso precisa primeiro saber de quem se trata: a série, a
-- turma, a idade, o que essa criança procura sozinha, e duas ou três frases que
-- desenham ela. Só depois faz sentido perguntar alguma coisa sobre ela.
--
-- O RESUMO É ESCRITO, NÃO GERADO. Ele descreve o que a criança faz, com cena
-- concreta, e nunca o que ela é. Nenhum resumo aqui usa nome de inteligência,
-- nem adjetivo de personalidade: "anda com as revistinhas numa sacola" fica;
-- "é criativo" não entra, porque fecha a investigação na primeira linha.
--
-- Os gostos vêm do que a família e a escola contaram, com as palavras delas.
-- ============================================================

alter table public.casos add column if not exists resumo text;
alter table public.casos add column if not exists gostos text[] not null default '{}';

comment on column public.casos.resumo is
  'Duas ou tres frases sobre o que a crianca FAZ, com cena concreta. Nunca o que ela e, nunca nome de inteligencia, nunca adjetivo de personalidade.';

-- ------------------------------------------------------------------ os oito
update public.casos c set resumo = v.resumo, gostos = v.gostos
  from (values
    (1,
     'Desenha revistas em quadrinhos que ele mesmo cria, e anda com elas numa sacola para todo lado. Leva também uma maletinha de Lego que vai de casa para a casa da avó. Fala dos personagens que inventou como se a gente os conhecesse, e pergunta "sabia?" depois de cada frase. Na escola toma a liderança do grupo, e organizou um campeonato de desenhos com cronograma e auxiliar.',
     array['revistas em quadrinhos que ele mesmo faz','Lego','anime','vídeos de jogo no YouTube']),

    (2,
     'Brinca de carro, trator e escavadeira, principalmente na areia. Os vídeos que ele procura são quase sempre de máquina trabalhando: caminhoneiro, escavadeira, caminhão de lixo, e também bicho e inseto. Em casa fala muito e aumenta as histórias, contando por partes, sem ordem. Na escola, travou duas vezes na mesma aula na hora de apresentar.',
     array['trator, escavadeira e caminhão','brincar na areia','bicho e inseto','viagem de caminhoneiro']),

    (3,
     'Entra num mundo de cada vez e fica: agora é Harry Potter, antes foi Encanto. Faz pulseira e cartinha no quarto, faz ballet e gosta de esporte no geral. Pergunta como as coisas são feitas, e a mãe responde mostrando vídeo. Repara em incoerência de adulto e fala: apontou o pijama usado fora da hora de dormir, e o açúcar que a avó esqueceu no suco. Na escola, a professora achou que perto de personalidade forte ela não se sobressai.',
     array['Harry Potter','ballet e esporte','fazer pulseira e cartinha','saber como as coisas são feitas']),

    (4,
     'Desenha e pinta vendo TV. Já dobra a própria roupa e vem tentando as peças que não conseguia, para mostrar que consegue do jeito que a mãe ensinou. Numa visita, interrompeu a bisavó que tinha apitado perto da irmã dormindo para explicar que era preciso pensar antes de agir, porque o barulho podia acordar o bebê. A família toda parou para ouvir e a bisavó pediu desculpas.',
     array['desenhar e pintar','fazer as coisas sozinha para mostrar']),

    (5,
     'Brinca de carrinho e anda com um Pikachu de pelúcia. Pede a praça todos os dias. Quando quer alcançar alguma coisa no alto, vai buscar o banquinho sozinho, sem pedir. Conta o que aconteceu narrando com detalhe e marcador de tempo ("mãe, naquele dia que a gente brincou de cócegas, lembra?"). Reparou que a mãe não estava bem e insistiu: "e por que você tá com essa carinha?". Na escola, repetiu o que o colega falou.',
     array['carrinho','Pikachu de pelúcia','ir para a praça','piscina','a música da copa']),

    (6,
     'A professora conta que, numa idade em que as crianças ainda estão muito voltadas para si, ele é o único da turma que olha para os outros: pede para ela ver se um colega está bem, e se preocupa quando alguém não bebe água. O único registro escrito que existe dele é de julho, e diz que ele narrou a própria brincadeira em voz alta enquanto brincava. A família ainda não respondeu o questionário.',
     array[]::text[]),

    (7,
     'Jogar bola é o centro. Inventa jeitos diferentes de jogar, como driblar os colegas no futsal. Chega em casa e conta tudo o que aconteceu no dia. Num dia em que a mãe estava séria, perguntou se ela estava com raiva dele. Na escola, diante de um obstáculo na atividade, a professora registrou que ele não demonstrou interesse em participar.',
     array['jogar bola e futsal','contar o dia inteiro quando chega']),

    (0,
     'Estatístico, fundador do Arboria. Escreveu a primeira palestra do projeto como a história de um menino fictício acompanhado do Maternal até a formatura, sem ter nenhuma teoria sobre si mesmo. Fez mestrado em estatística, concluiu todas as disciplinas e não terminou, e diz que foi a coisa mais difícil que já fez porque não conseguia entender as fórmulas. Em 21/08 entendeu bootstrap de primeira quando a explicação virou um chapéu com 55 papéis.',
     array['contar história em palestra','montar fluxo em raia de tempo','dar nome às coisas'])
  ) as v(numero, resumo, gostos)
 where c.numero = v.numero;

-- --------------------------------------------------------------- conferência
select numero,
       coalesce(array_length(gostos,1),0) as gostos,
       length(coalesce(resumo,'')) as letras_do_resumo
  from public.casos order by numero;
