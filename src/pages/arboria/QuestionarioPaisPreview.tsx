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
import { useState, useEffect, useRef } from 'react';
import type React from 'react';
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
// Onde o rascunho mora. No produto a chave leva o id da crianca, senao dois
// filhos na mesma casa dividiriam o mesmo rascunho.
const CHAVE_RASCUNHO = 'arboria:questionario-pais:' + FAIXA;
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

// A VOZ TEM UM TAMANHO SO'.
// Na tela de pergunta, tudo o que o Arboria diz sai igual: a linha de puxar
// conversa, a cena, a pergunta, o convite para escrever e a dica embaixo dele.
// Texto menor o pai simplesmente nao le', e era justamente na letra miuda que
// estavam as frases que faziam ele escrever em vez de clicar. A hierarquia
// agora e' feita pelo espaco entre os blocos, nunca pelo tamanho da letra.
const FALA: React.CSSProperties = {
  fontFamily: T.serif, fontSize: 23, lineHeight: 1.38, fontWeight: 700,
  letterSpacing: '-.01em', color: '#fff', margin: '0 0 12px',
};

type Item =
  | { tipo: 'fala'; linhas: string[]; enorme?: string; cta: string; ctaSuave?: string; rodape?: string }
  | { tipo: 'crianca'; cta: string }
  | { tipo: 'respondente'; chave: string; titulo: string; sub?: string; opcoes: string[]; livre?: string; cta: string }
  | { tipo: 'transicao'; enorme: string; linha?: string; cta: string }
  | { tipo: 'pergunta'; abre?: string; cena?: string; texto: string; convite?: string; ajuda?: string; opcoes: string[] };

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
  // AS SETE ISCAS DO MATERNAL 2 (v3, 14/08/2026)
  //
  // Mesma espinha do Grupo IV e o mesmo principio: a opcao e' isca de memoria,
  // nao categoria, e quem le' o mecanismo e' a IA no relato. O que muda de faixa
  // para faixa e' o EXEMPLO dentro da cena, nunca a pergunta. Espinha igual e' o
  // que permite comparar a mania dos 2 anos com a dos 5 da mesma crianca daqui
  // a tres anos; perguntas diferentes por faixa matariam a regua longitudinal e
  // fariam o Maternal 2 virar coleta perdida.
  //
  // O QUE MUDA AOS 2 ANOS, e vem da ficha da propria professora do Maternal 2:
  //  - a crianca mostra que entendeu REPRODUZINDO o que ve, nao falando. Por
  //    isso a imitacao e' isca fixa aqui e no Grupo IV nao e'.
  //  - quando quer algo e nao sabe pedir, ela "aponta ou pega e leva, fazendo
  //    gestos". Nada de perguntar o que a crianca disse: so' o que ela fez.
  //  - lembrar do que aconteceu antes "precisa resgatar, e mesmo assim tem
  //    crianca que nao lembra". Entao nada de "conta o que aconteceu no passeio":
  //    a ancora de tempo tem que estar na cena, dada pelo Arboria.
  //  - do primeiro para o segundo semestre a diferenca e' enorme. Aos 2 anos a
  //    idade em meses vale mais que a serie, e ela ja' vem da data de nascimento.
  //
  // E o que NAO entra: nada de birra, choro ou travamento. Sob frustracao os
  // oito mecanismos ficam iguais e so' aparece temperamento, que e' estavel e
  // seria lido pela IA como padrao longitudinal.
  // ============================================================

  { tipo: 'pergunta',
    abre: 'Vou começar pela pergunta mais gostosa.',
    texto: `O que ${NOME} mais gosta de fazer quando chega em casa?`,
    convite: 'Me conta',
    ajuda: 'Pode ser a coisa mais boba do mundo. É justamente isso que eu quero saber.',
    opcoes: [] },

  { tipo: 'pergunta',
    abre: 'Agora uma que sempre rende história.',
    cena: 'Toda criança de 2 anos tem uma coisa que ninguém entende. Tem uma aqui que só entra na sala se for pela mesma porta. Tem um que enche e despeja o mesmo potinho a manhã toda.',
    texto: `${NOME} tem uma dessas?`,
    convite: 'Me conta qual é',
    opcoes: ['Leva um objeto pra todo canto e não larga', 'Enche e despeja, bota e tira, abre e fecha', 'Não deixa mudar o lugar das coisas dela', 'Não lembro de nada assim', 'Põe as coisas em fila ou empilha', 'Faz sempre o mesmo caminho pela casa'] },

  { tipo: 'pergunta',
    abre: 'Essa é a que a família toda gosta de contar.',
    cena: 'Acontece de a criança fazer uma coisa e a casa inteira parar pra olhar. Ninguém tinha ensinado aquilo.',
    texto: `${NOME} já fez uma dessas?`,
    convite: 'Me conta o que foi',
    opcoes: ['Falou uma palavra que ninguém sabia que ela sabia', 'Fez sozinha uma coisa que sempre precisou de ajuda', 'Imitou alguém igualzinho', 'Não lembro de nada assim', 'Achou uma coisa que ninguém estava achando', 'Repetiu um som ou uma música certinho'] },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre ${NOME}.`, cta: 'Continuar' },

  // A isca ancora do Maternal 2. A professora descreveu a imitacao como o canal
  // principal de evidencia nessa idade, e o valor nao esta' em QUANTO a crianca
  // imita: esta' em O QUE ela seleciona da mesma cena. Cinco criancas veem a
  // mesma coisa e copiam coisas diferentes, e a diferenca e' o filtro. E' o mais
  // perto de mecanismo puro que existe aos 2 anos, e nao exige uma palavra dela.
  { tipo: 'pergunta',
    cena: 'Tem um aqui que pegou o jeito da mãe de falar no telefone, com a mão e tudo. Tem uma que varre igualzinho, com a vassoura maior que ela.',
    texto: `Você já viu ${NOME} fazendo alguma coisa igualzinha a alguém?`,
    convite: 'Me conta o que ele(a) copiou',
    opcoes: ['Um jeito de falar, uma palavra', 'Um gesto, um jeito de mexer a mão', 'Uma coisa inteira, na mesma ordem em que viu', 'Não lembro de nada assim', 'O jeito de andar, de sentar', 'O jeito de cuidar: ninar, fazer carinho'] },

  { tipo: 'pergunta',
    abre: 'Confessa uma coisa pra mim.',
    cena: 'Sabe aquilo que ela faz de novo, e de novo, e de novo? O adulto já enjoou e ela quer outra vez.',
    texto: `Tem alguma coisa assim com ${NOME}?`,
    convite: 'Me conta o que é, e quanto tempo ele(a) fica nisso',
    ajuda: 'Pode reclamar, eu entendo.',
    opcoes: ['A mesma brincadeira, sempre', 'Encher e despejar, botar e tirar', 'Subir e descer, rodar, pular', 'Não lembro de nada assim', 'O mesmo livro, a mesma figura', 'O mesmo som, a mesma musiquinha'] },

  // A pausa que explica ao pai por que isto importa.
  { tipo: 'transicao',
    enorme: 'Quando eu faço essas perguntas, é porque entender cada um deles faz diferença.',
    linha: `Eu não quero que ${NOME} seja apenas mais um na multidão: quero que ele(a) brilhe do jeito dele(a), que não é igual ao de mais ninguém. E eu sei que temos um caminho longo pela frente, mas de pouquinho em pouquinho faremos essa árvore crescer juntos...`,
    cta: 'Continuar' },

  { tipo: 'pergunta',
    cena: 'Tem dia que a gente chega em casa acabado e nem fala nada pra ninguém.',
    texto: `Já aconteceu de ${NOME} perceber isso antes de alguém falar?`,
    convite: 'Me conta como foi que ele(a) percebeu',
    opcoes: ['Veio perto e ficou ali', 'Trouxe alguma coisa pra você', 'Parou de brincar e ficou olhando', 'Não lembro de nada assim', 'Ficou mais agitado(a) do que o normal', 'Nem reparou, seguiu brincando'] },

  { tipo: 'pergunta',
    abre: 'Essa é a que eu mais preciso.',
    cena: 'Aqui na sala tem criança que quase não abre a boca, e a mãe chega dizendo que em casa ela não para de falar.',
    texto: `E ${NOME}, é o(a) mesmo(a) nos dois lugares?`,
    convite: `Me conta uma coisa que ele(a) faz em casa e que eu talvez nunca tenha visto`,
    opcoes: ['Em casa ele(a) fala muito mais', 'Em casa ele(a) é mais quieto(a)', 'Em casa ele(a) faz sozinho(a) o que aqui pede ajuda', 'Não sei dizer', 'Em casa ele(a) é mais agitado(a)', 'Nos dois lugares ele(a) é bem parecido(a)'] },
];

// ============================================================
// O BANCO DAS GUARDADAS DO MATERNAL 2
// Mesma logica do Grupo IV: duas iscas fixas (a abertura e a de casa) e cinco
// que giram entre a rodada do inicio do ano e a de agosto.
//
// REGRA DE LEITURA, INEGOCIAVEL: o que nao apareceu aqui nao e' ausencia na
// crianca, e' canal que a gente nao perguntou nesta rodada.
// ============================================================
const GUARDADAS_M2: Item[] = [

  { tipo: 'pergunta',
    cena: 'Ela estava no meio de alguma coisa e parou do nada, por conta própria. Ninguém chamou.',
    texto: 'Da última vez que isso aconteceu, o que foi que fez ele(a) parar?',
    convite: 'Me conta essa vez',
    opcoes: ['Um barulho que veio de fora', 'Um bicho, um passarinho, alguma coisa viva', 'Alguém chegando ou saindo', 'Não lembro de nada assim', 'Uma música, alguém cantando', 'Uma luz, uma sombra, alguma coisa se mexendo'] },

  { tipo: 'pergunta',
    cena: 'Já vi criança de 2 anos separar as coisas sem ninguém pedir. Junta as tampinhas de um lado, os bichinhos do outro. Ou põe tudo numa fila só dela.',
    texto: `Já viu ${NOME} fazendo isso?`,
    convite: 'Me conta o que ele(a) separou',
    opcoes: ['Já vi, com brinquedo', 'Já vi, mas com outra coisa da casa', 'Não lembro de nada assim', 'Junta tudo num monte só', 'Faz o contrário, espalha tudo'] },

  { tipo: 'pergunta',
    cena: 'Tem criança dessa idade que estranha quando alguém canta a musiquinha de sempre de um jeito diferente. E tem quem repita um barulho dias depois de ouvir.',
    texto: `${NOME} é assim com som?`,
    convite: 'Me conta o que aconteceu',
    opcoes: ['Repete o som ou a música depois', 'Estranha quando cantam diferente', 'Para tudo quando aparece um som novo', 'Não lembro de nada assim', 'Gosta de música, mas não é nada demais', 'Não liga muito pra isso'] },

  { tipo: 'pergunta',
    cena: 'Tem um aqui que viu uma vez o jeito de bater na panela e no dia seguinte fez igual, com a mesma mão.',
    texto: `${NOME} já pegou alguma coisa assim, só de ver?`,
    convite: 'Me conta o que ele(a) pegou',
    opcoes: ['Um jeito de mexer o corpo', 'Um jeito de segurar ou de fazer com a mão', 'Imitou alguém tão igual que deu risada', 'Não lembro de nada assim', 'Pega, mas precisa tentar várias vezes', 'Não é muito disso'] },

  { tipo: 'pergunta',
    cena: 'A gente muda uma coisa de lugar em casa e nem lembra que mudou.',
    texto: `${NOME} repara nessas coisas?`,
    convite: 'Me conta uma vez que isso aconteceu',
    opcoes: ['Repõe a coisa no lugar sozinho(a)', 'Aponta e resmunga até alguém ver', 'Estranha pessoa com roupa nova, cabelo cortado', 'Não lembro de nada assim', 'Percebe quando falta uma peça do brinquedo', 'Não costuma reparar nisso'] },
];
void GUARDADAS_M2;

const CENAS_G4: Item[] = [
  // ============================================================
  // AS SETE ISCAS DO GRUPO IV (v3, 14/08/2026)
  //
  // Mudanca de principio, nao de redacao. Ate' a v2 as opcoes tentavam LER o
  // mecanismo, e o pai tinha que classificar o proprio filho numa grade de
  // analista. No teste com pais eles clicavam qualquer coisa so' para avancar.
  //
  // Agora a opcao e' ISCA DE MEMORIA, nao categoria: o Arboria conta uma cena
  // que aconteceu com OUTRA crianca, e o pai reconhece a dele ali ou nao
  // reconhece. Quem le' o mecanismo passa a ser a IA, no relato escrito. Por
  // isso o campo de texto vem primeiro e as opcoes viraram saida rapida para
  // quem nao vai escrever.
  //
  // "Nao lembro de nada assim" fica no MEIO da lista, nunca no fim, e e' uma
  // resposta legitima: a gente esta' pescando, e as vezes nao vem peixe.
  //
  // SETE, e nao doze: com sete o pai escreve nas sete; com doze ele escreve
  // nas tres primeiras e clica o resto. O custo e' que quatro mecanismos nao
  // sao convocados nesta rodada, e por isso vale a regra de leitura abaixo.
  // ============================================================

  { tipo: 'pergunta',
    abre: 'Vou começar pela pergunta mais gostosa.',
    texto: `O que ${NOME} mais gosta de fazer quando chega em casa?`,
    convite: 'Me conta',
    ajuda: 'Pode ser a coisa mais boba do mundo. É justamente isso que eu quero saber.',
    opcoes: [] },

  { tipo: 'pergunta',
    abre: 'Agora uma que sempre rende história.',
    cena: 'Toda criança de 4 anos tem uma mania que ninguém entende. Tem um aqui que sobe a escada contando os degraus, e se erra a conta volta e começa tudo de novo. Tem uma que guarda tampinha no bolso e não deixa ninguém pegar.',
    texto: `${NOME} tem uma dessas?`,
    convite: 'Me conta qual é',
    opcoes: ['Junta e guarda coisinha: tampinha, pedra, palito de picolé', 'Repete uma frase até todo mundo decorar', 'Não deixa mudar o lugar das coisas dela', 'Não lembro de nada assim', 'Conversa com o bicho de pelúcia e responde por ele', 'Faz tudo na mesma ordem, sempre'] },

  { tipo: 'pergunta',
    abre: 'Essa é a que a família toda gosta de contar.',
    cena: 'Acontece de a criança fazer uma coisa e a casa inteira parar pra olhar. Ninguém tinha ensinado aquilo. E depois vira história que todo mundo repete.',
    texto: `${NOME} já fez uma dessas?`,
    convite: 'Me conta o que foi',
    opcoes: ['Falou uma palavra que ninguém sabia que ela sabia', 'Montou ou consertou uma coisa sozinha', 'Viu uma coisa que passou por todo mundo', 'Não lembro de nada assim', 'Cantou uma música inteira de primeira', 'Resolveu uma briga entre duas pessoas'] },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre ${NOME}.`, cta: 'Continuar' },

  { tipo: 'pergunta',
    abre: 'Confessa uma coisa pra mim.',
    cena: 'Sabe aquilo que ela pede de novo, e de novo, e de novo? O adulto já não aguenta mais e ela quer outra vez.',
    texto: `Tem alguma coisa assim com ${NOME}?`,
    convite: 'Me conta o que é, e quanto tempo ela fica nisso',
    ajuda: 'Pode reclamar, eu entendo.',
    opcoes: ['Uma brincadeira que ela sempre puxa', 'Uma música que ela mesma canta', 'Um brinquedo que vai pra todo canto com ela', 'Não lembro de nada assim', 'Rodar, pular, subir, sem parar', 'Ficar mexendo em água, terra, areia'] },

  { tipo: 'pergunta',
    cena: 'Tem dia que a gente chega em casa acabado e nem fala nada pra ninguém.',
    texto: `Já aconteceu de ${NOME} perceber isso antes de alguém falar?`,
    convite: 'Me conta como foi que ela percebeu',
    opcoes: ['Veio perguntar o que tinha acontecido', 'Não falou nada, só chegou perto', 'Mudou o jeito dela, ficou mais quietinha', 'Não lembro de nada assim', 'Foi buscar alguma coisa pra agradar', 'Nem reparou, seguiu brincando'] },

  // A pausa que explica ao pai por que isto importa.
  { tipo: 'transicao',
    enorme: 'Quando eu faço essas perguntas, é porque entender cada um deles faz diferença.',
    linha: `Eu não quero que ${NOME} seja apenas mais um na multidão: quero que ele(a) brilhe do jeito dele(a), que não é igual ao de mais ninguém. E eu sei que temos um caminho longo pela frente, mas de pouquinho em pouquinho faremos essa árvore crescer juntos...`,
    cta: 'Continuar' },

  { tipo: 'pergunta',
    cena: 'Já mudei um armário de lugar na sala e teve criança que reparou antes de eu terminar de arrastar.',
    texto: `${NOME} repara nessas coisas?`,
    convite: 'Me conta uma vez que isso aconteceu',
    opcoes: ['Repara quando alguma coisa muda de lugar em casa', 'Sabe onde cada coisa fica, melhor que os adultos', 'Na rua ela sabe o caminho de volta', 'Não lembro de nada assim', 'Percebe quando falta uma peça do brinquedo', 'Não costuma reparar nisso'] },

  { tipo: 'pergunta',
    abre: 'Essa é a que eu mais preciso.',
    cena: 'Aqui na sala tem criança que quase não abre a boca, e o pai chega dizendo que em casa ela não para de falar.',
    texto: `E ${NOME}, é a mesma nos dois lugares?`,
    convite: `Me conta uma coisa que ela faz em casa e que eu talvez nunca tenha visto`,
    opcoes: ['Em casa ela fala muito mais', 'Em casa ela é mais quieta', 'Em casa ela manda, aqui ela segue', 'Não sei dizer', 'Em casa ela faz sozinha o que aqui ela pede ajuda', 'Nos dois lugares ela é bem parecida'] },
];

