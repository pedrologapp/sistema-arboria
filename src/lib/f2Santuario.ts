/**
 * Santuário das 8 Casas, versão FUNDAMENTAL 2.
 *
 * Conteúdo aprovado pelo Fundador (aba Inteligências do F2). Cada Casa carrega o
 * mesmo mecanismo dos 12 anos, mas na voz do adolescente: como se revela na idade
 * do F2, o que o MENTOR cultiva no capítulo, e a referência (o gênio) preservada
 * do Infantil/F1 por continuidade. A `cor` é a cor oficial da inteligência (a
 * língua comum dos segmentos); `corVeu` é o tom pré-mesclado ao índigo do fundo
 * imersivo, pra não depender de color-mix em runtime.
 *
 * A linha `cuidado` é a MESMA em todas as Casas: a guarda anti-rótulo (autorrelato
 * é porta, silêncio não é ausência, toda pessoa tem as oito). É o que impede a
 * Casa de virar caixa que classifica aluno.
 *
 * `brasao` = caminho do brasão público por id (o mesmo do seed das inteligências).
 * A tela usa o brasão quando existe; senão, um escudo na cor da Casa.
 */

export interface SantuarioCasa {
  casaNome: string;
  cor: string;
  corVeu: string;
  brasao: string;
  essencia: string;
  mecanismo: string;
  revela: string[];
  cultiva: string;
  referencia: string;
  cuidado: string;
}

/**
 * A moldura do topo da aba (o "o que esta aba NÃO é"). Fica visível como cabeçalho
 * de estudo, deixando claro que é identidade, nunca checklist. Texto aprovado.
 */
export const MOLDURA_F2 = {
  titulo: 'Antes de tudo, o que esta aba NÃO é.',
  corpo:
    'Aqui é estudo e identidade, nunca um checklist para classificar aluno. Toda pessoa tem as oito inteligências: o que varia é a predominância. O autorrelato do adolescente (ele já se enxerga) é uma porta, não uma prova. E silêncio numa Casa não é ausência: pode ser um canal ainda fechado.',
} as const;

/** A linha de guarda, idêntica em todas as Casas (blindagem anti-rótulo). */
export const CUIDADO_F2 =
  'O autorrelato é porta, não prova. Silêncio nesta Casa não é ausência, pode ser um canal ainda fechado. Toda pessoa tem as oito, esta é a que abre mais fácil.';

/** Brasão público por id (mesmos arquivos do seed das inteligências). */
const BRASAO: Record<number, string> = {
  1: '/brasoes/linguistica.png',
  2: '/brasoes/logico_matematica.png',
  3: '/brasoes/espacial.png',
  4: '/brasoes/musical.png',
  5: '/brasoes/corporal_cinestesica.png',
  6: '/brasoes/logonaturalista.png',
  7: '/brasoes/interpessoal.png',
  8: '/brasoes/intrapessoal.png',
};

