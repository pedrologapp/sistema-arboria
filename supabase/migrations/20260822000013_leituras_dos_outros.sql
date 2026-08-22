-- ============================================================
-- A ESTRUTURA DO AYRTON, REPLICADA NOS OUTROS SEIS
--
-- Pedido do Fundador. A forma é a mesma da folha que já foi para a professora:
-- venho acompanhando desde tal mês; as cenas com data, uma a uma; e ao mesmo
-- tempo aparece isto; essas duas coisas não combinam, e é por isso; então o
-- problema não parece ser X, parece ser Y; o que eu quero descobrir.
--
-- Todas as datas aqui são reais, tiradas das cenas do acervo. Nenhuma cena foi
-- inventada e nenhuma frase de criança foi reescrita.
--
-- E vale registrar o que apareceu ao escrever as seis: em quatro delas
-- (#2, #4, #5, #7) a tensão é a MESMA FORMA, com conteúdos diferentes. A criança
-- faz em casa, com sobra, uma coisa que na escola não aparece ou aparece
-- pequena. Isso não é coincidência dos casos: é o formato do instrumento
-- ficando visível. O eixo casa foi aberto agora, e ele chega cheio; o eixo
-- escola tem uma ou duas observações por criança. A tensão "sobra em casa,
-- some na escola" pode ser real e pode ser artefato de quantidade, e por
-- enquanto a gente não sabe qual.
-- ============================================================

-- ==================================================== #2 · JOSHUA · 3º ANO A
insert into public.caso_leitura (caso_id, quando, titulo, texto)
select c.id, date '2026-08-22', 'Ele sentiu e não tinha por onde mostrar',
$$Venho juntando o que a escola registrou em julho com o que a família contou em agosto, e as duas metades se explicam.

**22 de julho.** A tarefa era contar uma notícia de outra forma. A notícia era que o Brasil não tinha ganhado a copa. Ele disse que não queria contar para ninguém porque sentia "dó". A professora pediu que ele mostrasse como diria isso, e ele não soube.

**No mesmo dia**, resolveu apresentar um "jornal sério", inventou alguma coisa além da notícia, e na hora de apresentar travou de novo.

**21 de agosto**, os pais responderam juntos. Contaram que ele brinca de carro, trator e escavadeira, principalmente na areia, e que os vídeos que ele procura são quase sempre de máquina em operação: caminhoneiro, escavadeira, caminhão de lixo, e também bicho e inseto. E contaram uma coisa que a escola não tinha: em casa **ele fala muito**, aumenta as histórias, e conta por partes aleatórias, sem ordem.

**Essas duas coisas não combinam.** Em casa a fala sobra a ponto de os pais ficarem em dúvida sobre o que aconteceu de verdade. Na escola ela trava duas vezes na mesma aula. É a mesma criança, e alguma coisa entre a casa e a sala apaga uma capacidade que ele claramente tem.

E tem um detalhe do registro de julho que muda a leitura: ele **sentiu** o dó, disse o que sentia, e não soube demonstrar. Isso não é falta de vontade nem timidez. Parece falta de canal.

**O que eu quero descobrir:** o que trava o Joshua na hora de mostrar, o público ou a ordem que a tarefa pede.$$
  from public.casos c where c.numero = 2
   and not exists (select 1 from public.caso_leitura l where l.caso_id = c.id);

-- ============================================== #3 · MARIA CECÍLIA · 4º ANO A
insert into public.caso_leitura (caso_id, quando, titulo, texto)
select c.id, date '2026-08-22', 'Duas pessoas descreveram crianças diferentes',
$$Este caso tem três vozes de casa e uma da escola, e elas não contam a mesma história.

**21 de julho.** A professora registrou que ela não gostou do grupo em que ficou, mas logo depois se acomodou e conseguiu fluir. E escreveu uma leitura junto: que perto de gente com personalidade forte ela não consegue se sobressair.

**21 de agosto**, a mãe respondeu. Disse o contrário: **"explica tim tim por tim tim, não é tímida e sempre fala tudo"**. Contou que ela entra num mundo de cada vez e fica: agora é Harry Potter, antes foi Encanto. Que pergunta como as coisas são feitas, e que uma vez quis saber como o vidro é feito e por que é transparente.

**No mesmo dia**, a avó respondeu separado, e trouxe a mesma coisa por outro caminho: **"aí vó, a senhora esqueceu de colocar açúcar no suco"**. A mãe já tinha contado uma parecida: que a menina achou estranho ela usar roupa de dormir fora da hora de dormir.

**Nenhuma das duas está mentindo, e é isso que interessa.** A professora viu uma menina que some perto de personalidade forte; a mãe e a avó veem uma que fala tudo e ainda corrige o adulto. Então a diferença não está nela: está em alguma coisa que muda entre a casa e a sala.

E as duas cenas de casa, ditas por pessoas diferentes, são do mesmo tipo: ela aponta quando o adulto sai do padrão. Só que pijama à noite e açúcar no suco são regras que ela já conhecia, então essas duas não separam se ela **compara com um modelo** ou se **recita uma regra**.

**O que eu quero descobrir:** o que faz a Maria Cecília aparecer e o que faz ela sumir.$$
  from public.casos c where c.numero = 3
   and not exists (select 1 from public.caso_leitura l where l.caso_id = c.id);

-- =============================================== #4 · MARIA HELENA · 2º ANO A
insert into public.caso_leitura (caso_id, quando, titulo, texto)
select c.id, date '2026-08-22', 'A escola está vendo o resultado, a casa viu o raciocínio',
$$Venho comparando o que a escola registrou em julho com o que a mãe contou em agosto, e a diferença entre os dois é o caso inteiro.

**23 de julho, na aula "Do Seu Jeito".** A professora escreveu: **"pedi para criar uma história do nada e ela criou, algo simples, mas criou"**.

**No mesmo dia, na aula "O Convite".** Ela fez um convite para uma noite do pijama, e mencionou que fazia tempo que não se reuniam assim. A professora leu ali o valor que ela dá aos laços de amizade.

**21 de agosto**, a mãe respondeu, e contou uma cena de outra natureza. Estavam na casa da bisavó. A bisavó achou um apito e apitou enquanto a irmãzinha da Helena dormia. A menina se levantou e explicou à bisavó que naquele momento ela não podia ter feito aquilo, que **tinha que ter pensado antes de agir**, porque aquele barulho poderia acordar a irmã. A família inteira ficou olhando, e a bisavó pediu desculpas.

A mãe contou também que ela já dobra a própria roupa, e que as peças que não conseguia ela vem tentando sozinha, para mostrar que consegue do jeito que a mãe ensinou.

**Essas duas coisas não combinam.** Uma menina de sete anos que monta uma cadeia inteira de causa e consequência em voz alta, na frente da família, e que ainda escolhe o momento de dizer, não é uma menina cuja história sai "simples".

Então o que saiu simples pode não ser ela: pode ser o que a tarefa pediu. A escola está olhando o **resultado** da produção, e a cena da casa mostra o **raciocínio**, que é justamente o que a produção não pede.

**O que eu quero descobrir:** o que muda no que a Maria Helena entrega quando a tarefa pede a razão, e não o produto.$$
  from public.casos c where c.numero = 4
   and not exists (select 1 from public.caso_leitura l where l.caso_id = c.id);

update public.casos set
  titulo = 'O que muda quando a tarefa pede a razão, e não o produto?',
  pergunta = 'Na escola a produção dela sai "simples". Em casa ela monta uma cadeia de causa e consequência inteira, em voz alta.',
  tipo_tensao = 'fontes_discordam',
  o_que_nao_fecha = 'A professora registrou "algo simples, mas criou". A mãe contou que ela interrompeu a bisavó para explicar que era preciso pensar antes de agir, porque o apito podia acordar a irmã, e a família toda parou para ouvir. Quem faz a segunda coisa não produz a primeira por falta de capacidade. O que não fecha é que ninguém sabe se o "simples" é dela ou se é o que a tarefa pediu.',
  o_que_muda = 'Se for a tarefa, basta pedir a razão em vez do produto e ela aparece inteira, sem precisar mudar nada nela. Se for ela, a escola vai continuar recebendo simples e vai achar que é o teto dela, quando não é.',
  proxima_peca = 'Uma tarefa em que ela tenha que explicar POR QUE, e não fazer o quê. Não precisa ser atividade nova: é reparar no que sai quando a pergunta muda de forma.'
 where numero = 4;

-- ============================================= #5 · LUIZ MIGUEL · GRUPO IV A
insert into public.caso_leitura (caso_id, quando, titulo, texto)
select c.id, date '2026-08-22', 'Em casa ele narra. Na escola, repetiu o colega',
$$Este caso tem duas vozes de casa, mãe e pai, respondendo separado, e uma linha da escola.

**13 de agosto.** A professora registrou, em caixa alta: **"repetiu o que o colega falou. Porém, em sala de aula compreende a linguagem falada, as instruções. Sabe relatar algo que acontece no seu dia a dia."** Ela mesma já viu que ele sabe relatar. Registrou as duas coisas na mesma frase.

**21 de agosto**, a mãe respondeu. Contou como ele conta as coisas, e citou: **"mãe, naquele dia que a gente brincou de fazer cócegas, lembra?"**. Ele narra com marcador de tempo e pede confirmação, aos quatro anos. Contou também que ele sobe no banquinho sozinho para alcançar o que está no alto, sem ninguém pedir, e que aparece com coisas que ela achava que ele não conseguiria pegar. E que num dia em que ela não estava bem, ele perguntou se ela estava com dor de cabeça, e quando ela disse que não, insistiu: **"e por que você tá com essa carinha?"**.

**No mesmo dia**, o pai respondeu separado, e trouxe outra metade: que ele lembra de situações e lugares muito tempo depois, inclusive de histórias que ele nem parecia estar prestando atenção.

**Essas duas coisas não combinam.** Quem narra com marcador de tempo, insiste numa leitura de rosto e guarda história que nem estava ouvindo não é uma criança sem o que dizer. E na escola, naquele dia, ele repetiu o colega.

Repetir o colega pode ser muita coisa. Pode ser que a fala dele precise de um tempo que a roda não dá. Pode ser que ele estivesse checando se era isso mesmo que se esperava. Pode ser só um dia. Uma linha só de registro não decide nada.

**O que eu quero descobrir:** em que situação o Luiz Miguel conta na escola do jeito que ele conta em casa.$$
  from public.casos c where c.numero = 5
   and not exists (select 1 from public.caso_leitura l where l.caso_id = c.id);

update public.casos set
  titulo = 'Em que situação ele conta na escola do jeito que conta em casa?',
  pergunta = 'Em casa narra com marcador de tempo e detalhe. Na escola, no único registro que existe, repetiu o colega.',
  tipo_tensao = 'some_de_um_lado',
  o_que_nao_fecha = 'A mãe cita a fala dele inteira: "mãe, naquele dia que a gente brincou de fazer cócegas, lembra?". O pai conta que ele guarda história que nem estava atento a ouvir. E a escola registrou que ele repetiu o que o colega falou, na mesma frase em que diz que ele sabe relatar o dia a dia. Não fecha, e existe uma linha só de registro para decidir.',
  o_que_muda = 'Se for tempo, dar a vez a ele antes ou depois da roda resolve, e não custa nada. Se for a roda em si, ele precisa de outro formato. E se for só um dia, não há nada a fazer e é importante saber disso também, para não inventar um problema onde não tem.',
  proxima_peca = 'Mais um registro de fala dele na escola, em qualquer situação. Com uma linha só não dá para saber se aquilo foi o dia ou se é o padrão.'
 where numero = 5;

-- ================================================ #6 · GAEL · MATERNAL 3 A
insert into public.caso_leitura (caso_id, quando, titulo, texto)
select c.id, date '2026-08-22', 'A coisa mais interessante dele não está escrita',
$$Este é o caso mais fino de todos, e o motivo disso é o próprio caso.

**10 de julho.** O único registro escrito que existe dele: **"do seu jeito, narrou a própria brincadeira em voz alta enquanto brincava"**.

**22 de agosto.** A professora contou, em conversa, que numa idade em que as crianças ainda estão muito voltadas para si, ele é o único da turma que olha para os outros: pede a ela para ver se um colega está bem, e se preocupa quando alguém não bebe água.

**Isso é tudo.** Não existe episódio com data, não existe registro escrito, e a família ainda não respondeu o questionário.

**E o exemplo mais citado é justamente o que menos ajuda.** Beber água é norma. Uma criança que lê o estado do outro e uma criança que fiscaliza uma regra que aprendeu produzem exatamente o mesmo gesto: chamar o adulto. As duas leituras cabem inteiras no que a gente tem, e nenhuma das duas pode ser descartada.

Existem ainda duas leituras que ninguém levantou e que aos quatro anos são prováveis. A primeira: o destinatário pode ser a **professora**, e não o colega. Reportar dá atenção e aprovação, e o colega seria o pretexto. A segunda: pode ser **script de casa**, um irmão ou um adulto que checa as pessoas, imitado sem leitura nenhuma. Essa segunda o questionário dos pais resolveria de graça.

**O que eu quero descobrir:** primeiro, o que ele fez, com data. Antes disso não há caso, há intenção.$$
  from public.casos c where c.numero = 6
   and not exists (select 1 from public.caso_leitura l where l.caso_id = c.id);

-- ================================================ #7 · THALLES · GRUPO V B
insert into public.caso_leitura (caso_id, quando, titulo, texto)
select c.id, date '2026-08-22', 'Inventa no futsal, desiste na atividade',
$$Uma linha da escola, cinco respostas de casa, e elas apontam para lados opostos.

**22 de julho.** A professora registrou: **"diante do obstáculo, o aluno não demonstrou interesse em participar da atividade proposta."**

**21 de agosto**, a mãe respondeu. Contou que jogar bola é o centro de tudo, e que ele **inventa formas diferentes de jogar, como driblar os colegas no futsal**. Que ele chega em casa e conta tudo o que aconteceu no dia. Que enxaguou a louça com a ajuda dela e fez direitinho. E que num dia em que ela estava séria, ele perguntou se ela estava com raiva dele.

**Essas duas coisas não combinam.** Inventar um jeito novo de driblar É lidar com obstáculo: o obstáculo é o colega na frente. Quem faz isso não é uma criança que desiste diante de dificuldade.

Então "não demonstrou interesse" provavelmente não está descrevendo desistência. Está descrevendo alguma outra coisa que ninguém nomeou ainda, e que pode ser o formato da atividade, o momento do dia, ou simplesmente aquele dia.

E vale dizer o tamanho do que a gente tem: **uma linha**. Uma observação isolada não sustenta leitura nenhuma sobre uma criança, e o mais honesto neste caso é que ele ainda não é um caso.

**O que eu quero descobrir:** o que o Thalles faz diante de um obstáculo quando o obstáculo é do tipo que ele gosta.$$
  from public.casos c where c.numero = 7
   and not exists (select 1 from public.caso_leitura l where l.caso_id = c.id);

update public.casos set
  titulo = 'O que ele faz diante de um obstáculo do tipo que ele gosta?',
  pergunta = 'Driblar um colega é lidar com obstáculo. Na atividade, "não demonstrou interesse".',
  tipo_tensao = 'some_de_um_lado',
  o_que_nao_fecha = 'A mãe conta que ele inventa formas diferentes de driblar no futsal, e isso é exatamente lidar com obstáculo: o obstáculo é o colega na frente. A escola registrou que diante do obstáculo ele não demonstrou interesse. As duas não podem descrever a mesma disposição.',
  o_que_muda = 'Se for o formato da atividade, muda a atividade e ele aparece. Se for desistência de verdade, é outra conversa e outro tipo de apoio. Hoje a escola tem uma linha só, e uma linha vira rótulo com muita facilidade.',
  proxima_peca = 'Um segundo registro dele diante de dificuldade, em qualquer atividade. Com uma observação só não há caso, há uma frase.'
 where numero = 7;

-- --------------------------------------------------------------- conferência
select c.numero, coalesce(l.titulo,'—') as leitura,
       (c.o_que_nao_fecha is not null) as ponte,
       (c.proxima_peca is not null) as proxima
  from public.casos c
  left join public.caso_leitura l on l.caso_id = c.id
 order by c.numero;
