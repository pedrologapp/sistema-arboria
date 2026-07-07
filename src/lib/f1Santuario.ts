/**
 * Santuário do mecanismo, versão FUNDAMENTAL 1, por FAIXA.
 *
 * O F1 renderiza o mesmo mecanismo do Infantil (SANTUARIO_INFANTIL). A CENA de
 * cada inteligência ABRE com o exemplo do gênio (Darwin, Dickens, Menuhin...),
 * que o Fundador faz questão de manter, e SÓ a parte "na sua sala" muda por
 * faixa, porque a do Infantil é de criança de 3-4 anos e soa deslocada no F1
 * (gargalo #5 da simulação, aprovado 07/07). Os demais campos (mecanismo,
 * naoDefine, veMundo, lente, cuidado, cores) vêm do SANTUARIO_INFANTIL.
 *
 * `abertura` = o exemplo do gênio, idêntico ao do Infantil (faixa-independente).
 * `cena13/cena45` = a parte da sala por faixa: 1º-3º é comportamento observável
 * do aluno de 6-8; 4º-5º é a técnica de PERGUNTAR ao aluno como fez, e o
 * auto-relato (metacognição de 9-10) revela o mecanismo. Conteúdo pelo setor,
 * ancorado no documento mestre e no santuário do Infantil.
 */
import { SANTUARIO_INFANTIL, type SantuarioMecanismo } from './infantilSantuario';

interface CenaFaixaF1 {
  abertura: string;
  cena13: string;
  cena45: string;
  observar13: string[];
  observar45: string[];
}

