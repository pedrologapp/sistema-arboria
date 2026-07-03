// Cross-IM: 64 combinações Casa x Fase do Projeto Arboria
// Gerado a partir do documento oficial de cruzamentos entre inteligências

export const MECANISMOS_CASA: Record<string, string> = {
  linguistica:
    'Você pensa em palavras o tempo todo. Antes de agir, enquanto age e depois de agir, tudo passa pela linguagem. É como se o mundo chegasse pra você já narrado, já com forma de frase.',
  logico_matematica:
    'Você olha pra qualquer coisa e já percebe padrões, relações e coisas que não batem. Não precisa procurar: seu cérebro já está organizando tudo em sistemas antes mesmo de você decidir fazer isso.',
  espacial:
    'Você enxerga soluções antes de pensar nelas. As coisas aparecem como imagens na sua cabeça, como se você montasse tudo visualmente antes de conseguir explicar com palavras.',
  musical:
    'Você percebe sons que a maioria ignora. Ritmo, melodia, estrutura sonora, tudo isso chega pra você de um jeito automático, antes de qualquer análise.',
  corporal_cinestesica:
    'Seu corpo pensa junto com sua mente. Você não planeja pra depois se mover: você se move pra descobrir. O gesto vem antes da explicação.',
  naturalista:
    'Você classifica e organiza as coisas de um jeito natural. Percebe diferenças, agrupa, separa: qualquer conjunto de coisas já te convida a colocar ordem.',
  interpessoal:
    'Você entende as pessoas de um jeito natural. Percebe o que os outros sentem, o clima de um grupo, quem está bem e quem não está, tudo isso sem precisar pensar.',
  intrapessoal:
    'Você se conhece de verdade. Sabe o que está sentindo e por que está sentindo, e usa isso pra tomar decisões melhores. O mundo passa por esse filtro interno antes de qualquer coisa.',
};

export interface CrossImCombinacao {
  casa_codigo: string;
  fase_codigo: string;
  texto_aluno: string;
  caminhos_possiveis: string[];
  fase_propria: boolean;
}

