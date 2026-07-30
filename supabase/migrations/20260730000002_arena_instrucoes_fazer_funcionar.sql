-- Atualiza os textos da Arena (capitulo + 3 encontros) pro novo formato:
-- de "apresentar" para "FAZER FUNCIONAR e DEFENDER ao vivo". Pedido do Fundador 30/07.
-- So dados; vale na hora, reversivel.

UPDATE public.capitulos SET
  descricao_convocacao = 'Todo mundo tem uma boa ideia. Quase ninguém consegue fazer ela funcionar na frente dos outros. É aí que a Arena entra. Você cria algo do zero com seu grupo e prova que funciona fazendo funcionar ao vivo, não lendo um slide. No fim, a escola vota nos melhores projetos.',
  frase_ancora = 'Ter a ideia é o começo. Fazer funcionar é o jogo.'
WHERE id = '8338b36f-5c3c-48b4-84ad-8ee4773f3e4a';

UPDATE public.capitulo_encontros SET
  objetivo = 'Apresentar a Arena, formar os grupos e começar a atacar o problema.',
  instrucoes = '1. Apresente a Arena: o que é, e a regra (criar E fazer funcionar na frente de todos, não só apresentar um slide).' || chr(10) ||
    '2. Cada aluno escolhe seu tema. Você forma os grupos (2 a 4) a partir das escolhas.' || chr(10) ||
    '3. Cada grupo define o subtema (o recorte) e o que vai criar.' || chr(10) ||
    '4. Tire dúvidas e organize os grupos.' || chr(10) ||
    '5. Comecem a olhar o problema pelas 4 perguntas: o que resolve, como funciona, o que usa, onde pode quebrar.'
WHERE capitulo_id = '8338b36f-5c3c-48b4-84ad-8ee4773f3e4a' AND ordem = 1;

UPDATE public.capitulo_encontros SET
  objetivo = 'Acompanhar a construção grupo a grupo, testar a lógica e observar como cada um pensa. É aqui, na oficina, que o mecanismo aparece.',
  instrucoes = '1. Passe grupo por grupo vendo a construção acontecer.' || chr(10) ||
    '2. Cada grupo desenvolve a criação e prepara pra fazer funcionar ao vivo, não só falar sobre.' || chr(10) ||
    '3. Testem a lógica: procurem onde pode quebrar e por que isso não derruba o projeto.' || chr(10) ||
    '4. Dê explicações e oriente quem travar.' || chr(10) ||
    '5. Observe como cada aluno chega: quem resolve desenhando, montando, calculando, coordenando. Registre o COMO, não só o resultado.'
WHERE capitulo_id = '8338b36f-5c3c-48b4-84ad-8ee4773f3e4a' AND ordem = 2;

UPDATE public.capitulo_encontros SET
  objetivo = 'O dia da Arena: cada grupo faz funcionar ao vivo e defende contra os desafios da plateia.',
  instrucoes = '1. Cada grupo faz a criação funcionar ao vivo. Não é ler um slide: o jogo se joga, a máquina se mexe, o sistema roda, o caso se resolve no quadro.' || chr(10) ||
    '2. A plateia desafia: e se mudasse isso? onde quebra? me prova. Como o grupo reage ao vivo faz parte da prova.' || chr(10) ||
    '3. A comunidade vota nos projetos, não em pessoas.' || chr(10) ||
    '4. Você inicia a avaliação ao vivo de cada projeto (as 4 perguntas + o que observar).'
WHERE capitulo_id = '8338b36f-5c3c-48b4-84ad-8ee4773f3e4a' AND ordem = 3;