const F1_FAIXA: Record<number, CenaFaixaF1> = {
  1: {
    abertura:
      'Charles Dickens, antes de publicar qualquer livro, enchia cadernos com descrições das pessoas que via na rua. Não era exercício: era necessidade.',
    cena13:
      'é o aluno que, ao explicar o que fez, não te dá a resposta: te conta a história de como chegou nela, com começo, meio e fim. Ou o que te corrige quando você troca uma palavra do combinado da turma: ele guardou o texto, não só a ideia.',
    cena45:
      "é o aluno que, quando você pergunta como pensou, responde em palavras: 'primeiro eu li tudo, aí fui montando a frase na cabeça'. Ele não só pensa em palavras: já sabe que pensa assim. Pergunte como ele fez, e ele te entrega o próprio mecanismo.",
    observar13: [
      'Repare quem reconta na segunda o que viveu no fim de semana com começo, meio e fim',
      'Quem corrige a palavra trocada de um combinado ou de uma história de sempre',
      'Quem inventa nome pra tudo, e o nome tem som, lógica, intenção',
      'Quem guarda a fala exata de alguém e devolve dias depois',
    ],
    observar45: [
      'Peça que ele conte como fez: repare quando a resposta vem em narrativa (o passo a passo em palavras), não em gesto nem em imagem',
      'Quem prefere escrever ou falar a explicação a desenhá-la ou montá-la',
      'Quem percebe e comenta a palavra precisa, o duplo sentido, a diferença entre dois jeitos de dizer a mesma coisa',
      'Quem sabe dizer que pensa em palavras, que monta a frase na cabeça antes de escrever',
    ],
  },
  2: {
    abertura:
      'Uma criança pequena derruba a colher do cadeirão. Você devolve. Ela derruba de novo: olhando para você, não para a colher. De novo. De novo. Não é birra: é um teste, ela verifica se o mundo responde sempre do mesmo jeito. É ciência sem nome, e é a mesma que reaparece anos depois.',
    cena13:
      "é o aluno que, antes de começar, quer a regra: 'mas sempre vai ser assim?'. Ou o que, recebendo um monte de coisas, separa e agrupa por conta própria, e o critério é dele.",
    cena45:
      "é o aluno que justifica a resposta mostrando o caminho: 'se esse é assim, então aquele tem que ser assado'. Peça que ele explique o porquê, e ele te mostra a cadeia que montou sozinho. Ele sabe que chegou por dedução, não por sorte.",
    observar13: [
      "Repare quem pede a regra antes de começar: 'sempre vai ser assim?'",
      'Quem emenda perguntas em cadeia, cada resposta puxando a próxima',
      'Quem nota na hora quando a rotina ou a sequência quebra a ordem de sempre',
      'Quem testa a mesma coisa de novo mudando um detalhe, pra ver se o resultado muda junto',
    ],
    observar45: [
      "Peça que ele explique por que a resposta está certa: repare quando ele mostra a cadeia ('se isso, então aquilo') em vez de dizer 'só sei'",
      'Quem confere o próprio resultado sozinho, procurando onde poderia ter falhado',
      'Quem generaliza: descobre uma regra num caso e já pergunta se vale pros outros',
      'Quem reconhece que chegou por raciocínio, e sabe refazer o caminho de trás pra frente',
    ],
  },
  3: {
    abertura:
      'Os navegadores das Ilhas Caroline cruzam centenas de quilômetros de oceano sem instrumentos. Eles não veem as ilhas enquanto navegam: eles as imaginam; um mapa vivo, dentro da cabeça, atualizado a cada onda.',
    cena13:
      'é o aluno que, antes de montar, olha as peças um tempo e depois encaixa quase sem errar. Ou o que sabe onde cada coisa fica guardada na sala, inclusive o que você mesma perdeu: ele busca pela imagem do lugar, não pelo nome.',
    cena45:
      "é o aluno que, quando você pergunta como resolveu, conta uma imagem: 'eu imaginei a peça virada e já sabia onde ela ia'. Peça que ele explique o caminho, e ele te descreve uma figura, não uma conta. Ele já sabe que pensa em formas, e enxerga a solução antes de conseguir dizê-la.",
    observar13: [
      'Repare quem olha as peças um tempo antes de tocar, e monta quase sem errar',
      'Quem acha o caminho pela escola ou lembra onde cada coisa fica guardada, buscando pela imagem do lugar',
      'Quem nota que algo mudou de posição na sala antes dos outros',
      'Quem resolve o encaixe pela forma, sem tentativa e erro',
    ],
    observar45: [
      "Peça que ele conte como chegou: repare quando a resposta é uma imagem ('eu vi', 'imaginei virado') em vez de um passo a passo falado",
      'Quem desenha um mapa, um esquema ou um diagrama pra explicar, no lugar de descrever com palavras',
      'Quem gira a figura na cabeça e acerta o encaixe ou a dobra de primeira',
      'Quem diz que enxergou a solução antes de conseguir escrevê-la',
    ],
  },
  4: {
    abertura:
      'Yehudi Menuhin foi levado escondido a um concerto aos três anos. O som do violino o afetou de um jeito que os pais não esperavam e não haviam provocado. Ele insistiu, não pediu, insistiu: em ter o próprio violino. A inteligência musical dele não esperou escola nem instrumento: estava operando antes.',
    cena13:
      'é o aluno que ouve uma música uma vez e dias depois devolve o ritmo certo, sem ter estudado. Ou o que bate um ritmo na mesa enquanto faz outra coisa: não é dispersão, é o canal dele funcionando. O que não ficou falado, fica quando vira cantiga.',
    cena45:
      "é o aluno que, quando você pergunta como decorou aquilo, conta que 'fez virar música na cabeça' ou 'achou o ritmo'. Pergunte como ele guardou, e ele te mostra que organizou pelo som: a batida, a repetição, a rima. Ele já sabe que a memória dele entra pelo ouvido.",
    observar13: [
      'Repare quem reproduz um ritmo ou uma melodia depois de ouvir uma vez',
      'Quem marca a batida com o lápis, o pé, o corpo, enquanto faz outra tarefa',
      'Quem estranha a música de sempre num tom diferente, antes de saber dizer o quê',
      'Quem decora rápido o que vira rima, cantiga ou ritmo',
    ],
    observar45: [
      "Peça que ele conte como memorizou: repare quando ele diz que 'virou música', achou o ritmo ou a rima",
      'Quem transforma sozinho a matéria em cantiga ou batida pra guardar',
      'Quem percebe padrão sonoro (rima, repetição, compasso) onde os outros só veem texto',
      'Quem sabe dizer que se concentra melhor com um fundo sonoro ou marcando um ritmo',
    ],
  },
  5: {
    abertura:
      'Uma artesã experiente molda argila sem olhar para as mãos. As mãos sabem a pressão certa, a velocidade certa, o momento em que a argila cede. Se você perguntar como ela faz, ela dirá: "você sente". Não é resposta evasiva: é a descrição exata de onde mora o conhecimento.',
    cena13:
      'é o aluno que só entende a atividade quando as mãos começam a fazer: a instrução ainda não acabou e ele já está mexendo. Ou o que sabe fazer e não sabe explicar: quando você pergunta como, ele faz de novo, porque o saber mora no gesto, não na fala.',
    cena45:
      "é o aluno que, quando você pergunta como aprendeu, responde que só entendeu quando fez: 'eu tentei, aí a mão pegou o jeito'. Peça que ele explique, e a resposta vem em gesto antes de vir em frase. Ele já sabe de si: precisa fazer pra entender, não adianta só olhar.",
    observar13: [
      'Repare quem precisa pegar pra entender: o objeto explicado de longe não chega',
      'Quem aprende um gesto ou um passo vendo uma vez e repetindo com o corpo',
      'Quem sabe fazer e, quando você pergunta como, mostra de novo em vez de contar',
      'Quem calcula peso, equilíbrio e força na montagem, no encaixe, no jogo',
    ],
    observar45: [
      "Peça que ele conte como fez: repare quando a resposta é 'eu senti', 'a mão pegou o jeito', ou quando ele refaz o gesto pra explicar (nesta, o sinal é o gesto vir antes da palavra)",
      'Quem só firma o que aprendeu depois de manipular, montar, escrever com a própria mão',
      'Quem, ao explicar, usa o corpo junto: gesticula, encena, mostra o movimento',
      'Quem reconhece de si que precisa fazer pra entender, e pede pra pôr a mão',
    ],
  },
  6: {
    abertura:
      'Charles Darwin, quando menino, colecionava besouros. Não como passatempo, como necessidade: precisava encontrá-los, nomeá-los, separá-los. Décadas depois, essa mesma compulsão por distinções produziu a teoria da evolução.',
    cena13:
      'é o aluno que acha na hora o que não pertence ao grupo: a figura, a folha, o número diferente no meio dos outros. Ou o que coleciona (figurinhas, pedrinhas, gravuras de bicho) e sabe exatamente qual falta e onde cada uma entra.',
    cena45:
      "é o aluno que, quando você pergunta como separou, explica o critério: 'esses são de um tipo, aqueles de outro, e esse aqui não é de nenhum'. Peça que ele diga por que agrupou assim, e ele te entrega a família que enxergou: o que é igual, o que é diferente, onde termina um grupo e começa o outro.",
    observar13: [
      'Repare quem separa e agrupa qualquer conjunto por conta própria: por cor, tipo, tamanho, e o critério é dele',
      'Quem acha na hora o intruso, o que não pertence ao grupo',
      'Quem coleciona e sabe exatamente qual peça falta',
      'Quem cobra o nome certo de cada coisa e guarda nomes que vêm em família (bichos, plantas, dinossauros)',
    ],
    observar45: [
      'Peça que ele explique o critério: repare quando ele nomeia as categorias e sabe dizer onde termina um grupo e começa outro',
      'Quem percebe diferenças finas que passam batido pelos outros: a exceção, o que quase pertence mas não',
      'Quem organiza a matéria em famílias, tabelas ou grupos sem ninguém pedir',
      'Quem, ao comparar dois exemplos, aponta na hora o que os separa',
    ],
  },
  7: {
    abertura:
      'Anne Sullivan chegou para ensinar Helen Keller; cega, surda, fechada, quase sem treinamento formal. Em poucas semanas entendeu o que nenhum adulto ao redor tinha visto: Helen não precisava de disciplina. Precisava de conexão. Ela leu o estado interno de uma criança sem linguagem, sem expressão visível.',
    cena13:
      'é o aluno que percebe que o colega vai chorar antes de você perceber, e às vezes antes do próprio colega. Ou o que muda o jeito de fazer conforme o parceiro: com um é mais firme, com outro mais devagar, e ninguém ensinou, ele leu.',
    cena45:
      "é o aluno que, quando você pergunta como sabia que o colega estava mal, aponta o sinal: 'ele ficou quieto, e não é assim que ele é'. Peça que ele conte como percebeu, e ele descreve o que leu no outro: o tom, a cara, o que mudou. Ele já sabe que enxerga o mundo pelas pessoas e pelo que se passa entre elas.",
    observar13: [
      'Repare quem percebe o colega triste antes de você',
      'Quem olha o seu rosto pra decidir se pode',
      'Quem muda de comportamento quando o clima da sala muda',
      'Quem, na disputa, procura a saída que acalma os dois lados',
    ],
    observar45: [
      "Peça que ele conte como percebeu: repare quando ele aponta o sinal ('ficou quieto', 'mudou o tom') em vez de dizer 'só sei'",
      'Quem lê a dinâmica de um grupo de trabalho e sabe dizer quem ficou de fora, quem puxou, quem cedeu',
      'Quem ajusta o próprio jeito conforme quem tem pela frente, e reconhece que faz isso',
      'Quem media um conflito enxergando os dois lados, e sabe dizer o que cada um estava sentindo',
    ],
  },
  8: {
    abertura:
      'Virginia Woolf, num ensaio, descreve momentos da infância com uma clareza que vai além da memória: ela não só lembra o que aconteceu; sabe dizer o que sentiu, por que sentiu, e como a sensação virou compreensão.',
    cena13:
      "é o aluno que, depois de um desentendimento, consegue dizer o que sentiu com precisão: não é só 'fiquei triste', é 'fiquei com raiva porque eu queria e não deu'. Ou o que sabe a hora de parar, procura sozinho um canto pra se recompor, e volta quando está pronto.",
    cena45:
      "é o aluno que, quando você pergunta por que reagiu assim, não se defende: se explica. 'Eu travei porque não entendi e fiquei com vergonha de perguntar.' Peça que ele conte o que passou por dentro, e ele separa os fios: o que sentiu, por que sentiu, do que precisava. Ele se conhece, e sabe dizer.",
    observar13: [
      "Repare quem nomeia o que sente com exatidão, além do 'triste' e do 'bravo'",
      'Quem sabe a hora de parar, procura sozinho o canto quieto, e volta quando está pronto',
      'Quem recusa uma atividade e consegue dizer por quê',
      'Quem observa a brincadeira antes de entrar, e escolhe sabendo o que quer',
    ],
    observar45: [
      'Peça que ele conte o que passou por dentro: repare quando ele separa o que sentiu, por que sentiu e do que precisava',
      'Quem reconhece o próprio limite naquele dia e sabe pedir o que ajuda (mais tempo, um canto, silêncio)',
      'Quem, depois de um erro ou conflito, reconstrói sozinho o que aconteceu por dentro, sem culpar só o de fora',
      'Quem escolhe tarefas e parcerias sabendo de si, e explica a escolha',
    ],
  },
};

/**
 * Devolve o mecanismo na versão F1: campos universais do SANTUARIO_INFANTIL,
 * a `cena` = abertura do gênio (preservada) + a parte da sala por faixa, e o
 * `observar` por faixa (1º-3º ou 4º-5º).
 */
export const getSantuarioF1 = (id: number, faixa1: boolean): SantuarioMecanismo => {
  const base = SANTUARIO_INFANTIL[id];
  const f = F1_FAIXA[id];
  if (!base || !f) return base;
  const parteSala = faixa1 ? f.cena13 : f.cena45;
  return {
    ...base,
    cena: `${f.abertura} Na sua sala, ${parteSala}`,
    observar: faixa1 ? f.observar13 : f.observar45,
  };
};