// ============================================================
// O BANCO DAS GUARDADAS
//
// O questionario roda duas vezes por ano: no comeco do ano e agora em agosto.
// Duas iscas sao fixas (a abertura e a de casa, que ancoram e fecham) e cinco
// giram. Assim o pai nunca responde doze de uma vez, e ao longo de dois anos
// todos os caminhos foram convocados. Ganho que nao era o objetivo: na segunda
// aplicacao o questionario NAO e' o mesmo, entao o pai nao responde no piloto
// automatico nem repete o que ja' escreveu.
//
// REGRA DE LEITURA, INEGOCIAVEL: o que nao apareceu aqui nao e' ausencia na
// crianca, e' canal que a gente nao perguntou nesta rodada. Ler o silencio de
// uma isca guardada como sinal quebra o Principio 6 com a nossa propria mao.
// ============================================================
const GUARDADAS_G4: Item[] = [

  { tipo: 'pergunta',
    cena: 'Já vi criança começar a arrumar as coisas sem ninguém pedir nada. Junta os carrinhos de um lado, os bichinhos do outro. Ou põe tudo em fila, do menor pro maior. Se alguém bagunça, ela arruma tudo de novo.',
    texto: `Já viu ${NOME} fazendo isso?`,
    convite: 'Me conta o que ela separou',
    opcoes: ['Já vi, com brinquedo', 'Já vi, mas com outra coisa da casa', 'Não lembro de nada assim', 'Ela junta tudo num monte só', 'Ela faz o contrário, espalha tudo'] },

  { tipo: 'pergunta',
    cena: 'Uma vez uma menina daqui ouviu uma música no carro e, dias depois, cantou o pedaço inteiro no tom certo. E tem criança que reclama quando alguém canta a música dela de um jeito diferente.',
    texto: `${NOME} é assim com música?`,
    convite: 'Me conta o que aconteceu',
    opcoes: ['Pega a música rápido e canta certinho', 'Reclama se alguém canta diferente', 'Repete um barulho ou um som que ouviu', 'Não lembro de nada assim', 'Gosta de música, mas não é nada demais', 'Não liga muito pra isso'] },

  { tipo: 'pergunta',
    cena: 'Umas crianças aprendem olhando. Veem uma vez o jeito de chutar a bola, e o pé já sai igual.',
    texto: `${NOME} já pegou alguma coisa assim, só de ver?`,
    convite: 'Me conta o que ela pegou',
    opcoes: ['Um passo de dança, um jeito de mexer o corpo', 'Um jeito de segurar ou de fazer alguma coisa com a mão', 'Imitou alguém tão igual que deu risada', 'Não lembro de nada assim', 'Pega, mas precisa tentar várias vezes', 'Não é muito disso'] },

  { tipo: 'pergunta',
    cena: 'Quando a história é sempre a mesma, tem criança que já sabe de cor. Aí o adulto pula uma parte pra terminar mais rápido, e ela reclama na hora.',
    texto: `${NOME} já te pegou fazendo isso?`,
    convite: 'Me conta o que ela falou',
    opcoes: ['Reclama se troca uma palavra', 'Faz a fala dos personagens junto', 'Conta a história de volta, do jeito dela', 'Não lembro de nada assim', 'Gosta da história, mas não repara nisso', 'Ela prefere história nova toda vez'] },

  { tipo: 'pergunta',
    abre: 'Essa você vai reconhecer na hora.',
    cena: 'É aquele "por quê" que puxa outro "por quê", e mais outro, e a conversa não acaba nunca.',
    texto: `${NOME} faz isso?`,
    convite: 'Me conta sobre o que ela costuma perguntar',
    opcoes: ['Faz, e uma pergunta puxa a outra', 'Pergunta muito, mas cada hora de uma coisa', 'Quer saber como as coisas funcionam por dentro', 'Não lembro de nada assim', 'Pergunta mais sobre as pessoas', 'Não é de perguntar muito'] },
];
void GUARDADAS_G4;

