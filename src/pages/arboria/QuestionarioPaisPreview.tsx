// ============================================================
// QuestionarioPaisPreview (/arboria/coleta/pais/preview)
//
// O questionario dos pais como o pai veria no celular: tela cheia, ceu de fundo,
// tipografia editorial, uma pergunta por vez. PROTOTIPO: nao grava nada, nao esta
// vinculado a turma nenhuma, e so o dono da plataforma abre.
//
// DUAS DECISOES DE NARRATIVA (Fundador, 13/08):
// 1. Toda pergunta e' uma CENA que o pai reconhece, nunca um item de formulario.
//    "No corre-corre do dia, o que ele ja faz sozinho?" no lugar de "o que ele faz sozinho".
// 2. TELAS DE TRANSICAO entre os blocos, com o Arboria reagindo. Sao elas que
//    impedem o meio do questionario de virar lista.
//
// A crianca de exemplo e' fixa. Quando isto virar produto, o link sera unico por
// crianca e o nome vem do banco (por isso NOME esta isolado numa constante).
// ============================================================
import { useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';

const CEU = '/arboria/ceu.png';

// ------------------------------------------------------------------ FAIXA
// O instrumento nao e' um so': o que uma crianca de 2 anos pode ter feito e o
// que uma de 4 pode ter feito sao coisas diferentes, e as opcoes precisam
// acompanhar. As cenas do Maternal 2 e as do Grupo IV vivem em listas
// separadas; a entrada, as pausas e o fim sao os mesmos.
// No prototipo, ?faixa=g4 abre a versao do Grupo IV.
const PARAMS = new URLSearchParams(window.location.search);
const FAIXA: 'm2' | 'g4' = PARAMS.get('faixa') === 'g4' ? 'g4' : 'm2';
const NOME = FAIXA === 'g4' ? 'Helena' : 'Arthur';
const TURMA = FAIXA === 'g4' ? 'Grupo IV A' : 'Maternal 2 B';
const NAO_SEI = '__nao_sei__';
// Segundos entre a pergunta aparecer e as opcoes aparecerem. Ficou em zero:
// a pausa era boa uma vez e virava espera repetida a partir da terceira tela.
// A tela inteira entra junto, com a mesma revelacao suave.
const ATRASO_OPCOES = 0;
const OUTRO_CUIDADOR = 'Outra pessoa que cuida dele(a)';
// ------------------------------------------------------------------ FLEXAO
// O app sabe de quem se trata, entao o texto inteiro fala no genero da crianca
// em vez de empurrar "(a)" para o pai ler. As frases sao escritas com a marca
// "ele(a)" e a flexao acontece aqui: no masculino o parenteses cai, no feminino
// a ultima vogal vira "a". Quem escrever pergunta nova so precisa usar a marca.
// No produto o sexo vem do cadastro da crianca; aqui o ?sexo=F testa o feminino.
const SEXO: 'M' | 'F' =
  PARAMS.get('sexo')?.toUpperCase() === 'F' ? 'F'
  : PARAMS.get('sexo')?.toUpperCase() === 'M' ? 'M'
  : FAIXA === 'g4' ? 'F' : 'M';
const FEM = SEXO === 'F';

function flex(s: string): string {
  return s
    // artigo e possessivo andam junto com o substantivo
    .replace(/\bo seu filho\(a\)/g, FEM ? 'a sua filha' : 'o seu filho')
    .replace(/\bseu filho\(a\)/g, FEM ? 'sua filha' : 'seu filho')
    // ele(a) -> ela | dele(a) -> dela | sozinho(a) -> sozinha
    .replace(/([A-Za-zÀ-ÿ]+?)([oe])\(a\)/g, (_m, raiz, vogal) => raiz + (FEM ? 'a' : vogal));
}

// A flexao roda uma vez sobre os dados, nao a cada render.
function flexProfundo<T>(v: T): T {
  if (typeof v === 'string') return flex(v) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => flexProfundo(x)) as unknown as T;
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, flexProfundo(x)])) as T;
  }
  return v;
}

// Aqui no Nordeste nao se poe artigo antes de nome proprio: e' "Arthur", nao
// "o Arthur". Por isso nao existe mais constante de artigo neste arquivo.
const CONHECE_LO = FEM ? 'conhecê-la' : 'conhecê-lo';

const T = {
  fundo: '#135E96',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
};

type Item =
  | { tipo: 'fala'; linhas: string[]; enorme?: string; cta: string; ctaSuave?: string; rodape?: string }
  | { tipo: 'crianca'; cta: string }
  | { tipo: 'respondente'; chave: string; titulo: string; sub?: string; opcoes: string[]; livre?: string; cta: string }
  | { tipo: 'transicao'; enorme: string; linha?: string; cta: string }
  | { tipo: 'pergunta'; cena?: string; texto: string; instr?: string; opcoes: string[]; outra?: string; convite?: string };

// A entrada e' a mesma para todas as faixas: quem esta falando, para que serve,
// quem e' a crianca e de qual olhar vem a resposta.
const ENTRADA: Item[] = [
  // ---------------------------------------------------------------- entrada
  // A primeira tela precisa dizer QUEM esta falando e DE ONDE vem, senao o pai
  // recebe um desconhecido pedindo intimidade sobre o filho. Quem da confianca
  // aqui nao e' o Arboria: e' a escola. As linhas entram uma depois da outra,
  // como alguem falando, em vez de um bloco de texto de uma vez.
  { tipo: 'fala', enorme: 'Olá!',
    linhas: [
      'Eu sou o Arboria, o jeito que o Centro Educacional Amadeus escolheu para conhecer cada criança de perto.',
      'E hoje eu queria conhecer melhor o seu filho(a).',
      'Posso contar com você?',
    ], cta: 'Vamos lá' },

  { tipo: 'fala', linhas: [
      'Você conhece ele(a) de um jeito que mais ninguém conhece.',
      'Do que ele(a) brinca quando ninguém manda nada. O que ele(a) faz quando alguma coisa dá errado. Aquilo que ele(a) fica olhando sem parar.',
      'É disso que eu preciso.',
    ], cta: 'Continuar' },

  { tipo: 'fala',
    linhas: [
      'E não tem resposta certa ou errada aqui.',
      'Eu não quero saber o que ele(a) já aprendeu: quero saber o jeito dele(a).',
      'E pode contar as coisas esquisitas também. Muitas vezes é ali que está o mais interessante.',
    ], cta: 'Continuar' },

  { tipo: 'fala', enorme: 'Uma coisa rápida.',
    linhas: [
      'Isto não é prova e não vira nota.',
      `Quem lê o que você escrever é a professora dele(a) e a coordenação. Ele(a) nunca vê.`,
      'Queremos entender ele(a) melhor, porque é conhecendo o caminho dele(a) que a escola consegue caminhar junto.',
      'Vamos lá?',
    ],
    rodape: 'Responder é você que decide, e não responder não muda nada para ele(a). O que você escrever fica guardado com a escola, e você pode pedir para ver ou apagar quando quiser.',
    cta: 'Pode perguntar', ctaSuave: 'Saber mais' },

  { tipo: 'crianca', cta: 'É ele(a)' },

  // A reacao ao nome vem colada na confirmacao da crianca: o pai diz quem e' e
  // o Arboria reage NA HORA, antes de qualquer outra pergunta. Reagir depois de
  // mais uma pergunta de cadastro faria o Arboria parecer que estava reagindo
  // ao formulario. Saiu daqui o "prontos para falarem de quem voces mais amam",
  // porque a largada agora e' o botao da ultima tela de contexto.
  { tipo: 'transicao',
    enorme: `Ah, ${NOME}!`,
    linha: `Estou animado para ${CONHECE_LO} melhor.`,
    cta: 'Continuar' },

  { tipo: 'respondente', chave: 'responde',
    titulo: 'E quem está me contando hoje?',
    sub: 'Pergunto porque cada um vê uma parte diferente do dia dele(a).',
    opcoes: ['A mãe', 'O pai', 'Os dois juntos', 'A avó ou o avô', OUTRO_CUIDADOR],
    livre: OUTRO_CUIDADOR, cta: 'Continuar' },

];

