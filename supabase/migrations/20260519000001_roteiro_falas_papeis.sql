-- =============================================
-- MIGRATION: Roteiro de Falas Cronológico por Papel
-- Adiciona coluna jsonb com as falas de cada papel
-- organizadas por fase e momento da Assembleia.
-- Idempotente: pode rodar várias vezes.
-- =============================================

-- 1) Adiciona coluna (se já existir, não falha)
ALTER TABLE public.capitulo_papeis
  ADD COLUMN IF NOT EXISTS roteiro_falas_cronologico jsonb;

-- 2) Popula falas por NOME do papel (cobre os 6 papéis por delegação numa só atualização)

-- ============================================
-- PRESIDENTE DA MESA
-- ============================================
UPDATE public.capitulo_papeis SET roteiro_falas_cronologico = $j$[
  {
    "fase_nome": "Aberturas",
    "fase_intervalo": "0:00 – 10:00",
    "momentos": [
      {
        "tempo": "0:00",
        "titulo": "Abra a sessão",
        "instrucao": "Bata duas vezes na mesa. Espere o silêncio. Em pé. Tom firme.",
        "fala": "Está aberta a sessão de Assembleia sobre a aplicação do ECA Digital. Cada delegação terá dois minutos para fala de abertura, sem direito a aparte. Iniciamos pela delegação [nome]. Tem a palavra a delegação."
      },
      {
        "tempo": "2:30",
        "titulo": "Chame a próxima delegação",
        "fala": "Agradecemos à delegação [nome]. Tem agora a palavra a delegação [próxima]."
      },
      {
        "tempo": "2:30 → 10:00",
        "titulo": "Se alguém tentar interromper",
        "fala": "Solicito ordem na sala. Não há aparte na fase de aberturas. A delegação [nome] poderá manifestar-se assim que abrirmos o debate."
      }
    ]
  },
  {
    "fase_nome": "Debate",
    "fase_intervalo": "10:00 – 22:00",
    "momentos": [
      {
        "tempo": "10:00",
        "titulo": "Abra o debate",
        "fala": "Concluídas as aberturas, abre-se o debate. Cada fala terá um minuto, e réplicas de trinta segundos. Solicito que as delegações ergam a mão para pedir a palavra. A Mesa concederá conforme a ordem de inscrição."
      },
      {
        "tempo": "10:30 → 21:30",
        "titulo": "Conceda a palavra a cada delegação",
        "fala": "Tem a palavra a delegação [nome]. Um minuto."
      },
      {
        "tempo": "durante o debate",
        "titulo": "Pesquisador-chefe pedir esclarecimento técnico",
        "fala": "Concedo a palavra para esclarecimento técnico."
      },
      {
        "tempo": "durante o debate",
        "titulo": "Pedido de réplica",
        "fala": "A delegação [nome] foi citada nominalmente. Concedo direito de réplica de trinta segundos."
      },
      {
        "tempo": "21:30",
        "titulo": "Anuncie o caucus",
        "fala": "O tempo do debate está se encerrando. Convoco caucus de oito minutos. As delegações estão liberadas para circular. Os Mediadores estão liberados para circular entre as delegações. Retornaremos em oito minutos para a votação."
      }
    ]
  },
  {
    "fase_nome": "Caucus",
    "fase_intervalo": "22:00 – 30:00",
    "momentos": [
      {
        "tempo": "30:00",
        "titulo": "Encerre o caucus",
        "instrucao": "Bata na mesa. Tom firme.",
        "fala": "Está encerrado o caucus. Solicito que todas as delegações retornem aos seus lugares. Daremos início à votação."
      }
    ]
  },
  {
    "fase_nome": "Votação",
    "fase_intervalo": "30:30 – 38:00",
    "momentos": [
      {
        "tempo": "30:30",
        "titulo": "Pergunte quais delegações têm proposta",
        "fala": "Quais delegações apresentam propostas formais para a Assembleia? Solicito que as delegações ergam a mão. Cada proposta terá um minuto para apresentação antes da votação."
      },
      {
        "tempo": "31:00 → 35:00",
        "titulo": "Conceda a palavra para apresentar proposta",
        "fala": "Tem a palavra a delegação [nome] para apresentar sua proposta."
      },
      {
        "tempo": "35:00",
        "titulo": "Inicie a votação",
        "fala": "Coloco em votação a proposta apresentada pela delegação [nome]. Delegação [primeira delegação] — voto?"
      },
      {
        "tempo": "38:00",
        "titulo": "Anuncie a vencedora",
        "fala": "A proposta apresentada pela delegação [nome] foi aprovada por [N] votos a [M]. Esta passa a ser a resolução vencedora desta Assembleia."
      }
    ]
  },
  {
    "fase_nome": "Leitura da Sala",
    "fase_intervalo": "38:30 – 44:00",
    "momentos": [
      {
        "tempo": "38:30",
        "titulo": "Convoque o Observatório",
        "fala": "Antes de encerrarmos, ouviremos a Leitura da Sala feita pelo Observatório. Os observadores acompanharam a sessão de fora, e agora apresentam o que viram."
      },
      {
        "tempo": "42:00",
        "titulo": "Chame o Secretário pra ler a resolução",
        "fala": "Agradecemos ao Observatório pela Leitura da Sala. Solicito ao Secretário que faça a leitura oficial da resolução vencedora."
      }
    ]
  },
  {
    "fase_nome": "Encerramento",
    "fase_intervalo": "44:00 – 45:00",
    "momentos": [
      {
        "tempo": "44:00",
        "titulo": "Encerre a sessão",
        "instrucao": "Em pé. Tom solene.",
        "fala": "Está encerrada a sessão de Assembleia sobre a aplicação do ECA Digital. A resolução vencedora será encaminhada à direção da escola como posição oficial desta turma. Agradeço a participação de todas as delegações, da Mesa, dos Mediadores e do Observatório. Está encerrada a sessão."
      }
    ]
  }
]$j$::jsonb
WHERE nome = 'Presidente da Mesa';

