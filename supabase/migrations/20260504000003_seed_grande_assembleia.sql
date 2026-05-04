-- =============================================
-- SEED: Capítulo 2 — A Grande Assembleia
-- Idempotente: pode rodar várias vezes
-- Itera todas as instituições e cria o capítulo na fase Interpessoal de cada uma
-- =============================================

DO $seed$
DECLARE
  v_inst_id uuid;
  v_fase_id uuid;
  v_inteligencia_interpessoal_id smallint;
  v_capitulo_id uuid;
BEGIN
  -- Acha o id da inteligência Interpessoal
  SELECT id INTO v_inteligencia_interpessoal_id
  FROM public.inteligencias
  WHERE codigo = 'interpessoal'
  LIMIT 1;

  IF v_inteligencia_interpessoal_id IS NULL THEN
    RAISE NOTICE 'Inteligência Interpessoal não encontrada — seed cancelado';
    RETURN;
  END IF;

  -- Loop por todas as instituições
  FOR v_inst_id IN SELECT id FROM public.institutions LOOP

    -- Acha a fase Interpessoal dessa instituição (ano letivo atual)
    SELECT id INTO v_fase_id
    FROM public.fases
    WHERE institution_id = v_inst_id
      AND inteligencia_id = v_inteligencia_interpessoal_id
    ORDER BY data_inicio DESC
    LIMIT 1;

    IF v_fase_id IS NULL THEN
      RAISE NOTICE 'Inst % sem fase Interpessoal — pulando', v_inst_id;
      CONTINUE;
    END IF;

    -- ===========================================
    -- Capítulo 2 (upsert)
    -- ===========================================
    INSERT INTO public.capitulos (
      institution_id, fase_id, numero, nome,
      frase_ancora, descricao_convocacao,
      tema_curto, briefing_chamada,
      briefing_o_que_aconteceu, briefing_porque_importa,
      regra_de_ouro, fases_assembleia,
      ativo
    ) VALUES (
      v_inst_id, v_fase_id, 2, 'A Grande Assembleia',
      'A sala é simulada. O problema é real.',
      'Tudo que você precisa pra entrar na briga.',
      'ECA Digital',
      'Tem uma briga rolando — e mexe com você.',
      $json$[
        "Em 17 de março de 2026, entrou em vigor uma lei chamada ECA Digital.",
        "Sua conta de Instagram, TikTok e jogo deveria estar ligada à conta dos seus pais se você tem menos de 16 anos.",
        "Jogos não podem mais te oferecer loot box (caixinhas de prêmio aleatório).",
        "As plataformas têm que verificar sua idade antes de te deixar entrar.",
        "Mas a maior parte de vocês ainda usa essas plataformas como se nada tivesse mudado."
      ]$json$::jsonb,
      $json$[
        "Porque ninguém ainda sabe como aplicar essa lei.",
        "As empresas dizem que é impossível na prática.",
        "Os pais dizem que tá demorando demais.",
        "Os adolescentes dizem que ninguém perguntou pra eles.",
        "Os jogos dizem que tão sendo tratados como vilão.",
        "Essa briga tá rolando AGORA, no Brasil real, enquanto a gente conversa."
      ]$json$::jsonb,
      'Quem fica isolado, perde. Quem cede tudo, perde. Quem entende a diferença entre o que defende e o que negocia, ganha. O objetivo NÃO é seu grupo ganhar sozinho — é montar uma resolução que tenha 3 ou mais grupos apoiando.',
      $json$[
        {"numero": 1, "nome": "Aberturas", "duracao_min": 10, "descricao": "Cada grupo fala 2 min. Só os Porta-vozes. Sem interromper."},
        {"numero": 2, "nome": "Debate", "duracao_min": 12, "descricao": "Quem quer falar levanta a mão. Cada fala tem 1 min."},
        {"numero": 3, "nome": "Caucus", "duracao_min": 8, "descricao": "Pausa: todos levantam, negociam. Coração da Assembleia."},
        {"numero": 4, "nome": "Votação", "duracao_min": 8, "descricao": "Cada grupo tem 1 voto. Mesa e Observatório não votam."},
        {"numero": 5, "nome": "Leitura da Sala", "duracao_min": 5, "descricao": "Observatório conta o jogo invisível. Mesa lê a resolução."}
      ]$json$::jsonb,
      true
    )
    ON CONFLICT (institution_id, fase_id) DO UPDATE SET
      nome = EXCLUDED.nome,
      frase_ancora = EXCLUDED.frase_ancora,
      descricao_convocacao = EXCLUDED.descricao_convocacao,
      tema_curto = EXCLUDED.tema_curto,
      briefing_chamada = EXCLUDED.briefing_chamada,
      briefing_o_que_aconteceu = EXCLUDED.briefing_o_que_aconteceu,
      briefing_porque_importa = EXCLUDED.briefing_porque_importa,
      regra_de_ouro = EXCLUDED.regra_de_ouro,
      fases_assembleia = EXCLUDED.fases_assembleia,
      ativo = true,
      updated_at = now()
    RETURNING id INTO v_capitulo_id;

    -- Limpa delegações e papéis antigos pra reseed limpo
    DELETE FROM public.capitulo_delegacoes WHERE capitulo_id = v_capitulo_id;
    DELETE FROM public.capitulo_papeis WHERE capitulo_id = v_capitulo_id;

    -- ===========================================
    -- 6 DELEGAÇÕES
    -- ===========================================
    INSERT INTO public.capitulo_delegacoes (capitulo_id, codigo, nome, quem_sao, objetivo, nao_cedem, topam_negociar, ordem) VALUES
    (v_capitulo_id, 'big_techs', 'Big Techs',
     'Meta, Google, TikTok',
     'Querem regras mais leves pra continuar fazendo o que fazem.',
     'Verificação de idade muito rígida. Auditoria do algoritmo.',
     'Educação digital. Controle parental. Tirar loot box.',
     1),
    (v_capitulo_id, 'adolescentes_organizados', 'Adolescentes Organizados',
     'Coletivos jovens reais (Instituto Alana, conselhos juvenis)',
     'Querem ser ouvidos nas decisões e ter espaço próprio online.',
     'Espaço seguro pra adolescente vulnerável (LGBTQ+, em sofrimento).',
     'Educação digital nas escolas. Mais regras pra crianças pequenas.',
     2),
    (v_capitulo_id, 'criadores_conteudo', 'Criadores de Conteúdo',
     'Influencers, streamers, podcasters profissionais',
     'Não querem ser confundidos com gente que explora criança.',
     'Direito de ganhar dinheiro com conteúdo legítimo.',
     'Regras pra quem usa criança em vídeo. Selo de "publi".',
     3),
    (v_capitulo_id, 'industria_jogos', 'Indústria de Jogos',
     'Estúdios, plataformas (Steam, Roblox), e-sports',
     'Querem que separem jogo bom de jogo predatório — não tratem todo mundo igual.',
     'Tratar todo jogo como vilão. Restringir e-sports.',
     'Acabar com loot box. Limites de tempo de jogo. Selos de classificação.',
     4),
    (v_capitulo_id, 'vozes_internet', 'Vozes da Internet',
     'Felca, jornalistas independentes, ativistas digitais',
     'Querem que a lei pegue pesado com quem explora — mas proteja quem denuncia.',
     'Liberdade de denunciar. Jornalismo independente.',
     'Regras pesadas pra quem expõe criança. Punir plataforma que permite isso.',
     5),
    (v_capitulo_id, 'familias', 'Famílias e Conselho Tutelar',
     'Pais, mães, conselheiros tutelares',
     'Querem ferramentas reais pra acompanhar o que o filho faz online.',
     'Direito da família de saber o que o filho menor tá fazendo.',
     'Mais autonomia pra quem tem 15-16. Diferenciar criança de adolescente.',
     6);

    -- ===========================================
    -- PAPÉIS — TIME 2 (MESA DIRETORA)
    -- ===========================================
    INSERT INTO public.capitulo_papeis (
      capitulo_id, nome, categoria, delegacao, descricao_curta,
      roteiro_papel, roteiro_como_fazer, roteiro_exemplos,
      vagas_por_turma, ordem, time_label
    ) VALUES
    (v_capitulo_id, 'Presidente da Mesa', 'mesa', NULL,
     'Você é a autoridade da Assembleia. Sua palavra organiza tudo. Sem você, o debate vira bagunça.',
     'O Presidente da Mesa não defende nenhuma delegação. Sua função é garantir que a Assembleia aconteça com ordem, justiça e tempo controlado. Você é o juiz, o árbitro e o condutor do jogo.

Você abre a Assembleia. Anuncia que a sessão começou, lê o tema, explica como vai funcionar. É a sua voz que dá início a tudo.

Você concede e retira a palavra. Cada delegação só fala quando você autorizar. Você decide a ordem dos oradores (com apoio do Vice). Quando uma fala passar do tempo, você corta. Quando alguém interromper, você restabelece a ordem.

Você anuncia as fases. Quando termina a abertura, é você que diz "vamos ao debate". Quando termina o debate, é você que abre o caucus. Quando termina o caucus, é você que chama todos de volta. Cada transição passa por sua voz.

Você conduz a votação. Quando chegar o momento da votação, é você que pergunta "como vota a delegação X?" e contabiliza os votos. É você que anuncia a resolução vencedora.

Importante: sua autoridade não vem do volume da voz, mas da firmeza tranquila. Não precisa gritar. Precisa ser inquestionável. Você não vota. Você não opina. Você apenas garante que o jogo aconteça do jeito certo.',
     $json$[
       {"titulo": "Antes da Assembleia, em casa", "passos": [
         "Aprenda o passo a passo das 5 fases da Assembleia (Aberturas, Debate, Caucus, Votação, Leitura da Sala) e o tempo de cada uma. Faça um cartão de consulta.",
         "Pratique o tom de voz: firme, calmo, sem rir, sem ironizar. Você é uma autoridade.",
         "Combine com o Vice e o Secretário como vocês vão se comunicar. Vice te passa a lista de oradores. Secretário registra as decisões.",
         "Tenha em mãos as falas-padrão de cada momento (abertura, transição entre fases, votação, encerramento)."
       ]},
       {"titulo": "Durante a sessão", "passos": [
         "Sente no centro da Mesa, com o Vice à sua direita e o Secretário à sua esquerda.",
         "Comece exatamente na hora. Bata duas vezes na mesa para pedir silêncio antes de abrir.",
         "Use a fala-padrão de abertura. Mantenha tom formal.",
         "Conceda a palavra delegação por delegação na ordem combinada com o Vice.",
         "Quando o Vice sinalizar que o tempo de uma fala está acabando, dê um aviso ao orador.",
         "Se duas pessoas pedirem a palavra ao mesmo tempo, escolha uma e justifique brevemente.",
         "Anuncie cada transição de fase com clareza, dando tempo para a sala se reorganizar.",
         "Na votação, chame cada delegação pelo nome e registre o voto em voz alta."
       ]}
     ]$json$::jsonb,
     $json$[
       {"titulo": "Abrindo a sessão", "fala": "Está aberta a sessão de Assembleia sobre a aplicação do ECA Digital. Cada delegação terá dois minutos para fala de abertura, sem direito a aparte. Em seguida, abriremos o debate. Iniciamos pela delegação Plataformas Digitais. Tem a palavra a delegação."},
       {"titulo": "Pedindo silêncio e ordem", "fala": "Solicito ordem na sala. A delegação Famílias terá direito de réplica em trinta segundos. Aguardo silêncio para conceder a palavra."},
       {"titulo": "Anunciando o caucus", "fala": "Convoco caucus de oito minutos. As delegações estão liberadas para circular livremente pela sala. Os Mediadores estão liberados para circular entre as delegações. O Vice-presidente cronometrará. Retornaremos em oito minutos para a votação."},
       {"titulo": "Conduzindo a votação", "fala": "Coloco em votação a proposta apresentada pela delegação Adolescentes Organizados em conjunto com a delegação Vozes da Internet. Delegação Plataformas Digitais — voto?"},
       {"titulo": "Encerrando a sessão", "fala": "Está encerrada a sessão de Assembleia. A resolução vencedora será encaminhada à direção da escola como posição oficial desta turma sobre a aplicação do ECA Digital. Agradeço a participação de todas as delegações."}
     ]$json$::jsonb,
     1, 1, 'TIME 2 · MESA DIRETORA'),

    (v_capitulo_id, 'Vice-presidente', 'mesa', NULL,
     'Você controla o tempo e a ordem das falas. Sem você, a Assembleia atrasa, fica injusta ou desanda.',
     'O tempo numa Assembleia não é detalhe — é estrutura. Cada fase tem um tempo certo. Cada fala tem um tempo certo. Sua função é garantir que tudo aconteça no tempo certo.

Você cronometra cada fala. Aberturas têm 2 minutos. Falas de debate têm 1 minuto. Réplicas têm 30 segundos. Aos 30 segundos finais, você levanta um cartão amarelo. Quando o tempo acaba, levanta um cartão vermelho.

Você organiza a fila de oradores. Durante o debate, várias delegações vão querer falar. Você anota a ordem em que pediram a palavra. Quando o Presidente perguntar, você passa a lista pra ele.

Você cronometra o caucus. Os 8 minutos do caucus são os mais importantes da Assembleia — é quando as alianças se formam. Quando faltarem 2 minutos, anuncia em voz alta para a sala.

Importante: seja rigoroso com o tempo. Se você deixar uma delegação passar 10 segundos, todas vão querer passar — e a Assembleia desanda. Não interrompa quem está falando. Apenas sinalize. Cabe ao Presidente cortar a palavra.',
     $json$[
       {"titulo": "Antes da Assembleia, em casa", "passos": [
         "Faça dois cartões: um amarelo (escreva \"30 segundos\") e um vermelho (escreva \"tempo encerrado\").",
         "Defina onde vai cronometrar — celular, relógio digital, ou cronômetro físico. Combine com a professora.",
         "Treine cronometrando uma fala de 2 minutos em casa. Note como passa rápido.",
         "Combine com o Presidente como vocês vão se comunicar quando o tempo acabar.",
         "Tenha um caderno para anotar a fila de oradores."
       ]},
       {"titulo": "Durante a sessão", "passos": [
         "Sente à direita do Presidente. Tenha cronômetro, cartões e caderno na mesa.",
         "Quando uma delegação começar a falar, inicie o cronômetro imediatamente.",
         "Aos 30 segundos finais, levante o cartão amarelo na altura do rosto, virado pro orador.",
         "Quando o tempo acabar, levante o cartão vermelho. Se o orador não parar, fale baixo com o Presidente.",
         "Quando uma delegação levantar a mão pedindo palavra, anote no caderno.",
         "Quando o Presidente pedir a lista de oradores, leia a ordem em voz baixa pra ele.",
         "Durante o caucus, cronometre os 8 minutos com precisão. Anuncie em voz alta quando faltarem 2 minutos.",
         "Quando o caucus acabar, sinalize ao Presidente para chamar todos de volta."
       ]}
     ]$json$::jsonb,
     $json$[
       {"titulo": "Sinalizando que o tempo está acabando", "fala": "Trinta segundos restantes para o orador."},
       {"titulo": "Marcando o fim do tempo de fala", "fala": "Tempo encerrado. Solicito ao orador que finalize a fala."},
       {"titulo": "Passando a lista de oradores ao Presidente", "fala": "Senhor Presidente, há cinco delegações inscritas para falar. A ordem é: Adolescentes Organizados, Famílias, Plataformas Digitais, Vozes da Internet e Indústria de Jogos."},
       {"titulo": "Anunciando os minutos finais do caucus", "fala": "Atenção. Faltam dois minutos para o encerramento do caucus. Solicito que as delegações comecem a finalizar suas conversas."},
       {"titulo": "Avisando o Presidente sobre o fim do caucus", "fala": "Senhor Presidente, o tempo do caucus está encerrado. Sugiro chamar as delegações de volta aos seus lugares."}
     ]$json$::jsonb,
     1, 2, 'TIME 2 · MESA DIRETORA'),

    (v_capitulo_id, 'Secretário', 'mesa', NULL,
     'Você escreve a história oficial da Assembleia. O documento que vai pra direção da escola passa pela sua mão.',
     'Tudo que acontece numa Assembleia precisa ser registrado — não as conversas inteiras, mas os pontos importantes: as propostas formais, os acordos fechados, a resolução vencedora. Sua função é ser a memória oficial da sessão.

Durante a sessão, você anota. Não tudo. Foco no que importa: as propostas que cada delegação apresenta, os argumentos centrais, as alianças que se formam no caucus, o resultado da votação.

No fim da sessão, você lê a resolução vencedora em voz alta. É o momento mais solene da Assembleia. A turma ouve a resolução pela sua voz. Leia devagar, com clareza.

Depois da aula, você escreve o documento final em casa. Pega suas anotações, organiza tudo no formato oficial, e entrega à professora. Sua versão é a versão que fica.

O formato oficial de uma resolução tem três partes: Considerando ("considerando que..." — o contexto), Princípios ("a Assembleia afirma que..." — os valores), e Recomendações ("recomenda que..." — as ações concretas).',
     $json$[
       {"titulo": "Antes da Assembleia, em casa", "passos": [
         "Pegue um caderno grande. Tenha várias canetas reserva. Você vai escrever muito.",
         "Treine escrita rápida. Em vez de \"a delegação Plataformas Digitais afirmou que...\", escreva \"BT diz que...\". Crie abreviações pra cada delegação.",
         "Estude o modelo de resolução: Considerando, Princípios, Recomendações. Faça um esboço em casa pra entender como é a estrutura.",
         "Combine com o Presidente o momento em que ele vai te chamar pra ler a resolução final."
       ]},
       {"titulo": "Durante a sessão", "passos": [
         "Sente à esquerda do Presidente. Tenha caderno aberto e caneta na mão desde o início.",
         "Anote o nome de cada delegação no topo de uma página separada do caderno.",
         "Para cada fala, anote: a delegação que falou, a ideia central em uma frase curta, e qualquer proposta concreta.",
         "Marque com uma estrela ⭐ o que parecer importante na hora — propostas formais, alianças anunciadas, mudanças de posição.",
         "Durante o caucus, observe quais delegações conversam entre si. Anote.",
         "No momento da votação, registre o voto de cada delegação.",
         "Quando o Presidente te chamar para ler a resolução vencedora, leia devagar, em tom firme. É o momento mais solene da sessão."
       ]},
       {"titulo": "Depois da aula, em casa", "passos": [
         "Pegue suas anotações e escreva o documento final no formato oficial: Considerando + Princípios + Recomendações.",
         "Capriche na letra ou digite. Esse documento vai pra direção da escola.",
         "Entregue à professora."
       ]}
     ]$json$::jsonb,
     $json$[
       {"titulo": "Pedindo a uma delegação que repita uma proposta", "fala": "Senhor Presidente, peço que a delegação Famílias repita a proposta que acabou de apresentar para que possamos registrar oficialmente."},
       {"titulo": "Confirmando uma proposta para registro", "fala": "Para fins de registro, a proposta apresentada pela delegação Adolescentes Organizados, em aliança com a delegação Vozes da Internet, é a seguinte: 'Que a escola implemente educação digital crítica como disciplina regular para o Fundamental II'."},
       {"titulo": "Lendo a resolução vencedora ao final da sessão", "fala": "A resolução vencedora, aprovada por três votos a um, é a seguinte: Considerando que o ECA Digital entrou em vigor em março de 2026, e considerando a necessidade de proteção dos adolescentes brasileiros, esta Assembleia recomenda que..."},
       {"titulo": "Encerrando o registro", "fala": "Encerro o registro oficial desta Assembleia. O documento completo será entregue à direção da escola na próxima semana, contendo o nome de todas as delegações, suas posições, e a resolução final."}
     ]$json$::jsonb,
     1, 3, 'TIME 2 · MESA DIRETORA'),

    -- ===========================================
    -- PAPÉIS — TIME 2 (MEDIADORES)
    -- ===========================================
    (v_capitulo_id, 'Mediador', 'mediador', NULL,
     'Quando duas delegações batem de frente, é você que ajuda a encontrar saída. É a função mais difícil da Assembleia.',
     'Numa Assembleia, é normal que delegações briguem. Faz parte do jogo. Mas às vezes a briga trava — duas delegações se enrolam tanto numa discussão que ninguém consegue avançar. Sua função é destravar essas situações.

Importante entender desde o começo: você não defende lado nenhum. Não tem opinião própria sobre o tema. Sua única missão é fazer a conversa funcionar. Mesmo que pessoalmente concorde com uma delegação, durante a Assembleia você é neutro.

Durante o debate, você fica em silêncio observando. Identifica os pontos de travamento. Quem está batendo de frente com quem? Onde a sala parou de andar?

Durante o caucus, você circula entre as delegações. Vai onde a tensão é maior. Aproxima delegações que estão travadas. Reformula falas agressivas. Encontra pontos em comum onde só se via diferença.

Mediador bom faz três coisas em sequência: escutar, reformular, propor. Escuta a queixa de cada lado. Reformula em palavras menos agressivas pro outro entender. Propõe um caminho onde os dois cedem um pouco e ganham um pouco.

Importante: se uma delegação está feliz brigando, deixe. Briga não é problema. Travamento é problema. Você só intervém quando vê que a conversa parou de andar.',
     $json$[
       {"titulo": "Antes da Assembleia, em casa", "passos": [
         "Estude TODAS as delegações. Você precisa entender a posição de cada uma pra ajudar a costurar pontes.",
         "Identifique os possíveis pontos de conflito — quais delegações têm tudo pra brigar entre si?",
         "Pra cada conflito previsto, pense em pelo menos uma terceira saída. Não tem que ser a melhor — só tem que existir.",
         "Pratique frases de reformulação. Tenha 3 ou 4 frases dessas prontas pra usar."
       ]},
       {"titulo": "Durante o debate", "passos": [
         "Sente em uma posição que permita ver as delegações ao mesmo tempo. Não fale.",
         "Anote no caderno: qual ponto está travando? Quem está batendo de frente?",
         "Identifique o momento em que duas delegações pararam de avançar e começaram a repetir os mesmos argumentos."
       ]},
       {"titulo": "Durante o caucus", "passos": [
         "Levante imediatamente quando o caucus for anunciado.",
         "Vá até a delegação que está mais travada. Aproxime-se com calma, não corra.",
         "Diga: \"posso conversar com vocês um minuto?\". Pergunte qual o ponto que travou.",
         "Escute a versão dela do conflito. Não interrompa.",
         "Vá até a outra delegação envolvida. Faça o mesmo.",
         "Volte com uma proposta de meio-termo. \"Vocês dizem A. Eles dizem B. Que tal C?\"",
         "Se aceitarem, ajude a costurar a redação. Se não aceitarem, agradeça e siga pra próxima.",
         "Se uma delegação te tratar mal, NÃO REVIDE. Saia da conversa com calma. Pode tentar de novo depois."
       ]}
     ]$json$::jsonb,
     $json$[
       {"titulo": "Aproximando-se de uma delegação travada", "fala": "Vocês estão batendo de frente com a delegação Famílias há cinco minutos. Posso ajudar? Eu vejo um caminho. Vocês concordam com eles em uma coisa: que educação digital nas escolas precisa existir. Por que não começar a conversa por aí?"},
       {"titulo": "Reformulando uma fala agressiva", "fala": "Quando você disse que 'as Plataformas Digitais estão mentindo descaradamente', eu entendi sua frustração, mas a sala fechou. Posso sugerir uma reformulação? 'Os dados apresentados pelas Plataformas me parecem inconsistentes com os estudos disponíveis.' Diz a mesma coisa, mas mantém a sala aberta."},
       {"titulo": "Encontrando ponto em comum invisível", "fala": "Vocês duas delegações estão dizendo coisas opostas, mas estão preocupadas com a mesma coisa: o adolescente vulnerável. Vocês definem 'vulnerável' de forma diferente, mas tem terreno comum aí. Querem que eu costure uma proposta conjunta?"},
       {"titulo": "Recusando ajudar em algo que não é seu papel", "fala": "Não posso ajudar vocês a atacar outra delegação. Essa não é minha função. Minha função é ajudar a sala a chegar num acordo. Se vocês quiserem propor um meio-termo, conversamos."}
     ]$json$::jsonb,
     99, 4, 'TIME 2 · MEDIADORES'),

    -- ===========================================
    -- PAPÉIS — TIME 2 (OBSERVATÓRIO)
    -- ===========================================
    (v_capitulo_id, 'Observatório', 'observatorio', NULL,
     'Você é o detetive da Assembleia. Lê o que está sendo dito por baixo do que está sendo dito — e como a sala inteira se move enquanto isso acontece.',
     'Numa Assembleia, o que aparece nas falas é só metade da história. A outra metade está nas entrelinhas — palavras escolhidas com cuidado, concessões que parecem reais mas não são, alianças que se formam em silêncio, alguém que foi calado sem ninguém perceber. Sua função é enxergar essa metade invisível.

Você não fala durante a sessão inteira. Senta na lateral da sala e apenas observa. Mas observa de um jeito específico: você procura ao mesmo tempo o que é dito e o que é feito. As intenções por trás das palavras, e os movimentos da sala como um todo.

Cinco coisas que você procura especificamente:

▸ Concessões falsas. Quando uma delegação diz "concordamos com isso, mas..." — e o que vem depois esvazia a concessão.
▸ Argumentos técnicos que escondem interesse. Quando a interpretação de um dado favorece convenientemente quem o citou.
▸ Quem foi silenciado. Alguém que tentou falar e não conseguiu espaço. Esses silêncios contam uma história.
▸ Mudanças de aliança. A delegação X estava com a Y no debate, mas no caucus foi até a Z. Por quê?
▸ Dominação invisível. Uma delegação não fala muito, mas todo mundo se posiciona em relação a ela.

No final da Assembleia, vocês — todos os Observadores — apresentam a Leitura da Sala juntos. É o momento mais legal da sessão. Vocês contam a narrativa do jogo invisível: como a sala começou, o que aconteceu no meio, como terminou. A turma fica impressionada com o que vocês viram.',
     $json$[
       {"titulo": "Antes da Assembleia, em casa", "passos": [
         "Estude as posições de TODAS as delegações. Você só percebe contradição se souber o que esperar de cada uma.",
         "Pratique a observação assistindo entrevistas políticas. Note quando a pessoa muda de assunto pra evitar uma pergunta.",
         "Combine com os outros Observatórios da turma como vocês vão dividir o trabalho. Por exemplo: cada um foca em uma ou duas delegações; ou um foca no conteúdo das falas, outro nos movimentos físicos no caucus.",
         "Faça uma planta da sala em casa: onde cada delegação vai sentar. Vai te ajudar a marcar movimentos no dia.",
         "Crie um sistema de anotação rápida. Por exemplo: \"BT→FA, 5min\" significa \"Big Techs foram conversar com Famílias por 5 minutos\"."
       ]},
       {"titulo": "Durante a sessão", "passos": [
         "Sente na lateral da sala. Não fale em momento nenhum.",
         "Quando uma delegação fizer uma concessão, anote a frase exata e pergunte mentalmente: \"essa concessão é real ou de fachada?\"",
         "Quando uma delegação citar um dado, anote — mas anote também se a interpretação dela parece tendenciosa.",
         "Marque as mudanças de tom de cada delegação com setas: ↑ se ficou mais firme, ↓ se ficou mais conciliadora.",
         "Anote no caderno cada vez que uma delegação tentar falar e não conseguir espaço.",
         "Durante o caucus, observe a dança da sala. Anote em código: quem foi até quem, quanto tempo conversaram, em que ordem.",
         "Note se houve momentos de paralisia — quando a sala não sabia o que fazer.",
         "No fim, antes da Leitura da Sala, organize suas observações. Combine com os outros Observatórios o que cada um vai apresentar."
       ]},
       {"titulo": "Na Leitura da Sala (final)", "passos": [
         "Levante quando o Presidente chamar o Observatório. Vá pra frente da sala com os outros colegas.",
         "Apresentem em conjunto a narrativa do que viram. Cada um conta uma parte — combinada antes.",
         "Cite frases exatas que anotou. Use linguagem de movimento: \"no início\", \"depois\", \"no fim\".",
         "Não acuse ninguém. Apenas descreva o que viu. Deixe a sala tirar a própria conclusão."
       ]}
     ]$json$::jsonb,
     $json$[
       {"titulo": "Apresentando uma concessão falsa", "fala": "Observamos que a delegação Plataformas Digitais aparentou cooperar quando concordou com a fiscalização. Mas a forma como o Porta-voz formulou — 'apoiamos auditoria voluntária' — esvaziou a concessão. Voluntário, nesse contexto, é o oposto de obrigatório. Foi uma concessão de fachada."},
       {"titulo": "Apresentando uma contradição entre debate e caucus", "fala": "Notamos uma diferença entre o que a delegação Famílias disse no debate e o que negociou no caucus. No debate, defendeu firmemente a verificação parental obrigatória. No caucus, ofereceu recuar nesse ponto em troca de apoio em outra cláusula. A posição não era tão inegociável quanto a delegação afirmou publicamente."},
       {"titulo": "Identificando alguém que foi silenciado", "fala": "A delegação Plataformas Digitais tentou pedir a palavra três vezes durante o debate. Foi atendida apenas na terceira. As duas primeiras vezes, outras delegações começaram a falar antes que a Mesa pudesse conceder. Isso afetou diretamente a presença dela no resto da sessão."},
       {"titulo": "Identificando dominação invisível", "fala": "A delegação Indústria de Jogos falou apenas duas vezes durante todo o debate. Mas em ambas as vezes, todas as outras delegações reagiram nas falas seguintes. Mesmo silenciosa, a delegação influenciou o andamento da sessão. Foi uma dominação por presença, não por volume."}
     ]$json$::jsonb,
     99, 5, 'TIME 2 · OBSERVATÓRIO');

    -- ===========================================
    -- PAPÉIS — TIME 1 (DENTRO DA DELEGAÇÃO)
    -- 4 papéis × 6 delegações = 24 papéis
    -- Roteiro repetido por simplicidade (modelo flat)
    -- ===========================================

    -- Helper: insere os 4 papéis pra cada delegação
    INSERT INTO public.capitulo_papeis (
      capitulo_id, nome, categoria, delegacao, descricao_curta,
      roteiro_papel, roteiro_como_fazer, roteiro_exemplos,
      vagas_por_turma, ordem, time_label
    )
    SELECT
      v_capitulo_id, p.nome, 'delegacao', d.codigo, p.descricao_curta,
      p.roteiro_papel, p.roteiro_como_fazer, p.roteiro_exemplos,
      99, p.ordem + (d.ordem * 100), 'TIME 1 · DENTRO DA DELEGAÇÃO'
    FROM public.capitulo_delegacoes d
    CROSS JOIN (
      VALUES
        ('Porta-voz',
         'Você é a voz da delegação. É a sua fala que define como o resto da sala vai entender o que sua delegação defende.',
         'Numa Assembleia, cada delegação tem 4 alunos com funções diferentes. Você é o único que fala em público. Os outros três trabalham de dentro do grupo, em silêncio, no apoio. Toda a fala oficial da delegação sai pela sua boca.

Primeiro, você apresenta o discurso de abertura nos primeiros minutos da Assembleia. São 2 minutos pra explicar quem é sua delegação e o que ela defende. É o momento em que toda a sala forma uma primeira impressão sobre o seu lado.

Segundo, durante o debate, você responde quando a Mesa te der a palavra. Cada fala dura 1 minuto. Se outra delegação te atacar diretamente, você pode pedir réplica de 30 segundos. A Mesa decide se concede.

Terceiro, você não trabalha sozinho. Ao seu lado fica o Estrategista, que vai cochichar instruções em tempo real durante o debate. Atrás de você, o Pesquisador-chefe segura os dados. Confie neles. Você é a voz, mas a delegação é o time.

Uma coisa importante: você não está defendendo a sua opinião pessoal. Você está defendendo a posição da sua delegação, mesmo que pessoalmente discorde dela. Isso é o que advogados fazem. É o que diplomatas fazem. É o exercício central da Assembleia.',
         $j$[
           {"titulo": "Antes da Assembleia, em casa", "passos": [
             "Leia a posição da sua delegação até entender bem o que ela defende, o que ela não cede, e o que ela pode negociar.",
             "Escreva seu discurso de abertura. Tem que durar 2 minutos. Isso são cerca de 250 palavras escritas.",
             "Pratique falando em voz alta, em pé, em frente a um espelho ou pra alguém da família. Cronometre.",
             "Combine sinais com seu Estrategista. Por exemplo: ele toca seu braço quando quer que você ceda. Ele balança o papel quando quer que você ataque."
           ]},
           {"titulo": "Na hora da Assembleia, durante o debate", "passos": [
             "Ao ser chamado pela Mesa para a abertura, levante-se, vá até a frente se for o caso, fale com voz firme.",
             "Olhe para a Mesa nos primeiros 5 segundos. Depois olhe para o resto da sala enquanto fala.",
             "Não fale rápido. Pausa entre frases vale mais que pressa.",
             "Quando outra delegação te atacar, respire antes de responder. Não revide na lata.",
             "Escute o Estrategista. Se ele cochichar uma sugestão, use.",
             "Se o Pesquisador-chefe te passar um número, cite com a fonte."
           ]}
         ]$j$::jsonb,
         $j$[
           {"titulo": "No discurso de abertura", "fala": "Senhores membros da Mesa, colegas delegações. As plataformas digitais que nossa delegação representa atendem mais de três bilhões de pessoas. Não somos contra a proteção de adolescentes. Somos contra a ideia de que verificação de idade, sozinha, resolve um problema que é, na sua essência, um problema de educação digital."},
           {"titulo": "Respondendo a uma acusação direta", "fala": "A delegação Famílias afirmou que adolescentes não têm maturidade para usar redes sem supervisão. Nossa delegação respeita essa preocupação, mas discorda da generalização. Maturidade não se mede pela idade. Mede-se pela capacidade de argumentar."},
           {"titulo": "Pedindo réplica à Mesa", "fala": "Senhor Presidente, peço a palavra. Nossa delegação foi citada nominalmente na fala anterior. Solicito direito de réplica conforme as regras da sessão."},
           {"titulo": "Cedendo um ponto sem perder posição", "fala": "Reconhecemos a validade do argumento apresentado pela delegação Adolescentes Organizados nesse ponto específico. Essa é uma área onde podemos avançar juntos. Mantemos nossa divergência apenas no método proposto."}
         ]$j$::jsonb,
         1
        ),
        ('Estrategista',
         'Você é o cérebro da delegação. Não fala em público, mas todas as decisões importantes da sua delegação passam pela sua leitura da sala.',
         'O Porta-voz tem o microfone. Você tem a estratégia. Sua função é pensar enquanto os outros reagem.

Você fica sentado ao lado do Porta-voz durante toda a sessão. Não fala em plenária — sua voz é apenas para o Porta-voz ouvir, em forma de cochicho ou bilhete. Mas é você quem decide a cada momento o que ele deve fazer: atacar, ceder, recuar, mudar de assunto, ficar em silêncio.

Primeiro, escutar com atenção total. Cada delegação que fala te dá pistas: do que tem medo, do que pode ceder, com quem está alinhada, com quem está em conflito.

Segundo, antecipar. Quando uma delegação termina de falar, você já deve saber qual é a próxima jogada possível dela. E como sua delegação responde se ela fizer isso.

Terceiro, comunicar de forma rápida e clara. Você não tem tempo de explicar pro Porta-voz a estratégia inteira. Tem que dar instruções curtas: "ataca", "cede", "fica quieto", "muda o assunto".

Essa é uma função onde quem é tímido ou observador costuma se destacar. Não é função menor — é uma das mais decisivas. Quem vê primeiro, ganha primeiro.',
         $j$[
           {"titulo": "Antes da Assembleia, em casa", "passos": [
             "Leia a posição da sua delegação E a posição de TODAS as outras delegações. Você precisa antecipar o que cada uma vai falar.",
             "Pra cada delegação, anote: qual o ataque mais provável que ela vai fazer contra a gente? Qual a resposta?",
             "Combine sinais e códigos com o Porta-voz. Por exemplo: você tocando o braço dele = \"cede agora\". Você batendo o lápis na mesa = \"responde firme\".",
             "Tenha em mãos uma lista das alianças possíveis e dos inimigos naturais. Vai te servir durante o caucus."
           ]},
           {"titulo": "Durante o debate", "passos": [
             "Sente ao lado do Porta-voz. Pegue caneta e papel.",
             "Anote as falas das outras delegações de forma rápida — palavra-chave, não frase inteira.",
             "Quando uma delegação atacar a sua, escreva no papel uma sugestão de resposta em uma frase. Empurre o papel pro Porta-voz.",
             "Se for urgente, cochiche. Mas só nos momentos em que ele não esteja falando.",
             "Observe o Pesquisador-chefe. Se ele tem um dado importante, sinalize pro Porta-voz citá-lo.",
             "Se uma delegação está te dando uma abertura para aliança, cochiche pro Porta-voz não atacá-la nesse momento."
           ]}
         ]$j$::jsonb,
         $j$[
           {"titulo": "Cochicho ao Porta-voz para responder a um ataque", "fala": "Eles estão te encurralando no ponto técnico. Sai pelo lado emocional: cita o caso da família que mencionamos no preparo. Eles não vão conseguir contestar."},
           {"titulo": "Cochicho ao Porta-voz para ceder um ponto menor", "fala": "Cede esse ponto agora. Não vale a pena brigar. Salva munição para a discussão sobre algoritmo, que é onde realmente importa pra gente."},
           {"titulo": "Cochicho ao Porta-voz quando o silêncio é melhor que a resposta", "fala": "Não responde isso agora. Eles vão se enrolar sozinhos se você ficar quieto. Deixa eles falarem mais e depois rebata tudo de uma vez."},
           {"titulo": "Cochicho ao Porta-voz quando uma delegação está dando sinal de aliança", "fala": "Vozes da Internet acabou de te apoiar implicitamente. Não ataca eles agora. Pelo contrário, na próxima fala mencione que concordamos com o ponto que eles fizeram. Estamos costurando aliança pro caucus."}
         ]$j$::jsonb,
         2
        ),
        ('Pesquisador-chefe',
         'Você é o dono dos dados. Sua delegação não pode ser desmontada por uma estatística — porque você sabe todos os números, e sabe quando os outros estão errados.',
         'Numa Assembleia, argumentos sem dados caem rápido. Quando alguém defende uma posição só com opinião, qualquer outra opinião desmonta. Mas quando alguém defende com dado e fonte, ninguém consegue contra-argumentar sem ter um dado melhor. Sua função é garantir que sua delegação tenha dados melhores que todas as outras.

Antes da Assembleia, você pesquisa. Levanta números, casos reais, declarações de autoridades, comparações com outros países. Organiza tudo em pastas por tema — assim, na hora do debate, você acha o dado em segundos.

Durante o debate, você alimenta o Porta-voz. Quando ele estiver argumentando, você passa um papel ou cochicha um número que reforça o que ele está dizendo.

E quando outra delegação errar um dado, você corrige. Levanta a mão e pede a palavra à Mesa para um esclarecimento técnico. Esse momento é crítico — quando você corrige um número errado, a credibilidade da outra delegação cai.

Importante: nunca cite um dado que você não tem certeza. Se você errar uma estatística no microfone, é a SUA delegação que perde credibilidade. Tenha sempre a fonte ao lado do dado.',
         $j$[
           {"titulo": "Antes da Assembleia, em casa", "passos": [
             "Pesquise sobre a posição da sua delegação. Use jornais grandes, sites de instituições oficiais, vídeos de jornalismo confiável.",
             "Pra cada dado importante que encontrar, escreva numa folha: o número, o que ele significa, e a FONTE de onde veio (jornal, instituto, data).",
             "Organize os dados por tema. Por exemplo: aba \"Saúde mental\", aba \"Tempo de tela\", aba \"Casos famosos\".",
             "Pesquise também os dados que as outras delegações vão usar. Assim, se alguém citar um número errado ou desatualizado, você tem como corrigir."
           ]},
           {"titulo": "Durante o debate", "passos": [
             "Sente próximo do Porta-voz e do Estrategista, com seus papéis de pesquisa em ordem.",
             "Quando o Porta-voz estiver argumentando, identifique se algum dado seu reforça a fala dele. Passe um papel.",
             "Escute as falas das outras delegações com atenção a NÚMEROS. Se citarem uma estatística, anote.",
             "Se a estatística citada estiver errada (você tem o dado correto), levante a mão imediatamente.",
             "Quando a Mesa te der a palavra, peça permissão para esclarecimento técnico. Cite o dado correto e a fonte.",
             "Não use sarcasmo. Não use ironia. Apenas corrija com calma."
           ]}
         ]$j$::jsonb,
         $j$[
           {"titulo": "Pedindo a palavra para corrigir um dado errado", "fala": "Senhor Presidente, peço a palavra para um esclarecimento técnico. A delegação que acabou de falar afirmou que a Austrália reverteu a proibição de redes sociais para menores. Esse dado é incorreto. A lei australiana entrou em vigor em dezembro de 2025 e segue ativa."},
           {"titulo": "Cochichando um dado para o Porta-voz", "fala": "Cita o dado da Sociedade Brasileira de Pediatria: 36,9% dos brasileiros passam mais de 3 horas por dia em redes, e 43,5% deles têm diagnóstico de ansiedade. Isso reforça a fala que você acabou de fazer."},
           {"titulo": "Apresentando um dado durante uma fala da delegação", "fala": "Quero contribuir com um dado relevante. Segundo pesquisa do Instituto Cactus em 2025, 57% dos adolescentes brasileiros relatam ter sofrido bullying online. Esse número sustenta a posição da nossa delegação."},
           {"titulo": "Reconhecendo um dado citado por outra delegação", "fala": "Reconhecemos a validade do dado apresentado pela delegação Famílias. É um número importante. Nossa divergência não é com o número, mas com a interpretação que dele se faz."}
         ]$j$::jsonb,
         3
        ),
        ('Negociador de Bastidor',
         'Você é quem decide a votação. Não nos discursos — nas conversas em voz baixa do caucus.',
         'Numa Assembleia, existem dois jogos acontecendo ao mesmo tempo.

O jogo de cima é o debate público. Os Porta-vozes falam, atacam, se defendem. É o que todo mundo vê. É o que faz barulho.

O jogo de baixo é a negociação. Acontece em voz baixa, em pé, longe do microfone. É onde as alianças se formam. É onde as votações se decidem antes mesmo de acontecer.

Você joga o jogo de baixo.

Sua missão é uma só: fazer com que pelo menos 2 outras delegações votem na proposta da sua delegação.

Pra isso, você vai oferecer trocas. Vai dizer: "se vocês apoiarem isto, nós apoiamos aquilo". Vai costurar acordos, ouvir contrapropostas, recuar quando preciso, fechar quando der.

A maioria dos seus colegas não vai entender o que você tá fazendo. Vai parecer que você só ficou andando pela sala conversando. Mas no momento da votação, quando 3 delegações se alinharem com a sua e a resolução vencedora for a que sua delegação propôs — aí todo mundo vai entender. Você não ganha aplauso. Você ganha a votação.

Uma última coisa importante: sua palavra é seu maior recurso. Se você prometer algo a outra delegação e não cumprir, ninguém mais vai negociar com você até o fim da Assembleia. Por isso, antes de prometer, sempre confirme com seu grupo se podem cumprir.',
         $j$[
           {"titulo": "Antes da Assembleia, em casa", "passos": [
             "Olhe a lista das outras delegações. Pra cada uma, anote: \"essa delegação pode aliar com a gente em quê?\"",
             "Combine com seu grupo: o que vocês PODEM ceder? O que NÃO PODEM ceder de jeito nenhum? Anote as duas listas.",
             "Tenha essas listas em mãos no dia. Releia antes de entrar."
           ]},
           {"titulo": "Durante o debate (primeiros 22 minutos)", "passos": [
             "Não fale. Só observe. Anote no caderno: quem atacou quem, quem concordou com quem."
           ]},
           {"titulo": "Quando a Mesa anunciar o caucus", "passos": [
             "Levante da cadeira imediatamente.",
             "Escolha 1 delegação pra ir conversar primeiro (a que tem mais chance de aliar).",
             "Vá até a delegação. Procure o Negociador deles (ele também estará levantando).",
             "Chame ele pra um canto. Fale baixo.",
             "Faça uma proposta de troca: \"se vocês X, nós Y\".",
             "Se ele aceitar, confirme a aliança. Volte pra sua delegação e informe.",
             "Se ele recusar, agradeça e vá pra próxima delegação. Não discuta.",
             "Você tem 8 minutos. Tente fechar com 2 delegações no mínimo."
           ]},
           {"titulo": "Na votação", "passos": [
             "Sente ao lado do Porta-voz. Ele vai apresentar a proposta.",
             "Quando uma delegação aliada votar, faça contato visual com o Negociador deles."
           ]}
         ]$j$::jsonb,
         $j$[
           {"titulo": "Ao se aproximar de outra delegação para propor aliança", "fala": "Reconheço que nossa delegação e a sua não vão concordar em todos os pontos. Mas no ponto sobre educação digital nas escolas, temos a mesma posição. Se apresentarmos uma proposta conjunta sobre esse tema, vocês votariam conosco?"},
           {"titulo": "Ao oferecer uma troca", "fala": "Tenho uma proposta. Se vocês apoiarem nossa cláusula sobre privacidade do adolescente, recuamos na questão da verificação parental. Vocês topam? Vou consultar minha delegação e fechar. Sugiro que vocês façam o mesmo."},
           {"titulo": "Ao desconfiar de uma proposta", "fala": "Antes de eu fechar, preciso entender uma coisa. Vocês também estão conversando com outra delegação. Qual é a posição final de vocês? Não posso voltar pra minha delegação com uma aliança incerta."},
           {"titulo": "Ao recusar uma proposta sem ofender", "fala": "Não temos como ceder nesse ponto. Foi acordado com nossa delegação. Mas se vocês reformularem o ponto X, podemos retomar a conversa."}
         ]$j$::jsonb,
         4
        )
    ) AS p(nome, descricao_curta, roteiro_papel, roteiro_como_fazer, roteiro_exemplos, ordem);

    RAISE NOTICE 'Capítulo 2 seedeado para institution %', v_inst_id;
  END LOOP;
END
$seed$;