// Quem mais fica com a crianca durante a semana. Estava aqui na entrada e saiu:
// no teste com pais (14/08) a pergunta foi lida como cobranca, como se OUTRA
// pessoa e' que devesse responder, e alguns pararam ali. No fim ela vira
// convite, porque a essa altura o pai ja' respondeu e ja' sabe o que ele
// estaria passando adiante.
const QUEM_MAIS_FICA = ['A mãe', 'O pai', 'A avó ou o avô', 'Uma babá ou outra pessoa que cuida', 'Uma tia, um tio, alguém da família', 'Não, sou eu mesmo quem fica mais'];

const CENAS_M2: Item[] = [
  // ============================================================
  // AS OITO CENAS DO MATERNAL 2 (v2, 13/08/2026)
  //
  // Reescritas depois que a simulacao com pais estimou que ~57% das marcacoes
  // da versao anterior nao teriam episodio por tras: o pai marcava descrevendo
  // o filho que ele tem na cabeca. Tres regras saem disso e valem para as
  // quatro faixas do Infantil:
  //   1. Toda pergunta em preterito perfeito. Nada de "ele costuma".
  //   2. Toda cena com ancora de tempo: ontem, essa semana, no ultimo lugar.
  //   3. O nome da crianca dentro da cena.
  //
  // Aos 2 anos isto e' EXPLORACAO, nao leitura: nada volta para o pai sobre
  // inteligencia e nada preenche cobertura de canal. O valor e' ser o
  // denominador que permite ler a mudanca dois anos depois.
  // ============================================================

  { tipo: 'pergunta',
    cena: `Pra começar, uma cena que tem em toda casa. Ontem, anteontem, esses dias: ${NOME} estava mexendo numa coisa que não abria, ou montando alguma coisa que caiu.`,
    texto: 'Qual foi a primeira coisa que ele(a) fez depois?',
    convite: 'Me conta como foi essa vez',
    opcoes: ['Fez de novo do mesmo jeito, com mais força', 'Virou a coisa e tentou por outro lado', 'Levou até você e pôs na sua mão', 'Foi pegar algo pra ajudar: uma cadeira, um pauzinho', 'Ficou olhando aquilo um tempo antes de mexer', 'Deixou pra lá e foi pra outra brincadeira'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `Essa semana ${NOME} quis uma coisa que estava em cima, alta demais pra ele(a).`,
    texto: 'O que ele(a) tentou primeiro?',
    convite: 'Me conta essa cena',
    opcoes: ['Esticou, pulou, subiu no que tinha perto', 'Arrastou uma cadeira, ou puxou o pano de cima', 'Pegou você pela mão e levou até lá', 'Ficou apontando e falando até alguém ir', 'Ficou olhando pra coisa, esperando alguém ver', 'Deixou pra lá e foi fazer outra coisa'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `Teve um dia esses dias em que ${NOME} quis alguma coisa e você não estava entendendo o que era. Ele(a) sabia bem o que queria.`,
    texto: 'Como ele(a) te mostrou?',
    convite: 'Me conta o que era, e como você descobriu',
    instr: 'Pode marcar mais de uma',
    // O leque foi refeito de proposito (Fundador, opcao A). A lista anterior
    // era apontar / levar pela mao / por a mao do adulto no objeto / alternancia
    // de olhar, que e' exatamente a combinacao usada em triagem de
    // desenvolvimento aos 2 anos. Um pai atento reconheceria a bateria, sairia
    // preocupado, e o Arboria nao devolve nada no Infantil: acenderia a
    // preocupacao sem dar onde pousar. Agora as opcoes estao escritas como cena
    // e duas delas (a analogia e o som) nao pertencem a triagem nenhuma, o que
    // quebra o padrao sem perder o que a pergunta lia.
    opcoes: ['Foi puxando você até o lugar', 'Apontou de longe', 'Fez o barulho ou o gesto daquilo que queria', 'Apontou e olhou pra você, esperando você entender', 'Trouxe outra coisa parecida pra você ver', 'Repetiu a mesma palavra até você entender'],
    outra: 'De outro jeito' },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre ${NOME}!`, cta: 'Continuar' },

  { tipo: 'pergunta',
    cena: 'Tem coisas que vocês fazem sempre na mesma ordem. Esses dias mudou sem querer: chegou visita, faltou tempo, alguém fez de outro jeito.',
    texto: `O que ${NOME} fez?`,
    convite: 'Me conta o que aconteceu',
    opcoes: ['Refez do jeito de sempre, sozinho(a)', 'Pegou na mão de quem estava fazendo e botou no lugar certo', 'Falou não e apontou o que estava errado', 'Riu e foi junto do jeito novo', 'Seguiu no que estava fazendo, sem mudar nada', 'Saiu de perto'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `Essa semana ${NOME} estava no meio de alguma coisa e parou do nada, por conta própria. Ninguém chamou ele(a).`,
    texto: 'Da última vez que isso aconteceu, o que foi que fez ele(a) parar?',
    convite: 'Me conta essa vez',
    opcoes: ['Um barulho que veio de fora', 'Um bicho, uma planta, alguma coisa viva', 'Alguém chegando ou saindo', 'Uma música, alguém cantando', 'Uma luz, uma sombra, alguma coisa se mexendo', 'Alguma coisa que estava diferente ali'],
    outra: 'De outro jeito' },

  // A pausa que explica ao pai por que isto importa. Sem ela o questionario
  // e' so' um formulario; com ela, o pai entende o que esta ajudando a construir.
  { tipo: 'transicao',
    enorme: 'Quando eu faço essas perguntas, é porque entender cada um deles faz diferença.',
    linha: `Eu não quero que ${NOME} seja apenas mais um na multidão: quero que ele(a) brilhe do jeito dele(a), que não é igual ao de mais ninguém. E eu sei que temos um caminho longo pela frente, mas de pouquinho em pouquinho faremos essa árvore crescer juntos...`,
    cta: 'Continuar' },

  { tipo: 'pergunta',
    cena: `Esses dias teve outra criança por perto de ${NOME}. Na casa de alguém, no parque, na porta da escola.`,
    texto: 'O que ele(a) fez nos primeiros minutos?',
    convite: 'Me conta como foi',
    opcoes: ['Ficou olhando de longe um tempo antes de chegar perto', 'Foi direto, sem esperar', 'Ficou colado em você antes de ir', 'Pegou um brinquedo e levou até a outra criança', 'Começou a fazer o que a outra criança estava fazendo', 'Brincou do lado, cada um no seu'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `Esses dias você viu ${NOME} fazendo alguma coisa igualzinha a alguém.`,
    texto: 'O que foi que ele(a) copiou?',
    convite: 'Me conta o que ele(a) copiou',
    instr: 'Pode marcar mais de uma',
    opcoes: ['Uma palavra, um jeito de falar', 'Um gesto, um jeito de mexer a mão', 'Uma coisa inteira, na mesma ordem em que viu', 'O jeito de sentar, de andar', 'Onde a pessoa guardou as coisas', 'O jeito de cuidar: ninar, fazer carinho'],
    outra: 'De outro jeito' },

  { tipo: 'transicao', enorme: 'Está quase acabando!', cta: 'Continuar' },

  { tipo: 'pergunta',
    cena: 'No último lugar em que vocês foram juntos, mesmo que tenha sido o mercado ou a casa de alguém. Voltaram, e passaram uns dias.',
    texto: 'Depois disso, em casa, ele(a) trouxe alguma coisa daquilo de volta?',
    convite: 'Me conta o que ele(a) trouxe de lá',
    instr: 'Pode marcar mais de uma',
    opcoes: ['Repetiu um movimento que viu alguém fazer lá', 'Repetiu o som ou a música que ouviu', 'Procurou em casa uma coisa parecida com a de lá', 'Brincou de ser alguma coisa que viu lá: o bicho, o moço, o carro', 'Dias depois, do nada, falou uma palavra sobre aquele lugar', 'Não trouxe nada de lá dessa vez'],
    outra: 'De outro jeito' },
];

// ============================================================
// AS CATORZE CENAS DO GRUPO IV (4 a 5 anos)
//
// Mesmos cinco eixos do Maternal 2, com as linhas de corte da idade. O que
// muda nao e' o tom da escrita: e' o que a crianca ja pode ter feito.
//   - aos 4 a FALA assume o lugar da imitacao como canal principal. A
//     professora do Grupo IV descreveu isso na ficha: a crianca mostra que
//     entendeu "falando, conversa participativo", enquanto no Maternal 2 e'
//     "elas reproduzem o que veem".
//   - reparar o que esta fora do lugar era "tem algumas que tem a percepcao"
//     no Maternal 2 e virou "a maioria percebe" no Grupo IV. Por isso o eixo
//     do que ela repara volta com tres itens, e nao com um.
//   - a crianca de 4 PERGUNTA se pode fazer diferente (a professora relatou),
//     mas ainda nao MUDA a regra e comunica a mudanca, que e' de 5 a 6 anos.
//   - o pai de 4 anos precisa de menos ajuda: as cenas sao mais curtas, e ele
//     ja consegue relatar o que a crianca DISSE, nao so' o que ela fez.
// ============================================================
const CENAS_G4: Item[] = [

  // ---------------------------------------------- eixo 1: o que nao obedece
  { tipo: 'pergunta',
    cena: `Pra começar, uma cena que tem em toda casa. Ontem, anteontem, esses dias: ${NOME} estava tentando fazer alguma coisa sozinho(a) e aquilo não ia.`,
    texto: 'O que ele(a) fez antes de pedir ajuda?',
    convite: 'Me conta como foi essa vez',
    opcoes: ['Insistiu, tentou de novo várias vezes', 'Parou, olhou bem a coisa e tentou de outro jeito', 'Foi buscar algo pra ajudar: uma cadeira, um pauzinho', 'Ficou falando sozinho(a) enquanto tentava', 'Já foi dizendo que não ia conseguir', 'Tentou uma vez e já veio chamar'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `Esses dias ${NOME} começou alguma coisa que ia demorar: um desenho grande, uma construção, uma brincadeira de várias partes.`,
    texto: 'Como ele(a) começou?',
    convite: 'Me conta o que ele(a) estava fazendo',
    opcoes: ['Já foi fazendo, sem parar pra pensar', 'Contou antes o que ia fazer', 'Separou tudo o que ia usar antes de começar', 'Foi procurar um pronto pra copiar: uma figura, um igual', 'Já chamou alguém pra fazer junto', 'Começou pela parte mais fácil'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `Esses dias alguma coisa que ${NOME} estava fazendo deu errado pela segunda vez.`,
    texto: 'O que ele(a) fez dessa vez?',
    convite: 'Me conta o que aconteceu',
    opcoes: ['Fez tudo de novo, do mesmo jeito', 'Mudou uma coisinha e tentou de novo', 'Deixou aquele jeito e foi tentar outro', 'Contou o que tinha dado errado', 'Chamou ajuda já mostrando onde travou', 'Largou e foi fazer outra coisa'],
    outra: 'De outro jeito' },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre ${NOME}!`, cta: 'Continuar' },

  // ------------------------------------------ eixo 2: fazer o outro entender
  { tipo: 'pergunta',
    cena: `${NOME} quis te contar uma coisa e você não estava entendendo. Ele(a) sabia o que queria dizer, mas não estava saindo.`,
    texto: 'O que ele(a) fez?',
    convite: 'Me conta o que era, e como você descobriu',
    instr: 'Pode marcar mais de uma',
    opcoes: ['Falou de novo, trocando as palavras', 'Disse o que não era: não é esse, é o outro', 'Comparou com outra coisa que você conhece', 'Levou você até lá pra mostrar', 'Imitou a cena, mostrou como tinha sido', 'Ficou bravo(a) e largou de explicar'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `Esses dias ${NOME} quis que alguém fizesse alguma coisa do jeito dele(a). Um jogo, um desenho, uma brincadeira.`,
    texto: 'Como ele(a) conduziu?',
    convite: 'Me conta como foi',
    opcoes: ['Foi explicando por partes, falando', 'Fez uma vez pra pessoa ver como era', 'Pegou na mão da pessoa e foi ajeitando', 'Combinou a vez: agora você, depois eu', 'Foi corrigindo a pessoa enquanto ela fazia', 'Cansou de explicar e fez sozinho(a)'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: 'Fim da tarde, você perguntou como tinha sido o dia.',
    texto: 'O que aconteceu?',
    convite: 'Me conta o que ele(a) falou',
    opcoes: ['Contou tudo sozinho(a), do começo ao fim', 'Contou só uma coisa, a que marcou', 'Só contou porque você foi perguntando', 'Repetiu a fala de alguém, do jeitinho da pessoa', 'Falou de como se sentiu, não do que aconteceu', 'Disse que não lembrava'],
    outra: 'De outro jeito' },

  // ----------------------------------------- eixo 3: como decifra o que e' novo
  { tipo: 'pergunta',
    cena: `Uma brincadeira com regra que ${NOME} nunca tinha visto, e as outras crianças já sabiam como era.`,
    texto: 'O que ele(a) fez?',
    convite: 'Me conta como foi',
    opcoes: ['Perguntou como era antes de entrar', 'Assistiu uma rodada inteira e só depois entrou', 'Entrou logo e foi aprendendo errando', 'Ficou fazendo igual a uma criança só', 'Perguntou se podia fazer de outro jeito', 'Chamou um adulto pra explicar'],
    outra: 'De outro jeito' },

  // A pausa que explica ao pai por que isto importa. Sem ela o questionario
  // e' so' um formulario; com ela, o pai entende o que esta ajudando a construir.
  { tipo: 'transicao',
    enorme: 'Quando eu faço essas perguntas, é porque entender cada um deles faz diferença.',
    linha: `Eu não quero que ${NOME} seja apenas mais um na multidão: quero que ele(a) brilhe do jeito dele(a), que não é igual ao de mais ninguém. E eu sei que temos um caminho longo pela frente, mas de pouquinho em pouquinho faremos essa árvore crescer juntos...`,
    cta: 'Continuar' },

  { tipo: 'pergunta',
    cena: `Chegou uma coisa nova, ou vocês viram alguma coisa funcionando que ${NOME} nunca tinha visto.`,
    texto: 'Qual foi a primeira pergunta dele(a)?',
    convite: 'Me conta o que era, e o que ele(a) perguntou',
    opcoes: ['Pra que isso serve?', 'Como é por dentro?', 'Eu posso mexer?', 'Quem trouxe? De quem é?', 'Tem outro igual em algum lugar?', 'Por que é assim?'],
    outra: 'De outro jeito' },

  // ----------------------------------------------- eixo 4: o que sobra dela
  { tipo: 'pergunta',
    cena: 'Fila, sala de espera, viagem de carro. Nada pra fazer e ainda ia demorar.',
    texto: `O que ${NOME} fez com esse tempo?`,
    convite: 'Me conta como foi',
    instr: 'Pode marcar mais de uma',
    opcoes: ['Inventou uma história e ficou falando sozinho(a)', 'Ficou cantando ou batendo em alguma coisa', 'Ficou olhando as pessoas e falando delas', 'Ficou reparando em tudo: placa, carro, letra', 'Ficou contando as coisas e vendo qual era maior', 'Não parou quieto(a) um minuto'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `No último passeio de que ${NOME} gostou. Voltaram, e passaram uns dias.`,
    texto: 'O que sobrou daquilo nele(a)?',
    convite: 'Me conta o que ficou',
    instr: 'Pode marcar mais de uma',
    opcoes: ['Ficou contando a mesma história várias vezes', 'Desenhou o que tinha visto', 'Brincou de ser o que viu lá: o bicho, o moço, o carro', 'Ficou repetindo uma música ou um som de lá', 'Dias depois voltou no assunto com uma pergunta nova', 'Ficou pedindo pra voltar lá'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `Pensa nas últimas vezes que ${NOME} brincou sozinho(a), essa semana.`,
    texto: 'O que ele(a) fez, na prática, nessas vezes?',
    convite: 'Me conta do que ele(a) brincou',
    instr: 'Pode marcar mais de uma',
    opcoes: ['Ficou conversando pelos bonecos, fazendo a voz de cada um', 'Ficou falando sozinho(a) o tempo todo, mesmo sem ninguém', 'Ficou cantarolando ou fazendo barulhinho enquanto brincava', 'Antes de começar, separou e arrumou tudo do jeito dele(a)', 'Inventou uma regra e foi seguindo ela sozinho(a)', 'Não ficou parado(a): levantava, corria, voltava'],
    outra: 'De outro jeito' },

  { tipo: 'transicao', enorme: 'Está quase acabando!', cta: 'Continuar' },

  // ------------------------------------------------- eixo 5: o que ela repara
  { tipo: 'pergunta',
    cena: `Esses dias ${NOME} reparou em alguma coisa que ninguém mais tinha visto.`,
    texto: 'O que foi?',
    convite: 'Me conta essa vez',
    opcoes: ['Uma coisa que tinha mudado de lugar em casa', 'Que duas coisas quase iguais tinham uma diferença', 'Um barulho que ninguém mais tinha ouvido', 'A cara de alguém, que estava diferente', 'Uma letra, um número, uma placa', 'Que estava faltando alguma coisa, ou alguém'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `${NOME} já te corrigiu numa coisa que você nem tinha percebido que errou.`,
    texto: 'Sobre o que foi?',
    convite: 'Me conta como foi',
    opcoes: ['Uma palavra que você trocou contando história', 'O caminho: não é por aqui', 'Uma coisa que estava fora do lugar', 'A música: você cantou errado', 'Que você disse uma coisa e fez outra', 'Uma conta, um número de coisas'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `${NOME} junta e guarda coisas dele(a): pedra, tampinha, papel, brinquedo pequeno.`,
    texto: 'Da última vez que você viu aquilo, como estava organizado?',
    convite: 'Me conta o que ele(a) junta',
    opcoes: ['Tudo junto por cor', 'Tudo junto por tamanho', 'Bicho com bicho, carro com carro', 'Numa ordem dele(a), e reclama se alguém mexe', 'Do jeito que achou bonito, sem regra nenhuma', 'Tudo misturado, sem ordem'],
    outra: 'De outro jeito' },
];

const FLUXO_BRUTO: Item[] = [...ENTRADA, ...(FAIXA === 'g4' ? CENAS_G4 : CENAS_M2)];

const FLUXO: Item[] = flexProfundo(FLUXO_BRUTO);

const TOTAL = FLUXO.filter((x) => x.tipo === 'pergunta').length;
const numeroDaPergunta = (i: number) => FLUXO.slice(0, i + 1).filter((x) => x.tipo === 'pergunta').length;

const QuestionarioPaisPreview = () => {
  const [i, setI] = useState(0);
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [escolhaTexto, setEscolhaTexto] = useState<Record<string, string>>({});
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [marcadas, setMarcadas] = useState<Record<number, string[]>>({});
  const [abertos, setAbertos] = useState<Record<number, boolean>>({});
  const [textos, setTextos] = useState<Record<number, string>>({});
  const [verMais, setVerMais] = useState(false);

  const noFim = i >= FLUXO.length;
  const item = noFim ? null : FLUXO[i];
  const ehPergunta = item?.tipo === 'pergunta';
  const num = ehPergunta ? numeroDaPergunta(i) : 0;
  const marcadasAqui = marcadas[i] ?? [];

  const alterna = (op: string) =>
    setMarcadas((m) => {
      const atual = m[i] ?? [];
      return { ...m, [i]: atual.includes(op) ? atual.filter((x) => x !== op) : [...atual, op] };
    });

  const avanca = () => setI((v) => v + 1);
  // O questionario so' e' gravado quando o pai aperta "Finalizar" na ultima
  // pergunta. Ate' la' ele pode voltar e trocar o que quiser sem virar bagunca,
  // porque nada foi para o banco ainda: o que grava e' um envio so', no fim.
  const ultimaPergunta = FLUXO.map((x) => x.tipo).lastIndexOf('pergunta');

  // O botao mora a DIREITA e tem cara de botao. O Fundador viu gente nao achar
  // onde apertar quando ele era so' texto sublinhado: em publico amplo, elegancia
  // que esconde a acao custa a resposta inteira.
  // A marca de escolhido. Vazia ela ja avisa que a linha se escolhe; cheia ela
  // diz que foi escolhida sem pedir ao pai que compare dois tons de branco.
  const Marca = ({ on }: { on: boolean }) => (
    <span
      className="flex items-center justify-center"
      style={{
        flex: 'none', width: 26, height: 26, borderRadius: 999,
        background: on ? '#1F6141' : 'transparent',
        border: on ? '2px solid #1F6141' : '1.5px solid rgba(255,255,255,.5)',
      }}
    >
      {on && <Check size={15} strokeWidth={3.5} color="#fff" />}
    </span>
  );

  const Cta = ({ texto, suave, forte, onClick }: { texto: string; suave?: boolean; forte?: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 font-bold uppercase ${forte ? 'cta-forte' : ''}`}
      style={{
        fontSize: suave ? 13 : forte ? 16 : 15,
        letterSpacing: '.14em',
        padding: suave ? '10px 4px' : forte ? '15px 30px' : '13px 24px',
        borderRadius: 999,
        color: suave ? 'rgba(255,255,255,.72)' : forte ? '#0E3F66' : '#fff',
        border: suave ? 'none' : '2px solid #fff',
        background: forte ? '#fff' : 'transparent',
        textDecoration: suave ? 'underline' : 'none',
        textUnderlineOffset: 5,
      }}
    >
      {texto}
      {!suave && <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>→</span>}
    </button>
  );

  // Rodape das telas: o secundario a esquerda, o principal a direita.
  const Rodape = ({ children }: { children: React.ReactNode }) => (
    <div className="pt-8 flex items-center justify-end gap-4 flex-wrap">{children}</div>
  );

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{
      backgroundColor: T.fundo,
      backgroundImage: `linear-gradient(180deg, rgba(6,38,66,.22) 0%, rgba(6,38,66,0) 34%), url("${CEU}")`,
      backgroundSize: 'cover, cover', backgroundPosition: 'center top, center', color: '#fff',
    }}>
      <div className="absolute pointer-events-none" style={{ left: '-14%', right: '-14%', bottom: '-110px', height: 210, borderRadius: '50%', background: '#3E8F63', opacity: 0.55, zIndex: 0 }} />
      <div className="absolute pointer-events-none" style={{ left: '-14%', right: '-14%', bottom: '-140px', height: 222, borderRadius: '50%', background: '#1F6141', zIndex: 0 }} />

      <div className="absolute pointer-events-none passaros-voo" style={{ top: '4.5%', left: '6%', width: 76, opacity: 0.42, zIndex: 1 }} aria-hidden>
        <svg viewBox="0 0 90 30" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" className="w-full block">
          <path d="M4 12c3-4 6-4 8 0 2-4 5-4 8 0" /><path d="M34 5c2.4-3.2 4.8-3.2 6.4 0 1.6-3.2 4-3.2 6.4 0" /><path d="M62 20c2-2.6 4-2.6 5.4 0 1.4-2.6 3.4-2.6 5.4 0" />
        </svg>
      </div>
      <style>{`
        @keyframes voo { from { transform: translate(0,0) } to { transform: translate(200px,-30px) } }
        .passaros-voo { animation: voo 46s linear infinite alternate; }
        @keyframes surge { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        
        .revela { animation: surge 1s cubic-bezier(.22,.61,.36,1) both; }
        /* As pausas curtas ("Está quase acabando!") estavam demorando o mesmo
           que as longas, porque o atraso do botao era fixo. Encurtado: numa
           frase de tres palavras, esperar quase tres segundos pelo botao
           parecia tela travada. */
        .pausa-frase { animation: surge .9s cubic-bezier(.22,.61,.36,1) .2s both; }
        .pausa-linha { animation: surge .9s cubic-bezier(.22,.61,.36,1) .95s both; }
        .cta-forte { animation: surge .7s cubic-bezier(.22,.61,.36,1) 1.5s both; }
        /* A tela do fim entra mais devagar que todas: e' a unica que o pai
           nao precisa vencer, entao ela pode tomar o tempo dela. */
        .fim-1 { animation: surge 1.2s cubic-bezier(.22,.61,.36,1) .4s both; }
        .fim-2 { animation: surge 1.2s cubic-bezier(.22,.61,.36,1) 1.9s both; }
        .fim-3 { animation: surge 1.2s cubic-bezier(.22,.61,.36,1) 3.4s both; }
        .fim-4 { animation: surge 1.2s cubic-bezier(.22,.61,.36,1) 4.9s both; }
        .fim-5 { animation: surge 1.2s cubic-bezier(.22,.61,.36,1) 6.2s both; }
        @media (prefers-reduced-motion: reduce) { .passaros-voo, .cta-forte, .pausa-frase, .pausa-linha, .revela,
          .fim-1, .fim-2, .fim-3, .fim-4, .fim-5 { animation: none; opacity: 1; transform: none } }
      `}</style>

      <div className="relative flex-1 flex flex-col w-full max-w-lg mx-auto px-6 pt-8 pb-7" style={{ zIndex: 2 }}>

        <div className="flex items-center justify-between mb-5" style={{ minHeight: 28 }}>
          {i > 0 ? (
            <button onClick={() => setI((v) => v - 1)} className="p-1 -ml-1" style={{ color: 'rgba(255,255,255,.88)' }} aria-label="Voltar"><ChevronLeft size={19} /></button>
          ) : <span />}
          {/* Sem contador e sem barra: o pai nao deve medir quanto falta.
              Quem marca o caminho sao as pausas do Arboria, que dizem onde
              estamos com afeto em vez de com numero. */}
          <span />
        </div>

        {/* ---------- FIM ---------- */}
        {noFim && (
          <>
            <p className="fim-1" style={{ fontFamily: T.serif, fontSize: 44, lineHeight: 1.04, letterSpacing: '-.022em', margin: '0 0 20px' }}>Muito obrigado!</p>
            <p className="fim-2" style={{ fontFamily: T.serif, fontSize: 23, lineHeight: 1.55, fontWeight: 600, margin: '0 0 24px' }}>Vou ler com muito carinho tudo o que você me contou.</p>
            <p className="fim-3" style={{ fontFamily: T.serif, fontSize: 23, lineHeight: 1.55, fontWeight: 600, margin: '0 0 24px' }}>No fim do semestre eu te mando o que a gente foi vendo, e também o que ainda não apareceu.</p>
            <p className="fim-4" style={{ fontFamily: T.serif, fontSize: 23, lineHeight: 1.55, fontWeight: 600, margin: '0 0 24px' }}>Nada se constrói de um dia para o outro. Fique de olho, porque em breve estaremos juntos de novo.</p>
            {/* O convite para uma segunda voz vem DEPOIS de responder, e nao
                antes: agora o pai ja' sabe o que sao as perguntas, entao ele
                consegue pensar em quem mais teria o que contar. Antes de
                responder ele nao tinha como saber. */}
            <div className="fim-5 mt-2" style={{ borderLeft: '2px solid rgba(255,255,255,.55)', padding: '2px 0 2px 16px' }}>
              <p style={{ fontFamily: T.serif, fontSize: 21, lineHeight: 1.42, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
                Tem mais alguém que fica bastante tempo com {NOME} durante a semana?
              </p>
              <p className="text-[13.5px]" style={{ color: 'rgba(255,255,255,.75)', margin: '0 0 10px', lineHeight: 1.5 }}>
                Cada um vê uma parte diferente do dia {flex('dele(a)')}. Se quiser, eu ouço essa pessoa também.
              </p>

              <div className="mb-4">
                {QUEM_MAIS_FICA.map((quem, k) => {
                  const on = escolhas['tempo'] === quem;
                  return (
                    <button
                      key={quem}
                      onClick={() => { setEscolhas((e) => ({ ...e, tempo: quem })); setLinkCopiado(false); }}
                      className="w-full flex items-center justify-between gap-3 text-left"
                      style={{
                        minHeight: 48, padding: '11px 0',
                        borderBottom: '1px solid rgba(255,255,255,.22)',
                        borderTop: k === 0 ? '1px solid rgba(255,255,255,.22)' : undefined,
                        fontFamily: T.serif, fontSize: 18, lineHeight: 1.3,
                        fontWeight: on ? 700 : 600,
                        color: on ? '#fff' : 'rgba(255,255,255,.86)',
                      }}
                    >
                      <span>{quem}</span>
                      <Marca on={on} />
                    </button>
                  );
                })}
              </div>

              {/* O link so' aparece quando ha' de fato outra pessoa para ouvir. */}
              {escolhas['tempo'] && escolhas['tempo'] !== 'Não, sou eu mesmo quem fica mais' && (
                <button
                  onClick={() => { navigator.clipboard?.writeText(window.location.href); setLinkCopiado(true); }}
                  className="inline-flex items-center gap-2 font-bold uppercase"
                  style={{ fontSize: 13, letterSpacing: '.12em', padding: '11px 20px', borderRadius: 999, border: '2px solid rgba(255,255,255,.75)', color: '#fff' }}
                >
                  {linkCopiado ? 'Link copiado' : 'Copiar o link pra essa pessoa'}
                  {linkCopiado && <Check size={14} strokeWidth={3} />}
                </button>
              )}
            </div>

            <p className="fim-5 text-[13px] mt-7" style={{ color: 'rgba(255,255,255,.74)' }}>Se quiser mudar alguma resposta, é só entrar de novo pelo mesmo link.</p>
            <Rodape>
              {/* Limpa tudo: quem comeca agora e' outra pessoa, e ver as
                  respostas de quem respondeu antes contaminaria as dela. */}
              <span className="fim-5">
                <Cta
                  texto="Passar para outra pessoa"
                  suave
                  onClick={() => { setI(0); setMarcadas({}); setTextos({}); setAbertos({}); setEscolhas({}); setEscolhaTexto({}); setLinkCopiado(false); }}
                />
              </span>
            </Rodape>
          </>
        )}

        {/* ---------- TRANSIÇÃO ---------- */}
        {item?.tipo === 'transicao' && (
          <>
            <p className="pausa-frase" style={{ fontFamily: T.serif, fontSize: item.enorme.length > 34 ? 36 : 43, lineHeight: 1.12, letterSpacing: '-.024em', margin: '0 0 22px' }}>{item.enorme}</p>
            {item.linha && <p className="pausa-linha" style={{ fontFamily: T.serif, fontSize: 23, lineHeight: 1.55, fontWeight: 600, margin: 0 }}>{item.linha}</p>}
            <Rodape><Cta texto={item.cta} forte onClick={avanca} /></Rodape>
          </>
        )}

        {/* ---------- FALA ---------- */}
        {item?.tipo === 'fala' && (() => {
          // Toda tela de fala entra em tempos, e o botao so' aparece depois que
          // a ultima linha terminou de entrar. Botao visivel antes do fim do
          // texto e' um convite para pular a leitura, e essas telas sao
          // justamente as que o pai precisa ler: quem esta falando, para que
          // serve, e o que a escola faz com o que ele contar.
          const PASSO = 0.9;              // intervalo entre uma linha e a proxima
          const DURACAO = 0.85;           // o quanto cada linha leva para entrar
          const INICIO = item.enorme ? 0.6 : 0.3;
          const atraso = (k: number) => INICIO + k * PASSO;
          const atrasoFim = atraso(item.linhas.length - 1) + DURACAO + 0.2;
          return (
          <>
            {item.enorme && (
              <p className="revela" style={{ fontFamily: T.serif, fontSize: item.enorme.length > 20 ? 35 : 47, lineHeight: 1.08, letterSpacing: '-.022em', margin: '0 0 26px', animationDelay: '.15s' }}>{item.enorme}</p>
            )}
            {item.linhas.map((l, k) => (
              <p key={`${i}-${k}`} className="revela"
                style={{
                  fontFamily: T.serif, fontSize: 23, lineHeight: 1.55, fontWeight: 600, margin: '0 0 24px',
                  animationDelay: atraso(k) + 's',
                }}>{l}</p>
            ))}
            {item.rodape && (
              <p className="revela text-[11.5px] mt-5" style={{ color: 'rgba(255,255,255,.66)', lineHeight: 1.5, maxWidth: '34ch', animationDelay: atrasoFim + 's' }}>{item.rodape}</p>
            )}
            <div key={`cta-${i}`} className="revela" style={{ animationDelay: atrasoFim + 's' }}>
              <Rodape>
                {/* "Saber mais" abre o texto completo. Antes ele avancava igual ao outro
                    botao, o que fazia a saida de quem quer ler virar armadilha. */}
                {item.ctaSuave && <Cta texto={item.ctaSuave} suave onClick={() => setVerMais(true)} />}
                <Cta texto={item.cta} onClick={avanca} />
              </Rodape>
            </div>
          </>
          );
        })()}

        {/* ---------- CRIANÇA ---------- */}
        {item?.tipo === 'crianca' && (
          <>
            <p style={{ fontFamily: T.serif, fontSize: 23, lineHeight: 1.55, fontWeight: 600, margin: '0 0 24px' }}>Só para eu ter certeza de quem a gente está falando.</p>
            <div style={{ borderLeft: '2px solid rgba(255,255,255,.7)', padding: '4px 0 4px 16px', margin: '16px 0 4px' }}>
              <p style={{ fontFamily: T.serif, fontSize: 29, fontWeight: 700, margin: '0 0 1px' }}>{NOME}</p>
              <p className="text-[14px] m-0" style={{ color: 'rgba(255,255,255,.78)' }}>{TURMA}</p>
            </div>
            <p className="text-[13px] mt-6" style={{ color: 'rgba(255,255,255,.74)' }}>{flex('Data de nascimento dele(a)')}</p>
            <input inputMode="numeric" placeholder="__ / __ / ____" className="w-full bg-transparent outline-none"
              style={{ borderBottom: '1px solid rgba(255,255,255,.5)', padding: '12px 0', fontFamily: T.serif, fontSize: 22, color: '#fff', letterSpacing: '.1em', marginTop: 4 }} />
            <Rodape><Cta texto={item.cta} onClick={avanca} /></Rodape>
          </>
        )}

        {/* ---------- QUEM RESPONDE ----------
            A mesma cena contada pela mae, pelo pai ou pela avo nao e' a mesma
            cena: cada um esta em casa em horas diferentes e repara em coisas
            diferentes. Sem saber de quem e' o olhar, a resposta perde metade
            do valor. Fica aqui, colado na identificacao, para nao cortar a
            virada afetiva que vem logo depois. */}
        {/* ---------- QUEM FALA ----------
            Duas telas usam este mesmo desenho: quem esta respondendo agora, e
            quem fica mais tempo com a crianca durante a semana. A segunda
            existe porque uma parte grande destas criancas passa mais horas com
            a avo ou com a baba do que com quem recebe o link, e quem responde
            responde assim mesmo, com confianca. Saber de qual olhar veio a
            resposta corrige mais vies do que reescrever pergunta nenhuma. */}
        {item?.tipo === 'respondente' && (() => {
          const escolhido = escolhas[item.chave] ?? null;
          const livre = item.livre ? flex(item.livre) : null;
          const texto = escolhaTexto[item.chave] ?? '';
          const podeSeguir = escolhido !== null && (escolhido !== livre || texto.trim() !== '');
          // Se quem responde nao e' quem fica mais tempo, a outra pessoa tem o
          // que contar. Oferecemos o link sem obrigar e sem travar o caminho.
          // Quem ja' esta' respondendo nao precisa receber link nenhum, e uma
          // resposta cobre mais de uma pessoa: "os dois juntos" cobre a mae E o
          // pai, e "outra pessoa que cuida" cobre a baba. Sem isso o Arboria
          // oferece o link para quem esta' com o celular na mao.
          const respondendo = escolhas['responde'];
          const jaEstaAqui =
            respondendo === 'Os dois juntos' ? ['A mãe', 'O pai']
            : respondendo === flex(OUTRO_CUIDADOR) ? ['Uma babá ou outra pessoa que cuida']
            : respondendo ? [respondendo]
            : [];
          const outroOlhar =
            item.chave === 'tempo' &&
            escolhido !== null &&
            escolhido !== 'Eu mesmo' &&
            escolhido !== 'Fica dividido, ninguém mais que os outros' &&
            !jaEstaAqui.includes(escolhido);
          return (
          <>
            <p style={{ fontFamily: T.serif, fontSize: 26, lineHeight: 1.28, fontWeight: 700, letterSpacing: '-.012em', margin: '0 0 6px' }}>{item.titulo}</p>
            {item.sub && <p className="text-[14px]" style={{ color: 'rgba(255,255,255,.8)', margin: '0 0 22px' }}>{item.sub}</p>}

            <div>
              {item.opcoes.map((quem, k) => {
                const rotulo = flex(quem);
                const on = escolhido === rotulo;
                return (
                  <button
                    key={rotulo}
                    onClick={() => { setEscolhas((e) => ({ ...e, [item.chave]: rotulo })); setLinkCopiado(false); }}
                    className="w-full flex items-center justify-between gap-3.5 text-left"
                    style={{
                      minHeight: 58, padding: '15px 0',
                      borderBottom: '1px solid rgba(255,255,255,.24)',
                      borderTop: k === 0 ? '1px solid rgba(255,255,255,.24)' : undefined,
                      fontFamily: T.serif, fontSize: 20, lineHeight: 1.35,
                      fontWeight: on ? 700 : 600,
                      color: on ? '#fff' : 'rgba(255,255,255,.86)',
                      fontStyle: rotulo === livre ? 'italic' : 'normal',
                    }}
                  >
                    <span>{rotulo}</span>
                    <Marca on={on} />
                  </button>
                );
              })}
            </div>

            {/* "Outra pessoa" sem dizer quem nao serve para nada na leitura:
                tia, babá e madrasta veem dias muito diferentes da crianca. */}
            {escolhido === livre && livre !== null && (
              <div className="mt-6">
                <p style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>Quem é?</p>
                <input
                  value={texto}
                  onChange={(e) => setEscolhaTexto((t) => ({ ...t, [item.chave]: e.target.value }))}
                  placeholder="tia, avó, babá, madrasta..."
                  className="w-full bg-transparent outline-none"
                  style={{ borderBottom: '1px solid rgba(255,255,255,.5)', padding: '10px 0', fontFamily: T.serif, fontSize: 20, color: '#fff' }}
                />
              </div>
            )}

            {outroOlhar && (
              <div className="mt-7" style={{ borderLeft: '2px solid rgba(255,255,255,.55)', padding: '2px 0 2px 16px' }}>
                <p style={{ fontFamily: T.serif, fontSize: 19, lineHeight: 1.45, fontWeight: 600, color: '#fff', margin: '0 0 12px' }}>
                  Então tem coisa que só essa pessoa viu. Se quiser, manda o link pra ela contar também.
                </p>
                <button
                  onClick={() => { navigator.clipboard?.writeText(window.location.href); setLinkCopiado(true); }}
                  className="inline-flex items-center gap-2 font-bold uppercase"
                  style={{ fontSize: 13, letterSpacing: '.12em', padding: '11px 20px', borderRadius: 999, border: '2px solid rgba(255,255,255,.75)', color: '#fff' }}
                >
                  {linkCopiado ? 'Link copiado' : 'Copiar o link'}
                  {linkCopiado && <Check size={14} strokeWidth={3} />}
                </button>
                <p className="text-[12.5px] mt-3" style={{ color: 'rgba(255,255,255,.7)', margin: 0 }}>
                  Você pode seguir daqui do mesmo jeito. As duas respostas contam.
                </p>
              </div>
            )}

            <Rodape>
              <span style={{ opacity: podeSeguir ? 1 : 0.35, pointerEvents: podeSeguir ? 'auto' : 'none' }}>
                <Cta texto={item.cta} onClick={avanca} />
              </span>
            </Rodape>
          </>
          );
        })()}

        {/* ---------- PERGUNTA ---------- */}
        {item?.tipo === 'pergunta' && (() => {
          const rotuloOutra = item.outra ?? 'De outro jeito';
          const opcoes = [...item.opcoes, rotuloOutra];
          const escolheuOutra = marcadasAqui.includes(rotuloOutra);
          // So' avanca com opcao marcada: texto sozinho nao vira dado legivel.
          // A saida honesta e' o "Nao sei dizer", que tambem e' uma resposta.
          // E quem marca "de outro jeito" precisa dizer qual: a opcao existe
          // justamente para o caso que as nossas nao previram, e sem o texto
          // ela devolve menos do que nada.
          const escreveu = (textos[i] ?? '').trim() !== '';
          const deveEscrever = escolheuOutra && !escreveu;
          const podeAvancar = marcadasAqui.length > 0 && !deveEscrever;
          return (
          <>
            {/* Sem rotulo de bloco no topo: a pergunta ja e' uma cena e se explica
                sozinha. O rotulo confundia mais do que orientava. */}
            {/* Cena e pergunta na mesma cor, fonte e peso: e' a mesma voz
                falando, so' que a linha corta entre uma e outra. */}
            {/* A cena e a pergunta entram primeiro, sozinhas. As opcoes so'
                aparecem depois de ATRASO_OPCOES, para o pai ler a cena antes de
                ter uma lista competindo pelo olho. A chave carrega o indice: sem
                ela o React reaproveita o no' e a animacao nao recomeca na tela
                seguinte. */}
            <div key={`cena-${i}`} className="revela">
              {item.cena && (
                <p style={{ fontFamily: T.serif, fontSize: 24, lineHeight: 1.32, fontWeight: 700, letterSpacing: '-.01em', margin: '0 0 12px' }}>{item.cena}</p>
              )}
              <p style={{ fontFamily: T.serif, fontSize: 24, lineHeight: 1.32, fontWeight: 700, letterSpacing: '-.01em', margin: '0 0 6px' }}>{item.texto}</p>
            </div>
            {/* O CAMPO DE ESCREVER VEM ANTES DAS OPCOES.
                Teste com pais de verdade (Fundador, 14/08): embaixo da lista,
                quase ninguem lia o convite, e o campo aberto por padrao. Isso
                inverte o peso de proposito: a lista existe para ativar a
                memoria, e o texto e' o dado que a leitura vai usar. */}
            <div key={`escrever-${i}`} className="revela mb-7">
              <p style={{ fontFamily: T.serif, fontSize: 21, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{item.convite ?? 'Tem história aí? Me conta.'}</p>
              <p className="text-[13px] mb-2" style={{ color: 'rgba(255,255,255,.7)', fontStyle: 'italic', lineHeight: 1.45 }}>
                o que você lembrar, do jeito que aconteceu
              </p>
              <textarea
                value={textos[i] ?? ''}
                onChange={(e) => setTextos((t) => ({ ...t, [i]: e.target.value }))}
                rows={3}
                placeholder="escreva aqui"
                className="w-full bg-transparent outline-none resize-y"
                style={{ borderBottom: '1px solid rgba(255,255,255,.42)', fontFamily: T.serif, fontSize: 19, color: '#fff', paddingBottom: 6 }}
              />
            </div>

            <p key={`instr-${i}`} className="revela text-[15px]" style={{ color: 'rgba(255,255,255,.85)', margin: '0 0 14px' }}>
              E marque também {item.instr === 'Pode marcar mais de uma' ? 'o que aconteceu, pode ser mais de uma' : 'o que mais se parece com aquele dia'}:
            </p>

            {/* Lista de linhas, sem caixa: o peso visual fica no texto e nao no
                container. Quem carrega a marcacao e' o circulo. Vazio ele ja diz
                "isto se escolhe" antes de o pai tocar; verde com check ele diz
                "escolhido" sem depender de o pai comparar dois tons de branco,
                que foi onde o teste com um pai de verdade falhou. */}
            <div key={`ops-${i}`} className="revela" style={{ animationDelay: ATRASO_OPCOES + 's' }}>
              {opcoes.map((op, k) => {
                const on = marcadasAqui.includes(op);
                return (
                  <button
                    key={op}
                    onClick={() => { alterna(op); if (op === rotuloOutra) setAbertos((a) => ({ ...a, [i]: true })); }}
                    className="w-full flex items-center justify-between gap-3.5 text-left"
                    style={{
                      minHeight: 58, padding: '15px 0',
                      borderBottom: '1px solid rgba(255,255,255,.24)',
                      borderTop: k === 0 ? '1px solid rgba(255,255,255,.24)' : undefined,
                      fontFamily: T.serif, fontSize: 20, lineHeight: 1.35,
                      fontWeight: on ? 700 : 600,
                      color: on ? '#fff' : 'rgba(255,255,255,.86)',
                      fontStyle: op === rotuloOutra ? 'italic' : 'normal',
                    }}
                  >
                    <span>{op}</span>
                    <Marca on={on} />
                  </button>
                );
              })}
            </div>

            {marcadasAqui.length === 0 && escreveu && (
              <p className="text-[14px] mt-5" style={{ color: '#FFE0B2', lineHeight: 1.5 }}>
                É necessário escolher alguma opção para continuar, além do texto.
              </p>
            )}

            {deveEscrever && (
              <p className="text-[14px] mt-5" style={{ color: '#FFE0B2', lineHeight: 1.5 }}>
                Você marcou {rotuloOutra.toLowerCase()}. Me conta qual é o jeito, aí a gente continua.
              </p>
            )}

            <div key={`rodape-${i}`} className="revela pt-6 flex items-center justify-between gap-4 flex-wrap" style={{ animationDelay: ATRASO_OPCOES + 's' }}>
              <button
                onClick={() => { setMarcadas((m) => ({ ...m, [i]: [NAO_SEI] })); avanca(); }}
                className="text-[15px]"
                style={{ color: 'rgba(255,255,255,.82)', textDecoration: 'underline', textUnderlineOffset: 4 }}
              >
                Não sei dizer
              </button>
              <button
                onClick={() => { if (podeAvancar) avanca(); }}
                disabled={!podeAvancar}
                className="inline-flex items-center gap-2.5 font-bold uppercase"
                style={{
                  fontSize: 15, letterSpacing: '.14em', padding: '13px 24px', borderRadius: 999,
                  border: '2px solid #fff',
                  background: i === ultimaPergunta ? '#fff' : 'transparent',
                  color: i === ultimaPergunta ? '#0E3F66' : '#fff',
                  opacity: podeAvancar ? 1 : 0.35,
                  cursor: podeAvancar ? 'pointer' : 'default',
                }}
              >
                {i === ultimaPergunta ? 'Finalizar' : 'Próxima'}
                {i === ultimaPergunta ? <Check size={16} strokeWidth={3} /> : <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>→</span>}
              </button>
            </div>
          </>
          );
        })()}
      </div>

      <div className="relative text-center pb-4 text-[11px]" style={{ color: 'rgba(255,255,255,.55)', zIndex: 2 }}>
        protótipo · nada é gravado
      </div>

      {/* folha do "Saber mais": a finalidade inteira, sem juridiques */}
      {verMais && (
        <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 40, background: '#0E3F66' }}>
          <div className="w-full max-w-lg mx-auto px-6 pt-8 pb-12">
            <button onClick={() => setVerMais(false)} className="flex items-center gap-1.5 text-[13px] font-bold uppercase mb-7"
              style={{ letterSpacing: '.14em', color: 'rgba(255,255,255,.8)' }}>
              <ChevronLeft size={17} /> Voltar
            </button>

            <p style={{ fontFamily: T.serif, fontSize: 34, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-.02em', margin: '0 0 26px', color: '#fff' }}>
              Sobre estas perguntas
            </p>

            {[
              ['Quem está pedindo', 'O Centro Educacional Amadeus, junto com o sistema Arboria.'],
              ['Para quê', `Para entender o jeito do ${NOME} de fazer as coisas: por onde ele(a) começa, o que faz quando algo dá errado. Não é para medir o que ele(a) já sabe.`],
              ['O que não é', 'Não é prova, não vira nota, não vira diagnóstico, não define turma nem grupo e não vai para o boletim. Ele(a) nunca vê o que você escreveu.'],
              ['Quem lê', 'A professora dele(a) e a coordenação da escola. Mais ninguém.'],
              ['Por quanto tempo fica', 'Enquanto ele(a) estudar aqui. Você pode pedir para ver, corrigir ou apagar o que respondeu a qualquer momento, falando com a secretaria.'],
              ['Responder é opcional', 'Se você não responder, não muda nada para ele(a).'],
            ].map(([titulo, texto]) => (
              <div key={titulo} className="mb-6">
                <p className="text-[11px] font-bold uppercase mb-1.5" style={{ letterSpacing: '.2em', color: 'rgba(255,255,255,.7)' }}>{titulo}</p>
                <p style={{ fontFamily: T.serif, fontSize: 20, lineHeight: 1.45, margin: 0, color: '#fff' }}>{flex(texto)}</p>
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <Cta texto="Entendi" onClick={() => setVerMais(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionarioPaisPreview;