-- ============================================
-- VICE-PRESIDENTE
-- ============================================
UPDATE public.capitulo_papeis SET roteiro_falas_cronologico = $j$[
  {
    "fase_nome": "Debate",
    "fase_intervalo": "10:00 – 22:00",
    "momentos": [
      {
        "tempo": "10:30+",
        "titulo": "Passe a lista de oradores pro Presidente",
        "instrucao": "Sussurre ou empurre o caderno.",
        "fala": "Senhor Presidente, há [N] delegações inscritas. A ordem é: [nomes]."
      },
      {
        "tempo": "durante cada fala",
        "titulo": "Se o orador insistir após o tempo",
        "fala": "Tempo encerrado. Solicito ao orador que finalize a fala."
      }
    ]
  },
  {
    "fase_nome": "Caucus",
    "fase_intervalo": "22:00 – 30:00",
    "momentos": [
      {
        "tempo": "28:00",
        "titulo": "Anuncie em voz alta",
        "fala": "Atenção. Faltam dois minutos para o encerramento do caucus. Solicito que as delegações comecem a finalizar suas conversas."
      },
      {
        "tempo": "29:30",
        "titulo": "Avise o Presidente",
        "instrucao": "Sussurre.",
        "fala": "Senhor Presidente, o tempo do caucus está encerrado. Sugiro chamar as delegações de volta aos seus lugares."
      }
    ]
  }
]$j$::jsonb
WHERE nome = 'Vice-presidente';

