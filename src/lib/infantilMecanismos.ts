/**
 * Textos da ABERTURA de fase (Tempo 2 da Virada): um por mecanismo, na ordem
 * da trilha (1-8, id == ordem em `inteligencias`).
 *
 * Visíveis SÓ a educadores. Voz do caderno do Infantil: frase-âncora em serif
 * itálico + "O mecanismo" + "Onde reparar" (3 cenas do COMO, nunca traços).
 * Aprovados pelo Fundador em 02/07/2026 junto com o design da Virada de Fase.
 */
export interface MecanismoInfantil {
  nome: string;
  ancora: string;
  mecanismo: string;
  reparar: [string, string, string];
}

export const MECANISMOS_INFANTIL: Record<number, MecanismoInfantil> = {
  1: {
    nome: 'Linguística',
    ancora: 'Há crianças que pensam falando; a palavra é o caminho delas.',
    mecanismo:
      'Nesta fase, a turma explora o mundo pela palavra: contar, nomear, perguntar, inventar histórias. Não é sobre falar bonito: é sobre usar a língua como ferramenta de pensar.',
    reparar: [
      'A criança que narra o que faz enquanto faz',
      'A que pergunta o nome das coisas e guarda',
      'A que muda uma história pra deixá-la do jeito dela',
    ],
  },
  2: {
    nome: 'Lógico-Matemática',
    ancora: 'Antes do número, vem a pergunta: por que isso acontece assim?',
    mecanismo:
      'A turma explora o mundo por padrões, causas e ordens: o que vem antes, o que se repete, o que acontece se. Não é conta: é o gosto de organizar e testar.',
    reparar: [
      'A criança que separa, empilha e classifica por conta própria',
      'A que percebe quando algo sai da sequência',
      'A que testa de novo só pra ver se dá o mesmo resultado',
    ],
  },
  3: {
    nome: 'Espacial',
    ancora: 'Tem criança que entende com os olhos antes de entender com palavras.',
    mecanismo:
      'Nesta fase, a exploração é por imagens, formas e lugares: montar, desenhar, mapear, imaginar as coisas de outro ângulo.',
    reparar: [
      'A criança que resolve o encaixe girando a peça na cabeça',
      'A que desenha pra explicar o que viveu',
      'A que lembra caminhos e onde cada coisa fica',
    ],
  },
  4: {
    nome: 'Musical',
    ancora: 'Antes de entender a palavra, a criança já entende o ritmo dela.',
    mecanismo:
      'A turma explora por som, ritmo e melodia: o corpo que marca o pulso, o ouvido que reconhece, a voz que experimenta.',
    reparar: [
      'A criança que percebe um som antes de todo mundo',
      'A que guarda melodias e as devolve depois',
      'A que transforma qualquer objeto em ritmo',
    ],
  },
  5: {
    nome: 'Corporal-Cinestésica',
    ancora: 'Há pensamentos que só acontecem em movimento.',
    mecanismo:
      'Exploração pelo movimento e pelo toque: o corpo como instrumento de entender; equilibrar, imitar, construir com as mãos.',
    reparar: [
      'A criança que aprende um gesto vendo uma vez',
      'A que precisa tocar pra compreender',
      'A que conta histórias com o corpo inteiro',
    ],
  },
  6: {
    nome: 'Naturalista',
    ancora: 'Tem olhar que floresce longe da sala; no pátio, no bicho, na chuva.',
    mecanismo:
      'A turma explora observando o vivo e o natural: coleções, bichos, plantas, mudanças do tempo. É o mecanismo de reparar diferenças finas no mundo.',
    reparar: [
      'A criança que para tudo pra acompanhar uma formiga',
      'A que coleciona e separa por tipo',
      'A que nota o que mudou no pátio antes de todos',
    ],
  },
  7: {
    nome: 'Interpessoal',
    ancora: 'Algumas crianças leem pessoas como outras leem figuras.',
    mecanismo:
      'Nesta fase, a exploração é pelo encontro: perceber o humor do colega, mediar, cuidar, organizar a brincadeira dos outros.',
    reparar: [
      'A criança que percebe quando o colega ficou de fora',
      'A que negocia os papéis da brincadeira',
      'A que muda o próprio jeito conforme quem está perto',
    ],
  },
  8: {
    nome: 'Intrapessoal',
    ancora: 'A mais silenciosa das inteligências pede o mais paciente dos olhares.',
    mecanismo:
      'Exploração do mundo de dentro: a criança que se conhece, escolhe com clareza, sabe o que a acalma. É o mecanismo mais fácil de confundir com timidez.',
    reparar: [
      'A criança que sabe dizer o que quer e o que não quer',
      'A que busca um canto pra se recompor, e volta',
      'A que tem opinião própria mesmo sem alarde',
    ],
  },
};