const FLUXO_BRUTO: Item[] = [...ENTRADA, ...(FAIXA === 'g4' ? CENAS_G4 : CENAS_M2)];

const FLUXO: Item[] = flexProfundo(FLUXO_BRUTO);

const TOTAL = FLUXO.filter((x) => x.tipo === 'pergunta').length;
const numeroDaPergunta = (i: number) => FLUXO.slice(0, i + 1).filter((x) => x.tipo === 'pergunta').length;

const QuestionarioPaisPreview = () => {
  const [i, setI] = useState(0);

  // Toda tela nova comeca do topo. Sem isto o navegador mantem a rolagem de
  // onde o pai estava, entao ele apertava "Proxima" no rodape e caia no meio da
  // pergunta seguinte, sem ver a cena que a explica.
  //
  // Rolar a janela nao bastava: "overflow-x: hidden" no container faz o
  // navegador tratar o eixo vertical como "auto", entao dependendo da altura do
  // conteudo quem rola e' a propria div, e nao a pagina. Por isso a rolagem e'
  // zerada nos dois. Instantaneo de proposito: rolagem suave mostraria o texto
  // da tela anterior subindo, o que confunde mais do que ajuda.
  const palco = useRef<HTMLDivElement>(null);
  useEffect(() => {
    palco.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }, [i]);

  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [escolhaTexto, setEscolhaTexto] = useState<Record<string, string>>({});
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [marcadas, setMarcadas] = useState<Record<number, string[]>>({});
  const [abertos, setAbertos] = useState<Record<number, boolean>>({});
  const [textos, setTextos] = useState<Record<number, string>>({});
  const [verMais, setVerMais] = useState(false);

  // ------------------------------------------------------------- RASCUNHO
  // O pai escreve no celular, e no celular ele e' interrompido: chega ligacao,
  // a crianca chama, ele troca de aplicativo. Sem rascunho, voltar significa
  // reescrever, e ninguem reescreve: fecha e desiste. Entao cada tecla vai para
  // o proprio aparelho, e ao voltar ele cai onde parou com tudo no lugar.
  //
  // Fica no aparelho e nao no servidor de proposito: enquanto o pai nao aperta
  // Finalizar, aquilo ainda e' rascunho dele e a escola nao viu nada.
  const [restaurado, setRestaurado] = useState(false);

  useEffect(() => {
    try {
      const cru = localStorage.getItem(CHAVE_RASCUNHO);
      if (!cru) return;
      const d = JSON.parse(cru);
      if (d.textos) setTextos(d.textos);
      if (d.marcadas) setMarcadas(d.marcadas);
      if (d.escolhas) setEscolhas(d.escolhas);
      if (d.escolhaTexto) setEscolhaTexto(d.escolhaTexto);
      if (typeof d.i === 'number' && d.i > 0) { setI(d.i); setRestaurado(true); }
    } catch {
      // Rascunho corrompido nao pode impedir o pai de responder.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({ i, textos, marcadas, escolhas, escolhaTexto }));
    } catch {
      // Aba anonima ou memoria cheia: segue sem rascunho, sem avisar nada.
    }
  }, [i, textos, marcadas, escolhas, escolhaTexto]);

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

  const avanca = () => { setRestaurado(false); setI((v) => v + 1); };
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
    <div ref={palco} className="min-h-screen flex flex-col relative overflow-x-hidden" style={{
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
        
        .campo-relato::placeholder { color: rgba(255,255,255,.62); font-style: italic; }
        .campo-relato:focus { border-color: #fff; background: rgba(255,255,255,.18); }
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
            <p className="fim-2" style={{ fontFamily: T.serif, fontSize: 23, lineHeight: 1.55, fontWeight: 600, margin: '0 0 24px' }}>Anotei tudo com muito carinho o que você me contou.</p>
            <p className="fim-3" style={{ fontFamily: T.serif, fontSize: 23, lineHeight: 1.55, fontWeight: 600, margin: '0 0 24px' }}>O que acontece em casa eu não tenho como ver. Por isso eu perguntei.</p>
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
                  onClick={() => { try { localStorage.removeItem(CHAVE_RASCUNHO); } catch { /* sem rascunho, nada a limpar */ } setI(0); setMarcadas({}); setTextos({}); setAbertos({}); setEscolhas({}); setEscolhaTexto({}); setLinkCopiado(false); setRestaurado(false); }}
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
                      fontFamily: T.serif, fontSize: 21, lineHeight: 1.35,
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
          const opcoes = item.opcoes;
          // A regra do avanco mudou junto com o principio. Antes era "so' avanca
          // com opcao marcada", porque texto solto nao virava dado legivel. Como
          // agora quem le' o mecanismo e' a IA no relato, o texto E' a resposta,
          // e obrigar a marcar depois de escrever seria cobrar duas vezes pela
          // mesma coisa. A abertura, que nao tem lista, avanca sozinha.
          const escreveu = (textos[i] ?? '').trim() !== '';
          const podeAvancar = opcoes.length === 0 || escreveu || marcadasAqui.length > 0;
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
            {/* Quem voltou precisa saber que nada se perdeu, senao ele desconfia
                e comeca de novo do zero. Aparece uma vez so', e some no primeiro
                avanco. */}
            {restaurado && (
              <p className="revela mb-5" style={{ fontFamily: T.serif, fontSize: 18, lineHeight: 1.4, fontWeight: 600, color: 'rgba(255,255,255,.82)' }}>
                Guardei o que você já tinha escrito. Continuamos daqui.
              </p>
            )}

            <div key={`cena-${i}`} className="revela">
              {/* A linha de puxar conversa. Ela e' o que faz o pai sentir que
                  tem alguem do outro lado e nao um formulario, e por isso nao
                  esta' em todas: em todas ela cansaria e viraria tique. */}
              {item.abre && (
                <p style={FALA}>{item.abre}</p>
              )}
              {item.cena && <p style={FALA}>{item.cena}</p>}
              <p style={FALA}>{item.texto}</p>
            </div>
            {/* O CAMPO DE ESCREVER VEM ANTES DAS OPCOES.
                Teste com pais de verdade (Fundador, 14/08): embaixo da lista,
                quase ninguem lia o convite, e o campo aberto por padrao. Isso
                inverte o peso de proposito: a lista existe para ativar a
                memoria, e o texto e' o dado que a leitura vai usar. */}
            <div key={`escrever-${i}`} className="revela mb-7">
              <p style={FALA}>{item.convite ?? 'Tem história aí? Me conta.'}</p>
              <p style={{ ...FALA, margin: '0 0 14px' }}>{item.ajuda ?? 'O que você lembrar, do jeito que aconteceu.'}</p>
              {/* O campo e' a resposta principal, entao ele parece um campo.
                  Como um filete embaixo do texto, ele se confundia com a propria
                  fala do Arboria e o pai passava direto. Solto do texto, com
                  fundo e borda propria, ele diz sozinho "e' aqui que se escreve",
                  e na mesma letra do resto para nao virar letra miuda de novo. */}
              <textarea
                value={textos[i] ?? ''}
                onChange={(e) => setTextos((t) => ({ ...t, [i]: e.target.value }))}
                rows={4}
                placeholder="escreva aqui"
                className="campo-relato w-full outline-none resize-y"
                style={{
                  marginTop: 18, padding: '15px 17px', borderRadius: 16,
                  background: 'rgba(255,255,255,.13)',
                  border: '2px solid rgba(255,255,255,.5)',
                  fontFamily: T.serif, fontSize: 23, lineHeight: 1.38, color: '#fff',
                }}
              />
            </div>

            {/* A lista agora e' SAIDA RAPIDA, nao a resposta principal: quem
                escreveu ja' respondeu. Por isso "se preferir", e por isso ela
                some inteira quando a isca nao tem lista (a abertura). */}
            {item.opcoes.length > 0 && (
              <p key={`instr-${i}`} className="revela" style={{ ...FALA, margin: '0 0 14px' }}>
                Ou, se preferir, marque o que mais parece:
              </p>
            )}

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
                    onClick={() => alterna(op)}
                    className="w-full flex items-center justify-between gap-3.5 text-left"
                    style={{
                      minHeight: 58, padding: '15px 0',
                      borderBottom: '1px solid rgba(255,255,255,.24)',
                      borderTop: k === 0 ? '1px solid rgba(255,255,255,.24)' : undefined,
                      fontFamily: T.serif, fontSize: 20, lineHeight: 1.35,
                      fontWeight: on ? 700 : 600,
                      color: on ? '#fff' : 'rgba(255,255,255,.86)',
                      
                    }}
                  >
                    <span>{op}</span>
                    <Marca on={on} />
                  </button>
                );
              })}
            </div>


            {/* O RODAPE E' FIXO NA TELA, nao no fim do conteudo.
                Com a lista de opcoes e o campo de texto, a pergunta passou a ser
                mais alta que o celular, e o botao de avancar ficava abaixo da
                dobra: quem nao rolasse ate' o fim nao via saida nenhuma e
                achava que o questionario tinha travado. Agora ele acompanha a
                rolagem, e o conteudo ganha um respiro embaixo para nao terminar
                escondido atras da barra. */}
            <div style={{ height: 96 }} aria-hidden />
            <div
              className="fixed left-0 right-0 bottom-0"
              style={{
                zIndex: 30,
                paddingTop: 30,
                background: 'linear-gradient(180deg, rgba(11,58,96,0) 0%, rgba(11,58,96,.82) 42%, rgba(11,58,96,.97) 100%)',
              }}
            >
              <div className="mx-auto flex items-center justify-between gap-4" style={{ maxWidth: 560, padding: '0 22px 20px' }}>
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
