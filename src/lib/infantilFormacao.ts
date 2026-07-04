/**
 * FORMAÇÃO ARBORIA (Infantil): treinamentos in-app com situações de escolha.
 *
 * Currículo deliberado pela MESA CONSULTIVA (03/07/2026: Delors, Gardner,
 * Santos, Dubois, Diamond, Ferrante, Moderador) e aprovado pelo Fundador:
 * núcleo de 6 treinamentos, um a cada ~3 semanas.
 *
 * Voz dos textos: professoral, sóbria, à la Gardner. Descrição antes de
 * julgamento; o tempo como intérprete; nada de frase de efeito.
 *
 * Regras do momento: errar explica e deixa tentar de novo (nunca "prova",
 * nunca nota); só a CONCLUSÃO é gravada no banco, nunca as respostas.
 * TRAVA DE VOCABULÁRIO (Mesa, tensão 2): nenhum termo clínico ou jargão
 * neuro aparece em tela, nem em revisões futuras deste arquivo.
 */

export interface AlternativaFormacao {
  texto: string;
  correta: boolean;
  feedback: string;
}

export interface SituacaoFormacao {
  /** Quando declaradas, a situação mostra o selo "Inteligência em cena".
   *  O T2 NÃO declara: identificar a inteligência é o próprio exercício. */
  inteligencia?: string;
  cor?: string;
  /** Pergunta da situação. Padrão: 'O que você registraria no diário?' */
  pergunta?: string;
  cena: string;
  alternativas: AlternativaFormacao[];
}

export interface TreinamentoFormacao {
  id: number;
  titulo: string;
  subtitulo: string;
  capa: string;
  disponivel: boolean;
  situacoes: SituacaoFormacao[];
}

