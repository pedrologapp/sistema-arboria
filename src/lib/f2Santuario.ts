/**
 * Santuário das 8 Casas, versão FUNDAMENTAL 2.
 *
 * MESMA estrutura e MESMOS campos do SANTUARIO_INFANTIL (SantuarioMecanismo): a
 * tela do F2 espelha exatamente o F1FasePage. Cada Casa ABRE com a história do
 * gênio (a mesma abertura do F1: Dickens, Darwin, Menuhin..., mantida VERBATIM),
 * e segue na voz do adolescente e do mentor.
 *
 * Origem de cada campo:
 * - cores + `nome` base: reusados do SANTUARIO_INFANTIL (a cor é a língua comum
 *   dos 12 anos). `nome` é sobrescrito pelos nomes CURTOS aprovados do F2.
 * - `cena`: abertura do gênio (verbatim do f1Santuario) + a essência da Casa.
 * - `mecanismo`, `revela`, `lente`, `cuidado`: conteúdo do F2.
 * - `naoDefine`, `veMundo`, `observar`: base do SANTUARIO_INFANTIL na linguagem F2.
 *
 * REVISÃO DE LINGUAGEM (Fundador, 09/07): textos reescritos para sair da fórmula
 * repetida e do excesso de dois-pontos que davam cara de texto automático. O
 * mecanismo, os limites (naoDefine) e as aberturas dos gênios seguem fiéis.
 */
import { SANTUARIO_INFANTIL, type SantuarioMecanismo } from './infantilSantuario';

/** Campos que o F2 sobrescreve; o resto (cores) vem do SANTUARIO_INFANTIL. */
type CampoF2 = Pick<
  SantuarioMecanismo,
  'nome' | 'cena' | 'mecanismo' | 'naoDefine' | 'revela' | 'veMundo' | 'lente' | 'observar' | 'cuidado'
>;

/** A linha de guarda, idêntica em todas as Casas (blindagem anti-rótulo). */
const CUIDADO_F2 =
  'O autorrelato é porta, não prova. Silêncio nesta Casa não é ausência, pode ser um canal ainda fechado. Toda pessoa tem as oito, esta é a que abre mais fácil.';

