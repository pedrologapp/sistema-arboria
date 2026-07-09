/**
 * FORMAÇÃO ARBORIA (Fundamental 2): treinamentos in-app para o mentor de Casa.
 *
 * Conteúdo escrito pela mesa pedagógica (não derivado de PDF/deck). Reusa a
 * MESMA estrutura da Formação do Infantil (interfaces de infantilFormacao.ts);
 * muda apenas o conteúdo, que aqui fala de adolescentes, capítulos e Casas.
 *
 * Doutrina inegociável do F2:
 *  - A Casa é a porta que abre mais fácil, nunca o teto do que o aluno pode.
 *  - A Casa nunca é causa de falha nem laudo, nota ou ranking. Toda pessoa tem as oito.
 *  - O autorrelato é porta, não prova: cruze sempre a fala com a cena.
 *  - Nunca concluir ausência: silêncio numa Casa pode ser um canal fechado.
 *
 * Regras do momento (iguais às do Infantil): errar explica e deixa tentar de
 * novo (nunca "prova", nunca nota); só a CONCLUSÃO é gravada no banco, nunca as
 * respostas. Nenhum termo clínico em tela.
 *
 * Este arquivo só é carregado para professores do segmento fundamental2 e sob o
 * flag F2_REFORMA_ATIVA. Infantil e F1 continuam com infantilFormacao, intacto.
 */

import type { TreinamentoFormacao } from './infantilFormacao';

/** Cores canônicas das Casas (id da inteligência), iguais a COR_INTELIGENCIA. */
const COR = {
  linguistica: '#1E3A8A',
  logica: '#047857',
  espacial: '#7C3AED',
  musical: '#7F1D1D',
  corporal: '#B8860B',
  naturalista: '#78350F',
  interpessoal: '#0891B2',
  intrapessoal: '#EA580C',
} as const;