-- ============================================
-- SECRETÁRIO
-- ============================================
UPDATE public.capitulo_papeis SET roteiro_falas_cronologico = $j$[
  {
    "fase_nome": "Debate",
    "fase_intervalo": "10:00 – 22:00",
    "momentos": [
      {
        "tempo": "se algo passar rápido",
        "titulo": "Peça repetição",
        "instrucao": "Sussurre ao Presidente.",
        "fala": "Senhor Presidente, peço que a delegação [nome] repita a proposta para registro oficial."
      }
    ]
  },
  {
    "fase_nome": "Votação",
    "fase_intervalo": "30:30 – 38:00",
    "momentos": [
      {
        "tempo": "30:30 → 35:00",
        "titulo": "Registre cada proposta formalmente",
        "instrucao": "Cada proposta deve ser registrada com a redação exata. Se necessário, peça ao Presidente.",
        "fala": "Para fins de registro, a proposta apresentada pela delegação [nome 1], em aliança com a delegação [nome 2], é a seguinte: '[texto]'. Confirmam a redação?"
      }
    ]
  },
  {
    "fase_nome": "Leitura da Resolução",
    "fase_intervalo": "42:00 – 44:00",
    "momentos": [
      {
        "tempo": "42:30",
        "titulo": "Leia a resolução vencedora",
        "instrucao": "Levante-se. Leia DEVAGAR. Tom solene. É o momento mais sério da Assembleia.",
        "fala": "A resolução vencedora, aprovada por [N] votos a [M], dispõe: 'Considerando que o ECA Digital entrou em vigor em março de 2026, e considerando [contexto principal], esta Assembleia recomenda que [ações concretas]'."
      }
    ]
  }
]$j$::jsonb
WHERE nome = 'Secretário';

-- ============================================
-- MEDIADOR
-- ============================================
UPDATE public.capitulo_papeis SET roteiro_falas_cronologico = $j$[
  {
    "fase_nome": "Caucus",
    "fase_intervalo": "22:00 – 30:00 — SUA HORA",
    "momentos": [
      {
        "tempo": "22:30",
        "titulo": "Vá à delegação mais travada",
        "instrucao": "Aproxime-se com calma. Não corra.",
        "fala": "Posso conversar com vocês um minuto? Eu vi que vocês estão batendo de frente com a delegação [nome] há vários minutos. Eu vejo um caminho."
      },
      {
        "tempo": "22:30 → 24:00",
        "titulo": "Depois de escutar a versão deles",
        "instrucao": "Não interrompa. Quando terminarem, diga:",
        "fala": "Entendi. Eu vou conversar com a outra delegação agora e ver se encontro um meio-termo. Aguardem aqui."
      },
      {
        "tempo": "24:00 → 26:00",
        "titulo": "Sugira a ponte na outra delegação",
        "fala": "Vocês duas delegações estão dizendo coisas opostas, mas estão preocupadas com a mesma coisa: [tema em comum]. Vocês definem isso de forma diferente, mas tem terreno comum. Querem que eu costure uma proposta conjunta?"
      },
      {
        "tempo": "26:00 → 30:00",
        "titulo": "Reformule fala agressiva",
        "fala": "Quando você disse que '[fala agressiva]', eu entendi sua frustração. Posso sugerir uma reformulação? '[versão menos agressiva]'. Diz a mesma coisa, mas mantém a sala aberta."
      },
      {
        "tempo": "se te tratarem mal",
        "titulo": "Não revide — saia com calma",
        "fala": "Entendi. Vou deixar vocês continuarem entre si. Se mudarem de ideia, me chamem."
      }
    ]
  }
]$j$::jsonb
WHERE nome = 'Mediador';

-- ============================================
-- OBSERVATÓRIO
-- ============================================
UPDATE public.capitulo_papeis SET roteiro_falas_cronologico = $j$[
  {
    "fase_nome": "Leitura da Sala",
    "fase_intervalo": "38:30 – 42:00 — SUA APRESENTAÇÃO",
    "momentos": [
      {
        "tempo": "38:30",
        "titulo": "Apresente a Leitura da Sala — exemplo de concessão falsa",
        "instrucao": "Use linguagem de movimento ('no início, no meio, no fim'). Cite frases exatas. NÃO ACUSE — apenas descreva.",
        "fala": "Observamos que a delegação [nome] aparentou cooperar quando concordou com [tema]. Mas a forma como o Porta-voz formulou — '[citação exata]' — esvaziou a concessão. Foi uma concessão de fachada."
      },
      {
        "tempo": "38:30",
        "titulo": "Apresente uma contradição entre debate e caucus",
        "fala": "Notamos uma diferença entre o que a delegação [nome] disse no debate e o que negociou no caucus. No debate, defendeu firmemente [posição A]. No caucus, ofereceu recuar nesse ponto em troca de apoio em outra cláusula. A posição não era tão inegociável quanto a delegação afirmou publicamente."
      },
      {
        "tempo": "38:30",
        "titulo": "Identifique alguém que foi silenciado",
        "fala": "A delegação [nome] tentou pedir a palavra três vezes durante o debate. Foi atendida apenas na terceira. As duas primeiras vezes, outras delegações começaram a falar antes que a Mesa pudesse conceder. Isso afetou diretamente a presença dela no resto da sessão."
      },
      {
        "tempo": "38:30",
        "titulo": "Identifique dominação invisível",
        "fala": "A delegação [nome] falou apenas duas vezes durante todo o debate. Mas em ambas as vezes, todas as outras delegações reagiram nas falas seguintes. Mesmo silenciosa, a delegação influenciou o andamento da sessão. Foi uma dominação por presença, não por volume."
      }
    ]
  }
]$j$::jsonb
WHERE nome = 'Observatório';