export const CROSS_IM_COMBINACOES: CrossImCombinacao[] = [
  // =============================================
  // FASE CORPORAL-CINESTÉSICA (Fase 1 de 8)
  // =============================================
  {
    casa_codigo: 'linguistica',
    fase_codigo: 'corporal_cinestesica',
    texto_aluno:
      'Você é fera com as palavras. Mas a fase Corporal-Cinestésica vai te mostrar que comunicar bem não é só sobre o que você diz: é sobre como você diz com o corpo inteiro. A postura, o gesto, a respiração. Quando a palavra encontra o corpo, o impacto do que você fala muda completamente.',
    caminhos_possiveis: [
      'Teatro e dramaturgia: dar vida às palavras no palco',
      'Oratória e apresentações: palestras que prendem a atenção de verdade',
      'Jornalismo de campo: contar histórias estando lá, de corpo presente',
      'Ensino: o professor que comunica com o corpo inteiro, não só com a voz',
      'Dublagem e locução: a voz como instrumento físico',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'logico_matematica',
    fase_codigo: 'corporal_cinestesica',
    texto_aluno:
      'Você pensa em estruturas e sistemas. E a fase Corporal-Cinestésica vai te apresentar o sistema mais sofisticado que existe: o corpo humano. Aqui você aprende a pensar com as mãos, a construir pra entender, a testar ideias no mundo real. Às vezes a melhor forma de resolver um problema é colocando a mão na massa: literalmente.',
    caminhos_possiveis: [
      'Medicina e cirurgia: raciocínio e precisão com as mãos',
      'Engenharia e prototipagem: construir pra entender como funciona',
      'Robótica e mecatrônica: fazer a lógica ganhar forma física',
      'Biomecânica: a matemática por trás do movimento humano',
      'Ciências experimentais: testar hipóteses com as próprias mãos',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'espacial',
    fase_codigo: 'corporal_cinestesica',
    texto_aluno:
      'Você imagina espaços e formas como ninguém. Mas a fase Corporal-Cinestésica vai te mostrar que não basta visualizar: é preciso sentir. O espaço que você projeta na cabeça precisa funcionar pro corpo que vai habitar ele. Quando a visão e o corpo trabalham juntos, o que você cria fica muito mais real.',
    caminhos_possiveis: [
      'Arquitetura e design de espaços: criar ambientes que funcionam de verdade',
      'Escultura e instalação artística: arte que as pessoas tocam e atravessam',
      'Dança e performance: o corpo como escultura em movimento',
      'Circo e acrobacia: domínio total do corpo no espaço',
      'Design industrial: objetos feitos pra serem usados com conforto e precisão',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'musical',
    fase_codigo: 'corporal_cinestesica',
    texto_aluno:
      'Você capta sons e ritmos que outros nem percebem. E a fase Corporal-Cinestésica vai te lembrar de algo importante: o corpo é o primeiro instrumento musical que existe. Ritmo não é só som: é movimento, pulso, presença. A música que seu corpo faz antes de qualquer instrumento é a base de tudo.',
    caminhos_possiveis: [
      'Dança e coreografia, onde música e movimento viram uma coisa só',
      'Teatro musical: cantar, atuar e se mover ao mesmo tempo',
      'Musicoterapia corporal: usar ritmo e movimento pra ajudar pessoas',
      'Percussão e instrumentos corporais: o corpo como instrumento principal',
      'Artes circenses com música: misturar performance física com sonora',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'corporal_cinestesica',
    fase_codigo: 'corporal_cinestesica',
    texto_aluno:
      'Essa fase é sobre a sua inteligência. Você já pensa pelo corpo naturalmente: se move pra entender, aprende fazendo, resolve as coisas na prática. Aqui você não vai aprender algo novo: vai entender por que faz o que faz tão bem. E quando você entende isso, começa a usar essa habilidade com ainda mais intenção.',
    caminhos_possiveis: [
      'Medicina, fisioterapia e saúde: cuidar do corpo humano',
      'Esportes de alto rendimento: levar o corpo ao limite',
      'Dança, teatro físico e artes do corpo: se expressar pelo movimento',
      'Cirurgia e procedimentos de precisão: mãos que resolvem problemas',
      'Educação física: ensinar através do movimento',
    ],
    fase_propria: true,
  },
  {
    casa_codigo: 'interpessoal',
    fase_codigo: 'corporal_cinestesica',
    texto_aluno:
      'Você entende as pessoas como poucos. E a fase Corporal-Cinestésica vai ampliar isso: as pessoas falam com o corpo antes de falar com palavras. O ombro que tensiona, a postura que se fecha, o gesto que entrega o que alguém tentou esconder. Você já percebia essas coisas, agora vai fazer isso de forma consciente.',
    caminhos_possiveis: [
      'Psicologia e psicoterapia: ler o corpo como informação sobre a pessoa',
      'Negociação e diplomacia: perceber o que o corpo do outro revela',
      'Liderança e gestão: ler equipes pelo que os corpos comunicam',
      'Coaching: o corpo como ponto de partida pra mudança',
      'Teatro e direção: trabalhar com atores usando a verdade do corpo',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'intrapessoal',
    fase_codigo: 'corporal_cinestesica',
    texto_aluno:
      'Você se conhece por dentro com uma clareza rara. E a fase Corporal-Cinestésica vai te mostrar que o corpo é a casa desse mundo interior. Seu corpo sabe das coisas antes da sua mente: aquele frio na barriga, a tensão no ombro, a inquietação nas pernas. Quando você conecta o corpo ao que sente, seu autoconhecimento vai pra outro nível.',
    caminhos_possiveis: [
      'Psicoterapia corporal: integrar corpo e mente no processo de se conhecer',
      'Meditação e práticas contemplativas: o corpo como porta pro mundo interior',
      'Filosofia prática: sabedoria que vive no corpo, não só na cabeça',
      'Artes marciais: disciplina física como caminho de autoconhecimento',
      'Coaching somático: transformação que começa pelo corpo',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'naturalista',
    fase_codigo: 'corporal_cinestesica',
    texto_aluno:
      'Você lê o ambiente natural como quem lê um livro. E a fase Corporal-Cinestésica vai te mostrar que os grandes exploradores não observam a natureza de longe: eles sentem com o corpo. Os pés no chão, a pele que percebe a mudança do clima, a respiração que muda com a altitude. Natureza se vive de corpo inteiro.',
    caminhos_possiveis: [
      'Biologia de campo e ecologia: ciência feita com o corpo presente',
      'Expedições e exploração: ambientes que exigem presença física total',
      'Medicina tradicional e etnobotânica: conhecimento que vive no corpo e na terra',
      'Permacultura e design regenerativo: trabalhar junto com a natureza',
      'Esportes de aventura: o corpo em diálogo com o ambiente natural',
    ],
    fase_propria: false,
  },

  // =============================================
  // FASE MUSICAL (Fase 2 de 8)
  // =============================================
  {
    casa_codigo: 'linguistica',
    fase_codigo: 'musical',
    texto_aluno:
      'Você domina as palavras. E a fase Musical vai te revelar algo que talvez não tenha percebido: toda escrita boa tem música. A cadência de uma frase, a pausa no lugar certo, o ritmo que prende o leitor. Quando você aprende a ouvir a música das palavras, o que você escreve ou fala ganha uma força nova.',
    caminhos_possiveis: [
      'Poesia e rap, onde palavra e música são a mesma coisa',
      'Roteiro pra audiovisual: texto que convive com som',
      'Jornalismo de rádio e podcast: a voz como instrumento',
      'Dublagem e locução artística: a musicalidade da fala',
      'Linguística: entender cientificamente como os sons das línguas funcionam',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'logico_matematica',
    fase_codigo: 'musical',
    texto_aluno:
      'Você pensa em lógica e padrões. E a fase Musical vai te mostrar que música é matemática que dá pra ouvir. Harmonia é proporção, ritmo é sequência, a estrutura de uma música é um sistema lógico bonito de verdade. Não é coincidência que muitos grandes matemáticos também amam música.',
    caminhos_possiveis: [
      'Acústica e física do som: a matemática que cria a experiência musical',
      'Teoria musical e composição algorítmica: sistemas lógicos que criam beleza',
      'Computação musical: código que produz som',
      'Engenharia de áudio: sistemas que capturam e reproduzem som',
      'Psicoacústica, como o cérebro entende padrões sonoros',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'espacial',
    fase_codigo: 'musical',
    texto_aluno:
      'Você pensa em imagens. E a fase Musical vai te mostrar que música também tem forma, cor e textura: pra quem aprende a ver. Uma partitura é um mapa, o espaço sonoro é um território, uma sinfonia é uma construção que existe no tempo. Quando você consegue ver o que ouve, mundos novos se abrem.',
    caminhos_possiveis: [
      'Direção de arte musical: criar o visual que acompanha o som',
      'Design sonoro pra cinema e games: o som que habita o espaço visual',
      'Arquitetura acústica: projetar espaços onde o som funciona perfeitamente',
      'Visualização de dados musicais: transformar o som em imagem',
      'Cenografia e design de shows: o espaço que amplifica a experiência musical',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'musical',
    fase_codigo: 'musical',
    texto_aluno:
      'Essa fase é sobre a sua inteligência. Você já ouve o que outros não ouvem, já sente padrões nos sons antes de nomeá-los. Aqui você não vai aprender música: vai entender como esse talento funciona em você. E quando você entende isso, descobre possibilidades que nem imaginava.',
    caminhos_possiveis: [
      'Composição e criação musical: seu talento no nível mais alto',
      'Performance e interpretação: a música que vive na presença e no corpo',
      'Produção e direção musical: criar as condições pra música acontecer',
      'Pesquisa em musicologia: entender a música como parte da experiência humana',
      'Musicoterapia: usar o som pra curar e transformar',
    ],
    fase_propria: true,
  },
  {
    casa_codigo: 'corporal_cinestesica',
    fase_codigo: 'musical',
    texto_aluno:
      'Você pensa pelo movimento. E a fase Musical vai te mostrar que movimento é ritmo. O corpo e a música falam a mesma língua: o ritmo que seu corpo sente antes de qualquer instrumento, a dança que surge antes da coreografia, a percussão que suas mãos fazem sem ninguém ensinar.',
    caminhos_possiveis: [
      'Dança contemporânea e clássica: movimento que responde à música com precisão',
      'Percussão e instrumentos de impacto: o corpo como instrumento principal',
      'Teatro musical: corpo e som como uma linguagem só',
      'Coreografia: criar a gramática do corpo em música',
      'Terapia pelo movimento: cura através do ritmo físico',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'interpessoal',
    fase_codigo: 'musical',
    texto_aluno:
      'Você lê as pessoas com facilidade. E a fase Musical vai te mostrar que grupos têm ritmo emocional. Quando a energia está subindo, quando o clima está pesado, quando o silêncio fala mais que qualquer palavra: você percebe tudo isso. Essa sensibilidade te dá o timing perfeito pra saber quando agir e quando esperar.',
    caminhos_possiveis: [
      'Facilitação de grupos: conduzir com o timing de um maestro',
      'Liderança: sentir o clima do time antes de qualquer dado',
      'Eventos e produção cultural: criar experiências com ritmo emocional certo',
      'Terapia em grupo: ouvir a harmonia e a tensão do grupo',
      'Diplomacia e mediação: saber quando o silêncio vale mais que a palavra',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'intrapessoal',
    fase_codigo: 'musical',
    texto_aluno:
      'Você se conhece profundamente. E a fase Musical vai te mostrar que certos estados internos têm música antes de ter palavras. Aquela melodia que aparece quando você está em paz, o ritmo acelerado quando bate a ansiedade, a composição que nasce de um sentimento que você ainda não sabe nomear. Música é uma ferramenta de autoconhecimento que pouca gente explora assim.',
    caminhos_possiveis: [
      'Composição autoral e songwriting: música que nasce do que você sente',
      'Musicoterapia: usar a música pra acessar o interior de outras pessoas',
      'Performance expressiva: a música como forma de se revelar',
      'Filosofia estética: pensar sobre o que a música mostra da experiência humana',
      'Escrita sobre música: dar palavras ao que a música diz sem elas',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'naturalista',
    fase_codigo: 'musical',
    texto_aluno:
      'Você lê a natureza como ninguém. E a fase Musical vai te mostrar que a natureza tem música de verdade. Não é modo de falar: ecossistemas têm harmonia, o canto dos pássaros tem estrutura, o som de um ambiente muda quando a saúde dele muda. Você tem os ouvidos certos pra perceber isso.',
    caminhos_possiveis: [
      'Bioacústica: o som como dado científico sobre a saúde do ambiente',
      'Documentário de natureza: capturar a música do mundo vivo',
      'Composição inspirada em padrões naturais: a natureza como partitura',
      'Monitoramento acústico: ouvir a saúde de um ecossistema',
      'Etnomusicologia: a música das culturas que vivem junto com a natureza',
    ],
    fase_propria: false,
  },

  // =============================================
  // FASE ESPACIAL (Fase 3 de 8)
  // =============================================
  {
    casa_codigo: 'linguistica',
    fase_codigo: 'espacial',
    texto_aluno:
      'Você cria mundos com palavras. E a fase Espacial vai te mostrar que mundos têm espaço, arquitetura, paisagem. Quando você aprende a narrar com dimensão: a cena que o leitor consegue habitar, o ambiente que comunica antes de qualquer diálogo; sua escrita ganha uma profundidade nova.',
    caminhos_possiveis: [
      'Literatura e worldbuilding: criar mundos que o leitor consegue habitar',
      'Roteiro pra cinema e games: o espaço como linguagem da história',
      'Design de experiências narrativas: contar histórias através de ambientes',
      'Arquitetura narrativa e exposições: espaços que contam histórias',
      'Game design: mundos que o jogador explora e vive',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'logico_matematica',
    fase_codigo: 'espacial',
    texto_aluno:
      'Você vê padrões e relações em tudo. E a fase Espacial vai te mostrar uma dimensão dos números que a álgebra sozinha não revela: formas, espaços, geometria. A intuição espacial é uma das ferramentas mais poderosas da matemática avançada. Quando lógica e visão espacial se juntam, o que você consegue resolver muda de nível.',
    caminhos_possiveis: [
      'Matemática pura: topologia, geometria, análise espacial',
      'Física teórica e cosmologia: o espaço como objeto de estudo',
      'Engenharia e projetos estruturais: cálculo que ganha forma no espaço',
      'Computação gráfica: espaço digital criado com lógica',
      'Cartografia e geoprocessamento: mapear o mundo com precisão',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'espacial',
    fase_codigo: 'espacial',
    texto_aluno:
      'Essa fase é sobre a sua inteligência. Você já enxerga soluções antes de descrever, já gira objetos na cabeça, já percebe relações espaciais que outros precisam calcular. Aqui você vai entender a sofisticação do que já faz naturalmente. E quando você entende isso, o que é possível pra você se multiplica.',
    caminhos_possiveis: [
      'Arquitetura e urbanismo: criar espaços que as pessoas habitam',
      'Design industrial e de produto: objetos que funcionam no mundo real',
      'Artes visuais e escultura: criar formas que existem no espaço',
      'Cinema e direção: a composição visual como linguagem',
      'Cirurgia e medicina de precisão: operar dentro do espaço do corpo humano',
    ],
    fase_propria: true,
  },
  {
    casa_codigo: 'musical',
    fase_codigo: 'espacial',
    texto_aluno:
      'Você ouve música com uma profundidade especial. E a fase Espacial vai te mostrar como ver o som. Partitura como mapa, espaço acústico como território, composição como uma construção no tempo. Quando você aprende a visualizar o que ouve, a forma como cria e entende música se transforma.',
    caminhos_possiveis: [
      'Composição pra mídia: música que existe no espaço visual do cinema e games',
      'Design de som e acústica: projetar como o som vive em espaços específicos',
      'Notação musical e visualização: criar sistemas visuais pra representar o som',
      'Produção musical: o estúdio como espaço tridimensional de som',
      'Direção musical de espetáculos: o som que habita o espaço do palco',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'corporal_cinestesica',
    fase_codigo: 'espacial',
    texto_aluno:
      'Você pensa pelo corpo e pelo movimento. E a fase Espacial vai te mostrar como ler o espaço antes de agir nele. É tipo o atleta que já sabe onde todo mundo vai estar, o dançarino que mapeia o espaço antes de entrar. Quando o corpo e a visão espacial trabalham juntos, o resultado é impressionante.',
    caminhos_possiveis: [
      'Esportes coletivos de alto nível: leitura espacial em tempo real',
      'Dança e coreografia: movimento que ocupa o espaço com intenção',
      'Circo e acrobacia: domínio do corpo no espaço tridimensional',
      'Navegação e orientação: ler espaços complexos e se guiar neles',
      'Artes marciais: a geometria do combate e do movimento',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'interpessoal',
    fase_codigo: 'espacial',
    texto_aluno:
      'Você entende as pessoas naturalmente. E a fase Espacial vai te mostrar que o espaço fala sobre as relações. Quem senta onde, como as pessoas se posicionam umas perto das outras, o que a disposição física revela sobre o clima do grupo. Quando você lê o espaço junto com as pessoas, sua percepção fica ainda mais afiada.',
    caminhos_possiveis: [
      'Design de experiência e facilitação: criar ambientes que favorecem conexão',
      'Urbanismo social: projetar cidades que constroem comunidade',
      'Diplomacia e protocolo: o espaço como linguagem de relação',
      'Gestão de eventos: criar ambientes que facilitam o tipo certo de interação',
      'Terapia e consultório: o espaço como parte do cuidado',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'intrapessoal',
    fase_codigo: 'espacial',
    texto_aluno:
      'Você conhece seu mundo interior com profundidade. E a fase Espacial vai te dar uma ferramenta nova: dar forma visual ao que está dentro de você. Mapas mentais que revelam como você pensa, diagramas que mostram o que gera cada emoção. Quando o autoconhecimento ganha imagem, ele fica mais claro e mais útil.',
    caminhos_possiveis: [
      'Arte terapia: criar imagens do interior como caminho de descoberta',
      'Design de jornadas e experiências pessoais: mapear o caminho interior',
      'Infografia e visualização: dar forma visual a ideias e sentimentos',
      'Filosofia visual e pensamento gráfico: pensar através de imagens',
      'Criação autoral e arte conceitual: obra que vem de dentro com forma visual',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'naturalista',
    fase_codigo: 'espacial',
    texto_aluno:
      'Você lê a natureza com uma atenção que poucos têm. E a fase Espacial vai te mostrar que a paisagem é um espaço com gramática própria. Como o relevo determina o ecossistema, como as árvores se distribuem seguindo padrões, como a forma de uma costa conta a história do lugar. Natureza é arquitetura viva.',
    caminhos_possiveis: [
      'Ecologia da paisagem: o ecossistema como sistema espacial',
      'Geografia física e geologia: ler a estrutura do planeta nas formas do terreno',
      'Design biofílico e arquitetura verde: natureza e espaço construído juntos',
      'Cartografia ambiental: mapear ecossistemas com precisão',
      'Ilustração científica: tornar visível o que a ciência descobre',
    ],
    fase_propria: false,
  },

  // =============================================
  // FASE NATURALISTA (Fase 4 de 8)
  // =============================================
  {
    casa_codigo: 'linguistica',
    fase_codigo: 'naturalista',
    texto_aluno:
      'Você domina as palavras e seus significados. E a fase Naturalista vai te mostrar que a linguagem funciona como um ecossistema: palavras nascem, evoluem, se adaptam e às vezes desaparecem. Quando você olha pra linguagem com esse olhar de naturalista, muda como você entende e como você usa as palavras.',
    caminhos_possiveis: [
      'Jornalismo ambiental e de ciência: dar voz ao que a natureza comunica',
      'Literatura de natureza: escrever sobre o mundo vivo',
      'Etnolinguística: estudar as línguas dos povos que vivem junto com a natureza',
      'Divulgação científica: explicar a natureza de um jeito que qualquer pessoa entende',
      'Escrita de campo e diário naturalista: registrar o que o mundo vivo mostra',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'logico_matematica',
    fase_codigo: 'naturalista',
    texto_aluno:
      'Você pensa em sistemas e modelos. E a fase Naturalista vai te mostrar que os sistemas naturais são os mais complexos e fascinantes que existem. Modelar populações, entender como ecossistemas se equilibram, usar equações pra descrever o comportamento da vida. A matemática mais interessante pode estar viva.',
    caminhos_possiveis: [
      'Bioinformática: modelar a vida com dados e algoritmos',
      'Ecologia quantitativa: matemática aplicada a ecossistemas',
      'Biofísica: a física dos sistemas vivos',
      'Estatística ecológica: análise de dados ambientais',
      'Modelagem climática: usar computação pra entender a Terra',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'espacial',
    fase_codigo: 'naturalista',
    texto_aluno:
      'Você enxerga formas e espaços com facilidade. E a fase Naturalista vai te mostrar que a natureza é a maior geradora de formas que existe. O vale que um rio escavou, a distribuição das copas das árvores competindo por luz, a forma de uma costa moldada pelas correntes. Quando você vê a natureza com olhos de espacial, descobre arte em todo lugar.',
    caminhos_possiveis: [
      'Ecologia da paisagem e biogeografia: o espaço como dado sobre a vida',
      'Design biofílico: arquitetura inspirada na natureza',
      'Ilustração científica: dar forma visual às descobertas da ciência',
      'Geologia e geomorfologia: ler a história da Terra nas formas do terreno',
      'Conservação e planejamento ambiental: cuidar do espaço natural',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'musical',
    fase_codigo: 'naturalista',
    texto_aluno:
      'Você percebe sons com uma sensibilidade especial. E a fase Naturalista vai te mostrar que a natureza tem música de verdade. O canto dos pássaros tem estrutura, as baleias compõem, ecossistemas saudáveis soam diferente dos doentes. Você tem os ouvidos certos pra captar tudo isso.',
    caminhos_possiveis: [
      'Bioacústica e ecologia sonora: o som como dado sobre a saúde dos ecossistemas',
      'Composição inspirada em sistemas naturais: a natureza como partitura',
      'Documentário de natureza com trilha sonora original',
      'Monitoramento acústico: ouvir a saúde do ambiente pelo som',
      'Etnomusicologia: a música das culturas que vivem em contato com a natureza',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'corporal_cinestesica',
    fase_codigo: 'naturalista',
    texto_aluno:
      'Você pensa pelo corpo e pela ação. E a fase Naturalista vai te mostrar como ler o ambiente através do corpo. Os pés que sentem o tipo de solo, a respiração que muda com a altitude, a pele que percebe a mudança do tempo antes da mente. É o tipo de conhecimento que exploradores e rastreadores desenvolvem.',
    caminhos_possiveis: [
      'Biologia de campo e zoologia: ciência feita com o corpo no ambiente',
      'Medicina tradicional e etnobotânica: conhecimento que vive no corpo e na terra',
      'Expedições científicas: ambientes extremos que exigem presença total',
      'Permacultura e agricultura ecológica: trabalhar junto com o sistema natural',
      'Esportes de aventura: escalada, trail, o corpo na natureza',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'interpessoal',
    fase_codigo: 'naturalista',
    texto_aluno:
      'Você lê as dinâmicas entre pessoas naturalmente. E a fase Naturalista vai te mostrar que grupos humanos funcionam como ecossistemas. Quem é a pessoa-chave, onde estão as tensões, o que mantém o equilíbrio, o que indica que o grupo está em crise. Quando você olha pra comunidades com esse olhar, sua leitura fica muito mais completa.',
    caminhos_possiveis: [
      'Antropologia e etnografia: estudar culturas como ecossistemas humanos',
      'Desenvolvimento comunitário: fortalecer comunidades como sistemas vivos',
      'Políticas públicas socioambientais, onde o humano e o natural se encontram',
      'Liderança em organizações complexas: ler dinâmicas de grupo como sistemas',
      'Resolução de conflitos socioambientais: mediar entre comunidade e natureza',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'intrapessoal',
    fase_codigo: 'naturalista',
    texto_aluno:
      'Você conhece seus ciclos internos com clareza. E a fase Naturalista vai te mostrar que esses ciclos são tão reais quanto os da natureza. Seu mundo interior tem estações, equilíbrios que se mantêm e outros que se rompem quando algo muda. Quando você olha pra dentro com olhar de naturalista, o autoconhecimento ganha outra profundidade.',
    caminhos_possiveis: [
      'Psicologia ecológica e ecoterapia: cura através da conexão com a natureza',
      'Filosofia da natureza: pensar sobre a vida usando a natureza como espelho',
      'Escrita de natureza como prática de autoconhecimento',
      'Permacultura como filosofia de vida: viver em harmonia com ciclos naturais',
      'Retiros e imersão na natureza: usar o ambiente natural pra se conhecer melhor',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'naturalista',
    fase_codigo: 'naturalista',
    texto_aluno:
      'Essa fase é sobre a sua inteligência. Você já classifica antes de perceber, já nota o que não pertence, já enxerga padrões onde outros veem bagunça. Aqui você vai entender a sofisticação do que já faz naturalmente. E quando você entende, a forma como usa esse talento muda completamente.',
    caminhos_possiveis: [
      'Biologia, ecologia e ciências da vida: seu talento aplicado ao máximo',
      'Conservação e gestão ambiental: proteger o que você entende como ninguém',
      'Pesquisa científica de campo: descobrir coisas pela observação direta',
      'Educação ambiental: ensinar outros a enxergar o que você já vê',
      'Gestão de áreas naturais: cuidar dos sistemas que você conhece',
    ],
    fase_propria: true,
  },

  // =============================================
  // FASE LINGUÍSTICA (Fase 5 de 8)
  // =============================================
  {
    casa_codigo: 'linguistica',
    fase_codigo: 'linguistica',
    texto_aluno:
      'Essa fase é sobre a sua inteligência. Você já pensa em palavras antes de tudo, já sente a diferença entre uma frase viva e uma morta, já percebe o ritmo por trás do conteúdo. Aqui você não vai aprender a usar palavras: vai entender o quanto esse talento molda tudo que você pensa e faz. E isso muda o jogo.',
    caminhos_possiveis: [
      'Literatura e escrita autoral: criar mundos com palavras',
      'Jornalismo e comunicação: informar e transformar com linguagem',
      'Direito e advocacia: a linguagem como instrumento de justiça',
      'Filosofia: a linguagem como ferramenta de pensamento',
      'Tradução e interpretação: navegar entre idiomas e culturas',
    ],
    fase_propria: true,
  },
  {
    casa_codigo: 'logico_matematica',
    fase_codigo: 'linguistica',
    texto_aluno:
      'Você pensa com lógica e precisão. E a fase Linguística vai te mostrar que a clareza da explicação é tão importante quanto a solidez da ideia. De nada adianta entender algo profundamente se você não consegue fazer o outro entender também. Quando lógica e linguagem se juntam, você faz a ponte entre o conhecimento e as pessoas.',
    caminhos_possiveis: [
      'Divulgação científica: explicar coisas difíceis de um jeito acessível',
      'Filosofia analítica: rigor lógico com clareza de expressão',
      'Programação e linguagens de código: criar formas de se comunicar com máquinas',
      'Ensino de ciências: fazer o abstrato virar algo que qualquer um entende',
      'Escrita técnica e documentação: precisão e clareza como habilidade',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'espacial',
    fase_codigo: 'linguistica',
    texto_aluno:
      'Você enxerga as coisas em imagens na mente. E a fase Linguística vai te dar o poder de fazer outras pessoas enxergarem o mesmo. Transformar a imagem mental em palavras, dar forma de história ao que está visível só pra você. Essa combinação cria os melhores roteiristas, criadores de mundos e comunicadores visuais.',
    caminhos_possiveis: [
      'Roteiro pra cinema e games: a imagem que nasce da palavra',
      'Worldbuilding: universos inteiros que existem primeiro como texto',
      'Comunicação visual e direção de arte: a palavra que guia a imagem',
      'Crítica de arte e curadoria: dar linguagem ao que é visual',
      'Design narrativo: criar a história que habita o espaço',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'musical',
    fase_codigo: 'linguistica',
    texto_aluno:
      'Você ouve e sente música com profundidade. E a fase Linguística vai te mostrar que letra não é detalhe: é metade da música. Quando você desenvolve sensibilidade com as palavras, descobre a musicalidade que existe em toda linguagem: o ritmo das frases, a emoção da voz, a rima que gruda na memória. Palavra e música têm a mesma origem.',
    caminhos_possiveis: [
      'Composição com letra: songwriting, musical, ópera',
      'Poesia oral e slam, onde o poema também é performance sonora',
      'Dublagem e direção de voz: a palavra como instrumento musical',
      'Locução e jingle: linguagem que comunica pelo som',
      'Linguística prosódica: o estudo do ritmo e da melodia da fala',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'corporal_cinestesica',
    fase_codigo: 'linguistica',
    texto_aluno:
      'Você aprende fazendo e pensa pelo corpo. E a fase Linguística vai te dar uma habilidade valiosa: colocar em palavras o que você viveu. Nomear com precisão o que aconteceu no corpo, explicar o que sentiu, traduzir a experiência física em história. Quando o corpo encontra a palavra, nasce uma comunicação poderosa.',
    caminhos_possiveis: [
      'Medicina clínica: nomear com precisão o que o corpo comunica',
      'Jornalismo esportivo e narração: dar linguagem à experiência física',
      'Coaching e treinamento: usar palavras pra transformar desempenho',
      'Fisioterapia e educação física: instruir com precisão e clareza',
      'Teatro e direção: dar linguagem ao trabalho do ator com o corpo',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'interpessoal',
    fase_codigo: 'linguistica',
    texto_aluno:
      'Você entende as pessoas como ninguém. E a fase Linguística vai te dar uma ferramenta poderosa: saber falar a língua certa pra cada pessoa. Não é sobre retórica genérica: é sobre a palavra certa, pro momento certo, pra pessoa certa. Isso é o que os grandes líderes e diplomatas fazem.',
    caminhos_possiveis: [
      'Diplomacia e relações internacionais: a palavra precisa no momento certo',
      'Liderança e comunicação: mensagens que chegam em pessoas diferentes',
      'Jornalismo de entrevista: criar o espaço onde a verdade aparece',
      'Mediação e negociação: usar a linguagem pra construir pontes',
      'Política e discurso público: palavras que movem grupos',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'intrapessoal',
    fase_codigo: 'linguistica',
    texto_aluno:
      'Você se conhece com profundidade. E a fase Linguística vai te mostrar algo importante: nomear o que você sente transforma o que você sente. Quando você encontra a palavra exata pro que estava sentindo, a relação com aquele sentimento muda. Essa combinação cria os escritores mais honestos e os pensadores mais lúcidos.',
    caminhos_possiveis: [
      'Escrita autobiográfica: o interior que vira obra',
      'Filosofia pessoal e ensaística: o pensamento que vira texto',
      'Psicologia e psicoterapia: nomear estados internos como parte da cura',
      'Poesia lírica: linguagem que toca o que não tem nome',
      'Crônica e jornalismo de opinião: o interior que ilumina o exterior',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'naturalista',
    fase_codigo: 'linguistica',
    texto_aluno:
      'Você observa e classifica o mundo natural com atenção rara. E a fase Linguística vai te mostrar que dar nome às coisas é ao mesmo tempo o primeiro ato da ciência e o mais poderoso ato da poesia. Nomear uma espécie, descrever um ecossistema, narrar uma expedição. A linguagem da natureza é das mais ricas que existem.',
    caminhos_possiveis: [
      'Jornalismo científico e de natureza: narrar o que a ciência descobre',
      'Literatura de expedição e escrita de campo: a natureza como narrativa',
      'Educação ambiental: usar a linguagem pra criar conexão com o natural',
      'Documentário e roteiro científico: dar história à descoberta',
      'Taxonomia: o ato de nomear que cria conhecimento científico',
    ],
    fase_propria: false,
  },

  // =============================================
  // FASE LÓGICO-MATEMÁTICA (Fase 6 de 8)
  // =============================================
  {
    casa_codigo: 'linguistica',
    fase_codigo: 'logico_matematica',
    texto_aluno:
      'Você domina as palavras. E a fase Lógico-Matemática vai te mostrar como construir argumentos que ninguém consegue derrubar. A lógica a serviço da palavra, o raciocínio que dá força à narrativa, a análise que sustenta o que você afirma. Os melhores advogados, filósofos e jornalistas investigativos combinam exatamente isso.',
    caminhos_possiveis: [
      'Direito e advocacia: argumento lógico como instrumento de justiça',
      'Filosofia analítica: rigor lógico no tratamento de ideias',
      'Jornalismo investigativo: análise de dados e evidências pra revelar a verdade',
      'Debate e oratória: construir argumentos sólidos',
      'Divulgação científica: raciocínio rigoroso em linguagem acessível',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'logico_matematica',
    fase_codigo: 'logico_matematica',
    texto_aluno:
      'Essa fase é sobre a sua inteligência. Você já vê padrões antes de procurá-los, já percebe inconsistências que outros não notam, já pensa em causa e consequência de forma automática. Aqui você vai entender a sofisticação do que já faz naturalmente. E quando você entende, o que é possível pra você se multiplica.',
    caminhos_possiveis: [
      'Matemática e ciências exatas: seu talento no nível mais alto',
      'Ciência da computação e algoritmos: lógica que move máquinas',
      'Física teórica e cosmologia: modelar a estrutura mais profunda da realidade',
      'Economia e finanças quantitativas: a lógica por trás de sistemas complexos',
      'Filosofia da ciência: pensar sobre como conhecemos o que conhecemos',
    ],
    fase_propria: true,
  },
  {
    casa_codigo: 'espacial',
    fase_codigo: 'logico_matematica',
    texto_aluno:
      'Você pensa em imagens e formas. E a fase Lógico-Matemática vai te dar acesso à matemática que o espacial já sente: topologia, análise espacial, geometria avançada. Quando a intuição de forma se junta com o rigor lógico, você alcança as fronteiras da matemática e da engenharia.',
    caminhos_possiveis: [
      'Engenharia estrutural e civil: a lógica do espaço construído',
      'Arquitetura computacional e paramétrica: algoritmos que criam espaço',
      'Geometria e topologia: o espaço como objeto de análise',
      'Computação gráfica e simulação visual: lógica que produz imagem',
      'Física e cosmologia: a lógica do espaço e do tempo',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'musical',
    fase_codigo: 'logico_matematica',
    texto_aluno:
      'Você sente a música profundamente. E a fase Lógico-Matemática vai te mostrar que harmonia é proporção, contraponto é lógica em várias vozes, e a estrutura de uma fuga é um sistema lógico de beleza absurda. Quando você entende a matemática por trás da música, a forma como compõe e analisa muda completamente.',
    caminhos_possiveis: [
      'Teoria musical e análise formal: entender a lógica por trás da beleza',
      'Composição algorítmica e música computacional: código que cria música',
      'Acústica e física do som: a matemática da experiência sonora',
      'Engenharia de áudio: sistemas lógicos pra capturar e reproduzir som',
      'Psicoacústica, como o cérebro entende padrões sonoros',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'corporal_cinestesica',
    fase_codigo: 'logico_matematica',
    texto_aluno:
      'Você pensa pelo corpo e pela ação. E a fase Lógico-Matemática vai te mostrar que o corpo tem uma lógica própria que dá pra analisar. Biomecânica, eficiência do movimento, a matemática do gesto. Quando você combina a inteligência do corpo com o raciocínio lógico, entende tanto o que sente quanto o que pode calcular.',
    caminhos_possiveis: [
      'Medicina e diagnóstico clínico: raciocínio lógico aplicado ao corpo',
      'Biomecânica e fisiologia do exercício: a matemática do movimento humano',
      'Fisioterapia analítica: entender o sistema pra corrigi-lo',
      'Engenharia de performance esportiva: otimizar o corpo como sistema',
      'Ciências do esporte: dados e análise a serviço do desempenho',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'interpessoal',
    fase_codigo: 'logico_matematica',
    texto_aluno:
      'Você lê as dinâmicas entre pessoas naturalmente. E a fase Lógico-Matemática vai te mostrar que essas dinâmicas têm padrões que dá pra analisar. Por que certos grupos funcionam, que variáveis determinam o comportamento coletivo, como prever o que vai acontecer antes de acontecer. Quando intuição e lógica se juntam, o resultado é raro e poderoso.',
    caminhos_possiveis: [
      'Ciências sociais quantitativas: medir e modelar comportamento humano',
      'Economia comportamental: a lógica do que parece irracional',
      'Análise organizacional e consultoria: entender sistemas humanos com rigor',
      'Ciências políticas: modelar dinâmicas de poder',
      'Pesquisa em psicologia social: dados sobre como as pessoas realmente funcionam',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'intrapessoal',
    fase_codigo: 'logico_matematica',
    texto_aluno:
      'Você conhece seus próprios padrões internos com clareza. E a fase Lógico-Matemática vai te dar ferramentas pra analisar esses padrões com rigor. Não é só saber o que sente: é entender por que sente, que padrões governam suas decisões, onde a lógica e a emoção divergem. Quando autoconhecimento encontra análise, o resultado é uma profundidade rara.',
    caminhos_possiveis: [
      'Filosofia da mente: pensar sobre como pensamos',
      'Psicologia cognitiva: o estudo científico dos nossos processos mentais',
      'Tomada de decisão e análise de viés: entender e corrigir erros do pensamento',
      'Pesquisa acadêmica: rigor aplicado a perguntas profundas',
      'Meditação analítica: observar o interior com precisão e método',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'naturalista',
    fase_codigo: 'logico_matematica',
    texto_aluno:
      'Você observa a natureza com atenção rara. E a fase Lógico-Matemática vai te dar as ferramentas pra transformar observação em modelo. Equações que descrevem populações, algoritmos que preveem migrações, sistemas que simulam ecossistemas inteiros. A lógica da vida é a mais fascinante de todas.',
    caminhos_possiveis: [
      'Bioinformática: modelar a vida com código',
      'Ecologia quantitativa: matemática aplicada a ecossistemas',
      'Biofísica: a física dos sistemas vivos',
      'Modelagem climática e ciências da Terra',
      'Epidemiologia: a lógica da propagação de doenças',
    ],
    fase_propria: false,
  },

  // =============================================
  // FASE INTERPESSOAL (Fase 7 de 8)
  // =============================================
  {
    casa_codigo: 'linguistica',
    fase_codigo: 'interpessoal',
    texto_aluno:
      'Você domina as palavras. E a fase Interpessoal vai te mostrar que as palavras mais poderosas são as que chegam naquela pessoa específica, não em qualquer audiência. Quando você aprende a escrever e falar pensando em quem está ouvindo: o argumento certo, o tom certo, a história certa; a comunicação ganha outro nível.',
    caminhos_possiveis: [
      'Jornalismo de entrevista: criar o espaço onde a verdade aparece',
      'Diplomacia e comunicação internacional: palavras que cruzam fronteiras',
      'Literatura com personagens reais e profundos',
      'Direito: argumentar pra juízes e júris específicos',
      'Roteiro pra audiovisual: personagens que parecem pessoas de verdade',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'logico_matematica',
    fase_codigo: 'interpessoal',
    texto_aluno:
      'Você vê sistemas em tudo. E a fase Interpessoal vai te mostrar que sistemas humanos têm uma lógica própria que os números sozinhos não explicam. Por que organizações falham por causa das pessoas, o que determina o comportamento de um grupo. Quando a lógica encontra a leitura de pessoas, você entende o que outros perdem.',
    caminhos_possiveis: [
      'Ciência comportamental e economia comportamental: a lógica do comportamento',
      'Gestão de projetos e liderança técnica: sistemas que funcionam porque as pessoas funcionam',
      'Análise organizacional: entender por que estruturas humanas falham',
      'Pesquisa em ciências sociais: dados sobre como pessoas realmente agem',
      'UX design: lógica a serviço da experiência humana',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'espacial',
    fase_codigo: 'interpessoal',
    texto_aluno:
      'Você cria espaços e formas com facilidade. E a fase Interpessoal vai te mostrar que espaços são habitados por pessoas reais, com necessidades e tensões reais. Quando você aprende a projetar pensando em como as pessoas realmente se comportam, não o usuário ideal, mas o ser humano de verdade: o que você cria funciona muito melhor.',
    caminhos_possiveis: [
      'Arquitetura social: criar com as pessoas, não só pra elas',
      'UX e design de experiência: espaços digitais que funcionam pra humanos reais',
      'Urbanismo e design de cidades: criar ambientes que constroem comunidade',
      'Facilitação com espaços, como o ambiente afeta a dinâmica do grupo',
      'Design de serviços: criar sistemas que as pessoas realmente usam',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'musical',
    fase_codigo: 'interpessoal',
    texto_aluno:
      'Você sente ritmos e padrões sonoros com profundidade. E a fase Interpessoal vai te mostrar que grupos humanos também têm ritmo. Conduzir pessoas é como reger uma orquestra: saber quando acelerar, quando dar espaço pro silêncio, quando alguém precisa ser ouvido. Seu senso de timing é uma habilidade de liderança.',
    caminhos_possiveis: [
      'Facilitação de grupos: conduzir com timing e sensibilidade',
      'Produção de eventos: criar experiências coletivas com o ritmo certo',
      'Liderança de bandas e grupos musicais: lidar com dinâmicas entre músicos',
      'Terapia de grupo com música: usar o ritmo pra facilitar o processo coletivo',
      'Regência: liderar grupos através da leitura em tempo real',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'corporal_cinestesica',
    fase_codigo: 'interpessoal',
    texto_aluno:
      'Você pensa pelo corpo e pelo movimento. E a fase Interpessoal vai te mostrar como ler o que o corpo dos outros comunica. O gesto que revela o estado interno, a postura que diz mais do que as palavras, o movimento que antecipa a ação. Quando a inteligência do corpo se junta com a leitura de pessoas, você ganha uma presença diferente.',
    caminhos_possiveis: [
      'Medicina e diagnóstico: ler o paciente além do exame',
      'Coaching: trabalhar com o corpo e a pessoa ao mesmo tempo',
      'Esportes coletivos e liderança: ler o time em tempo real',
      'Negociação e mediação: perceber o que o corpo do outro revela',
      'Teatro e direção: trabalhar com atores, perceber o que está funcionando',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'interpessoal',
    fase_codigo: 'interpessoal',
    texto_aluno:
      'Essa fase é sobre a sua inteligência. Você já lê grupos antes de qualquer palavra, já percebe o que não foi dito, já sente dinâmicas que outros demoram meses pra entender. Aqui você vai perceber o quanto esse talento pode mudar o que acontece ao seu redor quando usado com propósito e consciência.',
    caminhos_possiveis: [
      'Liderança e gestão de pessoas: seu talento a serviço do coletivo',
      'Psicologia e psicoterapia: leitura profissional do interior do outro',
      'Diplomacia e relações internacionais: navegar diferenças culturais',
      'Empreendedorismo social: criar soluções porque entende quem elas vão servir',
      'Mediação de conflitos: chegar a acordos que outros achavam impossíveis',
    ],
    fase_propria: true,
  },
  {
    casa_codigo: 'intrapessoal',
    fase_codigo: 'interpessoal',
    texto_aluno:
      'Você entende as pessoas como ninguém. Mas a fase Intrapessoal vai te mostrar algo importante: antes de entender os outros, vale entender a si mesmo. Quando você sabe o que é seu, a leitura que faz dos outros fica muito mais clara. Sem isso, você corre o risco de confundir o que o outro sente com o que você sente.',
    caminhos_possiveis: [
      'Psicologia: entender as pessoas de verdade, começando por entender você',
      'Liderança consciente: liderar a partir de um interior estável',
      'Mediação e facilitação: um interior quieto que permite ouvir sem filtrar',
      'Coaching de alto desempenho: guiar o outro a partir de experiência interior real',
      'Filosofia aplicada e aconselhamento: sabedoria interior a serviço do outro',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'naturalista',
    fase_codigo: 'interpessoal',
    texto_aluno:
      'Você lê ecossistemas com atenção rara. E a fase Interpessoal vai te mostrar que comunidades humanas são ecossistemas. Quem é a pessoa-chave, onde estão as tensões que ameaçam o equilíbrio, o que mantém o grupo funcionando. Quando você aplica seu olhar de naturalista às dinâmicas humanas, a leitura que faz é rara e transformadora.',
    caminhos_possiveis: [
      'Antropologia e etnografia: estudar culturas com a atenção de um naturalista',
      'Desenvolvimento comunitário: fortalecer sistemas humanos como ecossistemas',
      'Liderança em organizações complexas: ler e nutrir dinâmicas de grupo',
      'Políticas públicas socioambientais, onde o humano e o natural se encontram',
      'Resolução de conflitos coletivos: mediar em sistemas de alta complexidade',
    ],
    fase_propria: false,
  },

  // =============================================
  // FASE INTRAPESSOAL (Fase 8 de 8)
  // =============================================
  {
    casa_codigo: 'linguistica',
    fase_codigo: 'intrapessoal',
    texto_aluno:
      'Você domina as palavras. E a fase Intrapessoal vai te mostrar que as palavras mais poderosas são as honestas. A escrita que não faz pose mas confessa, a frase que captura exatamente o que você estava sentindo antes de ser dito. Quando a linguagem vem de um lugar verdadeiro, ela chega nos outros de um jeito diferente.',
    caminhos_possiveis: [
      'Literatura autobiográfica: o interior que se torna obra',
      'Crônica e jornalismo de opinião: o interior que ilumina o exterior',
      'Filosofia ensaística: pensamento que nasce da experiência vivida',
      'Psicologia e aconselhamento: nomear estados internos como parte da cura',
      'Poesia lírica: a linguagem que toca o que não tem nome',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'logico_matematica',
    fase_codigo: 'intrapessoal',
    texto_aluno:
      'Você analisa sistemas com facilidade. E a fase Intrapessoal vai te mostrar que a mente é o sistema mais próximo e mais importante de analisar. Mapear seus próprios vieses, identificar os padrões de raciocínio que te levam a erros, entender como as emoções interferem na lógica. Quando você analisa a si mesmo com rigor, tudo que você faz melhora.',
    caminhos_possiveis: [
      'Filosofia da mente: pensar sobre como pensamos e conhecemos',
      'Psicologia cognitiva e neurociência comportamental',
      'Tomada de decisão e análise de viés: corrigir erros do próprio pensamento',
      'Pesquisa acadêmica: rigor que começa pela honestidade sobre os próprios limites',
      'IA e sistemas cognitivos: modelar a mente humana',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'espacial',
    fase_codigo: 'intrapessoal',
    texto_aluno:
      'Você pensa em imagens e formas. E a fase Intrapessoal vai te dar uma habilidade nova: criar mapas do que está por dentro. Representações visuais das suas crenças, diagramas do que gera cada emoção, a arquitetura invisível que guia seu comportamento. Quando o autoconhecimento ganha forma visual, ele fica muito mais claro.',
    caminhos_possiveis: [
      'Arte terapia: criar imagens do interior como caminho de cura e descoberta',
      'Design de jornadas transformadoras: mapear o caminho interior',
      'Infografia do abstrato: dar forma visual a conceitos e emoções',
      'Criação autoral: obra que vem de dentro com forma visual precisa',
      'Filosofia visual e pensamento gráfico: pensar através de imagens',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'musical',
    fase_codigo: 'intrapessoal',
    texto_aluno:
      'Você sente o mundo em sons. E a fase Intrapessoal vai te mostrar que o seu interior também tem música. A melodia que aparece quando há paz, o ritmo que o corpo produz na ansiedade, a composição que nasce de um estado que ainda não tem palavras. Usar a música como espelho de si mesmo é uma forma de autoconhecimento que poucos exploram.',
    caminhos_possiveis: [
      'Composição autoral e songwriting: música que nasce do interior honesto',
      'Musicoterapia: usar a música pra acessar e transformar o interior',
      'Performance expressiva: a música como forma de se revelar',
      'Filosofia estética: o que a música mostra sobre a experiência de ser humano',
      'Escrita sobre música e crítica musical: dar palavras ao que a música diz sem elas',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'corporal_cinestesica',
    fase_codigo: 'intrapessoal',
    texto_aluno:
      'Você pensa pelo corpo. E a fase Intrapessoal vai te mostrar que o corpo guarda verdades que a mente ainda não sabe. Aquele aperto no peito, a tensão nos ombros, a inquietação que aparece do nada, tudo isso é informação. Quando você aprende a ouvir o corpo como caminho de autoconhecimento, entende coisas sobre si que nenhuma reflexão sozinha alcança.',
    caminhos_possiveis: [
      'Psicoterapia corporal: integrar corpo e mente pra se conhecer melhor',
      'Medicina integrativa: o corpo como entrada pra saúde global',
      'Artes marciais: disciplina física como caminho de autoconhecimento',
      'Dança terapêutica: o corpo que conta a história interior',
      'Coaching somático: transformação que começa pelo corpo',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'interpessoal',
    fase_codigo: 'intrapessoal',
    texto_aluno:
      'Você entende as pessoas como ninguém. Mas a fase Intrapessoal vai te mostrar algo importante: antes de entender os outros, vale entender a si mesmo. Quando você sabe o que é seu, a leitura que faz dos outros fica muito mais clara. Sem esse autoconhecimento, você corre o risco de enxergar no outro o que na verdade é seu.',
    caminhos_possiveis: [
      'Psicologia: entender as pessoas de verdade, começando por entender você',
      'Liderança consciente: liderar a partir de um interior estável',
      'Mediação e facilitação: o interior quieto que permite ouvir sem filtrar',
      'Coaching de alto desempenho: guiar o outro a partir de experiência interior real',
      'Diplomacia: navegar diferenças a partir de uma identidade interior sólida',
    ],
    fase_propria: false,
  },
  {
    casa_codigo: 'intrapessoal',
    fase_codigo: 'intrapessoal',
    texto_aluno:
      'Essa fase é sobre a sua inteligência. Você acessa o que está por dentro com uma clareza que a maioria das pessoas nunca desenvolve. Aqui você não vai aprender a se conhecer: vai entender a sofisticação do que já faz naturalmente. E quando você entende isso, a forma como usa esse talento em todas as áreas da vida muda.',
    caminhos_possiveis: [
      'Filosofia e pensamento contemplativo: seu talento no nível mais alto',
      'Psicologia profunda: o interior humano como campo de estudo',
      'Escrita autobiográfica: o interior que vira patrimônio',
      'Espiritualidade e práticas de autoconhecimento: o caminho interior',
      'Aconselhamento e mentoria: guiar outros a partir de profundidade interior',
    ],
    fase_propria: true,
  },
  {
    casa_codigo: 'naturalista',
    fase_codigo: 'intrapessoal',
    texto_aluno:
      'Você observa o mundo exterior com precisão rara. E a fase Intrapessoal vai te mostrar que o mundo interior tem a mesma complexidade. Ciclos como as estações, equilíbrios que se mantêm e outros que se rompem quando algo muda. Quando você se observa por dentro com a mesma atenção que observa a natureza, vira o naturalista de si mesmo.',
    caminhos_possiveis: [
      'Psicologia ecológica e ecoterapia: cura pela conexão entre o interior e a natureza',
      'Filosofia da natureza: a natureza como espelho do mundo interior',
      'Escrita de natureza como prática contemplativa e de autoconhecimento',
      'Permacultura como filosofia de vida: o ciclo natural como modelo pra vida interior',
      'Retiros e imersão na natureza: usar o ambiente natural pra se conhecer melhor',
    ],
    fase_propria: false,
  },
];