const F2: Record<number, CampoF2> = {
  1: {
    nome: 'Linguística',
    cena:
      'Charles Dickens, antes de publicar qualquer livro, enchia cadernos com descrições das pessoas que via na rua. Não era exercício, era necessidade. É a Casa de quem pensa com palavras. Para esses alunos, a ideia já nasce em forma de frase, e dizer as coisas com precisão é uma maneira de entender o mundo.',
    mecanismo:
      'O que esse aluno processa é a linguagem, o som, o ritmo, a estrutura e o sentido das palavras. A palavra não entra depois, só para vestir uma ideia já pronta. Ela é o próprio material com que a ideia se forma. No adolescente isso vira consciência. Ele sente a diferença entre dois jeitos de dizer a mesma coisa, percebe quando uma frase não fechou e caça a palavra exata. Não confunda com ser falante ou sociável. O filtro aqui é a linguagem como estrutura, e não a vontade de estar perto das pessoas.',
    naoDefine: [
      'Falar muito, ser desinibido ou "bom de papo"',
      'Escrever com letra caprichada ou sem erros de norma',
      'Ter vocabulário "adiantado" ou usar palavra difícil',
      'Gostar de ler: muita gente gosta',
      'Ser o mais extrovertido do grupo',
    ],
    revela: [
      'Ao explicar como pensou, entrega uma narrativa, não um gesto nem uma imagem.',
      'Reescreve a própria frase até soar certa; incomoda-se com a palavra imprecisa.',
      'Guarda e devolve a formulação exata: cita, ironiza, joga com duplo sentido.',
      'Pode ser o aluno calado que escreve páginas: o processamento é por dentro.',
    ],
    veMundo:
      'Para ele, o mundo chega em palavras antes de chegar de qualquer outro jeito. Não é que ele pense primeiro e traduza depois. As palavras já estão ali quando o pensamento começa. Por isso nota a diferença entre dois modos de dizer a mesma coisa e sente na hora quando uma frase ficou torta.',
    lente:
      'O mentor lapida a precisão e a construção do dizer, o argumento, a narrativa, o peso de cada palavra. No capítulo, vale pedir que ele defenda uma ideia, reescreva e dê nome às coisas, reparando se o caminho até a resposta passa pela linguagem.',
    observar: [
      'Peça que ele conte como pensou: repare quando a resposta vem em narrativa, não em gesto nem em imagem',
      'Quem reescreve a própria frase até soar certa e se incomoda com a palavra imprecisa',
      'Quem cita de memória a formulação exata, ironiza, brinca com o duplo sentido',
      'Pode ser o aluno calado que escreve páginas: o processamento é por dentro',
    ],
    cuidado: CUIDADO_F2,
  },
  2: {
    nome: 'Lógico-Matemática',
    cena:
      'Uma criança pequena derruba a colher do cadeirão. Você devolve. Ela derruba de novo, olhando para você, não para a colher. De novo. De novo. Não é birra, é um teste: ela verifica se o mundo responde sempre do mesmo jeito. É ciência sem nome, e é a mesma que reaparece anos depois. É a Casa de quem lê o mundo como um sistema, cheio de regras esperando para serem descobertas. Esse aluno pensa por "se isso, então aquilo", e procura o padrão antes de aceitar qualquer fato.',
    mecanismo:
      'Ele processa padrões, sequências e relações de causa e efeito. Não tem a ver com números nem com calcular rápido. Tem a ver com encadear uma coisa na outra, isolar a variável, testar a hipótese e exigir que a conclusão se sustente. O mundo chega como um conjunto de regras a decifrar, empurrado por uma pergunta que não para, por quê, e se, e de novo. No adolescente isso ganha rigor. Ele quer a demonstração e desconfia do "é assim porque sim".',
    naoDefine: [
      'Tirar nota alta em matemática ou calcular rápido',
      'Ser organizado, "certinho" ou obediente à rotina',
      'Ser calado ou "maduro para a idade"',
      'Responder depressa: velocidade não é o sinal',
      'Gostar de jogos de lógica: presença isolada não confirma',
    ],
    revela: [
      'Justifica a resposta mostrando a cadeia, não dizendo "só sei".',
      'Confere o próprio resultado procurando onde teria falhado.',
      'Descobre a regra num caso e já pergunta se vale nos outros.',
      'Pode parecer lento: está checando cada elo. A lentidão é método, não dificuldade.',
    ],
    veMundo:
      'O mundo chega como um sistema à espera de ser decifrado. Ele não decide procurar padrões, eles simplesmente aparecem. Nada passa como "é assim porque sim". Tudo vira relação de causa e efeito para testar, movido pela mesma pergunta que não descansa, por quê, e se, e de novo.',
    lente:
      'O mentor lapida o raciocínio que se sustenta sozinho, a hipótese, a prova, a coerência. No capítulo, peça que ele justifique e generalize, observando se chegou lá pela dedução ou pela sorte.',
    observar: [
      'Peça que ele justifique a resposta: repare quando mostra a cadeia ("se isso, então aquilo") em vez de dizer "só sei"',
      'Quem confere o próprio resultado procurando onde teria falhado',
      'Quem descobre a regra num caso e já pergunta se vale nos outros',
      'Pode parecer lento: está checando cada elo. A lentidão é método, não dificuldade',
    ],
    cuidado: CUIDADO_F2,
  },
  3: {
    nome: 'Espacial',
    cena:
      'Os navegadores das Ilhas Caroline cruzam centenas de quilômetros de oceano sem instrumentos. Eles não veem as ilhas enquanto navegam, eles as imaginam, um mapa vivo dentro da cabeça, atualizado a cada onda. É a Casa de quem pensa em imagens. Esse aluno enxerga a solução montada na cabeça antes de conseguir dizê-la, e representa o mundo por dentro em formas que gira, arma e desarma mentalmente.',
    mecanismo:
      'Ele processa formas, posições e relações no espaço. Não é sobre desenhar bem. É construir e mexer em imagens mentais, ver a peça já girada antes de encaixar, entender a estrutura inteira a partir das partes. Muitas vezes resolve antes de saber explicar, porque a resposta chega como figura, não como frase. Uma diferença fina ajuda a separar: aqui o pensamento é a imagem interna, enquanto na Casa Corporal o pensamento acontece no gesto.',
    naoDefine: [
      'Desenhar "bonito" ou ter traço caprichado',
      'Gostar de artes',
      'Ser caprichoso com o material',
      'Manter o caderno organizado',
      'Gostar de olhar imagens e vídeos',
    ],
    revela: [
      'Ao explicar, descreve uma imagem ("imaginei virado e já sabia onde ia"), não um passo a passo.',
      'Desenha mapa, esquema ou diagrama em vez de escrever.',
      'Gira a figura na cabeça e acerta de primeira; orienta-se por onde as coisas estão.',
      'Diz que enxergou a solução antes de conseguir escrevê-la.',
    ],
    veMundo:
      'Para ele, o mundo chega como imagem antes de virar palavra. Ele arma e gira figuras na cabeça, encaixa a peça mentalmente, vê o todo pelas partes. Costuma resolver antes de conseguir explicar, porque a saída aparece em forma, e não em frase. O que filtra o mundo para ele é a forma, a posição, o espaço.',
    lente:
      'O mentor lapida a visualização e a leitura de estrutura, o projetar, o mapear, o representar. No capítulo, ofereça o problema em forma de espaço e repare em quem responde construindo, não só falando.',
    observar: [
      'Peça que ele conte como chegou: repare quando a resposta é uma imagem ("imaginei virado e já sabia onde ia"), não um passo a passo',
      'Quem desenha mapa, esquema ou diagrama em vez de escrever',
      'Quem gira a figura na cabeça e acerta de primeira; orienta-se por onde as coisas estão',
      'Quem diz que enxergou a solução antes de conseguir escrevê-la',
    ],
    cuidado: CUIDADO_F2,
  },
  4: {
    nome: 'Musical',
    cena:
      'Yehudi Menuhin foi levado escondido a um concerto aos três anos. O som do violino o afetou de um jeito que os pais não esperavam e não haviam provocado. Ele insistiu, não pediu, insistiu em ter o próprio violino. A inteligência musical dele não esperou escola nem instrumento, já estava operando antes. É a Casa de quem organiza o mundo pelo som. Antes mesmo do significado, esse aluno já captou o padrão sonoro, e escuta ritmo, melodia e repetição como estrutura, não como enfeite.',
    mecanismo:
      'Ele processa padrões de som, o ritmo, a altura, a melodia, a repetição. Não é cantar afinado nem gostar de música. É um ouvido que acha a regra sonora, guarda uma sequência depois de escutar uma vez, sente que um tom mudou antes de saber explicar o quê. Para ele o som não atrapalha, ancora, e o silêncio total é que costuma incomodar mais. No adolescente isso vira estratégia consciente, ele transforma a matéria em ritmo ou rima para não esquecer.',
    naoDefine: [
      'Cantar afinado ou tocar um instrumento',
      'Gostar de música: quase todo mundo gosta',
      'Vir de família musical',
      'Dançar quando toca uma música',
      'Ficar quieto e atento quando há música',
    ],
    revela: [
      'Ao contar como memorizou, diz que "virou música na cabeça" ou que "achou o ritmo".',
      'Percebe rima, repetição e compasso onde os outros só veem texto.',
      'Marca a batida com o corpo enquanto faz outra tarefa: é o canal funcionando, não dispersão.',
      'Estranha a música conhecida num tom diferente.',
    ],
    veMundo:
      'O mundo chega para ele com textura sonora. Ele registra o ritmo e a melodia das coisas antes do sentido, e uma sequência ouvida uma vez fica guardada como estrutura. O som não dispersa, sustenta, e o silêncio absoluto é que atrapalha. O que ele procura primeiro é o padrão, o ritmo, a repetição que entrega a regra.',
    lente:
      'O mentor lapida a escuta que dá forma, o encontrar padrão, o compor, o ler o tempo e a repetição. No capítulo, deixe o som virar ferramenta de pensamento e veja quem organiza o mundo pelo ouvido.',
    observar: [
      'Peça que ele conte como memorizou: repare quando diz que "virou música na cabeça" ou "achou o ritmo"',
      'Quem percebe rima, repetição e compasso onde os outros só veem texto',
      'Quem marca a batida com o corpo enquanto faz outra tarefa: é o canal funcionando, não dispersão',
      'Quem estranha uma música conhecida num tom diferente',
    ],
    cuidado: CUIDADO_F2,
  },
  5: {
    nome: 'Corporal',
    cena:
      'Uma artesã experiente molda argila sem olhar para as mãos. As mãos sabem a pressão certa, a velocidade certa, o momento em que a argila cede. Se você perguntar como ela faz, ela dirá que você sente. Não é resposta evasiva, é a descrição exata de onde mora o conhecimento. É a Casa de quem pensa com o corpo. A compreensão vem no momento de fazer, não antes dele. Esse aluno resolve por movimento, toque e gesto, e o corpo dele não só executa o que a cabeça decidiu, ele pensa junto.',
    mecanismo:
      'Ele resolve os problemas pelo corpo, pelo movimento, pelo toque, pelo ajuste fino de peso, equilíbrio e tempo. O saber mora no gesto. Ele sabe fazer antes de saber explicar, e quando você pergunta como, mostra de novo em vez de contar. Aqui mora uma distinção importante. Isso não é agitação nem impulsividade. Impulsividade é mexer sem processar; esta Casa é mexer para processar. E também não se confunde com motricidade fina, que é habilidade treinável.',
    naoDefine: [
      'Ser agitado ou "não parar quieto"',
      'Ser bom de esporte, rápido ou habilidoso',
      'Ser "bagunceiro" ou difícil de conter',
      'Gostar de atividade física: muita gente gosta',
      'Ter boa motricidade fina: é habilidade treinável, é outra coisa',
    ],
    revela: [
      'Só firma o que aprendeu depois de manipular, montar, escrever com a própria mão.',
      'Ao explicar, o gesto vem antes da palavra: gesticula, encena, refaz o movimento.',
      'Tem intuição de peso e equilíbrio que a conta não dá.',
      'Reconhece de si que precisa fazer para entender, e pede para pôr a mão.',
    ],
    veMundo:
      'O mundo chega para ele pelo corpo antes de chegar pela cabeça. A compreensão acontece na hora em que as mãos fazem. Ele sabe fazer antes de explicar, e se você pergunta como, ele repete o gesto. Não é agitação. Mexer sem processar é impulsividade; aqui, o mexer é o próprio processar. O filtro é o fazer.',
    lente:
      'O mentor lapida a inteligência que se prova fazendo, a precisão do gesto, o domínio do próprio corpo, o pensar com as mãos. No capítulo, abra o canal do fazer e note a diferença entre quem se mexe para pensar e quem só não para quieto.',
    observar: [
      'Peça que ele conte como fez: repare quando a resposta é "eu senti", "a mão pegou o jeito", ou quando refaz o gesto para explicar',
      'Quem só firma o que aprendeu depois de manipular, montar, escrever com a própria mão',
      'Quem, ao explicar, usa o corpo junto: gesticula, encena, mostra o movimento',
      'Quem reconhece de si que precisa fazer para entender, e pede para pôr a mão',
    ],
    cuidado: CUIDADO_F2,
  },
  6: {
    nome: 'Naturalista',
    cena:
      'Charles Darwin, quando menino, colecionava besouros. Não como passatempo, mas como necessidade: precisava encontrá-los, nomeá-los, separá-los. Décadas depois, essa mesma compulsão por distinções produziu a teoria da evolução. É a Casa de quem lê o mundo classificando. A diferença salta aos olhos antes mesmo de ele procurar por ela. Esse aluno enxerga o que é igual, o que é diferente e onde passa a fronteira entre um grupo e outro.',
    mecanismo:
      'Ele reconhece padrões e cria categorias. Percebe o desvio, o intruso, a exceção que quase pertence mas não pertence. Não tem a ver com gostar de natureza. É um olhar que organiza qualquer variedade em famílias, e funciona sobre dados, obras, espécies, estilos. Vale separar da Lógica: a Lógica busca a regra causal, o porquê de acontecer, enquanto a Naturalista busca a taxonomia, a que grupo aquilo pertence.',
    naoDefine: [
      'Gostar de natureza, de animais ou de plantas',
      'Preferir ficar ao ar livre',
      'Ser quieto e observador',
      'Saber nomes de espécies de cor',
      'Cuidar bem de um bicho de estimação',
    ],
    revela: [
      'Ao explicar como separou, nomeia os critérios e sabe onde termina um grupo e começa outro.',
      'Percebe diferenças finas que passam batido; organiza a matéria em tabelas e famílias sem pedirem.',
      'Ao comparar dois exemplos, aponta na hora o que os separa.',
      'Pode parecer desligado quando não há nada para comparar: é a inteligência sem material, não desinteresse.',
    ],
    veMundo:
      'O mundo chega para ele já separado em categorias. Diante de qualquer conjunto, dados, obras, espécies, estilos, a cabeça começa a trabalhar sozinha. O que é igual? O que é diferente? Onde um grupo termina e outro começa? Ele não decide reparar na diferença, ela salta antes de ele pensar em procurá-la.',
    lente:
      'O mentor lapida o olhar que distingue e ordena, o comparar, o categorizar, o mapear diferenças. No capítulo, dê conjuntos para ele organizar e repare no critério que ele cria por conta própria.',
    observar: [
      'Peça que ele explique o critério: repare quando nomeia as categorias e sabe onde termina um grupo e começa outro',
      'Quem percebe diferenças finas que passam batido: a exceção, o que quase pertence mas não',
      'Quem organiza a matéria em famílias, tabelas ou grupos sem ninguém pedir',
      'Pode parecer desligado quando não há nada para comparar: é a inteligência sem material, não desinteresse',
    ],
    cuidado: CUIDADO_F2,
  },
  7: {
    nome: 'Interpessoal',
    cena:
      'Anne Sullivan chegou para ensinar Helen Keller, cega, surda, fechada, quase sem treinamento formal. Em poucas semanas entendeu o que nenhum adulto ao redor tinha visto: Helen não precisava de disciplina, precisava de conexão. Ela leu o estado interno de uma criança sem linguagem, sem expressão visível. É a Casa de quem lê as pessoas. Para esse aluno, a realidade é feita de gente e do que acontece entre as pessoas, e ele percebe humores, intenções e o clima de um grupo antes de qualquer conversa começar.',
    mecanismo:
      'Ele processa o mundo interno dos outros, o estado de ânimo, a intenção, a tensão numa voz que parece tranquila. Não é ser simpático nem popular. É captar diferenças finas de estado que a maioria não nota e ajustar o próprio jeito a partir dessa leitura. Não confunda com a Linguística, porque falar bem é linguagem, e ler o que o outro sente é interpessoal. Um cuidado: a mesma leitura serve tanto para acalmar quanto para manipular. A bússola ética ainda está se formando, e é justamente isso que o mentor acompanha.',
    naoDefine: [
      'Ser simpático, popular ou ter muitos amigos',
      'Ser "o líder" ou o mais falante',
      'Ser carinhoso com todo mundo',
      'Gostar de trabalhar em grupo: muita gente gosta',
      'Ser "o ajudante" do professor',
    ],
    revela: [
      'Percebe o colega mal antes dos outros e aponta o sinal ("ficou quieto, e não é assim que ele é").',
      'Lê a dinâmica do grupo: quem puxou, quem cedeu, quem ficou de fora.',
      'Ajusta o próprio jeito conforme quem tem pela frente, e reconhece que faz isso.',
      'Pode ser o quieto da beirada que lê a sala inteira em silêncio.',
    ],
    veMundo:
      'O mundo chega para ele através das pessoas. Antes de qualquer conversa, ele já registrou o estado de cada um, a postura, o desvio do olhar, a tensão numa voz que soa normal. O filtro dele é relacional, a realidade é feita de gente e do que passa entre ela. E como a mesma leitura serve para acalmar ou para manipular, a bússola ética ainda está em construção.',
    lente:
      'O mentor lapida a leitura do outro com direção ética, o cooperar, o mediar, o liderar sem usar ninguém. No capítulo, dê papéis que exijam coordenar gente e observe como o aluno lê o grupo e responde a ele.',
    observar: [
      'Peça que ele conte como percebeu: repare quando aponta o sinal ("ficou quieto", "mudou o tom") em vez de dizer "só sei"',
      'Quem lê a dinâmica do grupo e sabe dizer quem puxou, quem cedeu, quem ficou de fora',
      'Quem ajusta o próprio jeito conforme quem tem pela frente, e reconhece que faz isso',
      'Pode ser o quieto da beirada que lê a sala inteira em silêncio',
    ],
    cuidado: CUIDADO_F2,
  },
  8: {
    nome: 'Intrapessoal',
    cena:
      'Virginia Woolf, num ensaio, descreve momentos da infância com uma clareza que vai além da memória. Ela não só lembra o que aconteceu, sabe dizer o que sentiu, por que sentiu, e como a sensação virou compreensão. É a Casa de quem lê o próprio mundo interno. O sentimento chega para ela já com nome, antes de virar reação. Esse aluno acessa o que sente, por que sente e do que precisa, com uma precisão rara.',
    mecanismo:
      'Ele processa o próprio estado interno. Distingue sentimentos que para os outros pareceriam a mesma coisa, não era raiva, era frustração, e usa isso para decidir. É a mais reservada das oito e quase nunca aparece sozinha, precisa de outra porta para se mostrar, a fala, o desenho, o corpo. Não confunda com a Interpessoal, porque uma lê o outro e esta lê a si mesma. E não confunda com timidez, o sinal aqui é a precisão com que ele fala de si, não o silêncio.',
    naoDefine: [
      'Ser tímido, quieto ou "na dele"',
      'Preferir trabalhar sozinho',
      'Sentir "demais" ou se emocionar fácil',
      'Ser calmo e dar pouco trabalho',
      'Ser reservado: reserva não é o sinal, a precisão do autorrelato é',
    ],
    revela: [
      'Ao ser perguntado por que reagiu assim, não se defende, se explica ("travei porque não entendi e fiquei com vergonha de perguntar").',
      'Reconhece o próprio limite no dia e sabe pedir o que ajuda (mais tempo, um canto, silêncio).',
      'Depois de um erro, reconstrói por dentro sem culpar só o de fora.',
      'Escolhe tarefas e parcerias sabendo de si.',
    ],
    veMundo:
      'O mundo chega para ele filtrado pelo estado interno. Antes de reagir, existe um instante em que ele registra como está e por quê. O que para os outros é um sentimento embolado, para ele já vem separado, não era raiva, era frustração. A experiência de dentro vira informação antes de virar comportamento.',
    lente:
      'O mentor lapida o autoconhecimento que guia a ação, o nomear o próprio estado, o se regular, o escolher com consciência. No capítulo, abra espaço para a reflexão e repare na precisão com que o aluno se lê, sem confundir quem é reservado com quem não tem o que mostrar.',
    observar: [
      'Peça que ele conte o que passou por dentro: repare quando separa o que sentiu, por que sentiu e do que precisava',
      'Quem reconhece o próprio limite no dia e sabe pedir o que ajuda (mais tempo, um canto, silêncio)',
      'Quem, depois de um erro, reconstrói por dentro sem culpar só o de fora',
      'Quem escolhe tarefas e parcerias sabendo de si',
    ],
    cuidado: CUIDADO_F2,
  },
};