export const SANTUARIO_F2: Record<number, SantuarioCasa> = {
  1: {
    casaNome: 'Linguística',
    cor: '#1E3A8A',
    corVeu: '#293695',
    brasao: BRASAO[1],
    essencia:
      'A Casa de quem pensa em palavras, onde a experiência chega já narrada. Une quem organiza o pensamento em nomes, ritmos e histórias, e para quem dizer com precisão é uma forma de entender.',
    mecanismo:
      'Processa o mundo pela linguagem: som, ritmo, estrutura e significado das palavras. A palavra não veste o pensamento depois de pronto: a palavra é o material com que o pensamento se faz. No adolescente vira consciência: ele sente a diferença entre dois jeitos de dizer a mesma coisa, percebe quando uma frase não fechou, caça a palavra exata. Não é ser falante ou sociável: o filtro é a linguagem como estrutura, não a vontade de estar entre pessoas.',
    revela: [
      'Ao explicar como pensou, entrega uma narrativa, não um gesto nem uma imagem.',
      'Reescreve a própria frase até soar certa; incomoda-se com a palavra imprecisa.',
      'Guarda e devolve a formulação exata: cita, ironiza, joga com duplo sentido.',
      'Pode ser o aluno calado que escreve páginas: o processamento é por dentro.',
    ],
    cultiva:
      'Lapida a precisão e a arquitetura do dizer: argumento, narrativa, o peso de cada palavra. No capítulo, pede que ele defenda, reescreva e nomeie, e observa se o caminho até a resposta vem em linguagem.',
    referencia:
      'Charles Dickens enchia cadernos com descrições das pessoas na rua antes de publicar qualquer livro. Âncora do mecanismo: a Casa não fabrica escritores, revela quem pega o mundo pela palavra.',
    cuidado: CUIDADO_F2,
  },
  2: {
    casaNome: 'Lógico-Matemática',
    cor: '#047857',
    corVeu: '#0A5A47',
    brasao: BRASAO[2],
    essencia:
      'A Casa de quem lê o mundo como sistema, onde tudo é regra esperando ser descoberta. Une quem processa por "se isso, então aquilo": a busca do padrão antes da aceitação do fato.',
    mecanismo:
      'Processa padrões, sequências e relações de causa e efeito. Não é sobre números nem velocidade de cálculo: é encadear, isolar a variável, testar a hipótese, exigir que a conclusão se sustente. O mundo chega como conjunto de regras a decifrar, movido pela pergunta que não para: por quê, e se, e de novo. No adolescente ganha rigor: quer a demonstração, desconfia do "é assim porque sim".',
    revela: [
      'Justifica a resposta mostrando a cadeia, não dizendo "só sei".',
      'Confere o próprio resultado procurando onde teria falhado.',
      'Descobre a regra num caso e já pergunta se vale nos outros.',
      'Pode parecer lento: está checando cada elo. A lentidão é método, não dificuldade.',
    ],
    cultiva:
      'Lapida o raciocínio que se sustenta: hipótese, prova, coerência. No capítulo, pede que ele justifique e generalize, e observa se chega pela dedução ou pela sorte.',
    referencia:
      'A criança que derruba a colher olhando para o adulto, não para a colher, para ver se o mundo responde sempre igual. É ciência sem nome, a mesma que reaparece no adolescente que exige prova.',
    cuidado: CUIDADO_F2,
  },
  3: {
    casaNome: 'Espacial',
    cor: '#7C3AED',
    corVeu: '#5B2FA6',
    brasao: BRASAO[3],
    essencia:
      'A Casa de quem pensa em imagens, onde a solução é vista antes de ser dita. Une quem representa o mundo por dentro em formas que gira, monta e desmonta na cabeça.',
    mecanismo:
      'Processa formas, posições e relações no espaço. Não é desenhar bem: é construir e manipular imagens mentais, ver a peça girada antes de encaixar, enxergar a estrutura do todo pelas partes. Muitas vezes resolve antes de conseguir explicar, porque a solução chega como figura, não como frase. Distinção fina: aqui o pensamento É a imagem interna; na Casa Corporal o pensamento acontece no gesto.',
    revela: [
      'Ao explicar, descreve uma imagem ("imaginei virado e já sabia onde ia"), não um passo a passo.',
      'Desenha mapa, esquema ou diagrama em vez de escrever.',
      'Gira a figura na cabeça e acerta de primeira; orienta-se por onde as coisas estão.',
      'Diz que enxergou a solução antes de conseguir escrevê-la.',
    ],
    cultiva:
      'Lapida a visualização e a leitura de estrutura: projetar, mapear, representar. No capítulo, oferece o problema em forma de espaço e observa quem responde construindo, não só falando.',
    referencia:
      'Os navegadores das Ilhas Caroline cruzam o oceano sem instrumentos, com um mapa vivo dentro da cabeça, atualizado a cada onda.',
    cuidado: CUIDADO_F2,
  },
  4: {
    casaNome: 'Musical',
    cor: '#7F1D1D',
    corVeu: '#5F2434',
    brasao: BRASAO[4],
    essencia:
      'A Casa de quem organiza o mundo pelo som, onde o padrão sonoro chega antes do significado. Une quem pega ritmo, melodia e repetição como estrutura, não como enfeite.',
    mecanismo:
      'Processa padrões de som: ritmo, altura, melodia, repetição. Não é cantar afinado nem gostar de música: é o ouvido que encontra a regra sonora, guarda uma sequência ouvida uma vez, sente que um tom mudou antes de saber dizer o quê. O som não distrai, ancora: o silêncio absoluto pode ser o que mais atrapalha. No adolescente vira estratégia consciente: transforma matéria em ritmo ou rima para guardar.',
    revela: [
      'Ao contar como memorizou, diz que "virou música na cabeça" ou que "achou o ritmo".',
      'Percebe rima, repetição e compasso onde os outros só veem texto.',
      'Marca a batida com o corpo enquanto faz outra tarefa: é o canal funcionando, não dispersão.',
      'Estranha a música conhecida num tom diferente.',
    ],
    cultiva:
      'Lapida a escuta que estrutura: encontrar padrão, compor, ler o tempo e a repetição. No capítulo, deixa o som ser ferramenta de pensamento e observa quem organiza o mundo pelo ouvido.',
    referencia:
      'Yehudi Menuhin, levado escondido a um concerto aos três anos, insistiu, não pediu, em ter o próprio violino. A inteligência operava antes da escola.',
    cuidado: CUIDADO_F2,
  },
  5: {
    casaNome: 'Corporal',
    cor: '#B8860B',
    corVeu: '#8A6A2E',
    brasao: BRASAO[5],
    essencia:
      'A Casa de quem pensa com o corpo, onde a compreensão acontece no fazer, não antes dele. Une quem resolve por movimento, toque e gesto: o corpo não executa o que a cabeça decidiu, o corpo pensa junto.',
    mecanismo:
      'Processa e resolve problemas pelo corpo: movimento, toque, ajuste fino de peso, equilíbrio e tempo. O saber mora no gesto: sabe fazer antes de saber explicar, e quando você pergunta como, mostra de novo em vez de contar. Distinção crítica: não é agitação nem impulsividade. Impulsividade é mover-se sem processar; a Casa Corporal é mover-se PARA processar. E não é o mesmo que motricidade fina treinável.',
    revela: [
      'Só firma o que aprendeu depois de manipular, montar, escrever com a própria mão.',
      'Ao explicar, o gesto vem antes da palavra: gesticula, encena, refaz o movimento.',
      'Tem intuição de peso e equilíbrio que a conta não dá.',
      'Reconhece de si que precisa fazer para entender, e pede para pôr a mão.',
    ],
    cultiva:
      'Lapida a inteligência que se prova no fazer: precisão do gesto, domínio do próprio corpo, o pensar manipulando. No capítulo, abre o canal do fazer e observa a diferença entre quem se move para pensar e quem só não para.',
    referencia:
      'A artesã que molda a argila sem olhar para as mãos e, perguntada como faz, responde "você sente". Não é evasiva: é a descrição exata de onde mora o conhecimento.',
    cuidado: CUIDADO_F2,
  },
  6: {
    casaNome: 'Naturalista',
    cor: '#78350F',
    corVeu: '#5E3320',
    brasao: BRASAO[6],
    essencia:
      'A Casa de quem lê o mundo classificando, onde a distinção chega antes da decisão de percebê-la. Une quem enxerga o que é igual, o que é diferente e onde passa a fronteira entre um grupo e outro.',
    mecanismo:
      'Reconhece padrões e cria categorias: percebe o desvio, o intruso, a exceção que quase pertence mas não. Não é gostar de natureza: é o olhar que organiza qualquer variedade em famílias, e opera sobre dados, obras, espécies, estilos. Distinção fina com a Lógica: a lógica busca a regra causal (por que acontece); a naturalista busca a taxonomia (a que grupo pertence).',
    revela: [
      'Ao explicar como separou, nomeia os critérios e sabe onde termina um grupo e começa outro.',
      'Percebe diferenças finas que passam batido; organiza a matéria em tabelas e famílias sem pedirem.',
      'Ao comparar dois exemplos, aponta na hora o que os separa.',
      'Pode parecer desligado quando não há nada para comparar: é a inteligência sem material, não desinteresse.',
    ],
    cultiva:
      'Lapida o olhar que distingue e ordena: comparar, categorizar, mapear diferenças. No capítulo, dá conjuntos para organizar e observa o critério que o aluno cria sozinho.',
    referencia:
      'Charles Darwin, menino, colecionava besouros por necessidade de encontrar, nomear e separar. Décadas depois, a mesma compulsão por distinções produziu a teoria da evolução.',
    cuidado: CUIDADO_F2,
  },
  7: {
    casaNome: 'Interpessoal',
    cor: '#0891B2',
    corVeu: '#155F7E',
    brasao: BRASAO[7],
    essencia:
      'A Casa de quem lê as pessoas, onde a realidade é feita de gente e do que se passa entre elas. Une quem percebe humores, intenções e o clima de um grupo antes de qualquer conversa.',
    mecanismo:
      'Processa o mundo interno dos outros: estados de ânimo, intenção, a tensão numa voz que parece normal. Não é ser simpático nem popular: é registrar diferenças finas de estado que a maioria não nota e ajustar o comportamento a partir dessa leitura. Não confundir com a Linguística (falar bem é linguagem; ler o que o outro sente é interpessoal). Atenção: a mesma leitura serve para acalmar ou para manipular. A bússola ética ainda está em construção, e é o que o mentor acompanha.',
    revela: [
      'Percebe o colega mal antes dos outros e aponta o sinal ("ficou quieto, e não é assim que ele é").',
      'Lê a dinâmica do grupo: quem puxou, quem cedeu, quem ficou de fora.',
      'Ajusta o próprio jeito conforme quem tem pela frente, e reconhece que faz isso.',
      'Pode ser o quieto da beirada que lê a sala inteira em silêncio.',
    ],
    cultiva:
      'Lapida a leitura do outro com direção ética: cooperar, mediar, liderar sem instrumentalizar. No capítulo, dá papéis que exigem coordenar gente e observa como o aluno lê o grupo e responde a ele.',
    referencia:
      'Anne Sullivan leu o estado interno de Helen Keller, cega e surda, onde nenhum adulto tinha visto: entendeu que ela não precisava de disciplina, precisava de conexão.',
    cuidado: CUIDADO_F2,
  },
  8: {
    casaNome: 'Intrapessoal',
    cor: '#EA580C',
    corVeu: '#A6491F',
    brasao: BRASAO[8],
    essencia:
      'A Casa de quem lê o próprio mundo interno, onde o sentimento chega com etiqueta antes de virar comportamento. Une quem acessa o que sente, por que sente e do que precisa, com uma precisão rara.',
    mecanismo:
      'Processa o próprio estado interno: distingue sentimentos que para os outros parecem iguais ("não era raiva, era frustração") e usa isso para decidir. É a mais reservada das oito, quase nunca aparece sozinha: precisa de outra porta (a fala, o desenho, o corpo) para se mostrar. Não confundir com a Interpessoal (uma lê o outro, a outra lê a si). E não confundir com timidez: o sinal é a precisão do autorrelato, não o silêncio.',
    revela: [
      'Ao ser perguntado por que reagiu assim, não se defende, se explica ("travei porque não entendi e fiquei com vergonha de perguntar").',
      'Reconhece o próprio limite no dia e sabe pedir o que ajuda (mais tempo, um canto, silêncio).',
      'Depois de um erro, reconstrói por dentro sem culpar só o de fora.',
      'Escolhe tarefas e parcerias sabendo de si.',
    ],
    cultiva:
      'Lapida o autoconhecimento que orienta a ação: nomear o próprio estado, regular, escolher com consciência. No capítulo, abre espaço de reflexão e observa a precisão com que o aluno se lê, sem confundir reserva com ausência.',
    referencia:
      'Virginia Woolf descrevia momentos da infância sabendo dizer o que sentiu e por que sentiu. Não sentia mais que os outros: sentia com mais precisão.',
    cuidado: CUIDADO_F2,
  },
};
