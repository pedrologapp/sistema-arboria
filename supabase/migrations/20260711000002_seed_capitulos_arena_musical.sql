-- =============================================================
-- SEED (conteúdo aprovado pelo Fundador): os 2 capítulos do formato TIMES.
--   . Arena Arboria         (Casa Lógica,  inteligência 2, F2) - 8 TEMAS
--   . O Não Tão Show        (Casa Musical, inteligência 4, F2) - 4 FRENTES
--
-- PRÉ-REQUISITO: 20260711000001 (categoria 'time'). Sem ela, os INSERTs de
-- capitulo_papeis com categoria='time' violam o CHECK de categoria.
--
-- Idempotente: só insere se ainda não existir capítulo para aquela fase.
-- inst Amadeus = 00000000-0000-0000-0000-000000000001
-- =============================================================

-- ================= ARENA ARBORIA (Lógica, inteligência 2) =================
DO $$
DECLARE v_cap uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.capitulos WHERE fase_id='7f11984c-52cd-4d8d-b41a-910886771bce') THEN
    INSERT INTO public.capitulos (fase_id, institution_id, numero, nome, frase_ancora, tema_curto, descricao_convocacao, ativo)
    VALUES ('7f11984c-52cd-4d8d-b41a-910886771bce', '00000000-0000-0000-0000-000000000001', 4,
      'Arena Arboria',
      'Ter a ideia e o comeco. Provar que funciona e o jogo.',
      'Uma competicao de projetos que se provam.',
      'Todo mundo tem uma boa ideia. Quase ninguem consegue provar que ela funciona. E ai que a Arena entra. Voce cria algo original com seu grupo, prova que funciona (nao so que e bonito), e leva pro palco: a escola vota nos projetos. A unica regra que importa: nao basta ter a ideia, voces precisam criar e provar. Ideia sem prova e so um cartaz bonito.',
      true)
    RETURNING id INTO v_cap;

    INSERT INTO public.capitulo_encontros (capitulo_id, ordem, titulo, objetivo, instrucoes) VALUES
      (v_cap, 1, 'Definir',
        'Olhar o problema inteiro antes de ter qualquer ideia e definir o que criar.',
        'Quem sai criando sem entender o problema quebra no meio. Escolham o recorte (subtema) dentro do tema, definam o que vao criar e qual problema real atacam, e comecem as 4 perguntas: o que resolve, como funciona, o que usa, onde pode quebrar.'),
      (v_cap, 2, 'Estruturar e defender',
        'Desenvolver, testar se a logica se sustenta, achar onde pode quebrar e ajustar.',
        'Desenvolvam a criacao e a prova. Fechem as 4 perguntas, procurem o ponto fraco e mostrem por que ele nao derruba o projeto. Este e o encontro de acompanhar os grupos e registrar como cada um pensa.'),
      (v_cap, 3, 'A Arena',
        'Levar pro palco a criacao e a prova de que funciona.',
        'O dia do palco. Cada grupo apresenta a criacao e a prova. A comunidade vota nos projetos, nao em pessoas. Vale a ideia mais engenhosa, a que mais testou antes de decidir, a prova mais convincente. Sem corrida contra o relogio: logica boa e cuidadosa. Aqui o mentor inicia a avaliacao ao vivo de cada projeto.');

    -- 8 TEMAS como TIMES alocaveis (categoria='time', delegacao NULL)
    INSERT INTO public.capitulo_papeis (capitulo_id, nome, categoria, descricao_curta, vagas_por_turma, ordem) VALUES
      (v_cap, 'Inteligencia Artificial', 'time', 'Voce constroi o cerebro: um assistente, uma IA que caca fake news, o cerebro de um jogo ou robo.', 8, 1),
      (v_cap, 'Games e e-sports', 'time', 'O jogo justo nao acontece por acaso. Voce prova que ele e justo: equilibrio, torneio, historia ramificada.', 8, 2),
      (v_cap, 'Redes, fama e influencia', 'time', 'Viralizar nao e sorte, e logica. Crescer um perfil, desmontar um viral, uma campanha, monetizar um publico.', 8, 3),
      (v_cap, 'Sobreviver a 2100', 'time', 'O planeta e o problema, voce desenha a solucao: cidade que aguenta o clima, salvar um ecossistema, uma colonia.', 8, 4),
      (v_cap, 'Dinheiro e imperio', 'time', 'Construa algo que ganha, cresce e nao quebra: um negocio, um investimento, uma economia, um app que cobra.', 8, 5),
      (v_cap, 'Som e tecnologia', 'time', 'Transforme uma regra em batida: musica a partir de dados, um app que gera som, a formula de um hit.', 8, 6),
      (v_cap, 'O atleta do futuro', 'time', 'A vitoria esta nos numeros: otimizar um treino, uma tecnologia que mede performance, a tatica de um time, prevenir lesoes.', 8, 7),
      (v_cap, 'Crime e misterio', 'time', 'As pistas provam quem foi: um caso resolvido por logica, um codigo secreto, reconstituir por evidencias, um sistema de seguranca.', 8, 8);
  END IF;