export const TREINAMENTOS: TreinamentoFormacao[] = [
  /* ================================================================
   * T1. A ARTE DE OBSERVAR (patrocínio: Ferrante e Gardner)
   * ================================================================ */
  {
    id: 1,
    titulo: 'A arte de observar',
    subtitulo: 'Escrever o que se vê · 5 situações · uns 4 min',
    capa: 'Uma boa observação descreve o que a criança fez, não o que ela é. Nas próximas cenas, você escolhe o que escreveria no diário. Cada resposta vem comentada, para mostrar por que uma frase guarda mais do que outra.',
    disponivel: true,
    situacoes: [
      {
        inteligencia: 'Corporal-Cinestésica',
        cor: '#B8860B',
        cena: 'Fim da aula de massinha. O Theo passou o tempo apertando cada pedaço devagar e olhando a marca que o dedo deixava.',
        alternativas: [
          {
            texto: '"Theo brincou bem de massinha hoje."',
            correta: false,
            feedback:
              'A frase diz que a atividade correu bem, mas não conta o que o Theo fez. Quem ler daqui a um ano encontrará a atividade, não o menino.',
          },
          {
            texto: '"Theo apertou cada pedaço devagar e ficou olhando a marca do dedo na massinha."',
            correta: true,
            feedback:
              'Você descreveu o que as mãos e os olhos dele fizeram: o Theo conhecendo o mundo pelo corpo, que é o coração da inteligência Corporal-Cinestésica. Acumulada ao longo dos anos, é essa frase que permite compreender como uma criança pensa.',
          },
          {
            texto: '"Theo é uma criança muito concentrada."',
            correta: false,
            feedback:
              '"Concentrado" é um julgamento, não uma observação. A etiqueta acompanha a criança; a descrição da cena deixa que o tempo diga o que ela significa.',
          },
        ],
      },
      {
        inteligencia: 'Espacial',
        cor: '#7C3AED',
        cena: 'A Alice recusou a pintura. Ficou uns dez minutos parada, olhando os colegas misturarem as cores na mesa ao lado.',
        alternativas: [
          {
            texto: '"Alice não quis fazer a atividade de novo."',
            correta: false,
            feedback:
              'A frase registra a recusa e perde o resto. O que a Alice fez enquanto não pintava era a parte mais rica da cena.',
          },
          {
            texto: '"Alice recusou o pincel, mas passou o tempo todo olhando a mistura das cores na mesa do lado."',
            correta: true,
            feedback:
              'A recusa veio acompanhada de uma escolha: ela ficou estudando as cores e as misturas, um caminho da inteligência Espacial. Registrar isso é registrar por onde a Alice entra quando o pincel não a convida.',
          },
          {
            texto: '"Alice é tímida, precisa participar mais."',
            correta: false,
            feedback:
              '"Tímida" é uma etiqueta; "precisa participar" é uma prescrição. A observação descreve o que aconteceu; ela não classifica nem receita.',
          },
        ],
      },
      {
        inteligencia: 'Musical',
        cor: '#7F1D1D',
        cena: 'Na roda de música, o Caio marcava o ritmo no joelho antes mesmo de cantar. Quando a música parou, ele continuou o ritmo com a boca.',
        alternativas: [
          {
            texto: '"Caio participou bem da roda de música."',
            correta: false,
            feedback:
              'A frase vale para qualquer criança em qualquer roda. O que o Caio fez com o ritmo era só dele, e ficou de fora.',
          },
          {
            texto: '"Caio marcou o ritmo no joelho antes de cantar e seguiu com a boca depois que a música parou."',
            correta: true,
            feedback:
              'Você registrou o ritmo continuando depois que a música acabou: o som organizando o corpo do Caio, que é o coração da inteligência Musical. É esse tipo de detalhe que nenhuma memória guarda sozinha.',
          },
          {
            texto: '"Caio é muito musical, puxou a família."',
            correta: false,
            feedback:
              'Talvez seja. Mas a etiqueta não guarda a cena, e é a cena que permite acompanhar como isso se desenvolve ao longo dos anos. Sobre a família, o diário observa a criança, não a origem dela.',
          },
        ],
      },
      {
        inteligencia: 'Interpessoal',
        cor: '#0891B2',
        cena: 'Dois colegas disputavam o mesmo carrinho. A Duda parou a própria brincadeira, olhou os dois por um momento e trouxe outro carrinho para um deles.',
        alternativas: [
          {
            texto: '"Duda se comportou muito bem hoje."',
            correta: false,
            feedback:
              '"Se comportou bem" é um julgamento sobre a criança. O que a Duda fez (parar, ler a situação, resolver) é uma observação sobre a cena. É a segunda que interessa ao diário.',
          },
          {
            texto: '"Duda parou de brincar, olhou os dois colegas na disputa e resolveu trazendo outro carrinho para um deles."',
            correta: true,
            feedback:
              'Você descreveu a leitura que a Duda fez dos colegas antes de agir. Perceber o outro e mediar sem que ninguém peça é o centro da inteligência Interpessoal.',
          },
          {
            texto: '"Duda é a pacificadora da turma."',
            correta: false,
            feedback:
              'O apelido gruda e cobra: no dia em que ela não mediar, vira decepção. Descreva a cena de hoje e deixe o amanhã livre.',
          },
        ],
      },
      {
        inteligencia: 'Linguística',
        cor: '#1E3A8A',
        cena: 'Na história de sempre, a professora trocou uma palavra sem querer. O Rafa interrompeu na hora: "não é lobo mau, é lobo esfomeado".',
        alternativas: [
          {
            texto: '"Rafa estava muito atento na hora da história."',
            correta: false,
            feedback:
              '"Atento" é genérico: vale para quase tudo. O que o Rafa guardou (a palavra exata) é específico, e é o específico que constrói a história dele.',
          },
          {
            texto: '"Rafa corrigiu a troca de uma palavra da história de sempre: guardou o texto exato, não só o enredo."',
            correta: true,
            feedback:
              'Corrigir uma palavra trocada mostra que o Rafa guarda a palavra como matéria, não só o sentido: uma marca da inteligência Linguística. A sua frase registrou exatamente isso.',
          },
          {
            texto: '"Rafa já está pronto para a alfabetização."',
            correta: false,
            feedback:
              'Isso é um prognóstico, e o diário não faz prognósticos. Registre o que aconteceu hoje; as decisões pedagógicas nascem de outra conversa, com mais cenas na mesa.',
          },
        ],
      },
    ],
  },

  /* ================================================================
   * T2. AS OITO INTELIGÊNCIAS NA SALA (patrocínio: Gardner; formato
   * revisto pela Mesa: a escolha é QUAL inteligência está em cena, e
   * os distratores são os pares de confusão. Sem selo: identificar é
   * o próprio exercício.)
   * ================================================================ */
  {
    id: 2,
    titulo: 'As oito inteligências na sala',
    subtitulo: 'Reconhecer cada uma em cena · 8 situações · uns 6 min',
    capa: 'Cada inteligência tem um jeito de aparecer na sala, e algumas se parecem entre si à primeira vista. Nas próximas cenas, você escolhe qual inteligência está em jogo. Os erros mais comuns estão entre as opções de propósito: é neles que se aprende.',
    disponivel: true,
    situacoes: [
      {
        pergunta: 'Qual inteligência está em cena?',
        cena: 'A Helena montou a torre de blocos afastada da mesa. Antes de cada peça, dava um passo atrás e olhava o conjunto inteiro.',
        alternativas: [
          {
            texto: 'Corporal-Cinestésica: ela está construindo com as mãos.',
            correta: false,
            feedback:
              'As mãos executam, mas repare quem comanda: o olho que se afasta para ver o conjunto. Quando a compreensão precisa passar pelo toque, o corpo lidera; aqui quem lidera é a imagem.',
          },
          {
            texto: 'Espacial: quem guia é o olho que planeja o conjunto no espaço.',
            correta: true,
            feedback:
              'É isso. O passo atrás antes de cada peça mostra a torre existindo primeiro na cabeça da Helena, como imagem. A mão só vai lá conferir.',
          },
          {
            texto: 'Lógico-Matemática: ela está organizando peças.',
            correta: false,
            feedback:
              'Organizar aparece nas duas, e a diferença está no critério: a Lógico-Matemática compara e classifica (maior, menor, igual); a Espacial compõe uma imagem. A Helena está compondo.',
          },
        ],
      },
      {
        pergunta: 'Qual inteligência está em cena no Davi?',
        cena: 'O Bento fala o tempo todo na roda. Mas quem percebeu que a Lia estava chorando escondida atrás da estante foi o Davi, que quase não fala.',
        alternativas: [
          {
            texto: 'Linguística: perceber os outros é coisa de quem domina a linguagem.',
            correta: false,
            feedback:
              'Este é um dos enganos mais comuns: falar muito não é ler pessoas. O Bento usa palavras; o Davi leu um estado interno sem que ninguém dissesse nada. São inteligências diferentes.',
          },
          {
            texto: 'Intrapessoal: ele é quieto, vive no mundo dele.',
            correta: false,
            feedback:
              'A Intrapessoal lê o mundo de dentro DELE. O que o Davi leu foi o estado de OUTRA pessoa, e escondida. O silêncio dele não diz para onde o olhar dele aponta.',
          },
          {
            texto: 'Interpessoal: ele leu o estado da Lia sem que ninguém falasse nada.',
            correta: true,
            feedback:
              'Exatamente. A inteligência Interpessoal é a leitura do outro, e ela não precisa de palavras. As crianças mais faladeiras nem sempre são as que mais enxergam os colegas.',
          },
        ],
      },
      {
        pergunta: 'Qual inteligência está em cena?',
        cena: 'A Sofia separou as tampinhas por tamanho antes de começar a brincar, sem ninguém pedir. Só brincou quando a fila ficou em ordem.',
        alternativas: [
          {
            texto: 'Espacial: ela arrumou as tampinhas no espaço.',
            correta: false,
            feedback:
              'Tudo que existe ocupa espaço, então o critério não é esse. Pergunte o que comandou a arrumação: aqui foi a comparação (menor, maior, igual), que é a assinatura da Lógico-Matemática.',
          },
          {
            texto: 'Lógico-Matemática: a ordem por tamanho veio antes da brincadeira.',
            correta: true,
            feedback:
              'É isso. Classificar sem que ninguém peça, e só começar quando o conjunto obedece a uma regra, é a inteligência Lógico-Matemática operando. A brincadeira era a fila, não as tampinhas.',
          },
          {
            texto: 'Corporal-Cinestésica: ela passou o tempo mexendo nas tampinhas.',
            correta: false,
            feedback:
              'A mão trabalhou, mas a serviço de uma regra de comparação. Quando o corpo é o canal, o prazer está no gesto em si; aqui o gesto terminou assim que a ordem ficou pronta.',
          },
        ],
      },
      {
        pergunta: 'Qual inteligência está em cena no Miguel?',
        cena: 'O Miguel pediu para ficar no canto dos livros sozinho e recusou a mesa cheia. Meia hora depois, chamou a professora para mostrar a página de que tinha gostado.',
        alternativas: [
          {
            texto: 'Nenhuma: isso é timidez, ele foge dos colegas.',
            correta: false,
            feedback:
              'Repare no fim da cena: ele CHAMOU a professora para compartilhar. Quem foge não convida. Escolher a própria companhia não é fugir da dos outros; é saber onde se está bem.',
          },
          {
            texto: 'Intrapessoal: ele conhece o próprio gosto e escolhe as próprias condições.',
            correta: true,
            feedback:
              'É isso. Saber o que quer, escolher o canto certo para si e voltar para compartilhar quando estiver pronto: a inteligência Intrapessoal aparece nas escolhas, não no isolamento.',
          },
          {
            texto: 'Linguística: ele estava com um livro na mão.',
            correta: false,
            feedback:
              'O livro é o objeto da cena, não a inteligência dela. O que a cena mostra é a escolha das próprias condições. O que ele fizer COM a página (narrar, guardar palavras) aí sim seria Linguística.',
          },
        ],
      },
      {
        pergunta: 'Qual inteligência está em cena?',
        cena: 'Na caminhada ao pátio, a Cecília parou para ver a fila de formigas e perguntou para onde elas iam quando chovia.',
        alternativas: [
          {
            texto: 'Naturalista: o vivo parou a caminhada dela, e a pergunta continuou a observação.',
            correta: true,
            feedback:
              'É isso. A fila de formigas competiu com o pátio inteiro e venceu. A inteligência Naturalista aparece nesse imã pelo vivo e pelas diferenças finas do mundo natural.',
          },
          {
            texto: 'Lógico-Matemática: ela fez uma pergunta de causa e efeito.',
            correta: false,
            feedback:
              'A pergunta tem lógica dentro, como quase toda pergunta boa. Mas repare no que capturou a Cecília antes de qualquer pergunta: o bicho, o vivo. É pelo objeto do fascínio que a cena se decide.',
          },
          {
            texto: 'Espacial: ela estava observando o caminho das formigas.',
            correta: false,
            feedback:
              'O caminho existe no espaço, mas o que prendeu a Cecília não foi a forma do trajeto: foi a vida que passava por ele. Diferenças no mundo vivo são o território da Naturalista.',
          },
        ],
      },
      {
        pergunta: 'Qual inteligência está em cena?',
        cena: 'A Bia mudou a voz para cada boneco no faz de conta e corrigiu a colega: "a bruxa não fala assim, ela fala assiiim", esticando a palavra do jeito exato.',
        alternativas: [
          {
            texto: 'Musical: ela está brincando com sons de voz.',
            correta: false,
            feedback:
              'O som está em cena, mas a serviço de quê? A Bia não busca ritmo nem melodia: busca a fala CERTA de cada personagem. O material dela é a palavra e o jeito de dizer, não o som pelo som.',
          },
          {
            texto: 'Linguística: cada personagem tem a fala certa, e ela guarda o jeito exato de dizer.',
            correta: true,
            feedback:
              'É isso. A voz da bruxa é texto para a Bia: tem forma exata, e trocar o jeito de dizer é trocar a história. A palavra como matéria-prima é a assinatura da inteligência Linguística.',
          },
          {
            texto: 'Interpessoal: ela está dirigindo a brincadeira da colega.',
            correta: false,
            feedback:
              'Ela corrigiu a colega, mas repare o motivo: não foi para mediar a relação, foi para defender a fala exata do personagem. O centro da cena é a linguagem, não o encontro.',
          },
        ],
      },
      {
        pergunta: 'Qual inteligência está em cena?',
        cena: 'O Tomás bateu na mesa o mesmo ritmo três vezes, ajustando até ficar igual ao da música da entrada. Depois cantarolou baixinho só a parte que faltava.',
        alternativas: [
          {
            texto: 'Corporal-Cinestésica: ele está batendo na mesa com as mãos.',
            correta: false,
            feedback:
              'A mão é o instrumento, não o assunto. Repare no critério do ajuste: ficar IGUAL ao ritmo da música. Quem comanda a cena é o ouvido, e ouvido que compara padrão sonoro é Musical.',
          },
          {
            texto: 'Musical: ele ajustou o ritmo de ouvido até ficar igual, e completou a parte que faltava.',
            correta: true,
            feedback:
              'É isso. Ajustar até soar igual e cantar exatamente a parte que faltava mostra a música inteira guardada dentro dele. A inteligência Musical trabalha mesmo quando a música já parou.',
          },
          {
            texto: 'Lógico-Matemática: repetir três vezes é buscar um padrão.',
            correta: false,
            feedback:
              'Padrão aparece nas duas, e o critério desempata: o padrão da Lógico-Matemática se confere com regra (igual, diferente, maior); o do Tomás se confere com o OUVIDO. O juiz da cena era o som.',
          },
        ],
      },
      {
        pergunta: 'Qual inteligência está em cena?',
        cena: 'O Vicente, de quatro anos, derrubou a torre dos colegas ao passar correndo. Terceira vez na semana.',
        alternativas: [
          {
            texto: 'Corporal-Cinestésica: ele vive em movimento, o corpo é o canal dele.',
            correta: false,
            feedback:
              'Cuidado com esta, que é a confusão mais comum da sala. Na Corporal-Cinestésica o movimento ORGANIZA a criança: ela faz melhor movendo-se. No Vicente o movimento atropela: derruba o que nem era dele. São coisas diferentes.',
          },
          {
            texto: 'Nenhuma ainda: correr sem frear aos quatro anos é a idade, não um caminho.',
            correta: true,
            feedback:
              'É isso, e é uma das lições mais importantes deste treinamento: nem todo comportamento visível é uma inteligência aparecendo. Frear o próprio impulso é algo que amadurece com os anos, em toda criança. Registre a cena crua se quiser; não registre um veredito.',
          },
          {
            texto: 'Interpessoal: ele está buscando a atenção dos colegas.',
            correta: false,
            feedback:
              'Pode até haver busca de atenção, mas isso já seria interpretação em cima de interpretação. A cena mostra só um corpo de quatro anos mais rápido que o próprio freio. O resto é o tempo que dirá.',
          },
        ],
      },
    ],
  },

  /* ================================================================
   * T3. OBSERVAR SEM ROTULAR (patrocínio: Dubois; os três desvios:
   * a etiqueta, o teste e o diagnóstico)
   * ================================================================ */
  {
    id: 3,
    titulo: 'Observar sem rotular',
    subtitulo: 'A etiqueta, o teste e o diagnóstico · 5 situações',
    capa: 'Três desvios estragam um diário: a etiqueta (que julga), o teste (que destrói a cena para arrancar uma resposta) e o diagnóstico (que não pertence à escola). Nas próximas situações, você escolhe o caminho que protege a criança e o dado.',
    disponivel: true,
    situacoes: [
      {
        inteligencia: 'Espacial',
        cor: '#7C3AED',
        cena: 'A Manu passou a semana desenhando. Hoje desenhou a família e explicou cada pessoa enquanto desenhava. Fim do dia, hora de registrar.',
        alternativas: [
          {
            texto: '"A Manu é a artista da turma."',
            correta: false,
            feedback:
              'Etiqueta elogiosa também é etiqueta: cobra da Manu o mesmo papel amanhã, e apaga a cena de hoje. O elogio que vale é o que descreve.',
          },
          {
            texto: '"Manu desenhou a família e foi explicando cada pessoa enquanto desenhava."',
            correta: true,
            feedback:
              'Bem observado: a cena guarda o desenho E a narração junto dele, que é o detalhe que importa. Daqui a dois anos, essa frase ainda conta alguma coisa. "Artista da turma" não contaria nada.',
          },
          {
            texto: '"A Manu desenha muito melhor que os colegas da idade dela."',
            correta: false,
            feedback:
              'Comparação não guarda cena nenhuma, e ainda cria um pódio invisível na sua cabeça. O diário observa ESTA criança, hoje. Os colegas têm os diários deles.',
          },
        ],
      },
      {
        inteligencia: 'Lógico-Matemática',
        cor: '#047857',
        pergunta: 'O que fazer?',
        cena: 'Você quer saber se o João já reconhece as cores. Ele está entretido na garagem de carrinhos que montou sozinho.',
        alternativas: [
          {
            texto: 'Interromper a brincadeira e perguntar as cores, uma por uma, apontando os carrinhos.',
            correta: false,
            feedback:
              'Isso é um teste, e ele custa caro: a cena que existia (a garagem, a organização dele) foi destruída para produzir uma resposta que não diz quase nada. Criança de quatro anos erra cor que conhece e acerta cor que não conhece, dependendo do dia.',
          },
          {
            texto: 'Esperar: em algum momento a cor vai aparecer na brincadeira dele, e aí é só registrar.',
            correta: true,
            feedback:
              'É isso. "Separou os carrinhos vermelhos pra caçamba de cima" vale dez perguntas respondidas sob interrogatório. Observar é esperar a cena acontecer, não fabricá-la.',
          },
          {
            texto: 'Mandar um recado pedindo que a família treine as cores em casa.',
            correta: false,
            feedback:
              'Além de transformar brincadeira em lição de casa, isso registra uma FALTA que você ainda nem observou. O silêncio de uma habilidade não é ausência dela; talvez a cor simplesmente ainda não tenha sido convidada pela brincadeira.',
          },
        ],
      },
      {
        inteligencia: 'Intrapessoal',
        cor: '#EA580C',
        cena: 'A Alice quase não olha nos olhos quando fala. Hoje, na roda, respondeu olhando para o chão, e sorriu quando a colega sentou perto dela.',
        alternativas: [
          {
            texto: '"Acho que a Alice tem um grau de autismo, ela não olha nos olhos."',
            correta: false,
            feedback:
              'Este é o desvio mais sério dos três. O diário não recebe hipótese clínica: isso é conversa para a coordenação, por outra via, com a família e com profissional habilitado. No diário, ficaria gravada para sempre uma suspeita leiga sobre uma criança de quatro anos.',
          },
          {
            texto: '"Na roda, respondeu olhando pro chão e sorriu quando a colega sentou perto."',
            correta: true,
            feedback:
              'Bem observado: a cena literal, com o que aconteceu e nada além. Se um dia uma avaliação profissional for necessária, são cenas assim, datadas e limpas, que vão ajudar de verdade. A suspeita não ajuda ninguém.',
          },
          {
            texto: 'Não registrar nada sobre a Alice até ter certeza do que está acontecendo.',
            correta: false,
            feedback:
              'O medo de errar não pode calar o diário. Você não precisa de certeza nenhuma para descrever uma cena; precisa de certeza para CONCLUIR, e concluir não é papel do diário. Descreva; a leitura vem depois, e não é sua sozinha.',
          },
        ],
      },
      {
        inteligencia: 'Interpessoal',
        cor: '#0891B2',
        cena: 'Fim do ano se aproximando. O Antônio resolveu sozinho dois conflitos na semana e organizou a fila do lanche sem que ninguém pedisse.',
        alternativas: [
          {
            texto: '"O Antônio já está maduro para o Grupo IV."',
            correta: false,
            feedback:
              'Prognóstico não é observação. "Maduro para" é uma decisão sobre o futuro, e decisões nascem de muitas cenas, em outra mesa, com outras pessoas. O diário entrega as cenas; ele não decide.',
          },
          {
            texto: '"Resolveu sozinho a disputa do balanço: propôs contar até vinte pra cada um. E organizou a fila do lanche sem ninguém pedir."',
            correta: true,
            feedback:
              'Bem observado: duas cenas concretas, com o COMO dentro delas (a proposta de contar até vinte). Quem for decidir qualquer coisa sobre o Antônio vai agradecer por frases assim.',
          },
          {
            texto: '"O Antônio é o mais maduro da turma."',
            correta: false,
            feedback:
              'Superlativo é etiqueta com pódio: rotula o Antônio E rebaixa os outros dezenove de uma vez. O diário não faz ranking, nem por elogio.',
          },
        ],
      },
      {
        inteligencia: 'Linguística',
        cor: '#1E3A8A',
        cena: 'A Laura contou hoje uma história inventada com começo, meio e fim. O irmão dela, dois anos mais velho, estudou na escola e era conhecido de todos.',
        alternativas: [
          {
            texto: '"A Laura contou melhor que o irmão na idade dela."',
            correta: false,
            feedback:
              'A comparação com o irmão não guarda nada da história que a Laura contou, e ainda pendura nela uma régua que não é dela. Cada criança entra no diário sozinha, inteira.',
          },
          {
            texto: '"Laura inventou uma história com começo, meio e fim: a formiga que perdeu a casa na chuva e reconstruiu."',
            correta: true,
            feedback:
              'Bem observado: a estrutura (começo, meio, fim) E o enredo dela. A frase se sustenta sozinha, sem precisar de irmão, de média ou de comparação. É assim que o diário enxerga.',
          },
          {
            texto: '"A Laura está na média da turma em linguagem."',
            correta: false,
            feedback:
              '"Média" é número disfarçado de palavra, e o Infantil não pontua criança. A história da formiga era um dado precioso; a média não é dado de coisa nenhuma.',
          },
        ],
      },
    ],
  },

  /* ================================================================
   * T4. UMA ATIVIDADE, MUITOS CAMINHOS (patrocínio: Santos e Delors;
   * ataca o erro "exploração = conteúdo a ensinar")
   * ================================================================ */
  {
    id: 4,
    titulo: 'Uma atividade, muitos caminhos',
    subtitulo: 'A exploração não é conteúdo · 5 situações',
    capa: 'A atividade que você propõe espera um caminho, mas admite todos. O dado do Arboria mora no caminho que a criança escolhe: antes do primeiro movimento e diante do obstáculo. Nas próximas cenas, você decide o que fazer quando a criança sai do roteiro.',
    disponivel: true,
    situacoes: [
      {
        inteligencia: 'Lógico-Matemática',
        cor: '#047857',
        pergunta: 'O que fazer?',
        cena: 'Atividade de massinha "para fazer bichinhos". O Theo não fez bichinho nenhum: fez cobrinhas e passou o tempo medindo uma contra a outra.',
        alternativas: [
          {
            texto: 'Corrigir com carinho: "Theo, hoje é dia de bichinho, depois você faz cobrinha".',
            correta: false,
            feedback:
              'A atividade era o convite, não a regra. Ao corrigir, você apaga exatamente o dado que o Arboria procura: o Theo transformou massinha em comparação de tamanhos, e isso conta mais sobre ele que qualquer bichinho.',
          },
          {
            texto: 'Deixar, e registrar a medição: era esse o dado.',
            correta: true,
            feedback:
              'É isso. O bichinho era a expectativa; a medição foi a resposta do Theo. "Fez cobrinhas e mediu uma contra a outra a manhã toda" é a exploração funcionando: a atividade abriu a porta, e ele escolheu qual atravessar.',
          },
          {
            texto: 'Registrar que o Theo não conseguiu fazer a atividade proposta.',
            correta: false,
            feedback:
              '"Não conseguiu" registra um fracasso que não aconteceu. Ele conseguiu outra coisa, e escolheu essa outra coisa sem ajuda. Não confunda sair do roteiro com falhar no roteiro.',
          },
        ],
      },
      {
        inteligencia: 'Espacial',
        cor: '#7C3AED',
        cena: 'Você ainda estava explicando o jogo novo e três crianças já tinham ido aos materiais, cada uma para um canto: uma pros blocos, uma pros lápis, uma pra caixa de tecidos.',
        alternativas: [
          {
            texto: '"Três crianças não esperaram a explicação terminar."',
            correta: false,
            feedback:
              'A frase registra a desobediência e joga fora o ouro: PARA ONDE cada uma foi. A escolha feita antes da instrução é a mais limpa do dia, porque ninguém a induziu.',
          },
          {
            texto: '"Antes da explicação acabar: Enzo foi direto pros blocos, Maya pros lápis, Olívia pra caixa de tecidos."',
            correta: true,
            feedback:
              'É isso. Três crianças, três ímãs diferentes, zero indução. É o registro da gravitação: para onde cada criança é puxada quando ninguém está dirigindo. O Arboria vive dessas cenas.',
          },
          {
            texto: 'Chamar as três de volta e recomeçar a explicação para todos.',
            correta: false,
            feedback:
              'Você pode chamar de volta, claro, a aula é sua. Mas registre ANTES para onde cada uma foi: a cena de dez segundos que você ia desfazer valia a manhã inteira.',
          },
        ],
      },
      {
        inteligencia: 'Interpessoal',
        cor: '#0891B2',
        cena: 'Na pintura coletiva, a Duda largou o pincel no meio e passou a organizar quem pinta em qual parte do papel.',
        alternativas: [
          {
            texto: '"A Duda dispersou da atividade de pintura."',
            correta: false,
            feedback:
              '"Dispersou" mede a Duda pela atividade. Meça a atividade pela Duda: ela não saiu da pintura, ela mudou de canal DENTRO dela, da tinta para as pessoas. O canal novo é o dado.',
          },
          {
            texto: '"Largou o pincel e passou a organizar quem pinta onde: saiu da tinta e entrou nas pessoas."',
            correta: true,
            feedback:
              'É isso. A mesma atividade tem porta de tinta (Espacial), porta de gesto (Corporal) e porta de gente (Interpessoal). A Duda trocou de porta no meio, e a sua frase registrou a troca.',
          },
          {
            texto: 'Devolver o pincel e lembrar que a atividade é de pintura.',
            correta: false,
            feedback:
              'Se a organização dela estiver atrapalhando, intervenha, a sala é sua. Mas saiba o que estará interrompendo: a Duda estava fazendo exatamente o que a Duda faz com o mundo. Anote antes de devolver o pincel.',
          },
        ],
      },
      {
        inteligencia: 'Corporal-Cinestésica',
        cor: '#B8860B',
        pergunta: 'O quebra-cabeça emperrou. O que registrar?',
        cena: 'Diante da peça que não encaixava: o Caio tentou de novo do mesmo jeito, com mais força. A Lia virou a peça e olhou por baixo. O Enzo largou e chamou um colega pra ajudar.',
        alternativas: [
          {
            texto: '"O grupo teve dificuldade com o quebra-cabeça novo."',
            correta: false,
            feedback:
              'A frase dilui três crianças numa dificuldade só. Mas o obstáculo é onde cada criança mais mostra como pensa: as três respostas eram três dados diferentes, e o "grupo" engoliu todos.',
          },
          {
            texto: 'Três registros: o Caio insistiu com força, a Lia investigou a peça por baixo, o Enzo buscou um parceiro.',
            correta: true,
            feedback:
              'É isso. Mesma atividade, mesmo obstáculo, três caminhos: o corpo que insiste, o olho que investiga, a mão que se estende pro colega. Diante do impasse é onde a exploração rende mais.',
          },
          {
            texto: '"O Caio é o mais persistente dos três."',
            correta: false,
            feedback:
              'Além da etiqueta, um erro de leitura: insistir com mais força nem sempre é persistência, às vezes é o único caminho que a criança conhece até agora. Descreva os três; deixe os nomes das qualidades pro tempo.',
          },
        ],
      },
      {
        inteligencia: 'Lógico-Matemática',
        cor: '#047857',
        cena: 'Você planejou uma atividade de música justamente para observar a inteligência Musical. O Levi passou a atividade guardando os instrumentos em ordem de tamanho, e não cantou nada.',
        alternativas: [
          {
            texto: '"O Levi não se interessou pela atividade de música."',
            correta: false,
            feedback:
              'A atividade não falhou e o Levi não falhou: ele respondeu por outra porta. Planejar "atividade de música para ver a Musical" é um convite, nunca uma garantia; a criança responde pela porta DELA.',
          },
          {
            texto: '"Na atividade de música, o Levi organizou os instrumentos em ordem de tamanho, do chocalho ao tambor."',
            correta: true,
            feedback:
              'É isso. Você propôs som e ele encontrou ordem: a inteligência Lógico-Matemática respondendo a um convite Musical. O plano da aula diz o que você ofereceu; o registro diz o que a criança fez com a oferta. Os dois podem ser diferentes, e está tudo certo.',
          },
          {
            texto: 'Não registrar: a atividade era de música e não gerou dado musical.',
            correta: false,
            feedback:
              'Gerou dado, e dos bons, só que de outra inteligência. Se o diário só aceitasse o dado que a atividade encomendou, metade das crianças sumiria dele. Registre o que apareceu, não o que você esperava.',
          },
        ],
      },
    ],
  },

  /* ================================================================
   * T5. A CRIANÇA QUE AINDA NÃO APARECEU (patrocínio: Gardner e
   * Moderador; silêncio não é ausência)
   * ================================================================ */
  {
    id: 5,
    titulo: 'A criança que ainda não apareceu',
    subtitulo: 'Silêncio não é ausência · 5 situações',
    capa: 'Toda turma tem a criança de quem não se escreveu nada este mês. Este treinamento é sobre ela: o que o silêncio do diário significa, o que ele não significa, e o que fazer com ele. Regra de ouro: o que não apareceu não está ausente.',
    disponivel: true,
    situacoes: [
      {
        pergunta: 'Fim do mês: nada sobre a Maitê no diário. O que fazer?',
        cena: 'Revisando o Diário, você percebe que não escreveu nada sobre a Maitê em outubro. Ela não dá trabalho, não se destaca, não pede nada.',
        alternativas: [
          {
            texto: 'Registrar: "Maitê é quieta, mês sem novidades".',
            correta: false,
            feedback:
              'Essa frase transforma a SUA lacuna num traço DELA. Quem não apareceu no diário foi o seu olhar, não a Maitê; ela viveu outubro inteiro. A etiqueta "quieta" ainda fecha a questão que devia ficar aberta.',
          },
          {
            texto: 'Escolher a Maitê como a criança da semana que vem: observá-la de perto em atividades variadas.',
            correta: true,
            feedback:
              'É isso. O silêncio do diário é um lembrete pra você, não um dado sobre ela. A criança que nunca aparece é a que mais precisa do seu olhar deliberado, em mais de um tipo de atividade, porque talvez as portas que você abriu até aqui não sejam as dela.',
          },
          {
            texto: 'Deixar como está: se nada chamou atenção, é porque não houve nada.',
            correta: false,
            feedback:
              'O diário registra o que o olhar alcança, e nenhum olhar alcança vinte crianças por igual. "Não houve nada" e "eu não vi" são frases muito diferentes, e confundi-las é o risco mais silencioso do Arboria.',
          },
        ],
      },
      {
        pergunta: 'O que essa cena permite concluir?',
        cena: 'O Gael nunca participa da roda de música. Fica na beirada, mexendo nos brinquedos, e resiste quando é chamado.',
        alternativas: [
          {
            texto: 'O Gael não tem a inteligência Musical desenvolvida.',
            correta: false,
            feedback:
              'O que não apareceu não está ausente. Talvez a RODA seja o problema: grande, barulhenta, todo mundo olhando. A mesma música, num canto com um instrumento e sem plateia, pode encontrar outro Gael. Antes de concluir sobre a criança, varie a porta.',
          },
          {
            texto: 'Nada ainda: a roda pode ser a porta errada, e vale oferecer o som de outro jeito.',
            correta: true,
            feedback:
              'É isso. O silêncio numa situação diz respeito àquela situação. O canal pode estar bloqueado pela forma (a roda, a plateia, o volume) e não pelo conteúdo (o som). Ofereça a música por outra porta antes de qualquer conclusão.',
          },
          {
            texto: 'O Gael é desinteressado, e isso deve entrar no diário.',
            correta: false,
            feedback:
              '"Desinteressado" é etiqueta em cima de leitura apressada. A cena mostra recusa a UMA forma de encontro com a música. Registre a cena como ela é: "fica na beirada da roda, resiste quando chamado". O resto o tempo dirá.',
          },
        ],
      },
      {
        inteligencia: 'Intrapessoal',
        cor: '#EA580C',
        cena: 'A Íris passou a manhã no parque olhando os colegas brincarem, sem entrar em nenhuma brincadeira. Parecia tranquila.',
        alternativas: [
          {
            texto: '"A Íris não brincou com ninguém hoje."',
            correta: false,
            feedback:
              'A frase mede a Íris pelo que ela NÃO fez. Mas olhar demoradamente é fazer alguma coisa: lembre da Alice e das cores. A manhã da Íris foi cheia; a frase é que ficou vazia.',
          },
          {
            texto: '"Íris passou a manhã observando as brincadeiras do parque, tranquila, sem entrar em nenhuma."',
            correta: true,
            feedback:
              'É isso: o que ela FEZ (observar, a manhã toda, em paz) no lugar do que faltou. Se isso se repetir por semanas, o padrão aparecerá nas suas frases e dirá algo. Uma manhã sozinha não diz; descreve.',
          },
          {
            texto: '"A Íris tem dificuldade de socialização."',
            correta: false,
            feedback:
              'Isso é conclusão clínico-social em cima de UMA manhã tranquila. Uma criança que escolhe observar não está falhando em socializar; está fazendo outra coisa. A frase gruda e a manhã se perde.',
          },
        ],
      },
      {
        pergunta: 'Hoje você não conseguiu ver a Maitê. Registrar o quê?',
        cena: 'Semana da observação deliberada da Maitê. Mas hoje a sala virou do avesso e você não conseguiu olhar pra ela nenhuma vez com atenção.',
        alternativas: [
          {
            texto: 'Nada: sem cena, sem registro.',
            correta: false,
            feedback:
              'Existe um registro melhor que o silêncio: a lacuna declarada. Quem ler o diário depois não distingue "não havia nada" de "ninguém olhou", a menos que você diga qual foi.',
          },
          {
            texto: '"Hoje não consegui observar a Maitê: a sala não deixou. Sigo com ela na mira esta semana."',
            correta: true,
            feedback:
              'É isso, e essa frase é mais útil do que parece: ela protege a Maitê de um mês em branco ser lido como um mês vazio. Lacuna declarada é honestidade de quem observa; lacuna muda vira mentira por omissão.',
          },
          {
            texto: 'Escrever de memória alguma coisa da semana passada, pra não deixar o dia vazio.',
            correta: false,
            feedback:
              'Registro reaproveitado com data de hoje é dado falso, ainda que bem-intencionado. O diário aguenta um dia vazio; o que ele não aguenta é cena inventada, porque a análise não distingue.',
          },
        ],
      },
      {
        pergunta: 'O que essa cena diz?',
        cena: 'O Vicente, três anos e meio, não fica em nenhuma atividade por mais de dois minutos. Muda de canto, pega, larga, vai pra próxima.',
        alternativas: [
          {
            texto: 'É sinal de problema de atenção, melhor sugerir um encaminhamento à família.',
            correta: false,
            feedback:
              'Aos três anos e meio, dois minutos é o tamanho do fôlego, não um sinal. Sugerir encaminhamento em cima disso assusta uma família com aquilo que é, muito provavelmente, só a idade. Se um padrão persistir muito além do esperado, a conversa é com a coordenação, nunca um palpite no diário ou no portão.',
          },
          {
            texto: 'Registrar a cena crua e deixar o tempo interpretar: "muda de atividade a cada poucos minutos; hoje passou por blocos, tinta e areia".',
            correta: true,
            feedback:
              'É isso. A cena, datada, sem veredito. Se daqui a um ano o padrão continuar idêntico, as suas frases honestas serão a melhor base pra qualquer conversa séria. Se mudar (e aos três anos e meio, muda), nada foi carimbado à toa.',
          },
          {
            texto: '"O Vicente é agitado e desatento."',
            correta: false,
            feedback:
              '"Agitado" e "desatento" parecem observações, mas são veredictos vestidos de descrição, e dos que mais mancham diários de educação infantil. O que os seus olhos viram foi: mudou de canto, pegou, largou. Escreva isso.',
          },
        ],
      },
    ],
  },

  /* ================================================================
   * T6. A CONVERSA COM A FAMÍLIA (patrocínio: Delors e Santos, escrita
   * supervisionada por Ferrante; o portão é onde o rótulo vaza)
   * ================================================================ */
  {
    id: 6,
    titulo: 'A conversa com a família',
    subtitulo: 'Responder com cenas, não com veredictos · 5 situações',
    capa: 'A família guarda para sempre a palavra que a escola usa. Este treinamento é sobre o portão: as perguntas que os pais fazem todo dia e o jeito de responder com cenas, sem selar futuro nem confirmar rótulo. Aqui, o que você diz vale tanto quanto o que você escreve.',
    disponivel: true,
    situacoes: [
      {
        pergunta: 'O que você responde?',
        cena: 'No portão, a mãe do Theo pergunta, meio rindo, meio preocupada: "professora, me diz uma coisa, o Theo é hiperativo, né?"',
        alternativas: [
          {
            texto: '"Um pouquinho, né, mas nessa idade é normal."',
            correta: false,
            feedback:
              'O "um pouquinho" confirmou o rótulo, e é ele que a mãe vai levar pra casa e repetir no almoço de domingo. Palavra clínica dita pela escola vira quase-laudo na memória da família.',
          },
          {
            texto: '"Vou te contar o que eu vi hoje: ele passou a massinha inteira apertando devagar e olhando a marca do dedo. Quer ver o que eu escrevi?"',
            correta: true,
            feedback:
              'É isso: você respondeu à pergunta sobre um rótulo com uma cena, e a cena era mais interessante que o rótulo. A família sai do portão com uma imagem do filho, não com uma palavra pendurada nele.',
          },
          {
            texto: '"Não, imagina, ele é super tranquilo."',
            correta: false,
            feedback:
              'Negar o rótulo também é jogar o jogo do rótulo: a conversa continuou sendo sobre classificar o Theo. E no dia em que ele correr mais que o normal, a sua palavra vira moeda falsa. Saia do eixo veredito e entre no eixo cena.',
          },
        ],
      },
      {
        pergunta: 'O que você responde?',
        cena: 'O pai da Manu, orgulhoso: "ela vai ser artista igual a avó, né? Lá em casa todo mundo já sabe".',
        alternativas: [
          {
            texto: '"Com certeza! Ela é a nossa artista aqui também."',
            correta: false,
            feedback:
              'Selar futuro é doce na hora e pesado depois: a Manu tem quatro anos e acaba de ganhar uma profissão por aclamação. E se aos sete ela amar bichos e números, vai carregar a sensação de estar decepcionando dois mundos.',
          },
          {
            texto: '"Essa semana ela desenhou a família e foi explicando cada pessoa enquanto desenhava. É uma delícia de ver."',
            correta: true,
            feedback:
              'É isso: acolheu o orgulho do pai (que é legítimo) e devolveu uma cena real desta semana, sem prometer futuro nenhum. O afeto ficou; o selo não.',
          },
          {
            texto: '"A gente evita esse tipo de rótulo aqui na escola."',
            correta: false,
            feedback:
              'A intenção é certa e a frase é dura: o pai ouviu uma correção quando trouxe um orgulho. A doutrina é sua, não dele; pratique-a devolvendo cenas, não dando aula no portão.',
          },
        ],
      },
      {
        pergunta: 'O que você responde?',
        cena: 'A mãe do Gael, ansiosa: "ele está atrasado? O primo da mesma idade já escreve o nome inteiro".',
        alternativas: [
          {
            texto: '"Cada criança tem seu tempo, não se preocupe."',
            correta: false,
            feedback:
              'A frase é verdadeira e não acalma ninguém: é genérica demais pra competir com a imagem do primo escrevendo o nome. Ansiedade de comparação só perde para cena concreta do próprio filho.',
          },
          {
            texto: '"Deixa eu te contar do Gael: ontem ele montou um circuito de carrinhos com rampa e tudo, e me explicou por que a rampa tinha que ser mais alta. É esse menino que eu vejo todo dia."',
            correta: true,
            feedback:
              'É isso: você recusou a régua do primo sem nem mencioná-la, e encheu o espaço da ansiedade com uma cena rica do próprio Gael. A comparação murcha quando a criança real aparece.',
          },
          {
            texto: '"Escrever o nome tão cedo nem é tão importante assim."',
            correta: false,
            feedback:
              'Você entrou na régua pra discutir a régua, e de quebra diminuiu a conquista do primo (que a mãe vai recontar pra família). Não discuta a comparação; substitua-a por uma cena.',
          },
        ],
      },
      {
        pergunta: 'O que você responde?',
        cena: 'A avó da Íris, na saída: "e aí, o que a escola está achando dela? Ela é boa em quê?"',
        alternativas: [
          {
            texto: '"Ela é ótima em tudo, uma fofa."',
            correta: false,
            feedback:
              'Gentil e vazio: a avó saiu sem nada da Íris de verdade. E "boa em tudo" é só o rótulo bom de conteúdo zero: não sobrevive à primeira dificuldade que aparecer.',
          },
          {
            texto: '"Aqui a gente escreve o que ela vai fazendo e mostrando, semana a semana. Essa semana, por exemplo, ela passou a manhã estudando as brincadeiras do parque antes de escolher a dela. Essa história vai crescendo junto com ela."',
            correta: true,
            feedback:
              'É isso: você apresentou o próprio jeito do Arboria de olhar (a história que cresce, não a nota que sela) e entregou uma cena de verdade. A avó saiu entendendo o projeto sem ouvir uma palavra técnica.',
          },
          {
            texto: '"Ela é mais do tipo observadora, quieta, sabe?"',
            correta: false,
            feedback:
              '"Do tipo" é o rótulo entrando de mansinho, e em dois domingos vira "a escola disse que ela é a quieta". A Íris de quatro anos não é de tipo nenhum ainda; ela está sendo escrita.',
          },
        ],
      },
      {
        pergunta: 'O que você responde?',
        cena: 'A família do Vicente pede, formalmente: "a gente queria um laudo da escola sobre ele, o pediatra pediu pra perguntar".',
        alternativas: [
          {
            texto: 'Contar o que você acha do Vicente, já que a família confia em você.',
            correta: false,
            feedback:
              'A confiança é real e é exatamente por isso que a sua opinião improvisada teria peso de documento. Escola de educação infantil não emite laudo, e a professora não emite parecer clínico nem oral: o que você "acha" viraria "a escola disse".',
          },
          {
            texto: 'Encaminhar com acolhimento: "isso quem organiza é a coordenação; eu levo o pedido de vocês hoje ainda. O que eu posso garantir é que os registros do Vicente estão em dia pra ajudar no que precisarem".',
            correta: true,
            feedback:
              'É isso: a via certa (coordenação), no tom certo (acolhendo a preocupação, sem drama), e com a contribuição real da escola nomeada: as cenas datadas do diário, que é o que de fato ajuda um profissional de saúde.',
          },
          {
            texto: '"A escola não faz isso." e encerrar o assunto.',
            correta: false,
            feedback:
              'Correto no conteúdo, frio no gesto: a família saiu com um não e sem caminho. A mesma recusa, com a via certa apontada e a preocupação acolhida, protege a escola E a relação.',
          },
        ],
      },
    ],
  },
];
