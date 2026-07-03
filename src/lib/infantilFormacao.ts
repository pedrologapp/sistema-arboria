/**
 * FORMAÇÃO ARBORIA (Infantil): treinamentos in-app com situações de escolha.
 *
 * Voz dos textos: professoral, sóbria, à la Gardner (pedido do Fundador 03/07).
 * Descrição antes de julgamento; o tempo como intérprete; nada de frase de efeito.
 *
 * Regras do momento: errar explica e deixa tentar de novo (nunca "prova", nunca
 * nota); cada situação DECLARA a inteligência em cena (zero suposição); só a
 * CONCLUSÃO é gravada no banco, nunca as respostas.
 */

export interface AlternativaFormacao {
  texto: string;
  correta: boolean;
  feedback: string;
}

export interface SituacaoFormacao {
  inteligencia: string;
  cor: string; // cor oficial da inteligência (língua de cores do app)
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
  {
    id: 2,
    titulo: 'As oito inteligências na sala',
    subtitulo: 'Reconhecer cada uma em cena · 8 situações',
    capa: '',
    disponivel: false,
    situacoes: [],
  },
  {
    id: 3,
    titulo: 'Observar sem rotular',
    subtitulo: 'A etiqueta, o teste e o diagnóstico · 5 situações',
    capa: '',
    disponivel: false,
    situacoes: [],
  },
];