-- ============================================
-- PORTA-VOZ (vale pras 6 delegações)
-- ============================================
UPDATE public.capitulo_papeis SET roteiro_falas_cronologico = $j$[
  {
    "fase_nome": "Aberturas",
    "fase_intervalo": "0:00 – 10:00",
    "momentos": [
      {
        "tempo": "quando te chamarem",
        "titulo": "Faça o discurso de abertura",
        "instrucao": "Levante-se. Tom firme. Olhe pra Mesa nos primeiros 5 segundos, depois pra sala. Pause entre frases. Não corra.",
        "fala": "Senhores membros da Mesa, colegas delegações. [Aqui vai seu discurso de abertura preparado em casa, 2 minutos]."
      }
    ]
  },
  {
    "fase_nome": "Debate",
    "fase_intervalo": "10:00 – 22:00 — SUA HORA PRINCIPAL",
    "momentos": [
      {
        "tempo": "quando te derem palavra",
        "titulo": "Pra responder ataque",
        "fala": "A delegação [nome] afirmou que [argumento]. Nossa delegação respeita essa preocupação, mas discorda. [Sua resposta]."
      },
      {
        "tempo": "quando te derem palavra",
        "titulo": "Pra ceder ponto sem perder posição",
        "fala": "Reconhecemos a validade do argumento apresentado pela delegação [nome] nesse ponto específico. Mantemos nossa divergência apenas no método proposto."
      },
      {
        "tempo": "se te atacarem diretamente",
        "titulo": "Peça réplica",
        "fala": "Senhor Presidente, peço a palavra. Nossa delegação foi citada nominalmente na fala anterior. Solicito direito de réplica conforme as regras da sessão."
      }
    ]
  },
  {
    "fase_nome": "Votação",
    "fase_intervalo": "30:30 – 38:00",
    "momentos": [
      {
        "tempo": "31:00+",
        "titulo": "Apresente a proposta",
        "instrucao": "1 minuto. Diga o que vocês propõem e POR QUÊ. Cite aliados se houver.",
        "fala": "Nossa delegação, em conjunto com a delegação [aliada], propõe o seguinte: [texto da proposta]. Justificamos essa proposta porque [argumento principal]."
      },
      {
        "tempo": "35:00+",
        "titulo": "Vote em voz alta",
        "instrucao": "Responda firme. Combine antes com o time.",
        "fala": "A favor. (ou Contra. / Abstenção.)"
      }
    ]
  }
]$j$::jsonb
WHERE nome = 'Porta-voz';

-- ============================================
-- ESTRATEGISTA (vale pras 6 delegações)
-- ============================================
UPDATE public.capitulo_papeis SET roteiro_falas_cronologico = $j$[
  {
    "fase_nome": "Debate",
    "fase_intervalo": "10:00 – 22:00 — SUA HORA ATIVA",
    "momentos": [
      {
        "tempo": "10:00 → 22:00",
        "titulo": "Cochiche pra responder ataque",
        "instrucao": "Cochicho ao Porta-voz, baixo, no ouvido.",
        "fala": "Eles estão te encurralando. Sai pelo argumento de [tema X] — eles não vão conseguir contestar."
      },
      {
        "tempo": "10:00 → 22:00",
        "titulo": "Cochiche pra ceder um ponto",
        "fala": "Cede esse ponto agora. Não vale a pena brigar. Salva munição pro [tema importante]."
      },
      {
        "tempo": "10:00 → 22:00",
        "titulo": "Cochiche pra silenciar",
        "fala": "Não responde isso agora. Eles vão se enrolar sozinhos se você ficar quieto."
      },
      {
        "tempo": "10:00 → 22:00",
        "titulo": "Cochiche pra costurar aliança",
        "fala": "Vozes da Internet acabou de te apoiar implicitamente. Não ataca eles agora. Na próxima fala, mencione que concordamos com eles em [tema]."
      },
      {
        "tempo": "se ele estiver em apuros",
        "titulo": "Mudança de estratégia",
        "instrucao": "Cochicho de emergência.",
        "fala": "Vamos mudar a estratégia. Em vez de atacar, cede um ponto pra retomar a confiança da sala."
      }
    ]
  }
]$j$::jsonb
WHERE nome = 'Estrategista';