export const TREINAMENTOS: TreinamentoFormacao[] = [
  /* ================================================================
   * T1. COMO REGISTRAR (a cena, não o veredito)
   * Três lições + cinco situações registro forte vs veredito.
   * ================================================================ */
  {
    id: 1,
    titulo: 'Como registrar',
    nivel: 'Básico',
    subtitulo: 'A cena, não o veredito · 5 situações · uns 5 min',
    capa: 'Três lições curtas sobre o que faz um registro de capítulo valer no Fundamental 2. Depois, cinco cenas reais de capítulo para você escolher o que escreveria: o veredito rápido ou a cena com a fala do aluno.',
    disponivel: true,
    licoes: [
      {
        titulo: 'A cena e a fala',
        paragrafos: [
          'O diário do mentor não guarda o que você acha do aluno. Guarda duas coisas: a cena do capítulo (o que ele fez, por onde começou, o que fez diante do obstáculo) e a fala dele quando você pergunta como chegou ali. A opinião envelhece e gruda; a cena e a fala continuam contando a verdade capítulos depois.',
          'Repare na diferença. Dizer que o Enzo foi bem no debate serve para qualquer aluno em qualquer capítulo. Dizer que o Enzo reescreveu a própria fala três vezes até soar exata, e contou que só parou quando a frase fechou, só serve para o Enzo, naquele capítulo. É a segunda que vale, porque guarda o caminho.',
        ],
        destaque: 'Registre a cena e a fala. Não registre o veredito.',
      },
      {
        titulo: 'O autorrelato é porta, não prova',
        paragrafos: [
          'No F2 você tem uma ferramenta que o Infantil não tem: pode perguntar. A pergunta "como você fez isso?" abre a porta do processamento, que é o que interessa. Mas a resposta do aluno é porta, não prova: às vezes ele racionaliza depois, às vezes devolve o que acha que você quer ouvir.',
          'Por isso o registro forte junta os dois: a cena que você viu e a fala que ele disse, lado a lado. Quando as duas apontam para o mesmo caminho, você tem um dado firme. Quando divergem, você tem algo ainda mais interessante: registre as duas, sem escolher, e confie no que a cena mostra.',
        ],
        destaque: 'O que o aluno diz de si é porta. A cena é a prova.',
      },
      {
        titulo: 'A Casa não é causa nem teto',
        paragrafos: [
          'A Casa é um mecanismo: o jeito como o mundo entra primeiro para aquele aluno. Ela nunca é explicação de comportamento nem limite de destino. Dois desvios estragam um registro no F2, e os dois usam a Casa como muleta:',
        ],
        itens: [
          {
            titulo: 'A Casa como causa',
            texto: 'Dizer que ele não entregou porque é da Casa Corporal fecha a cena e transforma o mecanismo em desculpa. A Casa diz por onde o aluno entra quando entra; ela não causa a falta nem a preguiça.',
          },
          {
            titulo: 'A Casa como teto',
            texto: 'Dizer que teoria não é com ela porque é da Casa Interpessoal vira um canal em muro. Toda pessoa tem as oito; a predominância abre uma porta, nunca fecha as outras sete.',
          },
        ],
        destaque: 'A Casa abre uma porta. Nunca é causa de falha nem teto de destino.',
      },
    ],
    situacoes: [
      {
        inteligencia: 'Espacial',
        cor: COR.espacial,
        cena: 'No capítulo sobre a cidade, o grupo tinha que montar a maquete de um bairro. O Gael não rascunhou nada no papel: rodou as peças na mão, encaixou tudo de primeira e, quando você perguntou como sabia onde cada prédio ia, respondeu que já tinha visto o bairro pronto na cabeça antes de começar.',
        alternativas: [
          {
            texto: 'Gael foi o que mais ajudou o grupo na maquete.',
            correta: false,
            feedback:
              'Isso conta que a atividade rendeu, não como o Gael chegou lá. Ajudou como? Capítulos depois, quem ler encontra um bom colega, e não o mecanismo que operou. Falta a cena e falta a fala.',
          },
          {
            texto: 'Gael montou a maquete sem rascunho, encaixando de primeira, e disse que tinha visto o bairro pronto na cabeça antes de começar.',
            correta: true,
            feedback:
              'Você guardou a cena (montou sem rascunho) e a fala (viu pronto na cabeça) juntas, e as duas apontam para o mesmo caminho: a solução chegou como imagem interna antes da palavra. Isso é a Casa Espacial, e é exatamente isso que o registro forte preserva.',
          },
          {
            texto: 'Gael é o gênio das artes da turma.',
            correta: false,
            feedback:
              'Rótulo elogioso também é rótulo: cobra o mesmo papel no próximo capítulo e apaga o que aconteceu hoje. E artes nem era o ponto. Ele resolveu um problema de espaço, não fez um desenho bonito.',
          },
        ],
      },
      {
        inteligencia: 'Lógico-Matemática',
        cor: COR.logica,
        cena: 'Na missão de orçamento do capítulo, a Nina travou o grupo por dez minutos: não deixava seguir enquanto uma conta não fechava. Quando você perguntou por que não deixava passar, ela disse que, se aquele número estivesse errado, todo o resto ia desmoronar depois, e que queria achar onde tinha quebrado.',
        alternativas: [
          {
            texto: 'Nina é travada e atrasa o grupo, precisa soltar mais.',
            correta: false,
            feedback:
              'Isso é julgamento mais receita, e os dois estragam o registro. O que pareceu travamento era conferência de cada elo. O diário testemunha a cena; não prescreve que a aluna mude.',
          },
          {
            texto: 'Nina é da Casa Lógica, então não colabora em grupo.',
            correta: false,
            feedback:
              'Aqui a Casa virou desculpa para um defeito que a cena não mostra. A predominância diz por onde ela entra, nunca que ela não colabora. Usar a Casa como causa fecha a porta que o dado devia manter aberta.',
          },
          {
            texto: 'Nina segurou o grupo até a conta fechar e explicou que queria achar onde o número quebrava antes de seguir.',
            correta: true,
            feedback:
              'Cena (segurou o grupo pela conta) e fala (achar onde quebrou) mostram o mesmo mecanismo: ela precisa que a cadeia se sustente antes de aceitar o resultado. Isso é a Casa Lógico-Matemática. O registro forte deixa o próximo mentor ver o método, não só a demora.',
          },
        ],
      },
      {
        inteligencia: 'Corporal',
        cor: COR.corporal,
        cena: 'Capítulo de ciências, montar um circuito que acende a lâmpada. O Benício largou o roteiro escrito de lado, foi mexendo nos fios, testando e refazendo, e acendeu antes de todos. Na hora do relatório, empacou. Você perguntou como tinha acendido e ele pegou os fios de novo, dizendo que era mais fácil mostrar do que escrever.',
        alternativas: [
          {
            texto: 'Benício resolveu o circuito mexendo e testando antes de todos, e para explicar preferiu refazer com os fios a escrever.',
            correta: true,
            feedback:
              'A cena (resolveu manipulando) e a fala (mais fácil mostrar) apontam juntas para a compreensão que mora no gesto: a Casa Corporal. E você registrou como ele chegou, não só que empacou no relatório. O relatório é execução; o circuito foi o processamento.',
          },
          {
            texto: 'Benício acendeu a lâmpada primeiro, foi o melhor da atividade.',
            correta: false,
            feedback:
              'O resultado não guarda o mecanismo. Vários alunos acenderiam por caminhos diferentes: um lendo o roteiro, outro vendo o esquema. O que faz a cena valer é o caminho do Benício, e ele ficou de fora.',
          },
          {
            texto: 'Benício não entregou o relatório porque é da Casa Corporal, teoria não é com ele.',
            correta: false,
            feedback:
              'Este é o desvio central do treinamento: a Casa virou causa da falta e teto de destino ao mesmo tempo. Ele resolveu o circuito por raciocínio, no corpo; escrever é outra habilidade, treinável. A Casa Corporal explica por onde ele entrou, nunca justifica uma entrega que faltou.',
          },
        ],
      },
      {
        inteligencia: 'Interpessoal',
        cor: COR.interpessoal,
        cena: 'No capítulo do júri simulado, a Laís não foi a que mais falou. Mas foi ela que percebeu que o Murilo tinha ficado de fora e sem função, chamou ele para revisar os argumentos, e o grupo parou de brigar depois disso. Você perguntou como tinha sabido e ela disse que dava para ver que ele ia explodir, que ele ficou quieto de um jeito que não era dele.',
        alternativas: [
          {
            texto: 'Laís é a queridinha e líder da turma.',
            correta: false,
            feedback:
              'Popularidade e liderança de crachá não são a leitura fina que a cena mostrou. Ela percebeu um estado interno escondido e agiu sobre ele. O rótulo social apaga justamente o mecanismo que valia registrar.',
          },
          {
            texto: 'Laís trouxe o Murilo de volta ao grupo antes de o clima estourar, e disse que percebeu porque ele ficou quieto de um jeito que não era dele.',
            correta: true,
            feedback:
              'Cena (leu o grupo e agiu) e fala (quieto de um jeito que não é dele) mostram a leitura fina do estado do outro: a Casa Interpessoal. E note: não foi a mais falante que leu a sala. Falar é uma coisa; ler pessoas é outra.',
          },
          {
            texto: 'Laís é da Casa Interpessoal, então é melhor deixar ela longe das partes de conteúdo pesado.',
            correta: false,
            feedback:
              'A Casa virou muro. Ela abre mais fácil pela leitura de gente, o que não a impede de nada: toda pessoa tem as oito. Usar a predominância para reduzir o que se oferece ao aluno é o oposto do trabalho do mentor.',
          },
        ],
      },
      {
        inteligencia: 'Intrapessoal',
        cor: COR.intrapessoal,
        cena: 'Faltava um dia para a entrega do capítulo e o grupo quis virar a noite juntando tudo. A Isadora recusou a parte de apresentar ao vivo e pediu para cuidar do roteiro escrito. Quando você estranhou, ela disse que, se apresentasse nervosa, travaria e derrubaria o grupo, que no texto rende muito mais, e que sabe como funciona.',
        alternativas: [
          {
            texto: 'Isadora é tímida e foge de apresentar.',
            correta: false,
            feedback:
              'Timidez seria fuga; o que houve foi escolha informada por autoconhecimento. Ela não fugiu do grupo, assumiu a parte em que rende mais. Confundir reserva com a Casa Intrapessoal perde o sinal, que é a precisão do autorrelato, não o recuo.',
          },
          {
            texto: 'Isadora precisa perder a vergonha e ser obrigada a apresentar para evoluir.',
            correta: false,
            feedback:
              'O diário testemunha, não prescreve. E a decisão dela protegeu o grupo e mostrou domínio de si. Transformar isso em uma falha a corrigir é ler a cena de cabeça para baixo.',
          },
          {
            texto: 'Isadora escolheu o roteiro em vez da fala ao vivo e explicou que, apresentando nervosa, travaria, e que rende mais no texto.',
            correta: true,
            feedback:
              'A cena (escolheu a função) e a fala (sei como eu funciono) mostram a leitura precisa do próprio estado orientando a decisão: a Casa Intrapessoal. Registre a escolha e o motivo dela; é aí que essa Casa aparece, não no silêncio.',
          },
        ],
      },
    ],
  },

  /* ================================================================
   * T2. RECONHECER AS CASAS (qual Casa comanda a cena)
   * Três lições + nove situações de identificação (com pegadinhas).
   * Sem selo: identificar a Casa é o próprio exercício.
   * ================================================================ */
  {
    id: 2,
    titulo: 'Reconhecer as Casas',
    nivel: 'Básico',
    subtitulo: 'Qual Casa está em cena · 9 situações · uns 7 min',
    capa: 'Três lições curtas apresentam as oito Casas e os pares que mais enganam o olhar no Fundamental 2. Depois, nove cenas de capítulo para você identificar qual Casa comanda. Algumas cenas enganam de propósito. A aba Inteligências aprofunda cada uma quando você quiser.',
    disponivel: true,
    licoes: [
      {
        titulo: 'As oito Casas, em uma linha cada',
        paragrafos: [
          'Toda pessoa tem as oito. O que varia é qual abre mais fácil: por onde o mundo entra primeiro. No adolescente, cada uma vira consciência. Em uma linha cada:',
        ],
        itens: [
          { cor: COR.linguistica, titulo: 'Linguística', texto: 'A palavra é a matéria: argumentar, narrar, caçar o sentido exato, sentir quando a frase não fechou.' },
          { cor: COR.logica, titulo: 'Lógico-Matemática', texto: 'O mundo é sistema: causa e efeito, hipótese e prova, a regra que precisa se sustentar.' },
          { cor: COR.espacial, titulo: 'Espacial', texto: 'Pensa em imagem: gira a figura na cabeça, vê o resultado montado antes de existir.' },
          { cor: COR.musical, titulo: 'Musical', texto: 'O ouvido comanda: ritmo, melodia, o padrão sonoro que ancora e não deixa errar a ordem.' },
          { cor: COR.corporal, titulo: 'Corporal', texto: 'Compreende fazendo: mexe, testa, ajusta. O saber mora no gesto, não antes dele.' },
          { cor: COR.naturalista, titulo: 'Naturalista', texto: 'Classifica: o que é igual, o que difere, o intruso que quase pertence. Taxonomia sobre qualquer material.' },
          { cor: COR.interpessoal, titulo: 'Interpessoal', texto: 'Lê os outros: humor, intenção, a tensão numa voz que parece normal. Age sobre o que leu.' },
          { cor: COR.intrapessoal, titulo: 'Intrapessoal', texto: 'Lê a si: distingue o próprio estado, sabe do que precisa, escolhe com consciência.' },
        ],
      },
      {
        titulo: 'Os pares que enganam no F2',
        paragrafos: [
          'Algumas Casas se parecem à primeira vista, e é nesses pares que o olhar mais erra. Aprenda a chave de cada um:',
        ],
        itens: [
          {
            titulo: 'Espacial e Corporal',
            texto: 'As duas usam as mãos. Pergunte a ordem: o Espacial VÊ a solução pronta antes de tocar; o Corporal só entende DEPOIS de mexer. Imagem interna contra pensamento no gesto.',
          },
          {
            titulo: 'Interpessoal e Lógica',
            texto: 'Distribuir funções a um grupo pode ser leitura de gente ou montagem de sistema. Tire as pessoas da cena: se o aluno segue feliz encaixando a engrenagem, era Lógica; se o que o move é o estado dos colegas, é Interpessoal.',
          },
          {
            titulo: 'Corporal e impulsividade',
            texto: 'Mover muito não é a Casa Corporal. Impulsividade é mover-se sem processar; a Corporal é mover-se PARA processar. O sinal é o gesto produzir compreensão, não atropelo.',
          },
          {
            titulo: 'Interpessoal e popularidade',
            texto: 'Ter muitos amigos e ser o mais falante não é ler pessoas. O quieto da beirada pode ser quem enxerga a sala inteira. O sinal é distinguir estados finos, não a quantidade de amigos.',
          },
          {
            titulo: 'Intrapessoal e timidez',
            texto: 'Reserva não é o sinal. O sinal é a precisão do autorrelato: saber do que precisa, em que condição rende, o que sentiu e por quê. O tímido recua; o Intrapessoal escolhe.',
          },
          {
            titulo: 'Naturalista e Lógica',
            texto: 'As duas organizam. A Lógica busca a regra causal (por que acontece); a Naturalista busca a taxonomia (a que grupo pertence). Uma pergunta por quê; a outra separa em famílias.',
          },
        ],
      },
      {
        titulo: 'Duas perguntas antes de decidir',
        paragrafos: [
          'Diante de uma cena, faça uma pergunta só: quem comanda? A palavra, a regra, a imagem, o ouvido, a mão, a classificação, o outro ou o mundo de dentro? Muitas vezes há duas Casas na cena, porque o aluno é inteiro. A comandante é a que, se você tirar mentalmente, faz a cena desmontar.',
          'A segunda pergunta é sobre o que o aluno diz de si. No F2 ele fala, e isso é valioso, mas o autorrelato é porta, não prova. Quando a fala dele e a cena divergem, não escolha uma: registre as duas e confie no que a cena mostra. E na dúvida que não fecha, descreva a cena como ela foi. Nomear a Casa é trabalho que a cena bem escrita sempre permite depois.',
        ],
        destaque: 'Pergunte quem comanda a cena. E lembre: o que o aluno diz de si é porta, não prova.',
      },
    ],
    situacoes: [
      {
        pergunta: 'Qual Casa está em cena?',
        cena: 'No debate do capítulo, o Otávio não levantou a voz nem foi o mais empolgado. Mas quando o outro grupo usou a palavra "livre", ele interrompeu: vocês disseram livre, mas estão usando no sentido de grátis, e não é a mesma coisa; o argumento de vocês inteiro depende disso.',
        alternativas: [
          {
            texto: 'Interpessoal',
            correta: false,
            feedback:
              'Ler o outro seria perceber o estado, a hesitação, o clima. O Otávio não fez isso: pegou uma palavra e desmontou o duplo sentido. O material dele foi a linguagem, não as pessoas.',
          },
          {
            texto: 'Linguística',
            correta: true,
            feedback:
              'É isso. Perceber que "livre" foi usada em dois sentidos, e que o argumento inteiro dependia disso, é a palavra como estrutura: a Casa Linguística. Não foi quem falou mais alto; foi quem ouviu a palavra com precisão.',
          },
          {
            texto: 'Lógico-Matemática',
            correta: false,
            feedback:
              'Perto, porque houve raciocínio. Mas repare por onde ele entrou: pela palavra (livre, dois sentidos), não pela cadeia de causa e efeito. O gatilho foi linguístico, e a Casa se decide pela porta de entrada.',
          },
        ],
      },
      {
        pergunta: 'Qual Casa comanda a cena?',
        cena: 'No capítulo do evento da Casa, a Rebeca distribuiu as funções de todo mundo: quem faz o convite, quem cuida do som, quem recebe. Parece que ela lidera o grupo. Mas repare: ela montou uma planilha de horários encaixados, reservou para si a função mais solitária, e o que a empolgava era ver o cronograma fechar sem sobreposição.',
        alternativas: [
          {
            texto: 'Interpessoal',
            correta: false,
            feedback:
              'A pegadinha clássica do F2. Tire as pessoas da cena: a Rebeca segue feliz encaixando o cronograma. Tire a planilha e a empolgação some. As pessoas eram peças de um sistema, não gente que ela estava lendo. Organizar pessoas e ler pessoas são Casas diferentes.',
          },
          {
            texto: 'Lógico-Matemática',
            correta: true,
            feedback:
              'É isso. Distribuir funções pode parecer Interpessoal, mas o ímã dela era a engrenagem encaixada, e a prova é dupla: pegou para si a função mais solitária e vibrou com a planilha, não com o grupo. A Lógica monta o sistema; a Interpessoal lê as pessoas.',
          },
          {
            texto: 'Espacial',
            correta: false,
            feedback:
              'A planilha é o veículo. O critério dela era encaixe de horários sem sobreposição, que é regra de sequência e causa (se atrasa aqui, empurra ali), não composição de imagem. A Lógica impõe ordem; a Espacial compõe forma.',
          },
        ],
      },
      {
        pergunta: 'Qual Casa está em cena?',
        cena: 'Recebeu uma caixa com trinta reportagens para o capítulo de história. A Yasmin, sem ninguém pedir, começou a separar: estas são notícia, estas são opinião disfarçada de notícia, e estas três aqui são propaganda se fazendo de reportagem. Achou na hora as que fingiam ser o que não eram.',
        alternativas: [
          {
            texto: 'Lógico-Matemática',
            correta: false,
            feedback:
              'A distinção fina Naturalista e Lógica: a Lógica busca por que algo acontece (a regra causal); a Yasmin buscou a que grupo cada texto pertence (a taxonomia). Ela não perguntou por quê; separou em famílias e caçou o intruso.',
          },
          {
            texto: 'Naturalista',
            correta: true,
            feedback:
              'É isso. Separar em notícia, opinião e propaganda, e farejar as três que fingiam ser reportagem, é o olhar que classifica e distingue a exceção: a Casa Naturalista. E note o disfarce: sem uma planta ou bicho à vista, ela operou em textos. A Naturalista precisa de variedade, não de natureza.',
          },
          {
            texto: 'Linguística',
            correta: false,
            feedback:
              'Os textos eram o material, mas o que ela fez com eles foi classificar por tipo, não brincar com a palavra nem a narrativa. Pergunte a operação: agrupar e distinguir é Naturalista; caçar o sentido exato da palavra seria Linguística.',
          },
        ],
      },
      {
        pergunta: 'Qual Casa está em cena?',
        cena: 'Para decorar a linha do tempo do capítulo de história, o Danilo não fez resumo nem mapa. Transformou a lista de anos num refrão, com batida, e ficou repetindo baixinho. Quando você perguntou como guardava tanta data, disse que punha no ritmo, que aí não tinha como errar a ordem, porque o compasso não deixa.',
        alternativas: [
          {
            texto: 'Linguística',
            correta: false,
            feedback:
              'As palavras estavam lá, mas o que segurava a ordem, pela fala dele, era o compasso: o ritmo não deixa errar. Quando o juiz da memória é o som, e não o sentido da palavra, a Casa é a Musical.',
          },
          {
            texto: 'Musical',
            correta: true,
            feedback:
              'É isso, e a fala entrega: o compasso não deixa errar a ordem. Transformar matéria em ritmo para fixar é a estratégia consciente da Casa Musical no adolescente. O som não enfeita; ele ancora.',
          },
          {
            texto: 'Lógico-Matemática',
            correta: false,
            feedback:
              'Sistema sugere regra abstrata; o dele era sonoro. Ele não deduziu as datas, encaixou num ritmo. O canal que faz o trabalho aqui é o ouvido, não a cadeia lógica.',
          },
        ],
      },
      {
        pergunta: 'Qual Casa comanda a cena?',
        cena: 'O Ravi não para quieto no capítulo, mexe em tudo. Hoje, na estrutura de palitos que tinha que aguentar peso, ele não esperou o plano do grupo: foi montando, sentindo cada palito ceder, refazendo o ângulo com a mão até parar de balançar. A estrutura dele foi a que aguentou mais peso. Disse que a mão vai achando onde está mole.',
        alternativas: [
          {
            texto: 'Nenhuma Casa',
            correta: false,
            feedback:
              'A distinção crítica do F2. Impulsividade é mover-se sem processar; aqui ele se moveu PARA processar: sentiu cada palito ceder e corrigiu o ângulo até firmar. O resultado (aguentou mais peso) e a fala (a mão acha onde está mole) mostram compreensão no gesto, não dispersão.',
          },
          {
            texto: 'Corporal',
            correta: true,
            feedback:
              'É isso. O mesmo aluno que não para quieto pensou com as mãos: ajuste fino de peso e equilíbrio que a conta não dá. Corporal é mover-se para processar, e a prova é que o movimento produziu uma estrutura melhor, não bagunça.',
          },
          {
            texto: 'Espacial',
            correta: false,
            feedback:
              'Ao contrário do Espacial, ele NÃO viu pronto antes: foi descobrindo no fazer, sentindo onde cedia. A compreensão chegou pela mão durante a montagem, não como imagem prévia. Isso desloca a Casa para a Corporal.',
          },
        ],
      },
      {
        pergunta: 'Qual Casa está em cena?',
        cena: 'A Noa quase não fala nas reuniões do grupo e senta afastada. Você quase a marcou como tímida. Mas na hora de dividir o trabalho ela disse, sem hesitar: me dá a parte de pesquisa, sozinha, que eu rendo mais de manhã e sem gente perguntando toda hora; a parte de falar com as outras Casas passa para o Kauã, que fica melhor nisso do que eu.',
        alternativas: [
          {
            texto: 'Intrapessoal',
            correta: true,
            feedback:
              'É isso, e é a distinção que engana: reserva não é o sinal, a precisão do autorrelato é. Ela sabe o horário em que rende, o que a atrapalha e onde é melhor que o colega. A Casa Intrapessoal aparece na escolha lúcida, não no silêncio.',
          },
          {
            texto: 'Nenhuma Casa',
            correta: false,
            feedback:
              'A pegadinha. Timidez seria evitar por desconforto; ela não evitou, alocou: pegou o que rende mais e passou o resto a quem faz melhor. Isso é leitura precisa de si, não fuga. Não confunda canal fechado com ausência.',
          },
          {
            texto: 'Interpessoal',
            correta: false,
            feedback:
              'Ela citou o Kauã, mas o centro da decisão era ela: onde EU rendo, o que ME atrapalha, meu melhor horário. A lupa apontou para dentro; o colega entrou só no fim. Quando a consulta interna comanda, a Casa é a Intrapessoal.',
          },
        ],
      },
      {
        pergunta: 'Qual Casa está em cena?',
        cena: 'O Arthur não é o mais popular da turma, ninguém o chamaria de líder. Mas no capítulo, quando o grupo travou numa discussão que ia virar briga, foi ele que te chamou de canto: a Íris não está brava com a ideia, ela está magoada porque ninguém citou a parte que ela fez. E era exatamente isso.',
        alternativas: [
          {
            texto: 'Interpessoal',
            correta: true,
            feedback:
              'É isso, e derruba um mito: não foi o popular nem o líder que leu a sala. Distinguir mágoa de raiva num colega, e acertar o motivo, é a leitura fina da Casa Interpessoal. Popularidade é ter muitos amigos; isto é perceber o que se passa dentro do outro.',
          },
          {
            texto: 'Nenhuma Casa',
            correta: false,
            feedback:
              'Isso interpreta a intenção dele e ainda joga fora o dado. Independentemente do motivo de ter contado, ele fez uma leitura precisa de um estado interno escondido. Registre a leitura; o resto é suposição.',
          },
          {
            texto: 'Linguística',
            correta: false,
            feedback:
              'As palavras transportaram a leitura, mas a leitura veio antes da frase: ele percebeu a mágoa por baixo da raiva. Pergunte o que a mente fez antes de falar; aqui, leu uma pessoa. Isso é Interpessoal, não Linguística.',
          },
        ],
      },
      {
        pergunta: 'Qual Casa comanda a cena?',
        cena: 'A Melina te disse, com todas as letras, que é lógica, que pensa por conta e regra, que matemática é com ela. Mas hoje, no problema de geometria do capítulo, ela resolveu antes de todos e, quando você pediu para explicar à colega, travou: girou a figura no ar com a mão e disse que viu que encaixava, mas não sabia dizer a conta.',
        alternativas: [
          {
            texto: 'Lógico-Matemática',
            correta: false,
            feedback:
              'Cuidado: o autorrelato é porta, não prova. A Melina se descreve como lógica, mas a cena mostra outra coisa: ela viu que encaixava e não conseguiu dar a regra. Quando a fala do aluno e a cena divergem, registre as duas e confie no que a cena mostra.',
          },
          {
            texto: 'Espacial',
            correta: true,
            feedback:
              'É isso. Girar a figura no ar, acertar antes de todos e não saber dar a conta é a assinatura da Casa Espacial: resolve como imagem antes de virar frase ou fórmula. O que ela ACHA que é (lógica) não bate com o COMO ela chegou. A cena vence.',
          },
          {
            texto: 'Intrapessoal',
            correta: false,
            feedback:
              'Ela se descreveu com convicção, mas a descrição estava errada sobre o mecanismo: disse lógica e operou por imagem. Autoconhecimento seria acertar como funciona por dentro. Aqui o autorrelato abriu a porta para o lado errado, e a cena corrigiu.',
          },
        ],
      },
    ],
  },

  /* ================================================================
   * T7. AS OITO CASAS NA SALA · INTERMEDIÁRIO (as versões disfarçadas)
   * ================================================================ */
  {
    id: 7,
    titulo: 'As oito Casas na sala',
    nivel: 'Intermediário',
    subtitulo: 'As versões disfarçadas · 6 situações',
    capa: 'No nível anterior, as Casas apareceram com a roupa de sempre. Aqui vêm disfarçadas: a Linguística que gagueja, a Naturalista sem natureza, a Musical que não toca nada, a Espacial que desenha mal. Duas lições sobre os disfarces, depois seis cenas para desmontá-los.',
    disponivel: true,
    licoes: [
      {
        titulo: 'A Casa não é a habilidade visível',
        paragrafos: [
          'O erro mais fino do olhar é confundir a Casa com a habilidade que costuma acompanhá-la. São coisas diferentes: a habilidade se treina e aparece na superfície; a Casa é o jeito de processar, e opera por baixo, até quando a habilidade falha.',
        ],
        itens: [
          { titulo: 'Pronúncia não é narrativa', texto: 'O aluno pode gaguejar, evitar falar, e construir histórias com arquitetura impecável. A fala é habilidade treinável; a narrativa é a Casa Linguística operando.' },
          { titulo: 'Destreza não é corpo', texto: 'Pode se atrapalhar com precisão fina e só compreender o que toca e manipula. Motricidade é habilidade; conhecer pelo corpo é a Casa.' },
          { titulo: 'Desenho bonito não é Espacial', texto: 'O traço se treina. A Casa Espacial aparece em outro lugar: ver a peça girada, saber onde cada coisa cabe, resolver a estrutura antes de conseguir explicar.' },
        ],
      },
      {
        titulo: 'Onde cada uma se esconde no adolescente',
        paragrafos: ['Os disfarces mais comuns da sala, para você reconhecer de longe:'],
        itens: [
          { cor: COR.linguistica, titulo: 'A Linguística calada', texto: 'Quase não abre a boca no debate, e em casa reescreve o próprio texto até soar exato. A Casa opera por dentro, sem plateia.' },
          { cor: COR.naturalista, titulo: 'A Naturalista sem natureza', texto: 'Nunca pisou numa trilha, e classifica games, playlists e tênis em famílias que ela mesma inventa. O que busca é a diferença fina, com o material que houver.' },
          { cor: COR.musical, titulo: 'A Musical que não toca nada', texto: 'Nunca pegou um instrumento e diz que "não sabe música", mas decora virando batida e sente na hora quando um tom mudou.' },
          { cor: COR.interpessoal, titulo: 'A Interpessoal sem a ética pronta', texto: 'Consegue o que quer porque leu como cada adulto reage. É a Casa sem a bússola, que ainda está em construção. Casa não é virtude: é canal.' },
        ],
      },
    ],
    situacoes: [
      {
        pergunta: 'Qual Casa está em cena?',
        cena: 'Fábio gagueja e evita falar em público, então quase não participa dos debates. Mas o conto que ele entregou no capítulo tinha ironia, uma reviravolta e um narrador que engana o leitor de propósito até a última linha.',
        alternativas: [
          { texto: 'Casa Linguística: a arquitetura do conto é dele, a fala é só a superfície.', correta: true, feedback: 'É isso. Ironia, reviravolta, narrador que engana: domínio de narrativa, o coração da Casa Linguística. A fonoaudiologia cuida da superfície; o registro guarda a arquitetura.' },
          { texto: 'Nenhuma clara: ele ainda tem dificuldade de fala.', correta: false, feedback: 'A gagueira é superfície, habilidade treinável. Por baixo, uma história com arquitetura completa e suspense administrado. Não deixe a fala esconder a estrutura.' },
          { texto: 'Casa Intrapessoal: o narrador que engana é introspecção.', correta: false, feedback: 'O narrador que engana é recurso DE NARRADOR, a serviço do efeito da história. O material da cena é o conto, não o mundo interno dele.' },
        ],
      },
      {
        pergunta: 'Qual Casa está em cena?',
        cena: 'Beatriz nunca pisou numa trilha e acha "mato" chato. Mas organiza as figurinhas e a playlist por famílias que ela mesma inventa: "esse som é do mesmo tipo daquele", "esse tênis é da família dos que copiaram o primeiro".',
        alternativas: [
          { texto: 'Casa Lógico-Matemática: ela está classificando.', correta: false, feedback: 'Perto, mas repare no critério: "da mesma família", parentesco de tipo. A Lógica classifica por regra abstrata (tamanho, número); a Naturalista agrupa por famílias, como quem separa espécies.' },
          { texto: 'Casa Naturalista: ela caça a diferença fina e agrupa por família, com o material que tem.', correta: true, feedback: 'É isso, e é o disfarce clássico: a Naturalista não precisa de natureza, precisa de variedade onde caçar diferenças finas. Figurinhas e playlists servem.' },
          { texto: 'Nenhuma: sem contato com a natureza, a Naturalista não aparece.', correta: false, feedback: 'É exatamente a conclusão que este nível existe para desmontar. A Casa é o jeito de processar, não o cenário. Sem trilha, ela opera nos games, nos tênis, nos memes.' },
        ],
      },
      {
        pergunta: 'Qual Casa está em cena?',
        cena: 'Matheus nunca tocou um instrumento e diz que "não sabe música". Mas decora fórmula virando batida, percebeu na hora quando o professor trocou uma palavra da explicação de sempre, e reclamou que a versão nova de uma música "está num tom estranho".',
        alternativas: [
          { texto: 'Casa Corporal: ele fica batucando na mesa.', correta: false, feedback: 'A mão serve ao ouvido: o critério do ajuste é o som, não o gesto. Quando o juiz da cena é o tom e o compasso, quem comanda é a Casa Musical.' },
          { texto: 'Nenhuma: quem não toca não é da Casa Musical.', correta: false, feedback: 'O disfarce perfeito. Saber tocar e processar pelo som são coisas diferentes: uma é destreza, a outra é canal. O Matheus não toca E pensa pelo ouvido.' },
          { texto: 'Casa Musical: o ouvido comanda, mesmo sem instrumento nenhum.', correta: true, feedback: 'É isso. Tocar é habilidade treinável; a Casa é o ouvido que encontra a regra sonora, guarda a sequência, estranha o tom mudado. Ele tem tudo isso e nunca pegou um violão.' },
        ],
      },
      {
        pergunta: 'Qual Casa está em cena?',
        cena: 'Gabriel tira as piores notas em desenho geométrico, o traço sai torto. Mas quando o grupo se perdeu na maquete, foi ele que disse, sem medir nada: "essa parede não cabe aqui; se você girar o telhado, sobra espaço pra escada".',
        alternativas: [
          { texto: 'Casa Espacial: o traço é fraco, mas ele manipula a estrutura no espaço de cabeça.', correta: true, feedback: 'É isso. Ver a peça girada e saber onde cada coisa cabe é a Casa Espacial. O desenho bonito vira ou não; a Casa já está operando. São coisas independentes.' },
          { texto: 'Nenhuma clara: ele desenha mal.', correta: false, feedback: 'O traço é habilidade em treino. A Casa Espacial estava na outra metade da cena: o mapa da maquete inteiro girando na cabeça dele. Não deixe o papel esconder a estrutura.' },
          { texto: 'Casa Lógico-Matemática: ele resolveu um problema da maquete.', correta: false, feedback: 'Ele resolveu VENDO a figura girada, não deduzindo por regra. Quando a solução chega como imagem antes da conta, o canal é o Espacial.' },
        ],
      },
      {
        pergunta: 'O que essa cena mostra?',
        cena: 'Vinícius consegue o que quer de quase todo professor: sabe com qual dá pra negociar prazo, o tom que funciona com cada um, e nunca tenta com a coordenadora ("com ela não cola").',
        alternativas: [
          { texto: 'Um problema de comportamento, precisa de limite, não de registro.', correta: false, feedback: 'O limite talvez precise existir, mas jogar a cena fora seria desperdiçar o dado: ele mapeou vários adultos com precisão. Registre a leitura fina; o limite é outra conversa.' },
          { texto: 'Casa Interpessoal: ele mapeou cada adulto com precisão. A bússola ética vem com os anos; o canal já está aí.', correta: true, feedback: 'É isso, e é uma das lições mais adultas do treinamento: Casa não é virtude. Ele tem uma leitura de pessoas rara, hoje a serviço do próprio interesse. O canal é o dado; o uso é construção dos próximos anos.' },
          { texto: 'Casa Linguística: ele convence pelas palavras.', correta: false, feedback: 'As palavras são a ferramenta visível; o motor é o mapa que ele fez de cada adulto (com quem, quando, em que tom). Convencer é leitura de pessoas aplicada.' },
        ],
      },
      {
        pergunta: 'Qual Casa está em cena?',
        cena: 'Você pergunta a Luiza se ela topa liderar o grupo do próximo capítulo. Ela fica um tempo calada, você quase repete, e então: "topo, mas não na parte de falar em público, isso me trava. Deixa eu cuidar do roteiro e a Marina apresenta".',
        alternativas: [
          { texto: 'Lentidão pra responder, vale anotar a demora.', correta: false, feedback: 'Olhe o que a demora PRODUZIU: uma decisão própria, uma condição e um limite reconhecido de si. Isso não é lentidão, é consulta interna. Anotar "demora" seria registrar o disfarce e perder a Casa.' },
          { texto: 'Casa Interpessoal: ela pensou na Marina.', correta: false, feedback: 'Repare a ordem: primeiro o mergulho para dentro (o silêncio, o "isso me trava"), depois a solução que inclui a colega. Quando a consulta interna comanda, quem dirigiu foi a Intrapessoal.' },
          { texto: 'Casa Intrapessoal: o silêncio era ela consultando o próprio estado antes de decidir.', correta: true, feedback: 'É isso. O instante entre a pergunta e a resposta é a assinatura da Intrapessoal: ela acessa o que sente e o que a trava antes de agir. A resposta veio inteira: decisão, condição e autoconhecimento.' },
        ],
      },
    ],
  },

  /* ================================================================
   * T8. AS OITO CASAS NA SALA · AVANÇADO (qual comanda a cena?)
   * ================================================================ */
  {
    id: 8,
    titulo: 'As oito Casas na sala',
    nivel: 'Avançado',
    subtitulo: 'Qual comanda a cena? · 5 situações difíceis',
    capa: 'Nas cenas reais, as Casas quase nunca aparecem sozinhas: uma constrói enquanto a outra narra, uma organiza enquanto a outra lê os colegas. Este nível treina a pergunta mais difícil do olhar: qual delas comanda? Três lições, depois cinco cenas sem resposta fácil.',
    disponivel: true,
    licoes: [
      {
        titulo: 'Quando duas Casas operam juntas',
        paragrafos: [
          'O aluno monta uma maquete (Espacial?) narrando cada personagem (Linguística?). Outro organiza o grupo (Lógica?) distribuindo os papéis (Interpessoal?). Nas cenas boas sempre há mais de uma Casa trabalhando, porque o adolescente é inteiro.',
          'O teste para achar a comandante: tire uma Casa da cena, mentalmente, e veja se a cena desmonta. Se ele parasse de narrar mas seguisse montando, a cena sobreviveria? E se parasse de montar, a história continuaria? A que não pode faltar é a que comanda.',
        ],
        destaque: 'Tire cada Casa da cena. A que faz a cena desmontar é a que comanda.',
      },
      {
        titulo: 'O sinal sem plateia',
        paragrafos: [
          'O sinal mais confiável de uma Casa é o que o aluno faz quando acha que ninguém vê e ninguém pediu: a levada batida no fone durante o intervalo, o texto escrito e não mostrado, a coleção reorganizada por conta própria.',
          'Com plateia, o adolescente também responde ao olhar dos outros e à nota; sem plateia, sobra só o ímã. Guarde essas cenas com carinho especial no registro: elas valem por dez.',
        ],
        destaque: 'O que ele faz sem plateia e sem nota é o sinal mais puro que existe.',
      },
      {
        titulo: 'O limite do olhar',
        paragrafos: [
          'O observador avançado sabe uma coisa que o iniciante não sabe: às vezes a resposta certa é "ainda não dá pra saber". Aluno recém-transferido, semana atípica, cena ambígua: cravar a Casa no escuro é chutar com autoridade, e o chute gravado vira verdade de papel.',
          'Nessas horas, a frase descritiva é a resposta avançada: guarda tudo e não carimba nada. O padrão vai se formar sozinho, cena após cena, e um dia a leitura será óbvia. Pressa é o único erro sem conserto.',
        ],
        destaque: 'Saber dizer "ainda não sei" é o grau mais alto da observação.',
      },
    ],
    situacoes: [
      {
        pergunta: 'Qual Casa comanda a cena?',
        cena: 'No capítulo de história, Leonardo montou uma maquete detalhada do porto colonial e, enquanto montava, ia narrando em voz alta a vida de cada personagem que morava ali. Quando um pedaço quebrou, ele não refez: incorporou "e então um incêndio destruiu o armazém" e seguiu a narração.',
        alternativas: [
          { texto: 'Casa Linguística: a história comandava; a maquete quebrada virou capítulo, não fim.', correta: true, feedback: 'É isso, e a prova está no acidente: a peça caiu e a narrativa nem tropeçou, transformou a queda em incêndio. Quando o imprevisto é absorvido POR uma Casa, ela é a comandante.' },
          { texto: 'Casa Espacial: ele passou a cena inteira montando a maquete.', correta: false, feedback: 'Aplique o teste: quando a maquete quebrou, o que sobreviveu? A história, que absorveu a queda ("um incêndio"). Se a Espacial comandasse, ele teria refeito a peça. A construção era cenário da narrativa.' },
          { texto: 'Casa Corporal: ele montou tudo com as mãos.', correta: false, feedback: 'A mão era veículo, não motor. Tire o manuseio e a história segue de boca; tire a história e a montagem perde o sentido. O corpo servia à narrativa.' },
        ],
      },
      {
        pergunta: 'Qual Casa comanda a cena?',
        cena: 'No trabalho em grupo, Felipe distribui as funções: quem pesquisa, quem escreve, quem apresenta. Mas repare: ele reserva pra si a função mais solitária, e passa o resto do tempo montando o cronograma em planilha, ajustando prazos e as dependências entre as tarefas.',
        alternativas: [
          { texto: 'Casa Interpessoal: ele lidera e organiza os colegas.', correta: false, feedback: 'Parece liderança, mas aplique o teste: tire os colegas e o Felipe segue feliz na planilha; tire a planilha e as dependências, e a diversão dele acaba. As pessoas eram peças do sistema; o sistema era o ímã.' },
          { texto: 'Casa Lógico-Matemática: os colegas eram peças de um sistema; o ímã dele é o cronograma, os prazos, as dependências.', correta: true, feedback: 'É isso. A distribuição de papéis era montagem de engrenagem, não leitura de gente, e a prova é dupla: ele se reserva a função mais isolada e gasta o tempo na estrutura. Organizar pessoas e ler pessoas são Casas diferentes.' },
          { texto: 'Casa Espacial: ele monta a planilha visualmente.', correta: false, feedback: 'O critério da planilha é sequência e dependência, que é regra, não composição de imagem. O Espacial compõe uma figura; o Lógico impõe uma ordem. O critério desempata.' },
        ],
      },
      {
        pergunta: 'O que essa cena vale, e por quê?',
        cena: 'Intervalo, Cora achando que ninguém via. De fone, ela batia com o dedo na mesa a levada de uma música e parava toda vez que errava o acento, recomeçando o compasso do zero. Ninguém pediu, nada valendo nota.',
        alternativas: [
          { texto: 'Pouco: era intervalo, não era atividade de capítulo.', correta: false, feedback: 'É o contrário: fora da atividade, sem plateia e sem nota, sobrou só o ímã dela. O que o aluno faz quando ninguém vê é o sinal mais puro que o registro pode receber. Essa cena vale a semana.' },
          { texto: 'Muito: ela é disciplinada, repete até acertar. Casa Lógico-Matemática.', correta: false, feedback: 'Ela parou por um ACENTO errado, não por uma regra quebrada. Quem corrige acento é o padrão musical interno, não a lógica. O juiz da cena era o ouvido.' },
          { texto: 'Muito: sem plateia e sem nota, o padrão sonoro veio à tona com autocorreção. Casa Musical em estado puro.', correta: true, feedback: 'É isso, nos detalhes: o SEM PLATEIA (nenhuma função social, só o ímã) e a AUTOCORREÇÃO (parou no acento errado e recomeçou: existe um padrão interno exigente). Registre com data e capricho.' },
        ],
      },
      {
        pergunta: 'Qual Casa comanda a cena?',
        cena: 'Depois de uma discussão feia no grupo, Emanuel não mediou nem se meteu na hora, ficou de fora. No dia seguinte procurou o mentor: "fiquei pensando por que o Diego explodiu daquele jeito, ele não é assim. Acho que ele estava com medo de levar a culpa sozinho".',
        alternativas: [
          { texto: 'Casa Interpessoal: um dia depois ele ainda processava o estado do colega e chegou a uma hipótese sobre o que o outro sentiu.', correta: true, feedback: 'É isso, e note a sofisticação: a leitura do outro ("não é assim", "medo de levar a culpa") atravessou a noite e voltou como hipótese genuína sobre o mundo interno do Diego. Casa Interpessoal comandando.' },
          { texto: 'Casa Espacial: ele processou o conflito com distância.', correta: false, feedback: 'Não houve nada de espacial na cena. O que atravessou a noite foi uma leitura de pessoa, e o assunto era o estado interno do outro.' },
          { texto: 'Casa Intrapessoal: ele estava elaborando os próprios sentimentos sobre a briga.', correta: false, feedback: 'Olhe o objeto da frase: não é "por que EU fiquei mal", é "por que o DIEGO explodiu". O mundo interno investigado é o do outro. Intrapessoal e Interpessoal se distinguem aí: pela direção da lupa.' },
        ],
      },
      {
        pergunta: 'O que o registro deve dizer sobre a Betina?',
        cena: 'Betina chegou há três semanas, transferida de outra escola. Num capítulo entrega um texto caprichado, no outro monta o experimento com as mãos, no outro puxa o grupo. Nenhum padrão se repetiu ainda. Você quer muito escrever qual é a Casa dela.',
        alternativas: [
          { texto: 'Escolher a Casa da cena mais marcante até agora e registrá-la, pra não deixar a Betina sem leitura.', correta: false, feedback: 'Três semanas de aluna recém-transferida é adaptação, não padrão: ela ainda está lendo o território novo, talvez imitando os colegas para pertencer. A leitura forçada de hoje viraria a verdade de papel de amanhã.' },
          { texto: 'Descrever as cenas como são (texto na segunda, experimento na quarta, puxou o grupo na sexta) e deixar o padrão se formar sozinho, sem eleger Casa ainda.', correta: true, feedback: 'É isso, e é a resposta mais avançada do treinamento inteiro: saber dizer "ainda não sei". Lidas em sequência daqui a dois meses, as suas frases descritivas vão desenhar o padrão sozinhas. Pressa é o único erro que o registro não conserta.' },
          { texto: 'Registrar que a Betina é versátil, se adapta a tudo.', correta: false, feedback: '"Versátil" parece elogio e é carimbo no escuro: três semanas não sustentam nem essa leitura. E o rótulo positivo tem o mesmo defeito do negativo: fecha a pergunta que devia ficar aberta.' },
        ],
      },
    ],
  },

  /* ================================================================
   * T3. OBSERVAR SEM ROTULAR (a etiqueta, o laudo e o autorrelato)
   * ================================================================ */
  {
    id: 3,
    titulo: 'Observar sem rotular',
    subtitulo: 'A etiqueta, o laudo e o autorrelato · 5 situações',
    capa: 'Duas lições sobre o que estraga um registro de adolescente: a etiqueta que gruda, o laudo que não é seu de dar e o autorrelato tratado como prova. Depois, cinco cenas de capítulo para praticar o registro que protege o aluno e o dado.',
    disponivel: true,
    licoes: [
      {
        titulo: 'Os três desvios',
        paragrafos: [
          'Um registro pode ser estragado de três jeitos, e os três costumam vir com boa intenção. No adolescente eles custam mais caro, porque a palavra que a escola usa vira identidade: ele passa a se comportar conforme o rótulo que recebeu.',
        ],
        itens: [
          { titulo: 'A etiqueta', texto: '"É o gênio da turma", "é o preguiçoso". Julga em vez de descrever. A elogiosa engana mais: cobra do aluno o mesmo papel no capítulo seguinte.' },
          { titulo: 'O laudo', texto: 'Transformar a Casa em nota, medalha ou diagnóstico. A Casa é mecanismo de processamento, não um selo de valor nem um defeito. Suspeita clínica não pertence ao registro.' },
          { titulo: 'O autorrelato como prova', texto: 'O aluno diz "eu sou da Casa Musical". Isso é porta, não prova. O que ele diz de si abre a observação; não a encerra. Confira no que ele faz, não no que ele se declara.' },
        ],
        destaque: 'Descreva como o aluno chegou. Não escreva quem ele é.',
      },
      {
        titulo: 'Cada coisa na sua via',
        paragrafos: [
          'A preocupação séria existe e tem destino certo: a coordenação ou a orientação, numa conversa, nunca numa frase de registro. O que entra no registro é a cena literal, datada: é ela que ajuda qualquer profissional no futuro.',
          'E duas réguas nunca entram: a comparação ("melhor que o irmão", "o primeiro da turma") e a nota. O registro Arboria observa como este aluno processa, não quanto ele pontua.',
        ],
        destaque: 'No registro, a cena. Na coordenação, a preocupação. No aluno, nenhuma etiqueta.',
      },
    ],
    situacoes: [
      {
        inteligencia: 'Espacial',
        cor: COR.espacial,
        cena: 'No capítulo de geografia, Caetano resolveu o mapa de fusos antes de todos. Quando o mentor pediu que explicasse, ele disse: "eu girei o globo na cabeça e já vi onde caía".',
        alternativas: [
          { texto: '"Caetano resolveu os fusos e explicou que girou o globo na cabeça antes de calcular."', correta: true, feedback: 'Você registrou o COMO: a solução chegou como imagem girada antes de virar conta. É a Casa Espacial operando, e é essa frase que continua contando algo daqui a dois anos.' },
          { texto: '"Caetano é o gênio da turma em geografia."', correta: false, feedback: 'Etiqueta elogiosa também gruda: cobra do Caetano o mesmo brilho no próximo capítulo e apaga o que ele fez hoje. O elogio que vale é o que descreve.' },
          { texto: '"Dar a nota máxima de raciocínio espacial para o Caetano."', correta: false, feedback: 'Isso vira a Casa em nota. A Casa é mecanismo, não medalha nem placar. O registro guarda a cena, não pontua o aluno.' },
        ],
      },
      {
        inteligencia: 'Interpessoal',
        cor: COR.interpessoal,
        pergunta: 'O que registrar?',
        cena: 'Bruna escreveu na autoavaliação do capítulo: "eu sou da Casa Interpessoal, sou a líder do grupo". No trabalho, quem percebeu o colega travado e redistribuiu as tarefas foi outra pessoa. Bruna falou bastante, mas não leu ninguém.',
        alternativas: [
          { texto: '"Bruna é da Casa Interpessoal, ela mesma reconhece isso."', correta: false, feedback: 'O autorrelato é porta, não prova. Ela se declarou; a cena mostrou outra coisa. Registrar a declaração como veredito é gravar o que ela pensa de si, não o que ela fez.' },
          { texto: '"Na autoavaliação Bruna se disse líder; no trabalho, falou bastante mas não redistribuiu quando um colega travou."', correta: true, feedback: 'Bem observado: você separou o que ela disse do que ela fez, sem desmentir nem confirmar. É a cena que informa, e ela deixa a pergunta aberta.' },
          { texto: '"Bruna é falante e se acha a líder."', correta: false, feedback: 'Duas etiquetas numa frase. Descreva a fala e a ação; deixe o nome da qualidade para o tempo, e para muitas cenas, não uma.' },
        ],
      },
      {
        inteligencia: 'Corporal',
        cor: COR.corporal,
        cena: 'Igor não para quieto no capítulo: mexe na cadeira, roda a caneta. Mas quando o mentor deixou montar o circuito de física com as mãos, ele resolveu antes de todos e só então explicou o que tinha entendido.',
        alternativas: [
          { texto: '"Igor é agitado, não consegue se concentrar."', correta: false, feedback: 'Etiqueta, e das que confundem: mover-se sem processar é impulsividade; mover-se PARA processar é a Casa Corporal. A cena mostrou a segunda, não a primeira.' },
          { texto: '"Igor parece ter déficit de atenção, vale sugerir avaliação."', correta: false, feedback: 'Suspeita clínica não entra no registro nem na conversa de corredor. Se houver preocupação real, ela vai à coordenação, por outra via. Aqui, gravada, seguiria o Igor para sempre.' },
          { texto: '"Igor montou o circuito com as mãos e resolveu antes de conseguir explicar: entendeu manipulando."', correta: true, feedback: 'Você registrou o canal do fazer: a compreensão aconteceu nas mãos antes de virar palavra. É o coração da Casa Corporal.' },
        ],
      },
      {
        inteligencia: 'Lógico-Matemática',
        cor: COR.logica,
        cena: 'Clarice contestou a fórmula do capítulo, pediu a demonstração e não aceitou "é assim porque o livro diz". Só seguiu depois que o mentor mostrou de onde a fórmula vinha.',
        alternativas: [
          { texto: '"Clarice pediu a demonstração da fórmula e recusou aceitá-la sem prova."', correta: true, feedback: 'É isso: a cadeia antes da aceitação, o "por que" que não para. A Casa Lógico-Matemática aparece na exigência de que a conclusão se sustente.' },
          { texto: '"Clarice tirou a melhor nota de exatas do capítulo."', correta: false, feedback: 'A nota conta como terminou, não como ela chegou. O dado era a exigência de prova, e a nota o engoliu.' },
          { texto: '"Clarice é mais lógica que o resto da turma."', correta: false, feedback: 'Comparação cria um pódio invisível e não guarda cena nenhuma. O registro observa esta aluna, sozinha e inteira.' },
        ],
      },
      {
        inteligencia: 'Linguística',
        cor: COR.linguistica,
        cena: 'Renato reescreveu três vezes a frase de abertura do texto do capítulo, incomodado com uma palavra que "não fechava", até soar exata.',
        alternativas: [
          { texto: '"Renato é o escritor da turma."', correta: false, feedback: 'Etiqueta que vira cobrança: no dia em que o texto sair torto, o rótulo cobra a conta. Descreva a cena de hoje.' },
          { texto: '"Renato reescreveu a abertura três vezes até a palavra soar exata."', correta: true, feedback: 'Você guardou a palavra como material, não só o sentido: o incômodo com a imprecisão é a assinatura da Casa Linguística.' },
          { texto: '"Renato já está pronto para olimpíada de redação."', correta: false, feedback: 'Prognóstico não é observação. Selar futuro é decisão de outra mesa, com muitas cenas; o registro testemunha, não prevê.' },
        ],
      },
    ],
  },

  /* ================================================================
   * T4. UMA ATIVIDADE, MUITOS CAMINHOS (o capítulo não é o conteúdo)
   * ================================================================ */
  {
    id: 4,
    titulo: 'Uma atividade, muitos caminhos',
    subtitulo: 'O capítulo não é o conteúdo · 5 situações',
    capa: 'Duas lições sobre a diferença entre propor um capítulo e ditar um caminho. Depois, cinco cenas do mesmo trabalho resolvido por Casas diferentes, para você registrar o caminho e não o produto.',
    disponivel: true,
    licoes: [
      {
        titulo: 'O capítulo é um convite',
        paragrafos: [
          'O mesmo projeto de capítulo, o mesmo tema, o mesmo grupo: e oito portas de entrada. Um resolve pelo texto, outro pela estrutura, outro montando com as mãos, outro organizando as pessoas. O produto pode até sair parecido; o caminho, nunca. O dado é o caminho.',
          'Puxar o aluno de volta ao roteiro esperado apaga o melhor dado do dia. Se a saída dele atrapalha o grupo, intervenha, a sala é sua. Mas registre o caminho antes: era ele que contava a história.',
        ],
        destaque: 'O capítulo espera um caminho, mas admite oito. O dado é o caminho escolhido.',
      },
      {
        titulo: 'Os dois momentos de ouro',
        paragrafos: ['Dois instantes rendem mais que o capítulo inteiro:'],
        itens: [
          { titulo: 'Antes do primeiro movimento', texto: 'Para onde o aluno vai antes de qualquer instrução? A escolha feita antes da regra é a mais limpa, porque ninguém a induziu.' },
          { titulo: 'Diante do obstáculo', texto: 'O experimento que falha, o texto que empaca. No impasse cada aluno mostra como pensa: um insiste, outro investiga, outro chama alguém. Três respostas, três registros.' },
        ],
      },
    ],
    situacoes: [
      {
        inteligencia: 'Espacial',
        cor: COR.espacial,
        pergunta: 'O que registrar?',
        cena: 'Trabalho do capítulo: uma linha do tempo da Revolução. Guilherme escreveu quase nada de texto: desenhou tudo como um mapa visual, com tamanhos e distâncias representando o peso e o intervalo dos anos.',
        alternativas: [
          { texto: '"Guilherme montou a linha do tempo como mapa visual, com as distâncias representando os anos."', correta: true, feedback: 'É isso: ele pensou o tempo como forma no espaço. Mesmo trabalho, porta Espacial. O registro guarda a porta, não a quantidade de texto.' },
          { texto: '"Guilherme entregou menos texto que o resto do grupo."', correta: false, feedback: 'A frase mede o Guilherme pelo produto esperado. Meça o caminho: ele traduziu tempo em espaço, e essa é a informação.' },
          { texto: '"Guilherme não caprichou na escrita do trabalho."', correta: false, feedback: 'Julgar o produto perde o caminho. Ele não fez pior: fez por outra porta, e a porta era o dado.' },
        ],
      },
      {
        inteligencia: 'Musical',
        cor: COR.musical,
        cena: 'Mesmo capítulo. Para fixar a sequência de datas, Vitória transformou tudo num refrão com ritmo e ficou repetindo baixinho enquanto estudava.',
        alternativas: [
          { texto: '"Vitória ficou dispersa cantarolando durante o estudo."', correta: false, feedback: 'O que parece dispersão é o canal funcionando: ela pôs a matéria em ritmo para guardar. Marcar o compasso enquanto estuda é a Casa Musical trabalhando, não fugindo.' },
          { texto: '"Vitória virou a sequência de datas em refrão com ritmo para fixar."', correta: true, feedback: 'É isso: o som como ferramenta de pensamento. O que precisa decorar, ela fixa cantarolando. Mesmo capítulo, porta Musical.' },
          { texto: '"Vitória não levou o trabalho a sério."', correta: false, feedback: 'Veredito em cima de um método que você não reconheceu. Ela levou a sério pela porta dela; descreva a porta.' },
        ],
      },
      {
        inteligencia: 'Interpessoal',
        cor: COR.interpessoal,
        cena: 'No mesmo projeto em grupo, Lorena largou a própria parte no meio e passou a distribuir os papéis, percebeu quem tinha ficado de fora e chamou. O trabalho andou porque foi ela que costurou as pessoas.',
        alternativas: [
          { texto: '"Lorena não terminou a parte dela do trabalho."', correta: false, feedback: 'A frase mede pela tarefa individual e perde o que ela fez com o grupo. Ela trocou de canal dentro do capítulo, da tarefa para as pessoas.' },
          { texto: '"Lorena é mandona."', correta: false, feedback: 'Etiqueta. E leitura apressada: ela não impôs, ela leu quem estava de fora e chamou. Descreva a ação, não o rótulo.' },
          { texto: '"Lorena distribuiu os papéis, percebeu quem ficou de fora e chamou: costurou o grupo."', correta: true, feedback: 'É isso: ler o grupo e organizá-lo é a porta Interpessoal do mesmo trabalho. A tarefa dela virou coordenar gente.' },
        ],
      },
      {
        inteligencia: 'Naturalista',
        cor: COR.naturalista,
        cena: 'O mentor propôs um capítulo de composição de trilha justamente para ver a Casa Musical. Bernardo não compôs nada: passou o tempo classificando os sons por família (percussão, sopro, corda) e montando uma taxonomia dos timbres.',
        alternativas: [
          { texto: '"No capítulo de trilha, Bernardo classificou os sons por família em vez de compor."', correta: true, feedback: 'É isso: convite Musical, resposta Naturalista. Diante da variedade, ele começou a distinguir e agrupar. O plano diz o que você ofereceu; o registro diz o que ele fez com a oferta.' },
          { texto: '"Bernardo não se interessou pelo capítulo de música."', correta: false, feedback: 'Ele respondeu por outra porta. O capítulo é convite, não garantia: a Casa que aparece é a do aluno, não a que você encomendou.' },
          { texto: '"Não registrar: o capítulo era de música e ele não fez música."', correta: false, feedback: 'Gerou dado, e dos bons, só que de outra Casa. Se o registro só aceitasse o dado encomendado, metade da turma sumiria dele.' },
        ],
      },
      {
        pergunta: 'O que registrar?',
        cena: 'O experimento do capítulo deu errado, o resultado não bateu. Samuel refez o experimento igual, mais devagar. Elisa foi conferir a conta procurando onde tinha errado. Augusto largou e foi pedir ajuda ao grupo do lado.',
        alternativas: [
          { texto: '"O grupo do Samuel não conseguiu concluir o experimento."', correta: false, feedback: 'A frase dilui três alunos numa falha só. O obstáculo é justamente onde cada um mostra como pensa, e o "grupo" engoliu as três respostas.' },
          { texto: '"Três registros: Samuel refez igual mais devagar, Elisa foi caçar o erro na conta, Augusto buscou ajuda."', correta: true, feedback: 'É isso: mesmo obstáculo, três caminhos. O corpo que insiste, a lógica que investiga o elo, a leitura de que outro pode ajudar. Diante do impasse é onde mais rende.' },
          { texto: '"Samuel é o mais persistente dos três."', correta: false, feedback: 'Etiqueta, e leitura apressada: refazer igual com mais força nem sempre é persistência; às vezes é o único caminho que o aluno conhece até aqui. Descreva os três.' },
        ],
      },
    ],
  },

  /* ================================================================
   * T5. O ALUNO QUE AINDA NÃO APARECEU (silêncio não é ausência)
   * ================================================================ */
  {
    id: 5,
    titulo: 'O aluno que ainda não apareceu',
    subtitulo: 'Silêncio não é ausência · 5 situações',
    capa: 'Duas lições sobre o aluno de quem não se registrou nada: o que o silêncio significa, o que ele não significa, e a Casa que só aparece por outra porta. Depois, cinco situações para praticar.',
    disponivel: true,
    licoes: [
      {
        titulo: 'O que o silêncio significa',
        paragrafos: [
          'Quando um aluno passa um bimestre sem registro, isso não diz nada sobre ele: diz do alcance do seu olhar, que é humano e não cobre a turma por igual. Ele viveu o bimestre inteiro; o que faltou foi testemunha.',
          'E quando uma Casa nunca aparece num aluno, desconfie da porta antes de desconfiar dele. O debate barulhento pode ser a porta errada para a Casa Linguística que escreve páginas em silêncio; a plateia pode ser o que trava a Casa Corporal que monta absorta sozinha. Silêncio numa situação diz respeito àquela situação.',
        ],
        destaque: 'O que não apareceu não está ausente. Pode ser só a porta errada.',
      },
      {
        titulo: 'O que fazer com o silêncio',
        paragrafos: ['O silêncio do registro pede três gestos simples:'],
        itens: [
          { titulo: 'O aluno da semana', texto: 'Descobriu um aluno sem registro no mês? Ele vira seu observado deliberado da próxima semana, em capítulos variados: portas diferentes.' },
          { titulo: 'A lacuna declarada', texto: '"Hoje não consegui observar o Fábio, o capítulo não deixou." Essa frase protege o aluno: quem ler depois saberá que ninguém olhou, em vez de concluir que não havia nada.' },
          { titulo: 'Nunca preencher com veredito', texto: '"Quieto, sem novidades" transforma a SUA lacuna num traço DELE. Cena requentada de memória com data de hoje é dado falso. O registro aguenta o vazio; não aguenta o inventado.' },
        ],
      },
    ],
    situacoes: [
      {
        pergunta: 'Fim do bimestre: nada sobre a Flora no registro. O que fazer?',
        cena: 'Revisando os registros, o mentor percebe que não escreveu nada sobre Flora no bimestre. Ela entrega tudo, não dá trabalho, não se destaca.',
        alternativas: [
          { texto: 'Eleger a Flora como aluna da semana: observá-la de perto em capítulos variados.', correta: true, feedback: 'É isso. O silêncio do registro é um lembrete para você, não um dado sobre ela. Quem nunca aparece é quem mais precisa do olhar deliberado, em mais de um tipo de capítulo, porque talvez as portas abertas até aqui não sejam as dela.' },
          { texto: 'Registrar: Flora é quieta, bimestre sem novidades.', correta: false, feedback: 'Essa frase vira a sua lacuna num traço dela. Quem não apareceu no registro foi o seu olhar; ela viveu o bimestre inteiro. E "quieta" fecha a pergunta que devia ficar aberta.' },
          { texto: 'Deixar como está: se nada chamou atenção, é porque não houve nada.', correta: false, feedback: '"Não vi" e "não houve" são frases muito diferentes. Nenhum olhar cobre a turma por igual, e confundir as duas é o risco mais silencioso do registro.' },
        ],
      },
      {
        inteligencia: 'Linguística',
        cor: COR.linguistica,
        pergunta: 'O que a cena mostra?',
        cena: 'Tainá nunca fala nos debates do capítulo, fica na dela. O mentor quase concluiu que a Casa Linguística é fraca nela. Então leu o texto que ela entregou: três páginas com ironia, ritmo e uma escolha de palavras precisa.',
        alternativas: [
          { texto: '"Tainá não tem a Casa Linguística: não participa dos debates."', correta: false, feedback: 'O debate é uma porta só, e a errada para ela. A Casa Linguística pode ser o aluno calado que escreve páginas: o processamento é por dentro, sem plateia.' },
          { texto: '"A Casa Linguística de Tainá apareceu no texto escrito, não no debate."', correta: true, feedback: 'É isso: ironia, ritmo e palavra exata são a arquitetura do dizer. Ela não tem menos Casa Linguística; tem outra porta. Faltou a você a porta certa, não a ela a Casa.' },
          { texto: '"Tainá é tímida e desinteressada."', correta: false, feedback: 'Duas etiquetas em cima do silêncio de uma porta. Descreva a cena: cala no debate, escreve três páginas. O resto o tempo dirá.' },
        ],
      },
      {
        pergunta: 'O que essa cena permite concluir?',
        cena: 'No capítulo, quando o mentor pede que alguém vá à frente montar ou demonstrar, Lucca nunca se voluntaria e fica encolhido. O mentor quase anotou "não gosta de prática". Depois, no contraturno, viu Lucca montando sozinho e absorto uma engenhoca com as mãos.',
        alternativas: [
          { texto: '"Lucca não tem a Casa Corporal: recusa as práticas."', correta: false, feedback: 'Repare o que ele recusa: a plateia, não o fazer. O canal pode estar bloqueado pela forma (ir à frente da turma) e não pelo conteúdo (o manuseio). Sem plateia, o Lucca monta absorto.' },
          { texto: '"Lucca é inseguro e evita se expor."', correta: false, feedback: 'Etiqueta em cima de leitura apressada. A cena mostra recusa a uma forma de encontro, não um traço de personalidade. Registre a cena como ela é.' },
          { texto: '"Nada ainda: ir à frente da turma é a porta errada; sem plateia, ele constrói com as mãos."', correta: true, feedback: 'É isso. O canal estava fechado pela exposição, não pela Casa. Ofereça o fazer por uma porta sem plateia antes de qualquer conclusão.' },
        ],
      },
      {
        inteligencia: 'Intrapessoal',
        cor: COR.intrapessoal,
        cena: 'Sara passou o capítulo de projeto coletivo sentada de lado, sem entrar nas discussões, aparentemente por fora. No fim, entregou um parágrafo de autoavaliação preciso sobre por que preferiu observar o grupo antes de escolher sua parte.',
        alternativas: [
          { texto: '"Sara observou o grupo antes de entrar e explicou com precisão por que escolheu sua parte assim."', correta: true, feedback: 'É isso: ela leu o próprio estado e as próprias condições antes de agir, e soube nomear. A Casa Intrapessoal aparece na precisão do autorrelato, não confunda reserva com ausência.' },
          { texto: '"A Sara não colaborou com o grupo hoje."', correta: false, feedback: 'A frase mede a Sara pelo que ela não fez. Mas observar antes de entrar é fazer algo, e o parágrafo dela provou: houve trabalho interno o capítulo inteiro.' },
          { texto: '"Sara tem dificuldade de trabalhar em grupo."', correta: false, feedback: 'Conclusão em cima de um capítulo. Escolher observar antes de entrar não é falhar em colaborar; é outra coisa, e a autoavaliação mostrou qual.' },
        ],
      },
      {
        pergunta: 'Hoje você não conseguiu observar a Flora. Registrar o quê?',
        cena: 'Semana da observação deliberada da Flora. Mas o capítulo virou do avesso e você não conseguiu olhar para ela nenhuma vez com atenção.',
        alternativas: [
          { texto: '"Nada: sem cena, sem registro."', correta: false, feedback: 'Existe registro melhor que o silêncio: a lacuna declarada. Quem ler depois não distingue "não havia nada" de "ninguém olhou", a menos que você diga qual foi.' },
          { texto: '"Hoje não consegui observar a Flora, o capítulo não deixou. Sigo com ela na mira esta semana."', correta: true, feedback: 'É isso, e é mais útil do que parece: protege a Flora de uma semana em branco ser lida como uma semana vazia. Lacuna declarada é honestidade de quem observa.' },
          { texto: '"Escrever de memória algo da semana passada, para não deixar o dia vazio."', correta: false, feedback: 'Registro reaproveitado com data de hoje é dado falso, ainda que bem-intencionado. O registro aguenta um dia vazio; não aguenta cena inventada, porque a análise não distingue.' },
        ],
      },
    ],
  },

  /* ================================================================
   * T6. A CONVERSA COM A FAMÍLIA (responder com cenas, não vereditos)
   * ================================================================ */
  {
    id: 6,
    titulo: 'A conversa com a família',
    subtitulo: 'Responder com cenas, não com veredictos · 5 situações',
    capa: 'Duas lições sobre a conversa com a família do adolescente: responder com cena e caminho, e o que nunca deve sair pela voz da escola. Depois, cinco perguntas reais de famílias para você praticar.',
    disponivel: true,
    licoes: [
      {
        titulo: 'A regra da conversa',
        paragrafos: [
          'A família pergunta com rótulo e com nota porque é a língua que ela conhece: "qual é a Casa dele?", "ela está entre as melhores?". Você não precisa aceitar nem recusar; existe uma terceira saída, sempre a mesma: devolver uma cena do próprio filho e o caminho que ela mostra. A nota escolar existe fora do Arboria; o que a escola acrescenta aqui é o COMO, não o quanto.',
          'A cena real do próprio filho é mais interessante que qualquer etiqueta, e a família sai com uma imagem em vez de uma palavra pendurada no adolescente. Confirmar a Casa a carimba; negar mantém a conversa no eixo errado. A cena troca de eixo.',
        ],
        destaque: 'A família guarda a palavra que a escola usa. Entregue cenas e caminho, não carimbos.',
      },
      {
        titulo: 'O que não sai na conversa',
        paragrafos: ['Quatro coisas nunca saem pela sua voz, por mais confiança que exista:'],
        itens: [
          { titulo: 'O rótulo', texto: 'Nem para confirmar a Casa ("ele é bem da Espacial mesmo") nem para negar. As duas respostas prendem o filho a um selo. A Casa é como ele processa, não uma etiqueta de gaveta.' },
          { titulo: 'O prognóstico', texto: '"Vai ser engenheiro", "nasceu pra escrever". Selar futuro aos treze é doce na hora e pesado depois.' },
          { titulo: 'A comparação e a nota como ranking', texto: 'Com o irmão, com o primo, com a posição na turma. Não discuta a régua dos outros; substitua por uma cena rica do próprio filho.' },
          { titulo: 'O parecer clínico', texto: 'Pedido de laudo, suspeita, "o que você acha que ele tem": tudo vai à coordenação ou à orientação, com acolhimento e via clara. A contribuição da escola são as cenas datadas do registro.' },
        ],
      },
    ],
    situacoes: [
      {
        pergunta: 'O que você responde?',
        cena: 'Na reunião, a mãe de Caetano: "vocês já sabem qual é a Casa dele? É da Espacial, né? Quero saber pra já direcionar".',
        alternativas: [
          { texto: '"Deixa eu te mostrar uma cena: semana passada ele resolveu o mapa dos fusos girando o globo na cabeça antes de calcular. É esse jeito de pensar que a gente vai acompanhando."', correta: true, feedback: 'É isso: você respondeu ao pedido de rótulo com uma cena e um caminho. A mãe sai com uma imagem do filho pensando, não com uma Casa pendurada nele.' },
          { texto: '"É, ele é bem da Espacial mesmo, pode investir nisso."', correta: false, feedback: 'Você carimbou a Casa e selou um caminho. A Casa é como ele pensa, não uma vocação a fechar aos treze. Amanhã ele pode brilhar por outra porta e sentir que decepcionou.' },
          { texto: '"Ainda não dá pra cravar a Casa dele com certeza."', correta: false, feedback: 'Mesmo negando, você manteve a conversa no eixo do carimbo. Saia do eixo "qual é a Casa" e entre no eixo "olha o que ele fez".' },
        ],
      },
      {
        pergunta: 'O que você responde?',
        cena: 'O pai de Clarice: "e as notas? Ela está entre as melhores da turma?".',
        alternativas: [
          { texto: '"Está sim, uma das melhores."', correta: false, feedback: 'Você entrou no ranking, e o Arboria não é sobre posição. A nota fica com a coordenação; o que você acrescenta é outra coisa.' },
          { texto: '"As notas ficam com a coordenação, contam uma parte. O que eu vejo aqui é ela pedindo a demonstração de cada fórmula, sem aceitar \'é assim porque sim\'. É esse jeito de pensar que interessa pra ela."', correta: true, feedback: 'É isso: você reconheceu a pergunta legítima, apontou a via certa da nota e devolveu o COMO. O pai sai sabendo como a filha pensa, não só onde ela pontua.' },
          { texto: '"Nota não importa muito no nosso projeto."', correta: false, feedback: 'Você desmereceu uma preocupação legítima e deu aula na reunião. Não negue a nota; mostre o que a escola vê além dela.' },
        ],
      },
      {
        pergunta: 'O que você responde?',
        cena: 'A mãe de Renato, orgulhosa: "ele escreve tão bem, vai ser jornalista igual ao tio, né?".',
        alternativas: [
          { texto: '"Com certeza, é o escritor da turma."', correta: false, feedback: 'Você selou uma profissão aos treze e ainda pendurou um rótulo. Se aos quinze ele amar exatas, vai carregar a sensação de estar decepcionando.' },
          { texto: '"A gente evita esse tipo de rótulo aqui na escola."', correta: false, feedback: 'A intenção é certa e a frase é dura: a mãe ouviu uma correção quando trouxe um orgulho. A doutrina é sua; pratique-a devolvendo cenas, não dando aula na reunião.' },
          { texto: '"Semana passada ele reescreveu a abertura do texto três vezes até a palavra soar exata. Onde isso vai dar a gente ainda não sabe, e nem precisa saber agora: é lindo de ver o cuidado dele com a palavra."', correta: true, feedback: 'É isso: você acolheu o orgulho, que é legítimo, e devolveu uma cena real sem prometer futuro. O afeto ficou; o selo não.' },
        ],
      },
      {
        pergunta: 'O que você responde?',
        cena: 'O pai de Igor, preocupado: "o irmão mais velho era craque em prova. O Igor não para quieto e vai mal. Ele é mais devagar?".',
        alternativas: [
          { texto: '"Deixa eu te contar do Igor: no capítulo de física, quando deixei montar o circuito com as mãos, ele resolveu antes de todo mundo, aí sim explicou. Ele entende fazendo. É por essa porta que ele aprende."', correta: true, feedback: 'É isso: você recusou a régua do irmão sem citá-la e encheu o espaço da ansiedade com o caminho real do Igor. A comparação murcha quando o filho de verdade aparece.' },
          { texto: '"Cada um tem seu tempo, não compara."', correta: false, feedback: 'Verdadeira e vazia: genérica demais para competir com a imagem do irmão craque. Ansiedade de comparação só perde para cena concreta do próprio filho.' },
          { texto: '"Ficar quieto na prova não é o mais importante."', correta: false, feedback: 'Você entrou na régua para discuti-la. Não discuta a comparação; substitua por uma cena.' },
        ],
      },
      {
        pergunta: 'O que você responde?',
        cena: 'A família de Lucca, formal: "o psicólogo pediu um parecer da escola sobre ele. O que vocês acham que ele tem?".',
        alternativas: [
          { texto: '"Contar o que você acha do Lucca, já que a família confia em você."', correta: false, feedback: 'A confiança é real, e é justamente por isso que a sua opinião improvisada teria peso de documento. A escola não emite parecer clínico, nem por escrito nem de boca: o que você "acha" viraria "a escola disse".' },
          { texto: '"Isso quem organiza é a coordenação; eu levo o pedido de vocês hoje. O que eu posso garantir é que os registros do que ele faz e como faz estão em dia para ajudar o profissional."', correta: true, feedback: 'É isso: a via certa, o tom que acolhe a preocupação, e a contribuição real da escola nomeada. Cenas datadas de como o Lucca processa são o que de fato ajuda um profissional de saúde.' },
          { texto: '"A escola não faz isso, e encerrar o assunto."', correta: false, feedback: 'Correto no conteúdo, frio no gesto: a família sai com um não e sem caminho. A mesma recusa, com a via apontada e a preocupação acolhida, protege a escola e a relação.' },
        ],
      },
    ],
  },
];