/**
 * SANTUÁRIO F2 no formato SantuarioMecanismo: cores herdadas do SANTUARIO_INFANTIL
 * (identidade comum dos 12 anos), campos de texto sobrescritos pela versão F2.
 */
export const SANTUARIO_F2: Record<number, SantuarioMecanismo> = Object.fromEntries(
  Object.entries(F2).map(([k, v]) => {
    const id = Number(k);
    return [id, { ...SANTUARIO_INFANTIL[id], ...v }];
  })
) as Record<number, SantuarioMecanismo>;

/**
 * "UMA ATIVIDADE, OITO CAMINHOS" do F2: o MESMO projeto de capítulo, lido pela
 * porta de cada uma das oito Casas. Espelha o ATIVIDADE_OITO_CAMINHOS_F1 (o
 * cartaz em grupo), na linguagem do adolescente e do trabalho por capítulo. O
 * mentor entende cada Casa COMPARANDO: o caminho é o que importa, não o produto.
 */
export const ATIVIDADE_OITO_CAMINHOS_F2 = {
  titulo: 'Uma atividade, oito caminhos',
  atividade: 'O projeto em grupo',
  intro:
    'O mesmo projeto de capítulo, o mesmo tema, o mesmo grupo. Repare por onde cada aluno entra, porque o caminho é o que importa, não o resultado pronto.',
  caminhos: {
    1: 'Assume o texto e o argumento: escolhe as palavras, cuida do roteiro, defende a ideia. O tema só fica real depois que vira discurso preciso.',
    2: 'Quer a estrutura antes de agir: a ordem do argumento, a causa e o efeito, a evidência que sustenta cada afirmação. O projeto só anda quando a lógica fecha.',
    3: 'Enxerga o resultado montado antes de existir: o layout, o palco, onde entra cada parte, quanto espaço cabe em cada uma. Distribui tudo na cabeça antes de começar.',
    4: 'Transforma o conteúdo em som: um refrão para apresentar, um ritmo de fala, ou marca o compasso do que precisa fixar. O que precisa decorar, fixa cantarolando.',
    5: 'Pega o material e testa fazendo: protótipo, ensaio, encenação. Entende o projeto no fazer, e na hora de apresentar é o corpo que conta, com gesto e presença.',
    6: 'Diante do monte de informações, começa classificando: por tipo, o que pertence, o que é exceção. Acha na hora o dado fora do lugar. O projeto vira uma coleção posta em ordem.',
    7: 'Organiza o grupo: distribui os papéis, percebe quem ficou de fora e chama, resolve o impasse. O trabalho anda porque é ele que costura as pessoas.',
    8: 'Escolhe a parte que combina com ele e faz no próprio ritmo. Sabe dizer "essa parte não é pra mim, me deixa cuidar do texto". Entra sabendo exatamente o que quer.',
  } as Record<number, string>,
};