END $$;

-- ================= O NAO TAO SHOW (Musical, inteligencia 4) =================
DO $$
DECLARE v_cap uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.capitulos WHERE fase_id='7b1e53f5-9d92-42a9-8c6f-ab87f98d4f31') THEN
    INSERT INTO public.capitulos (fase_id, institution_id, numero, nome, frase_ancora, tema_curto, descricao_convocacao, ativo)
    VALUES ('7b1e53f5-9d92-42a9-8c6f-ab87f98d4f31', '00000000-0000-0000-0000-000000000001', 7,
      'O Nao Tao Show de Talentos',
      'Ninguem carrega a obra sozinho. Ela so existe se todo mundo entrar no mesmo tempo.',
      'A turma cria uma obra so.',
      'Aqui ninguem sobe pra exibir um talento pronto. A turma inteira cria uma obra so, e cada um e responsavel por uma peca do todo. Uma peca de 30 minutos, no palco, sobre o bullying: como alguem e deixado de fora do grupo, e o que faz o grupo abrir espaco de novo. Uma obra so da certo quando tudo entra no mesmo ritmo.',
      true)
    RETURNING id INTO v_cap;

    INSERT INTO public.capitulo_encontros (capitulo_id, ordem, titulo, objetivo, instrucoes) VALUES
      (v_cap, 1, 'Definir',
        'Formar as frentes e travar a historia.',
        'Cada um escolhe sua frente pelo que te puxa: contar, tocar, atuar ou construir. O Roteiro comeca a historia e entrega o esqueleto, porque sem historia de pe as outras frentes nao tem o que vestir. Travem os 3 movimentos: o grupo (pertencer), a ruptura (alguem e empurrado pra fora), a volta (o grupo abre espaco).'),
      (v_cap, 2, 'Construir e mostrar',
        'Cada frente desenvolve sua parte e apresenta pra turma.',
        'Cada frente desenvolve a sua parte e mostra pra turma. Aqui tudo comeca a se encaixar: roteiro, musica, cena e figurino precisam bater no mesmo compasso, e a Musica e Ritmo da o batimento que as outras seguem. Este e o encontro de acompanhar e registrar observacoes.'),
      (v_cap, 3, 'Estrear',
        'A peca de 30 minutos, no palco, pra escola.',
        'A estreia, tudo no mesmo ritmo. Ninguem carrega a obra sozinho. Aqui o mentor inicia a avaliacao ao vivo da contribuicao de cada frente.');

    -- 4 FRENTES como TIMES alocaveis (categoria='time', delegacao NULL)
    INSERT INTO public.capitulo_papeis (capitulo_id, nome, categoria, descricao_curta, vagas_por_turma, ordem) VALUES
      (v_cap, 'Roteiro', 'time', 'Voces inventam a historia: os personagens, o arco, as cenas e as falas. Garantir que a mensagem chegue sem virar sermao.', 10, 1),
      (v_cap, 'Musica e Ritmo', 'time', 'O coracao da obra. Voces dao o batimento que tudo segue: o pulso, a trilha, o tempo, as cancoes. A obra respira no seu ritmo.', 10, 2),
      (v_cap, 'Encenacao', 'time', 'Voces dao corpo a historia no palco: interpretar, marcar as cenas, ensaiar a intencao, ler o palco inteiro.', 10, 3),
      (v_cap, 'Figurino e Cena', 'time', 'Voces constroem o que os olhos veem: o figurino, o cenario, os objetos, a luz e o clima, conversando com a historia e a musica.', 10, 4);
  END IF;
END $$;
