/**
 * Conteúdo da ABA FASE do Infantil — "o santuário do mecanismo".
 *
 * Fonte: tópico 3.2 do documento mestre ("A Definição das 8 Inteligências pelo
 * olhar do Arboria"), adaptado pra voz do caderno pelo setor de Conteúdo e
 * APROVADO pelo Fundador em 02/07/2026 (mockup v2 interativo).
 *
 * `cor` = cor oficial da inteligência (mesma das Casas do F2 — a cor é a língua
 * comum dos 12 anos; brasões são exclusivos do F2). `corAcento`/`corVeu` são
 * tons pré-calculados (acento claro p/ títulos sobre escuro; véu = cor mesclada
 * ao índigo profundo do fundo) — pré-calculados pra não depender de color-mix.
 */
export interface SantuarioMecanismo {
  nome: string;
  cor: string;
  corAcento: string;
  corVeu: string;
  cena: string;
  mecanismo: string;
  naoDefine: string[];
  revela: string[];
  veMundo: string;
  lente: string;
  observar: string[];
  cuidado: string;
}

export const SANTUARIO_INFANTIL: Record<number, SantuarioMecanismo> = {
  1: {
    nome: 'Linguística',
    cor: '#1E3A8A',
    corAcento: '#8393BF',
    corVeu: '#293695',
    cena: 'Charles Dickens, antes de publicar qualquer livro, enchia cadernos com descrições das pessoas que via na rua. Não era exercício — era necessidade. Na sua sala, é a criança que narra a própria brincadeira em voz alta enquanto brinca: o boneco não anda — "e aí ele foi, e aí ele caiu, e aí a mamãe dele veio". Ninguém pediu história. Ela não consegue brincar de outro jeito.',
    mecanismo: 'É o mecanismo pelo qual a mente processa o mundo através da linguagem — o som, o ritmo, a estrutura e o significado das palavras. Não é falar muito. Não é falar cedo. É COMO a criança pensa: em palavras, em nomes, em histórias. Para ela, a palavra não carrega o pensamento — a palavra é o pensamento.',
    naoDefine: [
      'Falar muito ou ser desinibida',
      'Ter falado cedo ou pronunciar bem',
      'Já reconhecer letras ou o próprio nome escrito',
      'Ter vocabulário "adiantado"',
      'Gostar de ouvir histórias — quase toda criança gosta',
      'Ser extrovertida na roda',
    ],
    revela: [
      'Corrige você quando você muda uma palavra da história de sempre — ela guardou o texto, não só o enredo',
      'Inventa nomes para bonecos, lugares e brincadeiras — e os nomes têm lógica, som, intenção',
      'Reconta na segunda-feira, com começo, meio e fim, algo que viveu no sábado',
      'Contra-intuitivo: pode ser a criança quieta, que quase não fala na roda — e em casa reconta sua aula inteira. O mecanismo opera por dentro, sem plateia',
      'Contra-intuitivo: pode trocar sons, pronunciar "errado" — e construir histórias com estrutura. A pronúncia é habilidade; a narrativa é o mecanismo',
    ],
    veMundo: 'O mundo chega em palavras antes de chegar em qualquer outra coisa. Quando você muda o tom do "bom dia", ela não registra "algo mudou" — registra a diferença entre o de hoje e o de ontem. Ela não pensa e depois coloca em palavras. As palavras já estão lá quando o pensamento começa. Esse é o filtro: a experiência chega narrada.',
    lente: 'Quando você repara na criança que processa em palavras, ganha uma porta: o que não entrou pela demonstração entra pela história — vire narrativa o que era instrução. A tagarelice durante a atividade deixa de ser dispersão e vira o rascunho falado do pensamento dela. E a criança calada deixa de ser lida como "sem linguagem" — talvez a narração esteja acontecendo onde você não ouve. Só reparar já muda o que você oferece amanhã.',
    observar: [
      'Na roda de história, repare quem se adianta às palavras e quem pede a mesma história do mesmo jeito',
      'Quem narra a própria brincadeira enquanto brinca',
      'Quem ri de palavra engraçada, inventa nome pra tudo, repete uma palavra nova pelo gosto do som',
      'Quem guarda a fala exata de alguém e devolve dias depois',
    ],
    cuidado: 'A criança quieta pode estar processando por palavras por dentro — falar muito, sozinho, não é o sinal. Registre a cena; a leitura vem depois.',
  },
  2: {
    nome: 'Lógico-Matemática',
    cor: '#047857',
    corAcento: '#75B5A3',
    corVeu: '#1B5879',
    cena: 'Uma criança de 3 anos derruba a colher do cadeirão. Você devolve. Ela derruba de novo — olhando para você, não para a colher. De novo. De novo. Não é birra: é um teste. Ela está verificando se o mundo responde sempre do mesmo jeito. Está fazendo ciência sem saber nomear o que faz.',
    mecanismo: 'É o mecanismo pelo qual a mente processa padrões, sequências e relações de causa e efeito. Não é sobre números. Não é sobre contar. É sobre COMO a criança encadeia o pensamento: "se isso, então aquilo". O mundo chega como um conjunto de regras esperando ser descobertas.',
    naoDefine: [
      'Contar até números altos ou reconhecer numerais',
      'Ser organizada, "certinha" ou obediente à rotina',
      'Gostar de jogos de encaixe — presença isolada não confirma',
      'Ser calma ou "madura para a idade"',
      'Ser rápida nas respostas',
    ],
    revela: [
      'Repete a mesma ação dezenas de vezes variando um detalhe — é teste de hipótese, não teimosia',
      'Nota na hora quando a rotina quebra: "hoje não teve o lanche antes do parque?"',
      'Emenda perguntas: cada resposta gera a próxima. A cadeia de "por quês" não para sozinha',
      'Ordena sozinha por tamanho, distribui "um para cada um" — ninguém ensinou a regra; ela a encontrou',
      'Contra-intuitivo: pode parecer lenta ou cuidadosa demais — está conferindo cada passo. A velocidade não é o sinal; a busca do padrão é',
    ],
    veMundo: 'O mundo chega como sistema esperando ser decifrado. Ela não decide procurar padrões — eles aparecem. A colher que cai, a torre que tomba, a fila que anda: tudo é pergunta. O mundo não é feito de fatos — é feito de relações entre fatos. E o filtro é a pergunta que nunca para: "por quê? e se? e de novo?"',
    lente: 'Quando você repara na criança que entra pelo padrão, a repetição dela deixa de ser capricho e vira método — e você pode alimentar o método em vez de interrompê-lo. A pergunta encadeada deixa de ser desafio à sua paciência e vira o mecanismo pedindo mais um elo. E a criança que "demora" ganha o tempo que o raciocínio dela precisa. Você só passa a oferecer mundos com regras para descobrir.',
    observar: [
      'Repare quem derruba a torre de novo só pra conferir se cai igual',
      'Quem enfileira, ordena do menor pro maior, separa tudo antes de começar a brincar',
      'Quem percebe na hora que a rotina mudou de ordem',
      'Quem pergunta "por quê" em cadeia, um atrás do outro',
      'Quem desmonta o brinquedo pra ver o que tem dentro',
    ],
    cuidado: 'Essa criança pode parecer lenta ou teimosa quando, na verdade, está verificando a regra dela passo a passo. Descreva o que ela fez, não o tempo que levou.',
  },
  3: {
    nome: 'Espacial',
    cor: '#7C3AED',
    corAcento: '#B793F5',
    corVeu: '#5D36CC',
    cena: 'Os navegadores das Ilhas Caroline cruzam centenas de quilômetros de oceano sem instrumentos. Eles não veem as ilhas enquanto navegam: eles as imaginam — um mapa vivo, dentro da cabeça, atualizado a cada onda. Na sua sala, é a criança de 4 anos que atravessa a escola e sabe o caminho de volta sem hesitar. Ou que, antes de encaixar a peça, gira a peça na cabeça — e a mão já chega certa.',
    mecanismo: 'É o mecanismo pelo qual a mente processa o mundo em formas, posições e relações no espaço. Não é desenhar bem. É COMO a criança representa o mundo por dentro: em imagens que ela consegue girar, montar e desmontar mentalmente. Quando resolve um problema, ela vê a solução antes de conseguir dizê-la. E esse mecanismo não depende dos olhos — pode se construir inteiro pelo tato e pelo movimento.',
    naoDefine: [
      'Desenhar "bonito" ou pintar dentro da linha',
      'Gostar de desenhar',
      'Ser caprichosa com os materiais',
      'Manter o cantinho arrumado',
      'Gostar de olhar livros de figuras',
    ],
    revela: [
      'Sabe onde cada coisa fica guardada — inclusive o que você mesma perdeu. Busca pela imagem do lugar, não pelo nome',
      'Constrói com blocos algo que planejou por dentro: procura uma peça específica, não qualquer peça',
      'Monta o brinquedo novo sem esperar demonstração',
      'Contra-intuitivo: pode parecer dispersa na roda de história — e depois reconstruir a cena inteira com blocos. Ela entendeu; entendeu em imagem',
      'Contra-intuitivo: o canto "bagunçado" dela pode ter lógica precisa — a bagunça é relacional, não aleatória',
    ],
    veMundo: 'O mundo chega como imagem antes de chegar como palavra. Quando precisa lembrar onde deixou algo, ela busca pela imagem do lugar. A sala existe inteira na cabeça dela, com cada coisa em posição. Quando tem um problema, muitas vezes vê a solução antes de conseguir contá-la. O filtro é a forma, a posição, a relação no espaço.',
    lente: 'Quando você repara na criança que entra pela imagem, ganha uma porta: o que não entrou pela fala entra pelo mostrar, pelo montar, pelo lugar das coisas. A criança "perdida" na explicação longa deixa de parecer desatenta — o canal verbal saturou, não o entendimento. E você passa a dar espaço para ela responder construindo, não só falando.',
    observar: [
      'Repare quem olha os blocos por um tempo antes de tocar neles — e monta quase sem errar',
      'Quem encaixa a peça pela forma, sem tentativa e erro',
      'Quem nota que o móvel da sala mudou de lugar antes de todo mundo',
      'Quem encontra o caminho no pátio ou lembra onde cada coisa fica guardada',
    ],
    cuidado: 'Não é desenhar bonito. O desenho pode sair "bagunçado" e o processamento espacial estar todo lá — repare no montar, no olhar antes, não no resultado da folha.',
  },
  4: {
    nome: 'Musical',
    cor: '#7F1D1D',
    corAcento: '#B98383',
    corVeu: '#5F2659',
    cena: 'Yehudi Menuhin foi levado escondido a um concerto aos três anos. O som do violino o afetou de um jeito que os pais não esperavam e não haviam provocado. Ele insistiu — não pediu, insistiu — em ter o próprio violino. A inteligência musical dele não esperou escola nem instrumento: estava operando antes. Só precisou do contexto certo para se revelar.',
    mecanismo: 'É o mecanismo pelo qual a mente processa o mundo através de padrões de som — ritmo, melodia, altura, repetição. Não é cantar afinado. Não é gostar de música. É COMO a criança organiza o que percebe: pelo padrão sonoro, antes de qualquer intenção. Bebês de poucos meses já distinguem ritmos antes de qualquer palavra.',
    naoDefine: [
      'Cantar afinado ou ter voz bonita',
      'Participar animada das músicas da rotina — quase todas participam',
      'Vir de família musical',
      'Dançar quando toca música',
      'Ficar quieta e atenta na hora da música',
    ],
    revela: [
      'Ouve uma música uma vez e dias depois reproduz o ritmo sem ter "estudado"',
      'Percebe quando você canta a música de sempre num tom diferente — e estranha antes de saber explicar o quê',
      'Bate ritmos na mesa enquanto faz outra coisa — não é dispersão: é o canal padrão dela funcionando',
      'O que não fica falado, fica em 48 horas quando vira cantiga',
      'Contra-intuitivo: pode ficar inquieta justamente no silêncio absoluto. Para ela, o som não distrai — ancora',
    ],
    veMundo: 'O mundo chega com textura sonora. Quando entra num ambiente, ela registra o ritmo das conversas, a melodia de como as pessoas falam — antes do que dizem. Uma música ouvida uma vez fica — não como lembrança, mas como estrutura interna. O filtro não procura primeiro o significado. Procura o padrão. O ritmo. A repetição que revela a regra.',
    lente: 'Quando você repara na criança que entra pelo som, ganha a porta mais barata que existe: transformar em ritmo ou cantiga o que não entrou falado. O batuque na mesa deixa de ser indisciplina e vira pista de como aquela mente organiza o mundo. E você para de exigir silêncio absoluto de quem precisa de padrão sonoro para pensar.',
    observar: [
      'Repare quem para tudo quando aparece um som novo',
      'Quem marca o ritmo com a colher, o pé, o corpo inteiro',
      'Quem canta baixinho pra si mesma enquanto brinca de outra coisa',
      'Quem completa a cantiga no ponto exato, sem errar a entrada',
    ],
    cuidado: 'Batucar na mesa pode ser processamento, não dispersão — descreva a cena antes de interromper. E cantar afinado não é o sinal: o sinal é o ouvido que organiza o som.',
  },
  5: {
    nome: 'Corporal-Cinestésica',
    cor: '#B8860B',
    corAcento: '#D8BD79',
    corVeu: '#7E5F4F',
    cena: 'Uma artesã experiente molda argila sem olhar para as mãos. As mãos sabem a pressão certa, a velocidade certa, o momento em que a argila cede. Se você perguntar como ela faz, ela dirá: "você sente". Não é resposta evasiva — é a descrição exata de onde mora o conhecimento. Na sua sala, é a criança que só entende a atividade quando as mãos dela começam a fazer.',
    mecanismo: 'É o mecanismo pelo qual a mente processa o mundo e resolve problemas através do corpo — movimento, toque, gesto. Não é ser agitada. É COMO a criança pensa: o corpo não executa o que a cabeça decidiu — o corpo pensa junto. A compreensão acontece no fazer, não antes dele.',
    naoDefine: [
      'Ser agitada ou "não parar quieta"',
      'Correr rápido, pular alto, ser habilidosa no pátio',
      'Ser "bagunceira" ou difícil de conter na roda',
      'Gostar de parque e de brincadeiras físicas — quase todas gostam',
      'Recortar e desenhar com precisão para a idade',
    ],
    revela: [
      'Aprende fazendo, mesmo quando você pediu que olhasse primeiro — as mãos vão antes da instrução acabar',
      'Sabe fazer e não sabe explicar: quando você pergunta como, ela mostra de novo. O saber mora no gesto',
      'Tem intuição sobre peso, equilíbrio e encaixe — a torre dela para em pé porque a mão sentiu onde apoiar',
      'O que o corpo aprendeu, não esquece: a sequência de movimentos volta inteira semanas depois',
      'Contra-intuitivo: pode ser quieta, nada esportiva — e só compreender quando toca e manipula. E pode se atrapalhar com tesoura: motricidade fina é habilidade treinável; o mecanismo é outra coisa',
    ],
    veMundo: 'O mundo chega pelo corpo antes de chegar pelo pensamento. Quando aprende algo novo, a compreensão acontece no momento em que as mãos fazem. Quando processa algo difícil, o corpo se move: levanta, gesticula, pega. Não é inquietação — é o mecanismo pensando. O filtro é o fazer: a experiência só vira real quando passa pelo movimento.',
    lente: 'Quando você repara na criança que pensa com o corpo, o levantar no meio da explicação deixa de ser afronta e vira sinal: o canal dela ainda não foi aberto. Você ganha uma regra prática: se não entrou pelo ouvir, ofereça pelo fazer. E para de cobrar pela porta errada: exigir imobilidade dessa criança é fechar justamente o canal por onde ela aprende.',
    observar: [
      'Repare quem precisa pegar pra entender — o objeto explicado de longe não chega',
      'Quem aprende um gesto vendo uma vez só',
      'Quem, na hora da história, conta junto com o corpo: encena, imita, vira o personagem',
      'Quem calcula o pulo, o equilíbrio, a força exata no pátio',
    ],
    cuidado: 'Agitação não é este mecanismo. E a criança quieta, concentrada nas próprias mãos, pode estar com ele em plena atividade. Descreva o movimento, não o comportamento.',
  },
  6: {
    nome: 'Naturalista',
    cor: '#78350F',
    corAcento: '#B5907B',
    corVeu: '#5B3352',
    cena: 'Charles Darwin, quando menino, colecionava besouros. Não como passatempo — como necessidade: precisava encontrá-los, nomeá-los, separá-los. Décadas depois, essa mesma compulsão por distinções produziu a teoria da evolução. Na sua sala, é a criança de 4 anos que, diante de uma caixa de tampinhas, não brinca com uma por uma: separa. Por cor. Depois desmancha e refaz por tamanho. A atividade era livre. A classificação, não — foi inevitável.',
    mecanismo: 'É o mecanismo pelo qual a mente reconhece padrões e cria categorias — percebe o que é igual, o que é diferente e onde passa a fronteira entre um grupo e outro. Não é gostar de natureza. É COMO a criança processa a variedade do mundo: classificando. E opera sobre tampinhas, carrinhos, qualquer conjunto que admita ordem.',
    naoDefine: [
      'Gostar de animais ou de plantas',
      'Preferir brincar ao ar livre',
      'Ser quieta e observadora',
      'Ter bicho de estimação e cuidar bem dele',
      'Saber nomes de bichos de cor',
    ],
    revela: [
      'Separa espontaneamente qualquer conjunto — por critérios que ninguém ensinou',
      'Acha na hora o "intruso": a peça que não pertence, a folha diferente. Não é análise — é percepção direta do desvio',
      'Guarda com facilidade nomes que vêm em famílias — dinossauros, cores — porque nomes em sistema encaixam',
      'Contra-intuitivo: pode ser criança de apartamento, sem interesse por natureza — e o mecanismo aparecer inteiro na fileira de carrinhos',
      'Contra-intuitivo: pode parecer desligada em atividades muito abertas, sem nada pra comparar. Não é desinteresse — é o mecanismo sem material para operar',
    ],
    veMundo: 'O mundo chega em categorias. Diante de qualquer conjunto — objetos, figuras, pessoas — o mecanismo começa a trabalhar: o que é igual? o que é diferente? onde termina um grupo e começa o outro? Ela não decide perceber a distinção. A distinção já chegou antes da decisão de percebê-la.',
    lente: 'Quando você percebe que uma criança entra pelo olhar que classifica, você ganha uma porta: o conteúdo que não entrou pela explicação entra pela coleção, pela comparação, pelo "qual é o diferente?". A bagunça de tampinhas deixa de ser bagunça — vira o rascunho do pensamento dela. E você não precisa concluir nada: só reparar já muda o que você oferece amanhã.',
    observar: [
      'Repare quem separa os brinquedos por tipo, cor ou tamanho sem ninguém pedir',
      'Quem nota a folha diferente, o bichinho no canto do pátio que ninguém viu',
      'Quem coleciona pedrinhas, tampinhas — e sabe exatamente qual falta',
      'Quem pergunta o nome de cada coisa e cobra o nome certo',
    ],
    cuidado: 'Este filtro funciona com qualquer coleção — carrinhos, botões, potes — não só com natureza. Longe de coisas pra comparar e agrupar, a criança pode só parecer desinteressada.',
  },
  7: {
    nome: 'Interpessoal',
    cor: '#0891B2',
    corAcento: '#77C3D5',
    corVeu: '#1D65AB',
    cena: 'Anne Sullivan chegou para ensinar Helen Keller — cega, surda, fechada — quase sem treinamento formal. Em poucas semanas entendeu o que nenhum adulto ao redor tinha visto: Helen não precisava de disciplina. Precisava de conexão. Antes de ensinar uma letra, Sullivan leu o estado interno de uma criança sem linguagem, sem expressão visível. Essa leitura precisa de outra pessoa — esse é o mecanismo.',
    mecanismo: 'É o mecanismo pelo qual a mente processa o mundo interno das outras pessoas — humores, intenções, o clima entre elas. Não é ser simpática. Não é ter muitos amigos. É COMO a criança lê os outros: percebendo diferenças finas de estado que a maioria não registra, e ajustando o próprio comportamento a partir dessa leitura.',
    naoDefine: [
      'Ser a mais falante ou a "querida da turma"',
      'Abraçar e ser carinhosa com todo mundo',
      'Nunca brigar ou nunca morder',
      'Ser "a ajudante" da professora',
      'Gostar de brincar acompanhada — quase todas gostam',
    ],
    revela: [
      'Percebe que o colega vai chorar antes de qualquer adulto — e às vezes antes do próprio colega',
      'Ajusta o jeito de brincar conforme o parceiro: com um é mais firme, com outro mais devagar. Ninguém ensinou — ela leu',
      'Nota a sua mudança de humor pelo tom, pela postura — e reage antes de você dizer qualquer coisa',
      'Contra-intuitivo: pode ser a criança quieta, de poucos parceiros, que passa o pátio observando — e lê a dinâmica do grupo inteiro',
      'Contra-intuitivo: pode usar a leitura a favor de si — conseguir o que quer porque percebeu como cada adulto reage. É mecanismo sem a parte ética, que ainda está em construção. Mecanismo não é virtude',
    ],
    veMundo: 'O mundo chega através das pessoas. Quando entra num ambiente, ela registra o estado de cada um antes de qualquer conversa — a postura, o desvio do olhar, a tensão numa voz que parece normal. O filtro é relacional: a realidade não é feita de coisas. É feita de pessoas e do que se passa entre elas.',
    lente: 'Quando você repara na criança que entra pelas pessoas, os "movimentos sociais" dela durante a atividade deixam de ser dispersão — são o processamento principal dela acontecendo. Conteúdo com gente dentro (quem sentiu, quem ajudou) entra mais fundo do que conteúdo sem ninguém. E a criança que "manipula" pede orientação, não rótulo — a leitura dela é potente e ainda não tem bússola.',
    observar: [
      'Repare quem percebe o colega triste antes de você',
      'Quem olha o seu rosto pra decidir se pode',
      'Quem muda de comportamento quando o clima da sala muda',
      'Quem entrega ao colega justamente o brinquedo que ele queria, sem ninguém pedir',
      'Quem, na disputa, procura a saída que acalma os dois lados',
    ],
    cuidado: 'Não é ser sociável nem popular. A criança que fica na beirada, só olhando o grupo, pode estar lendo cada um em silêncio — descreva o que ela olha, não quantos amigos tem.',
  },
  8: {
    nome: 'Intrapessoal',
    cor: '#EA580C',
    corAcento: '#F4A379',
    corVeu: '#994650',
    cena: 'Virginia Woolf, num ensaio, descreve momentos da infância com uma clareza que vai além da memória: ela não só lembra o que aconteceu — sabe dizer o que sentiu, por que sentiu, e como a sensação virou compreensão. Na sua sala, essa capacidade aparece pequena e inteira: a criança de 4 anos que, depois da birra, consegue dizer "eu fiquei bravo porque eu queria e não deu". Ela não sentiu mais que as outras. Sentiu com mais precisão.',
    mecanismo: 'É o mecanismo pelo qual a mente processa o próprio mundo interno — o que sente, por que sente, do que precisa. Não é timidez. É a capacidade de acessar o próprio estado, distinguir sentimentos que para os outros parecem iguais, e usar isso para agir. É a mais reservada das oito: quase nunca aparece sozinha — precisa de outra (a fala, o desenho, o corpo) para se mostrar.',
    naoDefine: [
      'Ser tímida, quieta ou "na dela"',
      'Preferir brincar sozinha',
      'Chorar fácil ou sentir "demais"',
      'Ser calma e dar pouco trabalho',
      'Ser "sentida" ou manhosa',
    ],
    revela: [
      'Nomeia o que sente com precisão rara para a idade: não é só "triste" — é "bravo porque queria e não deu"',
      'Se retira sozinha para se recompor — e volta. Não é isolamento: é regulação. Ela sabe do que precisa',
      'Recusa uma atividade e sabe dizer por quê — é leitura do próprio limite naquele momento',
      'Pede tempo antes de entrar: observa a brincadeira antes de entrar nela',
      'Contra-intuitivo: pode ser a criança mais agitada e falante da sala — e ainda assim, depois do conflito, ser a única que reconstrói o que sentiu passo a passo',
    ],
    veMundo: 'O mundo chega filtrado pelo estado interno. Antes de reagir, há um instante — quase imperceptível — em que o mecanismo registra como ela está e por quê. O que para outras crianças é um sentimento embolado, para ela chega com etiqueta: não era bem raiva, era frustração. A experiência interna vira informação antes de virar comportamento.',
    lente: 'Quando você repara na criança que processa por dentro, o "tempo dela" deixa de ser lentidão e vira etapa: ela precisa acessar o próprio estado antes de agir, e cobrar resposta imediata é fechar a porta. O canto onde ela se recompõe deixa de ser fuga e vira ferramenta — que você pode proteger em vez de interromper. E como esse mecanismo quase não se mostra sozinho, o seu olhar é o que impede que ele passe despercebido. Reparar já é a metade do trabalho.',
    observar: [
      'Repare quem nomeia o que sente com exatidão',
      'Quem sabe a hora de parar e procura sozinha o canto quieto',
      'Quem recusa uma atividade e consegue dizer por quê',
      'Quem volta pro grupo quando está pronta, sem precisar de chamado',
      'Quem escolhe sabendo o que quer — não pega qualquer um',
    ],
    cuidado: 'É o mais silencioso dos oito filtros: só aparece através de outra porta — a fala, o corpo, o desenho. Timidez não é o sinal, e a criança "fechada" pode estar com esse processamento a todo vapor.',
  },
};
