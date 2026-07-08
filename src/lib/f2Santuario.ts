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
 *   dos 12 anos). `nome` é sobrescrito pelos nomes CURTOS aprovados do F2
 *   (Corporal, não Corporal-Cinestésica).
 * - `cena`: abertura do gênio (verbatim do f1Santuario) + a essência da Casa
 *   (conteúdo aprovado do F2).
 * - `mecanismo`, `revela`, `lente` (o que o mentor cultiva), `cuidado`: conteúdo
 *   APROVADO do F2 (o mecanismo mais denso, o "como se revela no adolescente", o
 *   "o que o mentor cultiva", a linha de guarda), verbatim.
 * - `naoDefine`, `veMundo`, `observar`: base do SANTUARIO_INFANTIL adaptada à
 *   LINGUAGEM do F2 (aluno/adolescente, o mentor que pergunta como o aluno fez).
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
      'Charles Dickens, antes de publicar qualquer livro, enchia cadernos com descrições das pessoas que via na rua. Não era exercício: era necessidade. A Casa de quem pensa em palavras, onde a experiência chega já narrada. Une quem organiza o pensamento em nomes, ritmos e histórias, e para quem dizer com precisão é uma forma de entender.',
    mecanismo:
      'Processa o mundo pela linguagem: som, ritmo, estrutura e significado das palavras. A palavra não veste o pensamento depois de pronto: a palavra é o material com que o pensamento se faz. No adolescente vira consciência: ele sente a diferença entre dois jeitos de dizer a mesma coisa, percebe quando uma frase não fechou, caça a palavra exata. Não é ser falante ou sociável: o filtro é a linguagem como estrutura, não a vontade de estar entre pessoas.',
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
      'O mundo chega em palavras antes de chegar em qualquer outra coisa. Ele não pensa e depois traduz em frase: as palavras já estão lá quando o pensamento começa. Sente a diferença entre dois jeitos de dizer a mesma coisa e percebe quando uma frase não fechou. O filtro é a linguagem como estrutura: a experiência chega narrada.',
    lente:
      'Lapida a precisão e a arquitetura do dizer: argumento, narrativa, o peso de cada palavra. No capítulo, pede que ele defenda, reescreva e nomeie, e observa se o caminho até a resposta vem em linguagem.',
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
      'Uma criança pequena derruba a colher do cadeirão. Você devolve. Ela derruba de novo: olhando para você, não para a colher. De novo. De novo. Não é birra: é um teste, ela verifica se o mundo responde sempre do mesmo jeito. É ciência sem nome, e é a mesma que reaparece anos depois. A Casa de quem lê o mundo como sistema, onde tudo é regra esperando ser descoberta. Une quem processa por "se isso, então aquilo": a busca do padrão antes da aceitação do fato.',
    mecanismo:
      'Processa padrões, sequências e relações de causa e efeito. Não é sobre números nem velocidade de cálculo: é encadear, isolar a variável, testar a hipótese, exigir que a conclusão se sustente. O mundo chega como conjunto de regras a decifrar, movido pela pergunta que não para: por quê, e se, e de novo. No adolescente ganha rigor: quer a demonstração, desconfia do "é assim porque sim".',
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
      'O mundo chega como sistema esperando ser decifrado. Ele não decide procurar padrões: eles aparecem. Nada é aceito como "é assim porque sim"; tudo é relação de causa e efeito a testar. O filtro é a pergunta que não para: por quê, e se, e de novo.',
    lente:
      'Lapida o raciocínio que se sustenta: hipótese, prova, coerência. No capítulo, pede que ele justifique e generalize, e observa se chega pela dedução ou pela sorte.',
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
      'Os navegadores das Ilhas Caroline cruzam centenas de quilômetros de oceano sem instrumentos. Eles não veem as ilhas enquanto navegam: eles as imaginam; um mapa vivo, dentro da cabeça, atualizado a cada onda. A Casa de quem pensa em imagens, onde a solução é vista antes de ser dita. Une quem representa o mundo por dentro em formas que gira, monta e desmonta na cabeça.',
    mecanismo:
      'Processa formas, posições e relações no espaço. Não é desenhar bem: é construir e manipular imagens mentais, ver a peça girada antes de encaixar, enxergar a estrutura do todo pelas partes. Muitas vezes resolve antes de conseguir explicar, porque a solução chega como figura, não como frase. Distinção fina: aqui o pensamento É a imagem interna; na Casa Corporal o pensamento acontece no gesto.',
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
      'O mundo chega como imagem antes de chegar como palavra. Ele constrói e manipula figuras mentais: gira a peça na cabeça antes de encaixar, enxerga a estrutura do todo pelas partes. Muitas vezes resolve antes de conseguir explicar, porque a solução chega como forma, não como frase. O filtro é a forma, a posição, a relação no espaço.',
    lente:
      'Lapida a visualização e a leitura de estrutura: projetar, mapear, representar. No capítulo, oferece o problema em forma de espaço e observa quem responde construindo, não só falando.',
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
      'Yehudi Menuhin foi levado escondido a um concerto aos três anos. O som do violino o afetou de um jeito que os pais não esperavam e não haviam provocado. Ele insistiu, não pediu, insistiu: em ter o próprio violino. A inteligência musical dele não esperou escola nem instrumento: estava operando antes. A Casa de quem organiza o mundo pelo som, onde o padrão sonoro chega antes do significado. Une quem pega ritmo, melodia e repetição como estrutura, não como enfeite.',
    mecanismo:
      'Processa padrões de som: ritmo, altura, melodia, repetição. Não é cantar afinado nem gostar de música: é o ouvido que encontra a regra sonora, guarda uma sequência ouvida uma vez, sente que um tom mudou antes de saber dizer o quê. O som não distrai, ancora: o silêncio absoluto pode ser o que mais atrapalha. No adolescente vira estratégia consciente: transforma matéria em ritmo ou rima para guardar.',
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
      'O mundo chega com textura sonora. Ele registra o ritmo e a melodia das coisas antes do significado; uma sequência ouvida uma vez fica como estrutura interna. O som não distrai, ancora: o silêncio absoluto pode ser o que mais atrapalha. O filtro procura primeiro o padrão: o ritmo, a repetição que revela a regra.',
    lente:
      'Lapida a escuta que estrutura: encontrar padrão, compor, ler o tempo e a repetição. No capítulo, deixa o som ser ferramenta de pensamento e observa quem organiza o mundo pelo ouvido.',
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
      'Uma artesã experiente molda argila sem olhar para as mãos. As mãos sabem a pressão certa, a velocidade certa, o momento em que a argila cede. Se você perguntar como ela faz, ela dirá: "você sente". Não é resposta evasiva: é a descrição exata de onde mora o conhecimento. A Casa de quem pensa com o corpo, onde a compreensão acontece no fazer, não antes dele. Une quem resolve por movimento, toque e gesto: o corpo não executa o que a cabeça decidiu, o corpo pensa junto.',
    mecanismo:
      'Processa e resolve problemas pelo corpo: movimento, toque, ajuste fino de peso, equilíbrio e tempo. O saber mora no gesto: sabe fazer antes de saber explicar, e quando você pergunta como, mostra de novo em vez de contar. Distinção crítica: não é agitação nem impulsividade. Impulsividade é mover-se sem processar; a Casa Corporal é mover-se PARA processar. E não é o mesmo que motricidade fina treinável.',
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
      'O mundo chega pelo corpo antes de chegar pelo pensamento. A compreensão acontece no momento em que as mãos fazem: sabe fazer antes de saber explicar, e quando você pergunta como, mostra de novo. Não é agitação: mover-se sem processar é impulsividade; aqui é mover-se PARA processar. O filtro é o fazer.',
    lente:
      'Lapida a inteligência que se prova no fazer: precisão do gesto, domínio do próprio corpo, o pensar manipulando. No capítulo, abre o canal do fazer e observa a diferença entre quem se move para pensar e quem só não para.',
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
      'Charles Darwin, quando menino, colecionava besouros. Não como passatempo, como necessidade: precisava encontrá-los, nomeá-los, separá-los. Décadas depois, essa mesma compulsão por distinções produziu a teoria da evolução. A Casa de quem lê o mundo classificando, onde a distinção chega antes da decisão de percebê-la. Une quem enxerga o que é igual, o que é diferente e onde passa a fronteira entre um grupo e outro.',
    mecanismo:
      'Reconhece padrões e cria categorias: percebe o desvio, o intruso, a exceção que quase pertence mas não. Não é gostar de natureza: é o olhar que organiza qualquer variedade em famílias, e opera sobre dados, obras, espécies, estilos. Distinção fina com a Lógica: a lógica busca a regra causal (por que acontece); a naturalista busca a taxonomia (a que grupo pertence).',
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
      'O mundo chega em categorias. Diante de qualquer conjunto, dados, obras, espécies, estilos, a inteligência começa a trabalhar: o que é igual? o que é diferente? onde termina um grupo e começa outro? Ele não decide perceber a distinção: ela já chegou antes da decisão de percebê-la.',
    lente:
      'Lapida o olhar que distingue e ordena: comparar, categorizar, mapear diferenças. No capítulo, dá conjuntos para organizar e observa o critério que o aluno cria sozinho.',
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
      'Anne Sullivan chegou para ensinar Helen Keller; cega, surda, fechada, quase sem treinamento formal. Em poucas semanas entendeu o que nenhum adulto ao redor tinha visto: Helen não precisava de disciplina. Precisava de conexão. Ela leu o estado interno de uma criança sem linguagem, sem expressão visível. A Casa de quem lê as pessoas, onde a realidade é feita de gente e do que se passa entre elas. Une quem percebe humores, intenções e o clima de um grupo antes de qualquer conversa.',
    mecanismo:
      'Processa o mundo interno dos outros: estados de ânimo, intenção, a tensão numa voz que parece normal. Não é ser simpático nem popular: é registrar diferenças finas de estado que a maioria não nota e ajustar o comportamento a partir dessa leitura. Não confundir com a Linguística (falar bem é linguagem; ler o que o outro sente é interpessoal). Atenção: a mesma leitura serve para acalmar ou para manipular. A bússola ética ainda está em construção, e é o que o mentor acompanha.',
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
      'O mundo chega através das pessoas. Ele registra o estado de cada um antes de qualquer conversa: a postura, o desvio do olhar, a tensão numa voz que parece normal. O filtro é relacional: a realidade é feita de gente e do que se passa entre elas. A mesma leitura serve para acalmar ou para manipular, e a bússola ética ainda está em construção.',
    lente:
      'Lapida a leitura do outro com direção ética: cooperar, mediar, liderar sem instrumentalizar. No capítulo, dá papéis que exigem coordenar gente e observa como o aluno lê o grupo e responde a ele.',
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
      'Virginia Woolf, num ensaio, descreve momentos da infância com uma clareza que vai além da memória: ela não só lembra o que aconteceu; sabe dizer o que sentiu, por que sentiu, e como a sensação virou compreensão. A Casa de quem lê o próprio mundo interno, onde o sentimento chega com etiqueta antes de virar comportamento. Une quem acessa o que sente, por que sente e do que precisa, com uma precisão rara.',
    mecanismo:
      'Processa o próprio estado interno: distingue sentimentos que para os outros parecem iguais ("não era raiva, era frustração") e usa isso para decidir. É a mais reservada das oito, quase nunca aparece sozinha: precisa de outra porta (a fala, o desenho, o corpo) para se mostrar. Não confundir com a Interpessoal (uma lê o outro, a outra lê a si). E não confundir com timidez: o sinal é a precisão do autorrelato, não o silêncio.',
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
      'O mundo chega filtrado pelo estado interno. Antes de reagir, há um instante em que a inteligência registra como ele está e por quê. O que para outros é um sentimento embolado, para ele chega com etiqueta: não era raiva, era frustração. A experiência interna vira informação antes de virar comportamento.',
    lente:
      'Lapida o autoconhecimento que orienta a ação: nomear o próprio estado, regular, escolher com consciência. No capítulo, abre espaço de reflexão e observa a precisão com que o aluno se lê, sem confundir reserva com ausência.',
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
    'O mesmo projeto de capítulo, o mesmo tema, o mesmo grupo. Repare por onde cada aluno entra: o caminho é o que importa, não o resultado pronto.',
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