-- ============================================
-- PESQUISADOR-CHEFE (vale pras 6 delegações)
-- ============================================
UPDATE public.capitulo_papeis SET roteiro_falas_cronologico = $j$[
  {
    "fase_nome": "Debate",
    "fase_intervalo": "10:00 – 22:00 — SUA HORA ATIVA",
    "momentos": [
      {
        "tempo": "durante o debate",
        "titulo": "Alimente o Porta-voz com dado",
        "instrucao": "Cochicho ao Porta-voz com dado pronto.",
        "fala": "Cita o dado da Sociedade Brasileira de Pediatria: 36,9% dos brasileiros passam mais de 3 horas por dia em redes, e 43,5% deles têm diagnóstico de ansiedade."
      },
      {
        "tempo": "se outra delegação errar um dado",
        "titulo": "Peça palavra pra corrigir",
        "instrucao": "Erga a mão imediatamente. Tom calmo, sem sarcasmo.",
        "fala": "Senhor Presidente, peço a palavra para um esclarecimento técnico. A delegação [nome] afirmou que [dado errado]. Esse dado é incorreto. Segundo [fonte oficial], o número correto é [dado certo]."
      },
      {
        "tempo": "se sua delegação precisar de fato concreto",
        "titulo": "Contribua com dado próprio",
        "fala": "Quero contribuir com um dado relevante. Segundo [fonte], [dado]. Isso sustenta a posição da nossa delegação."
      }
    ]
  }
]$j$::jsonb
WHERE nome = 'Pesquisador-chefe';

-- ============================================
-- NEGOCIADOR DE BASTIDOR (vale pras 6 delegações)
-- ============================================
UPDATE public.capitulo_papeis SET roteiro_falas_cronologico = $j$[
  {
    "fase_nome": "Caucus",
    "fase_intervalo": "22:00 – 30:00 — SUA HORA",
    "momentos": [
      {
        "tempo": "22:00 → 24:00",
        "titulo": "Abra a conversa com outra delegação",
        "instrucao": "Vá até a delegação. Procure o Negociador deles. Chame ele pra um canto. Fale baixo.",
        "fala": "Reconheço que nossa delegação e a sua não vão concordar em todos os pontos. Mas em [tema], temos a mesma posição. Se apresentarmos uma proposta conjunta sobre esse tema, vocês votariam conosco?"
      },
      {
        "tempo": "24:00 → 26:00",
        "titulo": "Ofereça uma troca",
        "fala": "Tenho uma proposta. Se vocês apoiarem nossa cláusula sobre [X], recuamos na questão de [Y]. Vocês topam? Vou consultar minha delegação e fechar. Sugiro que vocês façam o mesmo."
      },
      {
        "tempo": "26:00 → 28:00",
        "titulo": "Volte ao time e confirme",
        "fala": "Fechei com [delegação]. Eles votam com a gente se a gente fizer [Y]. Aprovam?"
      },
      {
        "tempo": "se recusarem a aliança",
        "titulo": "Saia com calma",
        "fala": "Entendo. Se mudarem de ideia ainda há tempo. Vou conversar com outra delegação."
      },
      {
        "tempo": "se descobrir aliança dupla",
        "titulo": "Confronte direto",
        "fala": "Vi você conversando com outra delegação. Qual é a posição real de vocês? Antes de eu fechar, quero saber."
      }
    ]
  }
]$j$::jsonb
WHERE nome = 'Negociador de Bastidor';
