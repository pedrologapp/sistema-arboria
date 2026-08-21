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
import { ChevronLeft, ChevronDown, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// As tabelas do questionario dos pais nasceram em 20/08 e os tipos gerados do
// Supabase ainda nao as conhecem, entao supabase.from('questionario_pais_envio')
// nao casa com nenhuma sobrecarga. Mesmo atalho ja usado em RelatarProblema.
// Sai sozinho quando os tipos forem regerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = (nome: string): any => (supabase as any).from(nome);

const CEU = '/arboria/ceu.png';

// ------------------------------------------------------------------ FAIXA
// O instrumento nao e' um so': o que uma crianca de 2 anos pode ter feito e o
// que uma de 4 pode ter feito sao coisas diferentes, e as opcoes precisam
// acompanhar. As cenas do Maternal 2 e as do Grupo IV vivem em listas
// separadas; a entrada, as pausas e o fim sao os mesmos.
// No prototipo, ?faixa=g4 abre a versao do Grupo IV.
const PARAMS = new URLSearchParams(window.location.search);
type Faixa = 'm2' | 'm3' | 'g4' | 'gv' | 'a1' | 'a2' | 'a3' | 'a4' | 'a5';
const FAIXAS: Faixa[] = ['m2', 'm3', 'g4', 'gv', 'a1', 'a2', 'a3', 'a4', 'a5'];
const PEDIDA = PARAMS.get('faixa') as Faixa | null;

// ===========================================================================
// DUAS VIDAS DESTA MESMA TELA
//
// 1. PROTOTIPO, em /arboria/coleta/pais/preview?faixa=a4. Crianca inventada,
//    nada e' gravado. E' onde o Fundador valida pergunta antes de pai nenhum
//    ver, e por isso ele nao pode morrer quando o de verdade nascer.
//
// 2. DE VERDADE, em /familia/perguntas. A crianca chega da porta pela memoria
//    da aba, e cada resposta vai para o banco.
//
// O contexto e' lido AQUI, no carregamento do modulo, e nao dentro do
// componente. E' o que faz as 114 perguntas nascerem ja com o nome certo sem
// reescrever o arquivo: elas sao montadas uma vez, na hora em que o arquivo
// carrega. Por isso a porta entra com recarga de verdade em vez de navegar.
// ===========================================================================
interface Contexto {
  envio: string; aluno: string; faixa: Faixa | null;
  nome: string; nomeCompleto: string; turma: string; serie: string; sexo: string | null;
}
const CTX: Contexto | null = (() => {
  try { return JSON.parse(sessionStorage.getItem('arboria:familia') || 'null'); }
  catch { return null; }
})();
const MODO_REAL = !!CTX?.envio;

// A PORTA VIVE DENTRO DO FLUXO, E NAO ANTES DELE.
//
// Ela ja foi uma tela separada em /familia, e estava errado: o pai caia num
// formulario pedindo o nome do filho antes de saber quem estava perguntando e
// por que. Agora ele ouve o Arboria se apresentar primeiro, nas mesmas quatro
// telas de sempre, e so' entao diz de quem a gente vai falar, no passo que ja
// existia para isso.
//
// NA_PORTA e' o estado de quem esta em /familia e ainda nao disse quem e' a
// crianca. No prototipo isso nunca acontece: la' a crianca e' inventada.
const NA_PORTA = window.location.pathname.startsWith('/familia') && !MODO_REAL;

// Onde a apresentacao termina e a identificacao comeca.
const PASSO_CRIANCA_MAIS_UM = 1;   // usado depois de achar o indice do passo

function mascaraData(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, 2) + '/' + d.slice(2);
  return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
}

// Devolve a data em ISO, ou null se ela nao existe no calendario. Sem esta
// checagem, 31/02/2019 vira 03/03/2019 sozinho e a busca falha por um motivo
// que o pai nao tem como adivinhar.
function dataParaISO(v: string): string | null {
  const d = v.replace(/\D/g, '');
  if (d.length !== 8) return null;
  const dia = d.slice(0, 2), mes = d.slice(2, 4), ano = d.slice(4);
  const iso = `${ano}-${mes}-${dia}`;
  const quando = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(quando.getTime())) return null;
  if (quando.getUTCDate() !== Number(dia) || quando.getUTCMonth() + 1 !== Number(mes)) return null;
  if (Number(ano) < 1990 || quando.getTime() > Date.now()) return null;
  return iso;
}

interface Achado { aluno_id: string; nome_completo: string; turma: string; sexo: string | null }
interface Confirmada extends Achado {
  primeiro_nome: string; serie: string; segmento: string;
  sexo: string | null; faixa: string | null;
}
const MINIMO_BUSCA = 4;

const FAIXA: Faixa =
  CTX?.faixa && FAIXAS.includes(CTX.faixa) ? CTX.faixa
  : PEDIDA && FAIXAS.includes(PEDIDA) ? PEDIDA
  : 'm2';

const NOME_POR_FAIXA: Record<Faixa, string> = {
  m2: 'Arthur', m3: 'Bento', g4: 'Helena', gv: 'Cecília',
  a1: 'Miguel', a2: 'Lívia', a3: 'Ana Júlia', a4: 'Caio', a5: 'Rafael',
};
const TURMA_POR_FAIXA: Record<Faixa, string> = {
  m2: 'Maternal 2 B', m3: 'Maternal 3 A', g4: 'Grupo IV A', gv: 'Grupo V A',
  a1: '1º Ano A', a2: '2º Ano A', a3: '3º Ano A', a4: '4º Ano A', a5: '5º Ano A',
};
const NOME = CTX?.nome || NOME_POR_FAIXA[FAIXA];
const TURMA = CTX?.turma || TURMA_POR_FAIXA[FAIXA];
const NAO_SEI = '__nao_sei__';
// Segundos entre a pergunta aparecer e as opcoes aparecerem. Ficou em zero:
// a pausa era boa uma vez e virava espera repetida a partir da terceira tela.
// A tela inteira entra junto, com a mesma revelacao suave.
const ATRASO_OPCOES = 0;
// Onde o rascunho mora. No produto a chave leva o id da crianca, senao dois
// filhos na mesma casa dividiriam o mesmo rascunho.
// A chave leva o id da crianca quando ele existe: dois filhos na mesma casa,
// respondidos do mesmo celular, dividiriam o mesmo rascunho e um apagaria o
// outro. No prototipo, onde nao ha crianca, a faixa faz esse papel.
const CHAVE_RASCUNHO = 'arboria:questionario-pais:' + (CTX?.aluno || FAIXA);
// Marca que este questionario ja foi finalizado neste aparelho. Fica separado
// do rascunho de proposito: o rascunho se apaga quando alguem passa o celular
// para outra pessoa, e o "ja finalizei" precisa sobreviver a uma recarga.
const CHAVE_FIM = CHAVE_RASCUNHO + ':finalizado';

const OUTRO_CUIDADOR = 'Outra pessoa que cuida dele(a)';
// A versao do que o pai aceitou. MUDA SEMPRE que o texto da tela "Uma coisa
// rapida" ou o do "Saber mais" mudar: sem isso, daqui a um ano ninguem sabe
// qual texto aquele pai leu, e o aceite guardado nao prova nada.
const VERSAO_TERMO = '2026-08-21';
// ------------------------------------------------------------------ FLEXAO
// O app sabe de quem se trata, entao o texto inteiro fala no genero da crianca
// em vez de empurrar "(a)" para o pai ler. As frases sao escritas com a marca
// "ele(a)" e a flexao acontece aqui: no masculino o parenteses cai, no feminino
// a ultima vogal vira "a". Quem escrever pergunta nova so precisa usar a marca.
// No produto o sexo vem do cadastro da crianca; aqui o ?sexo=F testa o feminino.
// Existe um terceiro estado: NAO SABER. Sem ele o texto assumia o masculino por
// omissao, e o pai de uma menina lia o questionario inteiro no genero errado.
// Quando o sexo nao e' conhecido, as marcas ficam como estao e o pai le'
// "seu filho(a)", que e' feio mas e' honesto. ?sexo=ND testa esse caso.
// De verdade o sexo vem do cadastro. Crianca sem sexo cadastrado cai no
// terceiro estado, e o pai le' "seu filho(a)": feio, e honesto.
const SEXO_CTX = CTX?.sexo?.toUpperCase();
const SEM_SEXO = MODO_REAL
  ? (SEXO_CTX !== 'M' && SEXO_CTX !== 'F')
  : PARAMS.get('sexo')?.toUpperCase() === 'ND';
const SEXO: 'M' | 'F' =
  SEXO_CTX === 'F' ? 'F' : SEXO_CTX === 'M' ? 'M'
  : PARAMS.get('sexo')?.toUpperCase() === 'F' ? 'F'
  : PARAMS.get('sexo')?.toUpperCase() === 'M' ? 'M'
  : FAIXA === 'g4' || FAIXA === 'gv' || FAIXA === 'a2' || FAIXA === 'a3' ? 'F' : 'M';
const FEM = SEXO === 'F';

function flex(s: string): string {
  if (SEM_SEXO) return s;
  return s
    // artigo e possessivo andam junto com o substantivo
    .replace(/\bo seu filho\(a\)/g, FEM ? 'a sua filha' : 'o seu filho')
    .replace(/\bseu filho\(a\)/g, FEM ? 'sua filha' : 'seu filho')
    // ele(a) -> ela | dele(a) -> dela | sozinho(a) -> sozinha
    .replace(/([A-Za-zÀ-ÿ]+?)([oe])\(a\)/g, (_m, raiz, vogal) => raiz + (FEM ? 'a' : vogal))
    // o(a) SOZINHO nao casava na regra acima, porque ela exige letra antes do
    // "o". Ficava literal na tela: "e o Bento, e' o(a) mesmo nos dois lugares?".
    .replace(/\bo\(a\)/g, FEM ? 'a' : 'o');
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
    opcoes: ['Leva um objeto pra todo canto e não larga', 'Tira tudo de dentro de uma caixa ou gaveta', 'Não deixa mudar o lugar das coisas dela', 'Não lembro de nada assim', 'Põe as coisas em fila ou empilha', 'Faz sempre o mesmo caminho pela casa'] },

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
    cena: 'Tem um aqui que põe a mão no ouvido igualzinho a quem está falando no telefone. Tem uma que passa a mão na mesa do mesmo jeito que viu alguém limpando.',
    texto: `Você já viu ${NOME} fazendo alguma coisa igualzinha a alguém?`,
    convite: 'Me conta o que ele(a) copiou',
    opcoes: ['Repetiu um gesto logo depois de ver', 'Um som, um jeito de falar', 'O jeito de andar ou de sentar', 'Não lembro de nada assim', 'O jeito de cuidar: ninar, fazer carinho', 'Pegou um objeto e usou do mesmo jeito que viu'] },

  { tipo: 'pergunta',
    abre: 'Confessa uma coisa pra mim.',
    cena: 'Sabe aquilo que ela faz de novo, e de novo, e de novo? O adulto já enjoou e ela quer outra vez.',
    texto: `Tem alguma coisa assim com ${NOME}?`,
    convite: 'Me conta o que é, e quanto tempo ele(a) fica nisso',
    ajuda: 'Pode reclamar, eu entendo.',
    opcoes: ['A mesma brincadeira, sempre', 'Tirar tudo de dentro e botar de volta', 'O mesmo livro, a mesma figura', 'Não lembro de nada assim', 'A mesma musiquinha, o mesmo som', 'Correr de um lado pro outro sem parar'] },

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
    cena: 'A gente muda uma coisa de lugar em casa e nem lembra que mudou.',
    texto: `${NOME} repara nessas coisas?`,
    convite: 'Me conta uma vez que isso aconteceu',
    opcoes: ['Repõe a coisa no lugar sozinho(a)', 'Aponta e resmunga até alguém ver', 'Estranha pessoa com roupa nova, cabelo cortado', 'Não lembro de nada assim', 'Percebe quando falta uma peça do brinquedo', 'Não costuma reparar nisso'] },
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
    cena: 'Tem criança que conta tudo na ordem em que aconteceu. Tem uma que começa pelo que achou mais legal. E tem quem levante e mostre com o corpo em vez de falar.',
    texto: `Quando ${NOME} te conta uma coisa que aconteceu, como é?`,
    convite: 'Me conta como ele(a) conta',
    opcoes: ['Conta na ordem, do começo ao fim', 'Começa pelo que achou mais legal', 'Levanta e mostra com o corpo', 'Não lembro de nada assim', 'Conta mais o que sentiu do que o que aconteceu', 'Vai buscar o objeto pra mostrar'] },
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

const CENAS_M3: Item[] = [
  // ============================================================
  // AS SETE ISCAS DO MATERNAL 3 (20/08/2026)
  //
  // Mesma espinha do Maternal 2 e do Grupo IV. O que muda e' o EXEMPLO dentro
  // da cena, nunca a pergunta: e' isso que permite comparar a mania dos 2 anos
  // com a dos 5 da mesma crianca daqui a tres anos.
  //
  // O QUE MUDA AOS 3 ANOS, tirado da conversa com a professora em 20/08:
  //
  //  - A PALAVRA SOZINHA NAO SUSTENTA O SIGNIFICADO. Se a professora fala
  //    "Pai", ela precisa desenhar, porque eles nao associam os detalhes so'
  //    pela fala. E quando perguntou o nome do pai, a crianca respondeu "Pai":
  //    ela tem a categoria e nao alcanca a instancia. Por isso entra uma isca
  //    nova aqui, que nao existe nas outras faixas: o que acontece quando o
  //    adulto fala de uma coisa que nao esta' ali na frente.
  //
  //  - JA' E' ESPONTANEA, e este e' o salto em relacao ao Maternal 2. La' a
  //    professora disse que a crianca so' conta "se houver a pergunta"; aqui
  //    "eles contam o que acontece em casa" sem ninguem puxar.
  //
  //  - MAS NAO RECONSTROI A ESCOLA. Os pais batem na tecla de que o filho nao
  //    diz o que aconteceu la', "porque eles nao conseguem construir". Entao
  //    NENHUMA isca desta faixa pode perguntar o que a crianca contou da
  //    escola: a resposta seria "nada" para todas, e nao diria nada sobre
  //    nenhuma. Pergunta-se o que ela FEZ em casa.
  //
  //  - A MOTRICIDADE FINA EXPLODE no ano: chegam rabiscando e terminam
  //    desenhando uma arvore reconhecivel, e ja' escrevem o primeiro e o
  //    segundo nome. Por isso desenho e nome entram na isca da surpresa.
  //
  //  - O EGOCENTRISMO E' A REGUA DA IDADE, e a professora foi explicita. Logo,
  //    reparar no outro e' o contra-regua, e e' onde mora o sinal. A cena diz
  //    ao pai que nao reparar e' o esperado, para a pergunta nao virar teste.
  //
  //  - A AUTONOMIA E' O QUE SE ADQUIRE no ano: chegam do Maternal 2 sem, saem
  //    com. E em casa "nao tem rotina", e a maioria nao faz atividade la'.
  //
  // A imitacao, que no Maternal 2 e' isca fixa, aqui vai para o banco das
  // guardadas: aos 3 anos ela continua existindo, mas deixou de ser o unico
  // canal de evidencia, porque a fala ja' entrou.
  // ============================================================

  { tipo: 'pergunta',
    abre: 'Vou começar pela pergunta mais gostosa.',
    texto: `O que ${NOME} mais gosta de fazer quando chega em casa?`,
    convite: 'Me conta',
    ajuda: 'Pode ser a coisa mais boba do mundo. É justamente isso que eu quero saber.',
    opcoes: [] },

  { tipo: 'pergunta',
    abre: 'Agora uma que sempre rende história.',
    cena: 'Toda criança dessa idade tem uma coisa que ninguém entende. Tem uma aqui que só senta na mesma cadeira. Tem um que faz a mesma pergunta cinco vezes seguidas.',
    texto: `${NOME} tem uma dessas?`,
    convite: 'Me conta qual é',
    opcoes: ['Quer sempre a mesma roupa, o mesmo copo, o mesmo lugar', 'Repete a mesma pergunta ou a mesma fala', 'Tem uma ordem certa de fazer as coisas e não deixa mudar', 'Não lembro de nada assim', 'Leva um objeto pra todo canto', 'Faz sempre o mesmo caminho pela casa'] },

  { tipo: 'pergunta',
    abre: 'Essa é a que a família toda gosta de contar.',
    cena: 'Acontece de a criança fazer uma coisa e a casa inteira parar pra olhar. Ninguém tinha ensinado aquilo.',
    texto: `${NOME} já fez uma dessas?`,
    convite: 'Me conta o que foi',
    opcoes: ['Desenhou alguma coisa que dava pra reconhecer', 'Escreveu ou tentou escrever o nome', 'Falou uma frase inteira que ninguém esperava', 'Não lembro de nada assim', 'Fez sozinho(a) uma coisa que sempre precisou de ajuda', 'Lembrou de uma coisa que aconteceu dias antes'] },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre ${NOME}.`, cta: 'Continuar' },

  // A ISCA ANCORA DO MATERNAL 3, e ela nao existe em nenhuma outra faixa.
  // Aos 3 anos a palavra ainda nao carrega a coisa sozinha, e o que varia entre
  // as criancas e' JUSTAMENTE o que elas fazem para preencher esse buraco: uma
  // vai buscar, outra aponta, outra espera alguem mostrar, outra repete a
  // palavra. Isso e' filtro puro, e nao exige que ela explique nada.
  { tipo: 'pergunta',
    cena: 'Aqui, quando eu falo de uma coisa que não está na sala, tem criança que entende na hora e tem criança que fica esperando eu mostrar.',
    texto: `Quando você fala com ${NOME} de uma coisa que vai acontecer depois, ou que está em outro cômodo, o que ele(a) faz?`,
    convite: 'Me conta o que ele(a) fez da última vez',
    ajuda: 'Por exemplo: você avisou que ia sair, ou pediu pra ele(a) buscar uma coisa em outro cômodo.',
    opcoes: ['Entendeu na hora, sem precisar ver', 'Foi procurar, ou apontou pra onde a coisa estava', 'Ficou esperando alguém mostrar', 'Não lembro de nada assim', 'Perguntou de novo várias vezes', 'Entendeu, mas trocou os detalhes na hora de repetir'] },

  { tipo: 'pergunta',
    abre: 'Confessa uma coisa pra mim.',
    cena: 'Sabe aquilo que ela faz de novo, e de novo, e de novo? O adulto já enjoou e ela quer outra vez.',
    texto: `Tem alguma coisa assim com ${NOME}?`,
    convite: 'Me conta o que é, e quanto tempo ele(a) fica nisso',
    ajuda: 'Pode reclamar, eu entendo.',
    opcoes: ['A mesma história, o mesmo vídeo, a mesma música', 'A mesma brincadeira, do mesmo jeito', 'Desenhar ou rabiscar a mesma coisa', 'Não lembro de nada assim', 'Subir e descer, correr, rodar', 'A mesma pergunta, várias vezes'] },

  { tipo: 'transicao',
    enorme: 'Quando eu faço essas perguntas, é porque entender cada um deles faz diferença.',
    linha: `Eu não quero que ${NOME} seja apenas mais um na multidão: quero que ele(a) brilhe do jeito dele(a), que não é igual ao de mais ninguém. E eu sei que temos um caminho longo pela frente, mas de pouquinho em pouquinho faremos essa árvore crescer juntos...`,
    cta: 'Continuar' },

  // Contra-regua da idade. A cena avisa que nao reparar e' o esperado, senao a
  // pergunta vira teste e o pai responde o que ele gostaria que fosse verdade.
  { tipo: 'pergunta',
    cena: 'Nessa idade a criança está muito no mundo dela, e isso é o esperado. Mas de vez em quando uma repara em alguém.',
    texto: `Já aconteceu de ${NOME} perceber que alguém não estava bem?`,
    convite: 'Me conta como foi que ele(a) percebeu',
    opcoes: ['Veio perto, encostou, ficou ali', 'Perguntou o que tinha acontecido', 'Foi buscar alguma coisa pra pessoa', 'Não lembro de nada assim', 'Contou pra outra pessoa que fulano estava triste', 'Nem reparou, seguiu no que estava fazendo'] },

  { tipo: 'pergunta',
    cena: 'A gente muda uma coisa de lugar em casa e nem lembra que mudou.',
    texto: `${NOME} repara nessas coisas?`,
    convite: 'Me conta uma vez que isso aconteceu',
    opcoes: ['Repõe a coisa no lugar sozinho(a)', 'Aponta e fala até alguém ver', 'Estranha pessoa com roupa nova, cabelo cortado', 'Não lembro de nada assim', 'Percebe quando falta uma peça do brinquedo', 'Não costuma reparar nisso'] },
];

// ============================================================
// O BANCO DAS GUARDADAS DO MATERNAL 3
// Duas iscas ficam fixas nas duas rodadas do ano (a abertura e a de casa) e
// cinco giram. A imitacao vive aqui porque aos 3 anos ela ja' divide espaco
// com a fala.
//
// REGRA DE LEITURA, INEGOCIAVEL: o que nao apareceu nao e' ausencia na
// crianca, e' canal que a gente nao perguntou nesta rodada.
// ============================================================
const GUARDADAS_M3: Item[] = [

  { tipo: 'pergunta',
    cena: 'Tem um aqui que pegou o jeito do avô de mexer no chinelo antes de sentar. Ninguém ensinou.',
    texto: `Você já viu ${NOME} fazendo alguma coisa igualzinha a alguém?`,
    convite: 'Me conta o que ele(a) copiou',
    opcoes: ['Um jeito de falar, uma palavra', 'Um gesto, um jeito de mexer a mão', 'Uma coisa inteira, na mesma ordem em que viu', 'Não lembro de nada assim', 'O jeito de andar, de sentar', 'O jeito de cuidar: ninar, fazer carinho'] },

  { tipo: 'pergunta',
    cena: 'Ela estava no meio de alguma coisa e parou do nada, por conta própria. Ninguém chamou.',
    texto: 'Da última vez que isso aconteceu, o que foi que fez ele(a) parar?',
    convite: 'Me conta essa vez',
    opcoes: ['Um barulho que veio de fora', 'Um bicho, um passarinho, alguma coisa viva', 'Alguém chegando ou saindo', 'Não lembro de nada assim', 'Uma música, alguém cantando', 'Uma luz, uma sombra, alguma coisa se mexendo'] },

  { tipo: 'pergunta',
    cena: 'Já vi criança dessa idade separar as coisas sem ninguém pedir. Junta as tampinhas de um lado, os bichinhos do outro. Ou põe tudo numa fila só dela.',
    texto: `Já viu ${NOME} fazendo isso?`,
    convite: 'Me conta o que ele(a) separou',
    opcoes: ['Já vi, com brinquedo', 'Já vi, mas com outra coisa da casa', 'Não lembro de nada assim', 'Junta tudo num monte só', 'Faz o contrário, espalha tudo'] },


  { tipo: 'pergunta',
    cena: 'Tem criança dessa idade que estranha quando alguém canta a musiquinha de sempre de um jeito diferente. E tem quem repita um barulho dias depois de ouvir.',
    texto: `${NOME} é assim com som?`,
    convite: 'Me conta o que aconteceu',
    opcoes: ['Repete o som ou a música depois', 'Estranha quando cantam diferente', 'Para tudo quando aparece um som novo', 'Não lembro de nada assim', 'Gosta de música, mas não é nada demais', 'Não liga muito pra isso'] },
];
void GUARDADAS_M3;

const CENAS_GV: Item[] = [
  // ============================================================
  // AS SETE ISCAS DO GRUPO V (20/08/2026)
  //
  // ATENCAO, E' PROVISORIO: esta e' a unica faixa escrita SEM entrevista com a
  // professora. Ela foi montada por interpolacao entre o Grupo IV e o 1o ano,
  // pesando mais no Grupo IV, e precisa ser revista depois da conversa. As
  // opcoes daqui sao as que tem mais chance de ter sido inventadas.
  //
  // O que sustenta a interpolacao, do que ja' foi colhido:
  //
  //  - Do GRUPO IV: a escrita entra copiando do quadro e o nome sai em cursiva.
  //    A variacao entre as criancas explode ("nenhum padrao"). A atencao cai
  //    para 5 a 10 minutos numa atividade proposta. Quando trava, faz birra sem
  //    choro. E destrava pelo que ama: a professora contou de um menino que
  //    volta pela historia.
  //
  //  - Do 1o ANO, e esta e' a fala que descreve o Grupo V pela vizinha de cima:
  //    "por a serie anterior ser o Grupo V, os pais nao desacostumaram, mas eles
  //    ja' conseguem fazer. A professora ja' ve o amadurecimento, mas os pais
  //    acham que e' o bebe ainda."
  //
  //    Isso faz do Grupo V a faixa onde a distancia entre o que a crianca ja'
  //    faz e o que o pai acha que ela faz e' MAIOR. E e' exatamente o que
  //    contamina a resposta, porque o pai responde pela imagem que tem.
  //    Consequencia de redacao: aqui as iscas ancoram em CENA e nunca em
  //    capacidade. Em vez de "ele consegue se arrumar sozinho", que convida o
  //    pai a responder pela imagem, "da ultima vez que ele se arrumou, o que
  //    aconteceu", que obriga a lembrar de um dia.
  //
  //  - Tambem do 1o ano: eles copiam o colega "como se ja' tivessem achado a
  //    resposta e nao precisassem trabalhar mais para achar outra", e a tela
  //    entra na conversa. As duas coisas provavelmente comecam aqui, e por isso
  //    aparecem no banco das guardadas, para serem testadas sem ocupar as sete.
  // ============================================================

  { tipo: 'pergunta',
    abre: 'Vou começar pela pergunta mais gostosa.',
    texto: `O que ${NOME} mais gosta de fazer quando chega em casa?`,
    convite: 'Me conta',
    ajuda: 'Pode ser a coisa mais boba do mundo. É justamente isso que eu quero saber.',
    opcoes: [] },

  { tipo: 'pergunta',
    abre: 'Agora uma que sempre rende história.',
    cena: 'Toda criança dessa idade tem uma coisa que ninguém entende. Tem uma aqui que arruma a mesa antes de começar qualquer coisa. Tem um que conta tudo em voz alta enquanto faz.',
    texto: `${NOME} tem uma dessas?`,
    convite: 'Me conta qual é',
    opcoes: ['Tem uma ordem certa de fazer as coisas', 'Fala sozinho(a) enquanto está fazendo', 'Junta e guarda coisas que ninguém entende pra quê', 'Não lembro de nada assim', 'Quer sempre a mesma roupa, o mesmo lugar', 'Repete a mesma fala ou a mesma pergunta'] },

  { tipo: 'pergunta',
    abre: 'Essa é a que a família toda gosta de contar.',
    cena: 'Acontece de a criança fazer uma coisa e a casa inteira parar pra olhar. Ninguém tinha ensinado aquilo.',
    texto: `${NOME} já fez uma dessas?`,
    convite: 'Me conta o que foi',
    opcoes: ['Leu ou reconheceu uma palavra que ninguém ensinou', 'Fez um desenho que contava uma história inteira', 'Explicou uma coisa de um jeito que ninguém tinha pensado', 'Não lembro de nada assim', 'Resolveu sozinho(a) uma coisa que travou', 'Contou uma coisa que aconteceu semanas antes'] },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre ${NOME}.`, cta: 'Continuar' },

  // A isca ancora do Grupo V, e ela e' construida contra a defasagem que a
  // professora do 1o ano descreveu. Nao se pergunta se a crianca CONSEGUE, se
  // pergunta o que aconteceu da ultima vez. A resposta traz a cena e nao a
  // imagem que o pai tem dela.
  { tipo: 'pergunta',
    cena: 'Tem uma hora em que a criança quer fazer sozinha e o adulto quer ajudar, e os dois estão certos.',
    texto: `Da última vez que ${NOME} quis fazer alguma coisa sozinho(a), o que aconteceu?`,
    convite: 'Me conta essa vez',
    ajuda: 'Pode ser se vestir, se servir, arrumar alguma coisa. O que der na cabeça.',
    opcoes: ['Fez sozinho(a) do começo ao fim', 'Começou sozinho(a) e chamou no meio', 'Fez do jeito dele(a), diferente do nosso', 'Não lembro de nada assim', 'Quis fazer, não deu certo e desistiu', 'Alguém acabou fazendo por ele(a)'] },

  { tipo: 'pergunta',
    abre: 'Confessa uma coisa pra mim.',
    cena: 'Sabe aquilo que ela faz de novo, e de novo, e de novo? O adulto já enjoou e ela quer outra vez.',
    texto: `Tem alguma coisa assim com ${NOME}?`,
    convite: 'Me conta o que é, e quanto tempo ele(a) fica nisso',
    ajuda: 'Pode reclamar, eu entendo.',
    opcoes: ['A mesma história, o mesmo vídeo, a mesma música', 'Desenhar ou montar a mesma coisa', 'A mesma brincadeira, com as mesmas regras', 'Não lembro de nada assim', 'Correr, pular, subir, sempre igual', 'A mesma pergunta, várias vezes'] },

  { tipo: 'transicao',
    enorme: 'Quando eu faço essas perguntas, é porque entender cada um deles faz diferença.',
    linha: `Eu não quero que ${NOME} seja apenas mais um na multidão: quero que ele(a) brilhe do jeito dele(a), que não é igual ao de mais ninguém. E eu sei que temos um caminho longo pela frente, mas de pouquinho em pouquinho faremos essa árvore crescer juntos...`,
    cta: 'Continuar' },

  { tipo: 'pergunta',
    cena: 'Tem dia que a gente chega em casa acabado e nem fala nada pra ninguém.',
    texto: `Já aconteceu de ${NOME} perceber isso antes de alguém falar?`,
    convite: 'Me conta como foi que ele(a) percebeu',
    opcoes: ['Perguntou o que tinha acontecido', 'Veio perto e ficou ali', 'Foi buscar alguma coisa pra você', 'Não lembro de nada assim', 'Mudou o jeito de falar, ficou mais quieto(a)', 'Nem reparou, seguiu no que estava fazendo'] },

  { tipo: 'pergunta',
    cena: 'Nessa idade eles começam a reparar em coisa que o adulto nem viu.',
    texto: `${NOME} já te apontou alguma coisa que você não tinha percebido?`,
    convite: 'Me conta o que era',
    opcoes: ['Uma coisa fora do lugar em casa', 'Um bicho, uma planta, alguma coisa viva', 'Alguém com uma coisa diferente na roupa ou no cabelo', 'Não lembro de nada assim', 'Um erro que o adulto tinha cometido', 'Um som que ninguém mais tinha ouvido'] },
];

// ============================================================
// O BANCO DAS GUARDADAS DO GRUPO V
// Duas destas existem para TESTAR o que a vizinha de cima descreveu: se copiar
// o colega e se a tela ja' comecam aqui ou so' no 1o ano. Se vierem vazias nas
// duas rodadas, a resposta e' que comecam depois, e isso tambem e' achado.
// ============================================================
const GUARDADAS_GV: Item[] = [

  { tipo: 'pergunta',
    cena: 'Tem criança que vê o irmão ou o primo fazendo uma coisa e faz igual na hora, sem nem pensar.',
    texto: `${NOME} é assim?`,
    convite: 'Me conta o que ele(a) copiou',
    opcoes: ['Copia o jeito de fazer, mas muda alguma coisa', 'Copia igualzinho', 'Copia só a parte que achou legal', 'Não lembro de nada assim', 'Prefere fazer do jeito dele(a)', 'Fica olhando, mas não faz'] },

  { tipo: 'pergunta',
    cena: 'Tem criança dessa idade que usa celular ou tablet e tem criança que quase não pega. E quem usa faz coisas bem diferentes lá dentro.',
    texto: `Se ${NOME} usa, o que ele(a) gosta de fazer lá dentro?`,
    convite: 'Me conta o que ele(a) mais faz',
    opcoes: ['Assiste vídeo', 'Joga sozinho(a)', 'Constrói, monta, cria alguma coisa', 'Ele(a) não usa', 'Joga com outras pessoas', 'Fica procurando coisa nova o tempo todo'] },

  { tipo: 'pergunta',
    cena: 'Ela estava fazendo alguma coisa e não estava dando certo.',
    texto: 'Da última vez que isso aconteceu, o que ele(a) fez em seguida?',
    convite: 'Me conta essa vez',
    opcoes: ['Chamou alguém pra ajudar', 'Tentou de outro jeito sozinho(a)', 'Parou e voltou depois', 'Não lembro de nada assim', 'Ficou bravo(a) e largou', 'Pediu pra outra pessoa fazer'] },

  { tipo: 'pergunta',
    cena: 'Já vi criança dessa idade organizar as coisas por um critério que só ela entende. Por cor, por tamanho, por quem é amigo de quem.',
    texto: `Já viu ${NOME} fazendo isso?`,
    convite: 'Me conta o que ele(a) separou, e por qual critério',
    opcoes: ['Já vi, com brinquedo', 'Já vi, mas com outra coisa da casa', 'Não lembro de nada assim', 'Organiza, mas só quando alguém pede', 'Faz o contrário, espalha tudo'] },

];
void GUARDADAS_GV;

const CENAS_A5: Item[] = [
  // ============================================================
  // AS SETE ISCAS DO 5o ANO (20/08/2026)
  //
  // Primeira faixa do Fundamental 1. Mesma espinha do Infantil, e isso e' de
  // proposito: e' o que permite comparar a mania dos 2 anos com a dos 10 da
  // mesma crianca. O que muda e' o exemplo dentro da cena.
  //
  // A BASE, e ela e' desigual. A ficha do 5o ano tem 5 respostas e as tres
  // perguntas do leque ficaram em branco. O que sustenta esta faixa vem de
  // outros tres lugares:
  //   1. a ficha do 4o ano, que e' a mesma faixa etaria e tem 8 respostas;
  //   2. as observacoes do proprio 5o ano no app, que sao muitas;
  //   3. as falas dos pais que as professoras repetiram.
  //
  // O QUE MUDA AOS 10 ANOS:
  //
  //  - A CONVERSA DEIXA DE SER PUBLICA. A professora do 5o ano: "se tiver
  //    confianca eles falam, se nao tiver, nao falam. Eles buscam estar a sos
  //    para falar." Consequencia direta: perguntar ao pai "o que ele te
  //    contou" passa a medir o VINCULO, nao a crianca. As iscas daqui
  //    perguntam o que ela FEZ, e o que ela disse entra como bonus.
  //
  //  - ELES ARGUMENTAM, e esta e' a novidade da faixa. Em 01/08 a professora
  //    pediu que convencessem a escola de alguma coisa, e quatro criancas
  //    argumentaram de quatro jeitos: por utilidade ("filosofia melhora o
  //    raciocinio e serve para outras materias"), por consequencia ruim ("os
  //    instrumentos podem machucar quem toca"), por empatia com outro ("o
  //    animal pode ser atropelado, morrer de fome ou ser maltratado") e por
  //    necessidade da familia ("quero ser jogador para melhorar a casa").
  //    Esse leque nao foi inventado: e' de quatro criancas reais, na mesma
  //    tarefa, no mesmo dia. Por isso "quando quer convencer" entra como uma
  //    das sete, e nao no banco.
  //
  //  - A TELA E' O TEMPO LIVRE. A professora do 4o ano: os pais falam quase so'
  //    de celular, e "queriam os filhos brincando na rua, os filhos querem, mas
  //    os pais nao tem coragem, porque as criancas nao sabem correr". Uma isca
  //    sobre brincadeira de rua seria isca sobre cena que nao acontece. A cena
  //    e' a tela, e o que varia e' o que a crianca faz LA DENTRO.
  //
  //  - O ANO VIRA A CRIANCA: "chegam infantis e saem querendo ser adolescentes.
  //    Nao querem mais participar de evento porque acham coisa de crianca."
  //
  //    ATENCAO, correcao do Fundador em 20/08: "nao gostam mais de pintar,
  //    desenho" fala da ATIVIDADE ESCOLAR de pintar, e nao do desenho. O Ayrton
  //    desta turma passa o dia desenhando e faz gibi. Desenhar voltou.
  //
  //  - E E' NO INTERESSE QUE ELES SE MOSTRAM: aos 10 anos o mecanismo aparece
  //    dentro do que a crianca escolhe nao largar.
  //
  // O que sai das sete e vai para o banco: a surpresa e o perceber o outro.
  // Aos 10 anos as duas continuam valendo, mas a tela e o convencer rendem
  // mais, porque acontecem todo dia e o pai ve.
  // ============================================================

  { tipo: 'pergunta',
    abre: 'Vou começar pela pergunta mais gostosa.',
    texto: `O que ${NOME} mais gosta de fazer quando chega em casa?`,
    convite: 'Me conta',
    ajuda: 'Pode ser a coisa mais boba do mundo. É justamente isso que eu quero saber.',
    opcoes: [] },

  { tipo: 'pergunta',
    abre: 'Agora uma que sempre rende história.',
    cena: 'Toda idade tem uma mania. Tem um aqui que fala com a mão levantada, gesticulando o tempo todo. Tem outro que não começa nada sem arrumar a mesa antes.',
    texto: `${NOME} tem uma dessas?`,
    convite: 'Me conta qual é',
    opcoes: ['Um jeito de mexer o corpo ou a mão quando fala', 'Precisa arrumar ou preparar antes de começar', 'Fica repetindo uma música, uma frase, um bordão', 'Não lembro de nada assim', 'Junta ou coleciona uma coisa específica', 'Tem uma ordem certa pra fazer as coisas'] },

  // A isca ancora da faixa. Todo pai ve esta cena, e as opcoes vieram de quatro
  // criancas reais do 5o ano, na mesma tarefa, em 01/08.
  { tipo: 'pergunta',
    cena: 'Tem uma hora em que eles querem muito uma coisa e a gente não quer dar. E cada um tenta de um jeito.',
    texto: `Da última vez que isso aconteceu com ${NOME}, como foi que ele(a) tentou?`,
    convite: 'Me conta essa vez',
    ajuda: 'Pode ser um jogo, um passeio, ficar acordado mais tarde. O que der na cabeça.',
    opcoes: ['Explicou por que aquilo era importante', 'Disse o que ia acontecer de ruim se não desse', 'Ofereceu alguma coisa em troca, fez um acordo', 'Não lembro de nada assim', 'Insistiu até a gente cansar', 'Foi pedir pra outra pessoa da casa'] },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre ${NOME}.`, cta: 'Continuar' },

  // A cena mais frequente da idade, e a unica que o pai observa todo dia. A
  // abertura diz "e tudo bem" de proposito: sem isso o pai responde o que ele
  // gostaria que fosse verdade, e a resposta vira o tempo de tela ideal.
  { tipo: 'pergunta',
    cena: 'No celular quase toda criança assiste vídeo e joga. O que muda de uma pra outra é o assunto: tem quem só veja vídeo de bicho, tem quem fique vendo gente montando coisa, tem quem volte sempre no mesmo jogo.',
    texto: `Sobre o que é o vídeo ou o jogo que ${NOME} mais procura?`,
    convite: 'Se souber o nome, escreve. Se não souber, me conta o que ele(a) fala sobre aquilo',
    opcoes: ['Um jogo específico, e acompanha quem joga aquilo', 'Gente ensinando ou mostrando como se faz', 'Um assunto que ele(a) foi atrás sozinho(a)', 'Não sei dizer, ou ele(a) quase não usa', 'Música, edição, gente criando alguma coisa', 'Humor, corte, gente conversando'] },

  { tipo: 'pergunta',
    abre: 'Agora a que eu mais aprendo.',
    cena: 'Tem uma coisa que a criança dessa idade não larga. Ela volta naquilo sozinha, sem ninguém mandar, e vai atrás de saber mais.',
    texto: `Tem alguma coisa assim com ${NOME}?`,
    convite: 'Me conta o que é. E se ele(a) já foi atrás disso por conta própria, me conta como',
    ajuda: 'Vale qualquer coisa: um assunto, um jogo, um bicho, uma música, um jeito de fazer.',
    opcoes: ['Um assunto que ele(a) fica pesquisando', 'Desenhar, escrever, criar alguma coisa', 'Um jogo, e vai atrás de aprender mais sobre ele', 'Não lembro de nada assim', 'Montar, construir, consertar', 'Um esporte, uma dança, um instrumento'] },

  { tipo: 'transicao',
    enorme: 'Quando eu faço essas perguntas, é porque entender cada um deles faz diferença.',
    linha: `Eu não quero que ${NOME} seja apenas mais um na multidão: quero que ele(a) brilhe do jeito dele(a), que não é igual ao de mais ninguém. E eu sei que temos um caminho longo pela frente, mas de pouquinho em pouquinho faremos essa árvore crescer juntos...`,
    cta: 'Continuar' },

  // Nao se pergunta o que ele CONTOU: aos 10 anos ele conta se quiser, e a
  // resposta mediria o vinculo. Pergunta-se o que ele fez quando travou.
  { tipo: 'pergunta',
    cena: 'Ele(a) estava fazendo alguma coisa em casa e não estava dando certo. O que me interessa não é se conseguiu no fim, é o que ele(a) fez no minuto seguinte.',
    texto: 'Da última vez que isso aconteceu, o que ele(a) fez em seguida?',
    convite: 'Me conta essa vez, do jeito que aconteceu',
    opcoes: ['Chamou alguém, mas pra olhar junto, não pra fazer por ele(a)', 'Desmanchou e começou de novo do zero', 'Ficou insistindo no mesmo ponto até sair', 'Não lembro de nada assim', 'Foi ver num vídeo como se faz e voltou pra tentar', 'Largou naquele dia e voltou depois, sozinho(a)'] },

  { tipo: 'pergunta',
    cena: 'Nessa idade eles reparam em coisa que o adulto deixou passar. Aqui eles percebem na hora quando eu escrevo uma palavra errada no slide.',
    texto: `${NOME} já te apontou alguma coisa que você não tinha percebido?`,
    convite: 'Me conta o que era',
    opcoes: ['Um erro que alguém tinha cometido', 'Uma coisa fora do lugar ou diferente', 'Uma contradição no que alguém falou', 'Não lembro de nada assim', 'Um detalhe num vídeo, num jogo, numa imagem', 'Uma mudança em alguém: humor, jeito, aparência'] },
];

// ============================================================
// O BANCO DAS GUARDADAS DO 5o ANO
//
// A ultima daqui e' a mais delicada do instrumento inteiro, e por isso ela
// pede as duas direcoes na mesma pergunta: "isso e' comigo" e "isso eu nao sei
// fazer". Perguntar so' pela segunda transformaria o questionario num convite
// a listar defeito do filho.
// ============================================================
const GUARDADAS_A5: Item[] = [

  { tipo: 'pergunta',
    abre: 'Essa é a que a família toda gosta de contar.',
    cena: 'Acontece de a criança fazer uma coisa e a casa inteira parar pra olhar. Ninguém tinha ensinado aquilo.',
    texto: `${NOME} já fez uma dessas?`,
    convite: 'Me conta o que foi',
    opcoes: ['Explicou uma coisa de um jeito que ninguém tinha pensado', 'Consertou ou resolveu alguma coisa sozinho(a)', 'Percebeu um erro que ninguém tinha visto', 'Não lembro de nada assim', 'Fez uma coisa com as mãos muito melhor do que se esperava', 'Falou de um assunto com uma profundidade que surpreendeu'] },

  // Aos 9 e 10 anos aparece a pergunta causal. A professora do 4o ano contou de
  // um aluno que perguntou como o micróbio entra se o pote esta fechado. Isso
  // acontece em casa tambem, e o pai lembra, porque costuma ser a pergunta que
  // ele nao soube responder.
  { tipo: 'pergunta',
    cena: 'Nessa idade eles começam a fazer umas perguntas que pegam a gente de surpresa. Teve um aqui que perguntou como é que o micróbio entra no pote se o pote está fechado.',
    texto: `${NOME} já te fez uma dessas?`,
    convite: 'Me conta qual foi',
    opcoes: ['Sobre como as coisas funcionam', 'Sobre pessoas, sobre por que alguém fez alguma coisa', 'Sobre dinheiro, sobre quanto custa', 'Não lembro de nada assim', 'Sobre a natureza, bicho, corpo', 'Sobre uma coisa que ele(a) viu num vídeo'] },

  { tipo: 'pergunta',
    cena: 'Tem dia que a gente chega em casa acabado e nem fala nada pra ninguém.',
    texto: `Já aconteceu de ${NOME} perceber isso antes de alguém falar?`,
    convite: 'Me conta como foi que ele(a) percebeu',
    opcoes: ['Perguntou o que tinha acontecido', 'Mudou o jeito, ficou mais quieto(a) do lado', 'Fez alguma coisa pra ajudar sem pedir', 'Não lembro de nada assim', 'Comentou depois, com outra pessoa', 'Nem reparou'] },

  { tipo: 'pergunta',
    cena: 'Já vi criança dessa idade organizar as coisas por um critério que só ela entende.',
    texto: `Já viu ${NOME} fazendo isso?`,
    convite: 'Me conta o que ele(a) organizou, e por qual critério',
    opcoes: ['As coisas do quarto, do material', 'Coleção, figurinha, carta, jogo', 'Não lembro de nada assim', 'Organiza no celular: pasta, lista, playlist', 'Organiza, mas só quando alguém pede', 'Não é muito disso'] },

  { tipo: 'pergunta',
    cena: 'Nessa idade eles começam a falar de si mesmos. Tem um aqui que disse "isso é comigo" e tem outro que disse "isso eu não sei fazer".',
    texto: `${NOME} já falou alguma coisa assim em casa?`,
    convite: 'Me conta o que ele(a) disse, com as palavras dele(a)',
    ajuda: 'Pode ser das duas coisas: uma que ele(a) acha que é dele(a), ou uma que ele(a) acha que não é.',
    opcoes: ['Disse que é bom(boa) em alguma coisa', 'Disse que não consegue fazer alguma coisa', 'Se comparou com alguém', 'Não lembro de nada assim', 'Falou do que quer ser quando crescer', 'Não costuma falar de si'] },
];
void GUARDADAS_A5;

const CENAS_A1: Item[] = [
  // ============================================================
  // AS SETE ISCAS DO 1o ANO (20/08/2026)
  //
  // O QUE MUDA AOS 6 ANOS, da conversa com a professora:
  //
  //  - ELES COPIAM, E O MOTIVO E' O ACHADO. "Se o aluno ve o amigo fazendo
  //    algo, ele faz tambem. E' como se eles ja tivessem achado a resposta e
  //    nao precisassem trabalhar mais em achar outra." Isso nao e' preguica, e'
  //    economia, e o que a crianca escolhe copiar da mesma cena e' o mais perto
  //    de mecanismo que existe nessa idade. Por isso e' a isca ancora.
  //
  //  - NAO DESISTEM. "Nunca vi alguem nao conseguir e nao fazer mais. Eles
  //    sempre pedem ajuda. Nao tem a autonomia de desistir." Isso separa esta
  //    faixa das seguintes: do 3o ano em diante a crianca ja negocia e evita.
  //
  //  - REPARAM O ERRO DO ADULTO e esperam para mostrar: "se esquecer alguma
  //    letra, eles ficam esperando a professora errar a letra no quadro para
  //    eles mostrarem". Virou a setima isca.
  //
  //  - CONTAM MENOS do que contavam. "Hoje esta bem mais dificil falar sobre o
  //    que fizeram." Entao nada de perguntar o que a crianca contou.
  // ============================================================

  { tipo: 'pergunta',
    abre: 'Vou começar pela pergunta mais gostosa.',
    texto: `O que ${NOME} mais gosta de fazer quando chega em casa?`,
    convite: 'Me conta',
    ajuda: 'Pode ser a coisa mais boba do mundo. É justamente isso que eu quero saber.',
    opcoes: [] },

  { tipo: 'pergunta',
    abre: 'Agora uma que sempre rende história.',
    cena: 'Toda criança dessa idade tem uma mania. Tem uma aqui que fica piscando o tempo todo quando conversa. Tem um que não começa nada sem arrumar o material.',
    texto: `${NOME} tem uma dessas?`,
    convite: 'Me conta qual é',
    opcoes: ['Um jeito de mexer o corpo ou o rosto quando fala', 'Precisa arrumar as coisas antes de começar', 'Repete a mesma frase ou a mesma pergunta', 'Não lembro de nada assim', 'Junta ou guarda uma coisa específica', 'Tem uma ordem certa pra fazer as coisas'] },

  { tipo: 'pergunta',
    abre: 'Essa é a que a família toda gosta de contar.',
    cena: 'Acontece de a criança fazer uma coisa e a casa inteira parar pra olhar. Ninguém tinha ensinado aquilo.',
    texto: `${NOME} já fez uma dessas?`,
    convite: 'Me conta o que foi',
    opcoes: ['Leu ou escreveu uma coisa que ninguém ensinou', 'Fez sozinho(a) uma coisa que sempre precisou de ajuda', 'Explicou uma coisa de um jeito que ninguém tinha pensado', 'Não lembro de nada assim', 'Consertou ou montou alguma coisa', 'Lembrou de um detalhe que todo mundo tinha esquecido'] },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre ${NOME}.`, cta: 'Continuar' },

  // A ISCA ANCORA DO 1o ANO. Nao interessa QUANTO ela copia: interessa O QUE ela
  // escolhe copiar da mesma cena. Cinco criancas veem a mesma coisa e levam
  // partes diferentes, e a parte escolhida e' o filtro.
  { tipo: 'pergunta',
    cena: 'Aqui, se um vê o outro fazendo, faz igual na hora. E o interessante é que cada um copia uma parte diferente da mesma coisa.',
    texto: `Você já viu ${NOME} copiando alguém em casa?`,
    convite: 'Me conta o que ele(a) copiou',
    ajuda: 'Pode ser de irmão, de primo, de alguém da TV, de um vídeo.',
    opcoes: ['O jeito de fazer, o passo a passo', 'Só a parte que achou mais legal', 'Copiou e mudou alguma coisa no meio', 'Não lembro de nada assim', 'Um jeito de falar ou um bordão', 'Prefere fazer do jeito dele(a)'] },

  { tipo: 'pergunta',
    abre: 'Confessa uma coisa pra mim.',
    cena: 'Sabe aquilo que ele faz de novo, e de novo, e de novo? O adulto já enjoou e ele quer outra vez.',
    texto: `Tem alguma coisa assim com ${NOME}?`,
    convite: 'Me conta o que é, e quanto tempo ele(a) fica nisso',
    ajuda: 'Pode reclamar, eu entendo.',
    opcoes: ['A mesma brincadeira, do mesmo jeito', 'O mesmo vídeo, a mesma música', 'Desenhar ou montar a mesma coisa', 'Não lembro de nada assim', 'Correr, pular, treinar o mesmo movimento', 'A mesma pergunta, várias vezes'] },

  { tipo: 'transicao',
    enorme: 'Quando eu faço essas perguntas, é porque entender cada um deles faz diferença.',
    linha: `Eu não quero que ${NOME} seja apenas mais um na multidão: quero que ele(a) brilhe do jeito dele(a), que não é igual ao de mais ninguém. E eu sei que temos um caminho longo pela frente, mas de pouquinho em pouquinho faremos essa árvore crescer juntos...`,
    cta: 'Continuar' },

  // Aqui a crianca ainda nao desiste. O que varia e' A QUEM ela recorre e COMO,
  // e e' isso que a pergunta persegue: a sequencia do que ela fez, nao como ela
  // se sentiu.
  { tipo: 'pergunta',
    cena: 'Ele estava fazendo alguma coisa em casa e não estava dando certo.',
    texto: 'Da última vez que isso aconteceu, o que ele(a) fez em seguida?',
    convite: 'Me conta essa vez',
    opcoes: ['Chamou alguém pra ajudar', 'Tentou de novo, de outro jeito', 'Chamou alguém pra fazer junto', 'Não lembro de nada assim', 'Foi ver como alguém faz', 'Parou e voltou depois'] },

  { tipo: 'pergunta',
    cena: 'Aqui eles reparam quando eu escrevo uma letra errada no quadro, e ficam esperando a hora de avisar.',
    texto: `${NOME} já te apontou alguma coisa que você não tinha percebido?`,
    convite: 'Me conta o que era',
    opcoes: ['Um erro que alguém tinha cometido', 'Uma coisa fora do lugar em casa', 'Alguém com uma coisa diferente na roupa ou no cabelo', 'Não lembro de nada assim', 'Um bicho, uma planta, alguma coisa viva', 'Um som que ninguém mais tinha ouvido'] },
];

const GUARDADAS_A1: Item[] = [
  { tipo: 'pergunta',
    cena: 'Tem criança que conta tudo na ordem em que aconteceu, e tem quem comece pelo fim.',
    texto: `Quando ${NOME} te conta uma coisa que aconteceu, como é?`,
    convite: 'Me conta como ele(a) conta',
    opcoes: ['Conta na ordem, do começo ao fim', 'Começa pelo que achou mais legal', 'Conta mais o que sentiu do que o que aconteceu', 'Não lembro de nada assim', 'Mostra com o corpo enquanto fala', 'Vai buscar o objeto pra mostrar'] },

  { tipo: 'pergunta',
    cena: 'Já vi criança dessa idade separar as coisas por um critério que só ela entende.',
    texto: `Já viu ${NOME} fazendo isso?`,
    convite: 'Me conta o que ele(a) separou, e por qual critério',
    opcoes: ['Já vi, com brinquedo', 'Já vi, com o material da escola', 'Não lembro de nada assim', 'Organiza, mas só quando alguém pede', 'Faz o contrário, espalha tudo'] },

  { tipo: 'pergunta',
    cena: 'Tem dia que a gente chega em casa acabado e nem fala nada pra ninguém.',
    texto: `Já aconteceu de ${NOME} perceber isso antes de alguém falar?`,
    convite: 'Me conta como foi que ele(a) percebeu',
    opcoes: ['Perguntou o que tinha acontecido', 'Veio perto e ficou ali', 'Fez alguma coisa pra ajudar sem pedir', 'Não lembro de nada assim', 'Ficou mais quieto(a) do que o normal', 'Nem reparou'] },

  { tipo: 'pergunta',
    cena: 'Tem criança que usa bastante o celular e tem criança que quase não pega.',
    texto: `Se ${NOME} usa, o que ele(a) gosta de fazer lá dentro?`,
    convite: 'Me conta o que ele(a) mais faz',
    opcoes: ['Assiste vídeo', 'Joga sozinho(a)', 'Constrói, monta, cria alguma coisa', 'Ele(a) não usa', 'Joga com outras pessoas', 'Fica procurando coisa nova o tempo todo'] },
];
void GUARDADAS_A1;

const CENAS_A2: Item[] = [
  // ============================================================
  // AS SETE ISCAS DO 2o ANO (20/08/2026)
  //
  // O QUE MUDA AOS 7 ANOS, da conversa com a professora:
  //
  //  - ELES TENTAM SOZINHOS PRIMEIRO. "Eles procuram fazer atividade e nao
  //    procuram ajuda, todos. Quando nao conseguem eles pedem ajuda, nao
  //    desistem." E' MAIS autonomo que o 1o ano, onde a crianca ja pedia de
  //    saida. A ancora persegue exatamente esse intervalo: o que ela faz ANTES
  //    de chamar alguem.
  //
  //  - QUEREM MOSTRAR QUE CONSEGUEM. "A questao do se sentir capaz de fazer,
  //    eles chegam querendo mostrar que tem a autonomia e quando terminam eles
  //    realmente tem, pro nivel deles." Isso e' semente do Acreditar aos 7 anos.
  //
  //  - MANIA DE DANCINHA. "Se deixar ele fica dancando."
  //
  //  - E A INVERSAO CASA-ESCOLA: aqui a crianca se apresenta mais carente e em
  //    casa mais madura, o contrario de todas as outras faixas. Nao vira
  //    pergunta, porque comparar era o erro que saiu do instrumento; vira
  //    cuidado de leitura quando os dois questionarios forem cruzados.
  // ============================================================

  { tipo: 'pergunta',
    abre: 'Vou começar pela pergunta mais gostosa.',
    texto: `O que ${NOME} mais gosta de fazer quando chega em casa?`,
    convite: 'Me conta',
    ajuda: 'Pode ser a coisa mais boba do mundo. É justamente isso que eu quero saber.',
    opcoes: [] },

  { tipo: 'pergunta',
    abre: 'Agora uma que sempre rende história.',
    cena: 'Toda criança dessa idade tem uma mania. Tem um aqui que, se deixar, fica dançando o dia inteiro. Tem uma que conta tudo em voz alta enquanto faz.',
    texto: `${NOME} tem uma dessas?`,
    convite: 'Me conta qual é',
    opcoes: ['Dança, canta ou repete um movimento', 'Fala sozinho(a) enquanto está fazendo', 'Precisa arrumar as coisas antes de começar', 'Não lembro de nada assim', 'Junta ou coleciona uma coisa específica', 'Repete a mesma frase ou a mesma pergunta'] },

  { tipo: 'pergunta',
    abre: 'Essa é a que a família toda gosta de contar.',
    cena: 'Acontece de a criança fazer uma coisa e a casa inteira parar pra olhar. Ninguém tinha ensinado aquilo.',
    texto: `${NOME} já fez uma dessas?`,
    convite: 'Me conta o que foi',
    opcoes: ['Fez sozinho(a) uma coisa que sempre precisou de ajuda', 'Leu ou escreveu uma coisa que ninguém ensinou', 'Explicou uma coisa de um jeito que ninguém tinha pensado', 'Não lembro de nada assim', 'Consertou ou montou alguma coisa', 'Percebeu um erro que ninguém tinha visto'] },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre ${NOME}.`, cta: 'Continuar' },

  // A ISCA ANCORA DO 2o ANO. Aqui existe um intervalo que no 1o ano nao existia:
  // entre travar e pedir ajuda, a crianca faz alguma coisa sozinha. O que ela
  // faz nesse intervalo e' o mecanismo aparecendo sem plateia.
  { tipo: 'pergunta',
    cena: 'Nessa idade eles tentam sozinhos primeiro. Só depois é que chamam alguém.',
    texto: `Da última vez que ${NOME} não conseguiu fazer uma coisa em casa, o que ele(a) fez ANTES de pedir ajuda?`,
    convite: 'Me conta essa vez',
    opcoes: ['Tentou de novo, de outro jeito', 'Ficou olhando, parado(a), pensando', 'Foi ver como alguém faz', 'Não lembro de nada assim', 'Foi buscar alguma coisa pra ajudar', 'Pediu ajuda na hora, não tentou antes'] },

  { tipo: 'pergunta',
    abre: 'Confessa uma coisa pra mim.',
    cena: 'Sabe aquilo que ele faz de novo, e de novo, e de novo? O adulto já enjoou e ele quer outra vez.',
    texto: `Tem alguma coisa assim com ${NOME}?`,
    convite: 'Me conta o que é, e quanto tempo ele(a) fica nisso',
    ajuda: 'Pode reclamar, eu entendo.',
    opcoes: ['A mesma brincadeira, do mesmo jeito', 'A mesma música, a mesma dança', 'Desenhar ou montar a mesma coisa', 'Não lembro de nada assim', 'O mesmo vídeo, a mesma história', 'Correr, pular, treinar o mesmo movimento'] },

  { tipo: 'transicao',
    enorme: 'Quando eu faço essas perguntas, é porque entender cada um deles faz diferença.',
    linha: `Eu não quero que ${NOME} seja apenas mais um na multidão: quero que ele(a) brilhe do jeito dele(a), que não é igual ao de mais ninguém. E eu sei que temos um caminho longo pela frente, mas de pouquinho em pouquinho faremos essa árvore crescer juntos...`,
    cta: 'Continuar' },

  // Semente do Acreditar aos 7 anos. Nao pergunta no que ela e' boa, que seria
  // pedir nota: pergunta o que ela FEZ QUESTAO de mostrar, que e' escolha dela.
  { tipo: 'pergunta',
    cena: 'Tem uma idade em que a criança faz questão de mostrar que consegue sozinha. Chega chamando pra ver.',
    texto: `${NOME} já fez isso em casa?`,
    convite: 'Me conta o que ele(a) fez questão de mostrar',
    opcoes: ['Uma coisa que ele(a) fez com as mãos', 'Uma coisa que aprendeu na escola', 'Uma coisa que conseguiu fazer sozinho(a) pela primeira vez', 'Não lembro de nada assim', 'Uma habilidade nova: pular, andar de bicicleta, nadar', 'Não costuma chamar pra ver'] },

  { tipo: 'pergunta',
    cena: 'Nessa idade eles reparam em coisa que o adulto deixou passar.',
    texto: `${NOME} já te apontou alguma coisa que você não tinha percebido?`,
    convite: 'Me conta o que era',
    opcoes: ['Um erro que alguém tinha cometido', 'Uma coisa fora do lugar em casa', 'Alguém com uma coisa diferente na roupa ou no cabelo', 'Não lembro de nada assim', 'Um bicho, uma planta, alguma coisa viva', 'Um som que ninguém mais tinha ouvido'] },
];

const GUARDADAS_A2: Item[] = [
  { tipo: 'pergunta',
    cena: 'Tem criança que vê alguém fazendo uma coisa e faz igual na hora.',
    texto: `Você já viu ${NOME} copiando alguém em casa?`,
    convite: 'Me conta o que ele(a) copiou',
    opcoes: ['O jeito de fazer, o passo a passo', 'Só a parte que achou mais legal', 'Copiou e mudou alguma coisa no meio', 'Não lembro de nada assim', 'Um jeito de falar ou um bordão', 'Prefere fazer do jeito dele(a)'] },

  { tipo: 'pergunta',
    cena: 'Tem criança que conta tudo na ordem em que aconteceu, e tem quem comece pelo fim.',
    texto: `Quando ${NOME} te conta uma coisa que aconteceu, como é?`,
    convite: 'Me conta como ele(a) conta',
    opcoes: ['Conta na ordem, do começo ao fim', 'Começa pelo que achou mais legal', 'Conta mais o que sentiu do que o que aconteceu', 'Não lembro de nada assim', 'Mostra com o corpo enquanto fala', 'Vai buscar o objeto pra mostrar'] },

  { tipo: 'pergunta',
    cena: 'Tem dia que a gente chega em casa acabado e nem fala nada pra ninguém.',
    texto: `Já aconteceu de ${NOME} perceber isso antes de alguém falar?`,
    convite: 'Me conta como foi que ele(a) percebeu',
    opcoes: ['Perguntou o que tinha acontecido', 'Veio perto e ficou ali', 'Fez alguma coisa pra ajudar sem pedir', 'Não lembro de nada assim', 'Ficou mais quieto(a) do que o normal', 'Nem reparou'] },

  { tipo: 'pergunta',
    cena: 'Tem criança que usa bastante o celular e tem criança que quase não pega.',
    texto: `Se ${NOME} usa, o que ele(a) gosta de fazer lá dentro?`,
    convite: 'Me conta o que ele(a) mais faz',
    opcoes: ['Assiste vídeo', 'Joga sozinho(a)', 'Constrói, monta, cria alguma coisa', 'Ele(a) não usa', 'Joga com outras pessoas', 'Fica procurando coisa nova o tempo todo'] },
];
void GUARDADAS_A2;

const CENAS_A3: Item[] = [
  // ============================================================
  // AS SETE ISCAS DO 3o ANO (20/08/2026)
  //
  // E' a UNICA faixa do F1 com as tres perguntas do leque respondidas, entao as
  // opcoes daqui sao as mais bem apoiadas de todo o Fundamental 1.
  //
  //  - A LICAO DE CASA DIVIDE: "alguns falam que nao e' dificil, outros dizem
  //    que pedem ajuda para os pais". E' a cena da idade e virou a ancora.
  //
  //  - A TELA VIRA CORPO: "tem aluno tao viciado em tela que fica fazendo os
  //    movimentos com os dedos dentro de sala". Nao da' para escrever isca sobre
  //    brincadeira de rua nesta faixa: a cena e' a tela.
  //
  //  - NAO TEM FILTRO: "soltam coisas de casa". Cuidado de leitura, nao de
  //    redacao: episodio domestico pode voltar com informacao de familia.
  //
  //  - E OS PAIS COBRAM MATURIDADE ADIANTADA: "veem a crianca com aparente
  //    maturidade e acham que podem cobrar responsabilidades, mas ainda e' uma
  //    crianca de 8 a 9 anos". Por isso nenhuma isca pergunta se ela CONSEGUE:
  //    todas perguntam o que aconteceu.
  // ============================================================

  { tipo: 'pergunta',
    abre: 'Vou começar pela pergunta mais gostosa.',
    texto: `O que ${NOME} mais gosta de fazer quando chega em casa?`,
    convite: 'Me conta',
    ajuda: 'Pode ser a coisa mais boba do mundo. É justamente isso que eu quero saber.',
    opcoes: [] },

  { tipo: 'pergunta',
    abre: 'Agora uma que sempre rende história.',
    cena: 'Toda criança dessa idade tem uma mania. Tem um aqui que fica mexendo os dedos no ar como se estivesse num celular. Tem uma que não senta sem arrumar tudo antes.',
    texto: `${NOME} tem uma dessas?`,
    convite: 'Me conta qual é',
    opcoes: ['Um jeito de mexer as mãos ou o corpo', 'Precisa arrumar as coisas antes de começar', 'Fala sozinho(a) enquanto está fazendo', 'Não lembro de nada assim', 'Junta ou coleciona uma coisa específica', 'Repete a mesma frase ou o mesmo bordão'] },

  // A ISCA ANCORA DO 3o ANO. Ela perguntava COMO ERA a hora da licao, e as
  // opcoes eram senta e faz / chama alguem / deixa pro fim. Vieram de resposta
  // direta da professora, mas sobre a LOGISTICA da tarefa: quem faz, quando faz,
  // se o pai senta junto. Isso o boletim ja' responde, e a isca estava sendo
  // gasta com comportamento.
  //
  // Agora ela persegue o que a crianca faz ENQUANTO faz. Quem narra em voz alta
  // o proprio passo a passo esta pensando por linguagem. Quem para no meio para
  // perguntar do personagem esta entrando pela pessoa dentro da historia. Quem
  // quer saber pra que aquilo serve antes de comecar esta pedindo a regra. Sao
  // tres cabecas diferentes na mesma folha de dever, e nenhuma delas aparece em
  // "senta e faz sozinho".
  { tipo: 'pergunta',
    cena: 'Enquanto faz a atividade, cada criança faz uma coisa junto. Tem uma que narra em voz alta tudo o que está fazendo. Tem uma que para no meio pra perguntar se o personagem da historinha está bem.',
    texto: `${NOME} faz alguma coisa assim enquanto está fazendo a atividade?`,
    convite: 'Me conta o que ele(a) faz',
    opcoes: ['Narra em voz alta o que está fazendo', 'Pergunta dos personagens, quer saber o que aconteceu com eles', 'Desenha ou rabisca no canto da folha', 'Não lembro de nada assim', 'Cantarola, bate um ritmo, balança o pé', 'Quer saber pra que serve aquilo, por que é assim'] },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre ${NOME}.`, cta: 'Continuar' },

  { tipo: 'pergunta',
    cena: 'No celular quase toda criança assiste vídeo e joga. O que muda de uma pra outra é o assunto: tem quem só veja vídeo de bicho, tem quem fique vendo gente montando coisa, tem quem volte sempre no mesmo jogo.',
    texto: `Sobre o que é o vídeo ou o jogo que ${NOME} mais procura?`,
    convite: 'Se souber o nome, escreve. Se não souber, me conta o que ele(a) fala sobre aquilo',
    opcoes: ['Bicho, dinossauro, natureza, espaço', 'Gente montando, construindo, consertando', 'História, personagem, desenho que ele(a) acompanha', 'Não sei dizer, ou ele(a) quase não usa', 'Música, dança, gente cantando', 'Um jogo só, e volta sempre no mesmo'] },

  { tipo: 'pergunta',
    abre: 'Agora a que eu mais aprendo.',
    cena: 'Tem uma coisa que a criança dessa idade não larga. Ela volta naquilo sozinha, sem ninguém mandar, e vai atrás de saber mais.',
    texto: `Tem alguma coisa assim com ${NOME}?`,
    convite: 'Me conta o que é. E se ele(a) já foi atrás disso por conta própria, me conta como',
    ajuda: 'Vale qualquer coisa: um assunto, um jogo, um bicho, uma música, um jeito de fazer.',
    opcoes: ['Um assunto que ele(a) fica pesquisando', 'Desenhar, escrever, criar alguma coisa', 'Um jogo, e vai atrás de aprender mais sobre ele', 'Não lembro de nada assim', 'Montar, construir, consertar', 'Um esporte, uma dança, um instrumento'] },

  { tipo: 'transicao',
    enorme: 'Quando eu faço essas perguntas, é porque entender cada um deles faz diferença.',
    linha: `Eu não quero que ${NOME} seja apenas mais um na multidão: quero que ele(a) brilhe do jeito dele(a), que não é igual ao de mais ninguém. E eu sei que temos um caminho longo pela frente, mas de pouquinho em pouquinho faremos essa árvore crescer juntos...`,
    cta: 'Continuar' },

  { tipo: 'pergunta',
    cena: 'Tem criança que conta tudo na ordem em que aconteceu. Tem quem comece pelo fim. E tem quem só conte se alguém perguntar.',
    texto: `Quando ${NOME} te conta uma coisa que aconteceu, como é?`,
    convite: 'Me conta como ele(a) conta',
    opcoes: ['Conta na ordem, do começo ao fim', 'Começa pelo que achou mais legal', 'Conta mais o que sentiu do que o que aconteceu', 'Não lembro de nada assim', 'Só conta se alguém perguntar', 'Mostra no celular em vez de contar'] },

  { tipo: 'pergunta',
    cena: 'Nessa idade eles reparam em coisa que o adulto deixou passar.',
    texto: `${NOME} já te apontou alguma coisa que você não tinha percebido?`,
    convite: 'Me conta o que era',
    opcoes: ['Um erro que alguém tinha cometido', 'Uma coisa fora do lugar em casa', 'Uma contradição no que alguém falou', 'Não lembro de nada assim', 'Um detalhe num vídeo, num jogo, numa imagem', 'Uma mudança em alguém: humor, jeito, aparência'] },
];

const GUARDADAS_A3: Item[] = [
  { tipo: 'pergunta',
    cena: 'Ele(a) estava fazendo alguma coisa em casa e não estava dando certo. O que me interessa não é se conseguiu no fim, é o que ele(a) fez no minuto seguinte.',
    texto: 'Da última vez que isso aconteceu, o que ele(a) fez em seguida?',
    convite: 'Me conta essa vez, do jeito que aconteceu',
    opcoes: ['Chamou alguém, mas pra olhar junto, não pra fazer por ele(a)', 'Desmanchou e começou de novo do zero', 'Ficou insistindo no mesmo ponto até sair', 'Não lembro de nada assim', 'Foi ver num vídeo como se faz e voltou pra tentar', 'Largou naquele dia e voltou depois, sozinho(a)'] },

  { tipo: 'pergunta',
    cena: 'Tem uma hora em que eles querem muito uma coisa e a gente não quer dar.',
    texto: `Da última vez que isso aconteceu com ${NOME}, como foi que ele(a) tentou?`,
    convite: 'Me conta essa vez',
    opcoes: ['Explicou por que aquilo era importante', 'Disse o que ia acontecer de ruim se não desse', 'Ofereceu alguma coisa em troca', 'Não lembro de nada assim', 'Insistiu até a gente cansar', 'Foi pedir pra outra pessoa da casa'] },

  { tipo: 'pergunta',
    cena: 'Tem dia que a gente chega em casa acabado e nem fala nada pra ninguém.',
    texto: `Já aconteceu de ${NOME} perceber isso antes de alguém falar?`,
    convite: 'Me conta como foi que ele(a) percebeu',
    opcoes: ['Perguntou o que tinha acontecido', 'Veio perto e ficou ali', 'Fez alguma coisa pra ajudar sem pedir', 'Não lembro de nada assim', 'Comentou depois, com outra pessoa', 'Nem reparou'] },

  { tipo: 'pergunta',
    cena: 'Já vi criança dessa idade organizar as coisas por um critério que só ela entende.',
    texto: `Já viu ${NOME} fazendo isso?`,
    convite: 'Me conta o que ele(a) organizou, e por qual critério',
    opcoes: ['As coisas do quarto, do material', 'Coleção, figurinha, carta, jogo', 'Não lembro de nada assim', 'Organiza no celular: pasta, lista, playlist', 'Organiza, mas só quando alguém pede', 'Não é muito disso'] },
];
void GUARDADAS_A3;

const CENAS_A4: Item[] = [
  // ============================================================
  // AS SETE ISCAS DO 4o ANO (20/08/2026)
  //
  // O QUE MUDA AOS 9 ANOS, da conversa com a professora:
  //
  //  - APARECE A PERGUNTA CAUSAL. "Ele perguntou como e' que o micróbio entra
  //    se esta fechado." Virou a isca ancora, e o pai reconhece na hora porque
  //    costuma ser a pergunta que ele nao soube responder.
  //
  //  - EXECUCAO SE SEPARA DE PROCESSAMENTO, e a cena e' a melhor de todo o
  //    material colhido: "ela sabia dividir mas nao sabia onde colocar os
  //    numeros. Tentou expressar por palavras mas nao havia construcao da
  //    explicacao. Quando a professora fez passo a passo, ai sim ela entende."
  //    Virou a isca de COMO ela explica o que ja sabe fazer.
  //
  //  - O ANO VIRA A CRIANCA: "chegam infantis e saem querendo ser adolescentes.
  //    Nao querem mais participar de evento porque acham coisa de crianca. Ja
  //    pensam em valor, se algo ta caro."
  //
  //    ATENCAO, correcao do Fundador em 20/08: a mesma professora disse que
  //    "nao gostam mais de pintar, desenho", e isso foi lido aqui como "nao
  //    gostam de desenhar". Sao coisas diferentes: o que morre nessa idade e' a
  //    ATIVIDADE ESCOLAR de pintar, nao o desenho. O Ayrton do 5o ano passa o
  //    dia desenhando e faz gibi. Desenhar voltou para as opcoes.
  //
  //  - E E' NO INTERESSE QUE ELES SE MOSTRAM. Aos 9 e 10 anos o mecanismo
  //    aparece dentro daquilo que a crianca escolhe nao largar, e por isso a
  //    isca de repeticao, que e' enquadramento de crianca pequena, deu lugar a
  //    do interesse: o que ela nao larga, e o que ela ja foi atras sozinha.
  //
  //  - E OS PAIS FALAM QUASE SO DE CELULAR.
  // ============================================================

  { tipo: 'pergunta',
    abre: 'Vou começar pela pergunta mais gostosa.',
    texto: `O que ${NOME} mais gosta de fazer quando chega em casa?`,
    convite: 'Me conta',
    ajuda: 'Pode ser a coisa mais boba do mundo. É justamente isso que eu quero saber.',
    opcoes: [] },

  { tipo: 'pergunta',
    abre: 'Agora uma que sempre rende história.',
    cena: 'Toda idade tem uma mania. Tem um aqui que fala com a mão levantada, gesticulando o tempo todo. Tem outro que não começa nada sem arrumar a mesa antes.',
    texto: `${NOME} tem uma dessas?`,
    convite: 'Me conta qual é',
    opcoes: ['Um jeito de mexer o corpo ou a mão quando fala', 'Precisa arrumar ou preparar antes de começar', 'Fica repetindo uma música, uma frase, um bordão', 'Não lembro de nada assim', 'Junta ou coleciona uma coisa específica', 'Tem uma ordem certa pra fazer as coisas'] },

  // A ISCA ANCORA DO 4o ANO. A pergunta que a crianca faz revela por onde ela
  // ataca o mundo, e o pai lembra dessa cena porque ela costuma ser a pergunta
  // que ele nao soube responder.
  { tipo: 'pergunta',
    cena: 'Nessa idade eles fazem umas perguntas que pegam a gente de surpresa. Teve um aqui que perguntou como é que o micróbio entra no pote se o pote está fechado.',
    texto: `${NOME} já te fez uma dessas?`,
    convite: 'Me conta qual foi',
    opcoes: ['Sobre como as coisas funcionam', 'Sobre pessoas, sobre por que alguém fez alguma coisa', 'Sobre dinheiro, sobre quanto custa', 'Não lembro de nada assim', 'Sobre a natureza, bicho, corpo', 'Sobre uma coisa que ele(a) viu num vídeo'] },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre ${NOME}.`, cta: 'Continuar' },

  { tipo: 'pergunta',
    cena: 'No celular quase toda criança assiste vídeo e joga. O que muda de uma pra outra é o assunto: tem quem só veja vídeo de bicho, tem quem fique vendo gente montando coisa, tem quem volte sempre no mesmo jogo.',
    texto: `Sobre o que é o vídeo ou o jogo que ${NOME} mais procura?`,
    convite: 'Se souber o nome, escreve. Se não souber, me conta o que ele(a) fala sobre aquilo',
    opcoes: ['Um jogo específico, e vai atrás de saber mais dele', 'Gente ensinando a fazer alguma coisa', 'Bicho, ciência, curiosidade, "você sabia"', 'Não sei dizer, ou ele(a) quase não usa', 'Humor, pegadinha, corte de gente falando', 'Desenho, história, mundo que ele(a) acompanha'] },

  { tipo: 'pergunta',
    abre: 'Agora a que eu mais aprendo.',
    cena: 'Tem uma coisa que a criança dessa idade não larga. Ela volta naquilo sozinha, sem ninguém mandar, e vai atrás de saber mais.',
    texto: `Tem alguma coisa assim com ${NOME}?`,
    convite: 'Me conta o que é. E se ele(a) já foi atrás disso por conta própria, me conta como',
    ajuda: 'Vale qualquer coisa: um assunto, um jogo, um bicho, uma música, um jeito de fazer.',
    opcoes: ['Um assunto que ele(a) fica pesquisando', 'Desenhar, escrever, criar alguma coisa', 'Um jogo, e vai atrás de aprender mais sobre ele', 'Não lembro de nada assim', 'Montar, construir, consertar', 'Um esporte, uma dança, um instrumento'] },

  { tipo: 'transicao',
    enorme: 'Quando eu faço essas perguntas, é porque entender cada um deles faz diferença.',
    linha: `Eu não quero que ${NOME} seja apenas mais um na multidão: quero que ele(a) brilhe do jeito dele(a), que não é igual ao de mais ninguém. E eu sei que temos um caminho longo pela frente, mas de pouquinho em pouquinho faremos essa árvore crescer juntos...`,
    cta: 'Continuar' },

  // Saber fazer e conseguir explicar sao coisas diferentes, e aos 9 anos elas se
  // separam de vez. E' a cena da fracao, trazida para dentro de casa.
  { tipo: 'pergunta',
    cena: 'Tem criança que sabe fazer uma coisa e trava na hora de explicar como fez.',
    texto: `Quando ${NOME} te mostra uma coisa que aprendeu, como é que ele(a) explica?`,
    convite: 'Me conta como foi da última vez',
    opcoes: ['Explica com palavras, na ordem', 'Faz na frente da gente em vez de explicar', 'Desenha ou escreve pra mostrar', 'Não lembro de nada assim', 'Sabe fazer, mas trava na hora de explicar', 'Explica pulando partes, na ordem que der'] },

  { tipo: 'pergunta',
    cena: 'Nessa idade eles reparam em coisa que o adulto deixou passar. Aqui eles percebem na hora quando eu escrevo uma palavra errada no slide.',
    texto: `${NOME} já te apontou alguma coisa que você não tinha percebido?`,
    convite: 'Me conta o que era',
    opcoes: ['Um erro que alguém tinha cometido', 'Uma coisa fora do lugar ou diferente', 'Uma contradição no que alguém falou', 'Não lembro de nada assim', 'Um detalhe num vídeo, num jogo, numa imagem', 'Uma mudança em alguém: humor, jeito, aparência'] },
];

const GUARDADAS_A4: Item[] = [
  { tipo: 'pergunta',
    cena: 'Tem uma hora em que eles querem muito uma coisa e a gente não quer dar.',
    texto: `Da última vez que isso aconteceu com ${NOME}, como foi que ele(a) tentou?`,
    convite: 'Me conta essa vez',
    opcoes: ['Explicou por que aquilo era importante', 'Disse o que ia acontecer de ruim se não desse', 'Ofereceu alguma coisa em troca', 'Não lembro de nada assim', 'Insistiu até a gente cansar', 'Foi pedir pra outra pessoa da casa'] },

  { tipo: 'pergunta',
    cena: 'Ele(a) estava fazendo alguma coisa em casa e não estava dando certo. O que me interessa não é se conseguiu no fim, é o que ele(a) fez no minuto seguinte.',
    texto: 'Da última vez que isso aconteceu, o que ele(a) fez em seguida?',
    convite: 'Me conta essa vez, do jeito que aconteceu',
    opcoes: ['Chamou alguém, mas pra olhar junto, não pra fazer por ele(a)', 'Desmanchou e começou de novo do zero', 'Ficou insistindo no mesmo ponto até sair', 'Não lembro de nada assim', 'Foi ver num vídeo como se faz e voltou pra tentar', 'Largou naquele dia e voltou depois, sozinho(a)'] },

  { tipo: 'pergunta',
    cena: 'Tem dia que a gente chega em casa acabado e nem fala nada pra ninguém.',
    texto: `Já aconteceu de ${NOME} perceber isso antes de alguém falar?`,
    convite: 'Me conta como foi que ele(a) percebeu',
    opcoes: ['Perguntou o que tinha acontecido', 'Veio perto e ficou ali', 'Fez alguma coisa pra ajudar sem pedir', 'Não lembro de nada assim', 'Comentou depois, com outra pessoa', 'Nem reparou'] },

  { tipo: 'pergunta',
    cena: 'Nessa idade eles começam a falar de si mesmos. Tem um aqui que disse "isso é comigo" e tem outro que disse "isso eu não sei fazer".',
    texto: `${NOME} já falou alguma coisa assim em casa?`,
    convite: 'Me conta o que ele(a) disse, com as palavras dele(a)',
    ajuda: 'Pode ser das duas coisas: uma que ele(a) acha que é dele(a), ou uma que ele(a) acha que não é.',
    opcoes: ['Disse que é bom(boa) em alguma coisa', 'Disse que não consegue fazer alguma coisa', 'Se comparou com alguém', 'Não lembro de nada assim', 'Falou do que quer ser quando crescer', 'Não costuma falar de si'] },
];
void GUARDADAS_A4;

// ============================================================
// A ISCA DE "CASA CONTRA ESCOLA" FOI REMOVIDA EM 20/08/2026.
//
// Ela existia nas cinco faixas e perguntava se a crianca era a mesma nos dois
// lugares. Diagnostico do Fundador: do jeito que estava escrita, ela dirigia o
// pai a falar de COMPORTAMENTO. As opcoes eram quieto, agitado, fala muito,
// manda, mais responsavel, chora mais. Nada disso e' mecanismo: e' temperamento,
// que e' estavel, e a IA leria como padrao longitudinal da crianca.
//
// E' o mesmo erro que a auditoria de 14/08 encontrou no Grupo IV, quando 8 dos
// 14 itens liam rota, estilo ou temperamento em vez de filtro.
//
// No lugar dela entrou uma setima isca de MECANISMO em cada faixa, e a
// divergencia entre casa e escola deixa de ser perguntada: ela passa a sair do
// CRUZAMENTO entre este questionario e o do professor. E' mais honesto, porque
// o pai nao sabe o que acontece na escola, e pedir que ele comparasse era pedir
// o que ele nao tem.
// ============================================================

const CENAS_POR_FAIXA: Record<Faixa, Item[]> = {
  m2: CENAS_M2, m3: CENAS_M3, g4: CENAS_G4, gv: CENAS_GV,
  a1: CENAS_A1, a2: CENAS_A2, a3: CENAS_A3, a4: CENAS_A4, a5: CENAS_A5,
};

const FLUXO_BRUTO: Item[] = [...ENTRADA, ...CENAS_POR_FAIXA[FAIXA]];

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

  // DEPOIS DE FINALIZAR NAO SE VOLTA PARA AS PERGUNTAS.
  //
  // Ate' agora o "voltar" da tela final devolvia o pai para a ultima pergunta, e
  // ele podia mexer e finalizar de novo. Sao dois estragos de uma vez: a escola
  // fica sem saber qual versao vale, e o pai perde a sensacao de que aquilo foi
  // entregue. Agora finalizar FECHA, e quem volta cai numa tela que diz isso e
  // abre espaco para o que ficou faltando, que costuma ser o melhor pedaco.
  // ------------------------------------------------------------- A PORTA
  const [termo, setTermo] = useState('');
  const [achados, setAchados] = useState<Achado[]>([]);
  const [buscandoNome, setBuscandoNome] = useState(false);
  const [procurou, setProcurou] = useState(false);
  const [escolhido, setEscolhido] = useState<Achado | null>(null);
  const [dataTexto, setDataTexto] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erroPorta, setErroPorta] = useState<string | null>(null);

  // Uma busca por pausa de digitacao, e nao uma por tecla. Sem o contador, as
  // respostas chegam fora de ordem: a lista de "Ana" chega depois da lista de
  // "Ana Julia" e sobrescreve a certa.
  const pedido = useRef(0);
  useEffect(() => {
    if (!NA_PORTA || escolhido) return;
    const t = termo.trim();
    if (t.length < MINIMO_BUSCA) { setAchados([]); setProcurou(false); return; }

    setBuscandoNome(true);
    const meu = ++pedido.current;
    const relogio = setTimeout(async () => {
      const { data, error } = await supabase.rpc('procurar_criancas' as never, { p_termo: t } as never);
      if (meu !== pedido.current) return;
      setAchados(error ? [] : ((data ?? []) as unknown as Achado[]));
      setProcurou(true);
      setBuscandoNome(false);
    }, 180);
    return () => clearTimeout(relogio);
  }, [termo, escolhido]);

  // Retoma de onde a porta parou. A entrada faz recarga de verdade, porque as
  // perguntas sao montadas com o nome da crianca no carregamento do modulo;
  // sem esta marca, o pai voltaria para o "Ola" depois de ja ter se apresentado.
  useEffect(() => {
    if (!CTX) return;
    const guardado = sessionStorage.getItem('arboria:familia');
    if (!guardado) return;
    try {
      const d = JSON.parse(guardado);
      if (typeof d.retomar === 'number') {
        setI(d.retomar);
        delete d.retomar;
        sessionStorage.setItem('arboria:familia', JSON.stringify(d));
      }
    } catch { /* sem retomada, comeca do inicio */ }
  }, []);

  // Quando o pai tenta avancar sem ter escrito nem marcado nada. Nao e' erro:
  // e' um lembrete de que existe uma saida ali do lado.
  const [avisoVazio, setAvisoVazio] = useState(false);

  const [depois, setDepois] = useState(false);
  const [acrescimo, setAcrescimo] = useState('');

  useEffect(() => {
    try {
      if (localStorage.getItem(CHAVE_FIM)) setDepois(true);
    } catch {
      // Aba anonima ou memoria cheia: sem a marca, o pai reentra pelo comeco.
    }
  }, []);

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

  // Com o fecho na tela, nenhum outro bloco pode aparecer: nem pergunta, nem
  // transicao, nem a celebracao do fim. Zerar os dois aqui e' o que garante
  // isso num lugar so', em vez de pendurar "&& !depois" em cada bloco e
  // esquecer de um.
  const noFim = i >= FLUXO.length && !depois;
  const item = depois || i >= FLUXO.length ? null : FLUXO[i];
  const ehPergunta = item?.tipo === 'pergunta';
  const num = ehPergunta ? numeroDaPergunta(i) : 0;
  const marcadasAqui = marcadas[i] ?? [];

  const alterna = (op: string) => {
    setAvisoVazio(false);
    setMarcadas((m) => {
      const atual = m[i] ?? [];
      return { ...m, [i]: atual.includes(op) ? atual.filter((x) => x !== op) : [...atual, op] };
    });
  };

  // ---------------------------------------------------------------- GRAVAR
  // Uma chamada por pergunta respondida, no momento em que o pai avanca, e nao
  // um envio unico no fim. E' a mesma licao que a Arena cobrou caro em 20/08:
  // no celular o pai e' interrompido, e o que so grava no fim nao grava nunca.
  //
  // Falha de rede aqui nao interrompe nada e nao avisa. O rascunho local ja
  // guardou o texto, o pai segue respondendo, e perder uma resposta e' menos
  // grave do que parar o questionario inteiro numa tela de erro que ele nao
  // sabe resolver.
  const gravaResposta = (indice: number) => {
    if (!MODO_REAL || !CTX) return;
    const it = FLUXO[indice];
    if (!it || it.tipo !== 'pergunta') return;

    const marcadasAli = (marcadas[indice] ?? []).filter((m) => m !== NAO_SEI);
    const texto = (textos[indice] ?? '').trim();
    if (!texto && marcadasAli.length === 0) return;

    void supabase.rpc('salvar_resposta_pais' as never, {
      p_envio_id: CTX.envio,
      p_ordem: numeroDaPergunta(indice),
      // O texto da pergunta vai junto com a resposta. As perguntas moram no
      // codigo e mudam; sem guardar o que foi perguntado, a resposta de hoje
      // fica pendurada numa pergunta que amanha nao existe mais.
      p_pergunta: it.texto,
      p_cena: it.cena ?? null,
      p_texto: texto || null,
      p_marcadas: marcadasAli,
    } as never).then(({ error }) => {
      if (error) console.error('[questionario pais] nao gravou a pergunta', indice, error);
    });
  };

  // Confirma a crianca e entra. Do lado do banco a data e' a chave: achar o
  // nome na lista nao abriu nada ainda, e confirmar_crianca so' responde se a
  // data bater com a que a escola tem.
  async function confirmarCrianca() {
    const iso = dataParaISO(dataTexto);
    if (!escolhido || !iso || entrando) return;
    setEntrando(true);
    setErroPorta(null);

    // UMA chamada, e nao duas. Antes o app confirmava a crianca e depois
    // inseria o envio lendo o id de volta, e a leitura de volta batia na RLS:
    // o pai pode ESCREVER nesta tabela e nunca ler, que e' a assimetria que
    // impede uma familia de puxar o que outra escreveu. A porta nao abria.
    //
    // A VERSAO DO TERMO VAI JUNTO. A tela do termo agora vem ANTES da porta (o
    // Arboria se apresenta primeiro e so' entao pergunta de quem vamos falar),
    // entao quando o pai passa por ela ainda nao existe envio para marcar. Como
    // aquela tela e' passo obrigatorio, quem chega ate' aqui ja leu, e o aceite
    // nasce junto com o envio.
    const { data, error } = await supabase.rpc('abrir_envio_pais' as never, {
      p_aluno_id: escolhido.aluno_id, p_nascimento: iso, p_versao_termo: VERSAO_TERMO,
    } as never);
    const c = ((data ?? []) as unknown as (Confirmada & { envio_id: string })[])[0];

    if (error || !c?.envio_id) {
      // A mensagem aponta para a data: o nome ele acabou de escolher na lista.
      setErroPorta('Essa data não confere com a que a escola tem. Confira e tente de novo.');
      setEntrando(false);
      return;
    }

    sessionStorage.setItem('arboria:familia', JSON.stringify({
      envio: c.envio_id,
      aluno: c.aluno_id, faixa: c.faixa,
      nome: c.primeiro_nome, nomeCompleto: c.nome_completo,
      turma: c.turma, serie: c.serie, sexo: c.sexo,
      retomar: FLUXO.findIndex((x) => x.tipo === 'crianca') + PASSO_CRIANCA_MAIS_UM,
    }));

    // Recarga de verdade: o questionario monta as perguntas com o nome da
    // crianca no carregamento do modulo, entao ele precisa nascer de novo.
    window.location.assign('/familia');
  }

  // RECOMECAR, PELA PORTA.
  //
  // Duas saidas com a mesma mecanica e intencoes diferentes: outra PESSOA
  // falando da mesma crianca, ou a mesma pessoa falando de OUTRA crianca. Nos
  // dois casos o envio anterior fica fechado e intacto, e um novo nasce quando
  // a pessoa passar pela porta de novo.
  //
  // Recomecar nunca sobrescreve o que ja veio. Duas vozes sobre a mesma crianca
  // sao dois olhares, e a divergencia entre elas e' dado, nao ruido: a mae e a
  // avo estao em casa em horas diferentes e reparam em coisas diferentes.
  const recomecar = (mesmaCrianca: boolean) => {
    try {
      // O rascunho e a marca de "ja finalizei" pertencem AQUELA crianca: a
      // chave leva o id dela. Somem quando quem vai falar de novo e' outra
      // pessoa sobre ela. Se o assunto e' outra crianca, a marca da primeira
      // fica onde esta, senao o pai voltaria a poder reabrir o que ja fechou.
      if (mesmaCrianca) {
        localStorage.removeItem(CHAVE_RASCUNHO);
        localStorage.removeItem(CHAVE_FIM);
      }
      sessionStorage.removeItem('arboria:familia');
    } catch { /* sem memoria, a recarga resolve do mesmo jeito */ }

    if (MODO_REAL) { window.location.assign('/familia'); return; }

    // No prototipo nao existe porta para voltar: reinicia na propria tela.
    setI(0); setMarcadas({}); setTextos({}); setAbertos({});
    setEscolhas({}); setEscolhaTexto({}); setLinkCopiado(false);
    setRestaurado(false); setDepois(false); setAcrescimo('');
  };

  const avanca = () => { gravaResposta(i); setAvisoVazio(false); setRestaurado(false); setI((v) => v + 1); };

  // Finalizar deixa a marca no aparelho. E' o que faz o pai que reabre o link
  // amanha cair no fecho, e nao numa tela de perguntas que ele ja respondeu.
  const finaliza = () => {
    gravaResposta(i);
    try { localStorage.setItem(CHAVE_FIM, new Date().toISOString()); } catch { /* sem memoria, segue */ }

    // Concluido fecha o envio: as politicas do banco so' aceitam escrita
    // enquanto ele esta aberto, entao carimbar aqui e' o que impede alguem de
    // reescrever a resposta depois pelo mesmo link.
    if (MODO_REAL && CTX) {
      void tabela('questionario_pais_envio')
        .update({
          concluido_em: new Date().toISOString(),
          // 'convive' nunca existiu: a unica chave de respondente e 'responde'.
          // E quem fica mais tempo e escolhido na tela do FIM, depois desta
          // linha rodar, entao ele tem funcao propria (registrar_quem_fica).
          respondente: escolhas['responde'] ?? null,
        } as never)
        .eq('id', CTX.envio)
        .then(({ error }) => { if (error) console.error('[questionario pais] nao fechou o envio', error); });
    }
    avanca();
  };
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
    <div ref={palco} className="flex flex-col relative" style={{
      // DOIS ROLADORES BRIGANDO PELO MESMO DEDO.
      //
      // "overflow-x: hidden" faz o navegador tratar o eixo vertical como "auto",
      // entao esta div virava um rolador por conta propria DENTRO da pagina que
      // ja rolava. No celular o toque cai ora num ora noutro: as vezes nao
      // desce, as vezes nao sobe. "clip" corta o horizontal sem criar rolador
      // nenhum, e ai sobra um so'.
      //
      // E "100vh" no celular mede a tela contando a faixa da barra do navegador
      // que se recolhe, entao a pagina fica sempre uns dedos mais alta do que o
      // que se ve e treme a cada rolagem. "100dvh" mede a altura que existe de
      // verdade naquele instante.
      minHeight: '100dvh',
      overflowX: 'clip',
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
          {i > 0 && !depois ? (
            <button
              onClick={() => {
                // Na tela final o voltar nao desfaz o envio: leva ao fecho.
                if (noFim) setDepois(true); else setI((v) => v - 1);
              }}
              className="p-1 -ml-1" style={{ color: 'rgba(255,255,255,.88)' }} aria-label="Voltar"><ChevronLeft size={19} /></button>
          ) : <span />}
          {/* Sem contador e sem barra: o pai nao deve medir quanto falta.
              Quem marca o caminho sao as pausas do Arboria, que dizem onde
              estamos com afeto em vez de com numero. */}
          <span />
        </div>

        {/* ---------- JA RESPONDEU ---------- */}
        {depois && (
          <>
            <p style={{ fontFamily: T.serif, fontSize: 38, lineHeight: 1.1, letterSpacing: '-.024em', margin: '0 0 22px' }}>
              Você já respondeu.
            </p>
            <p style={{ ...FALA, marginBottom: 6 }}>
              O que você escreveu já chegou aqui, e não muda mais.
            </p>
            <p style={{ ...FALA, marginBottom: 24 }}>
              Ficou faltando alguma coisa que você lembrou depois? Pode contar aqui.
            </p>

            <textarea
              value={acrescimo}
              onChange={(e) => setAcrescimo(e.target.value)}
              rows={5}
              placeholder="escreva aqui"
              className="campo-relato w-full outline-none resize-y"
              style={{
                padding: '15px 17px', borderRadius: 16,
                background: 'rgba(255,255,255,.13)',
                border: '2px solid rgba(255,255,255,.5)',
                fontFamily: T.serif, fontSize: 23, lineHeight: 1.38, color: '#fff',
              }}
            />

            {/* O BOTAO GRUDA NO RODAPE.
                No celular, escrever abre o teclado, o teclado come metade da
                tela e o botao vai para fora dela. O pai digitava, nao via mais
                para onde ir, e concluia que nao tinha como mandar. Grudado no
                rodape ele fica a vista o tempo todo em que se escreve, que e'
                exatamente quando ele precisa estar. */}
            <div className="sticky flex justify-end" style={{ bottom: 0, paddingTop: 20, paddingBottom: 12 }}>
              <Cta
                texto="Mandar isso também"
                forte
                onClick={() => {
                  const texto = acrescimo.trim();
                  if (!texto) return;
                  if (MODO_REAL && CTX) {
                    void supabase.rpc('acrescentar_depois' as never, {
                      p_envio_id: CTX.envio, p_texto: texto,
                    } as never).then(({ error }) => {
                      if (error) console.error('[questionario pais] nao gravou o acrescimo', error);
                    });
                  }
                  // Limpa o campo ao voltar: se o pai lembrar de outra coisa
                  // amanha, ele encontra a folha em branco e nao o texto que ja
                  // mandou, que faria parecer que nao foi.
                  setAcrescimo('');
                  setDepois(false);
                  setI(FLUXO.length);
                }}
              />
            </div>

            {/* Quem volta aqui as vezes nao veio acrescentar nada: veio porque
                tem outro filho na escola, ou porque a avo pediu o celular. */}
            <p className="text-[13px] mt-9" style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.55 }}>
              Se outra pessoa da casa quiser responder sobre {NOME}, ou se você
              tiver outra criança aqui na escola, comece de novo por aqui.
            </p>
            <Rodape>
              <Cta texto="Responder sobre outra criança" suave onClick={() => recomecar(false)} />
              <Cta texto="Passar para outra pessoa" suave onClick={() => recomecar(true)} />
            </Rodape>
          </>
        )}

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
                      onClick={() => {
                        setEscolhas((e) => ({ ...e, tempo: quem }));
                        setLinkCopiado(false);
                        // Etiqueta de olhar, e nao resposta: diz de qual ponto
                        // de vista veio o que ja foi contado. Corrige mais vies
                        // do que reescrever pergunta nenhuma.
                        if (MODO_REAL && CTX) {
                          void supabase.rpc('registrar_quem_fica' as never, {
                            p_envio_id: CTX.envio, p_quem: quem,
                          } as never);
                        }
                      }}
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

            {/* Aqui havia "se quiser mudar alguma resposta, e' so' entrar de
                novo pelo mesmo link". Caiu junto com o fecho: entrar de novo
                agora leva ao acrescimo, e prometer edicao seria mentir na
                ultima tela que o pai le'. */}
            {/* As duas saidas ficam na ultima tela, e nao no comeco: e' aqui
                que o pai ja sabe o que sao as perguntas e consegue pensar em
                quem mais teria o que contar, ou lembrar do outro filho. */}
            <p className="fim-5 text-[13px] mt-8" style={{ color: 'rgba(255,255,255,.74)', lineHeight: 1.55 }}>
              Se outra pessoa da casa quiser responder sobre {NOME}, ou se você
              tiver outra criança aqui na escola, dá pra começar de novo por aqui.
              Nada do que você já mandou se perde.
            </p>
            <Rodape>
              <span className="fim-5">
                <Cta texto="Responder sobre outra criança" suave onClick={() => recomecar(false)} />
              </span>
              <span className="fim-5">
                <Cta texto="Passar para outra pessoa" suave onClick={() => recomecar(true)} />
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
        {item?.tipo === 'crianca' && NA_PORTA && (() => {
          const iso = dataParaISO(dataTexto);
          const rotulo: React.CSSProperties = { fontSize: 13, color: 'rgba(255,255,255,.76)' };
          const campo: React.CSSProperties = {
            borderBottom: '1px solid rgba(255,255,255,.5)', padding: '12px 0',
            fontFamily: T.serif, fontSize: 24, color: '#fff', background: 'transparent',
          };
          return (
          <>
            <p style={{ fontFamily: T.serif, fontSize: 23, lineHeight: 1.55, fontWeight: 600, margin: '0 0 26px' }}>
              Só para eu ter certeza de quem a gente está falando.
            </p>

            {escolhido ? (
              <>
                <div style={{ borderLeft: '2px solid rgba(255,255,255,.7)', padding: '4px 0 4px 16px', marginBottom: 8 }}>
                  <p style={{ fontFamily: T.serif, fontSize: 27, fontWeight: 700, margin: '0 0 2px' }}>{escolhido.nome_completo}</p>
                  <p className="text-[14px] m-0" style={{ color: 'rgba(255,255,255,.78)' }}>{escolhido.turma}</p>
                </div>
                <button
                  onClick={() => { setEscolhido(null); setDataTexto(''); setErroPorta(null); }}
                  className="text-[13px]"
                  style={{ color: 'rgba(255,255,255,.8)', textDecoration: 'underline', textUnderlineOffset: 4, marginBottom: 30 }}
                >
                  Mudar o nome
                </button>

                <p style={rotulo}>{flex('Data de nascimento dele(a)')}</p>
                {/* Digitada, e nao seletor do aparelho: o pai sabe a data de cor
                    e digita mais rapido do que rola tres rodinhas de ano. O
                    teclado que abre e' o numerico, e a mascara poe as barras. */}
                <input
                  inputMode="numeric"
                  value={dataTexto}
                  onChange={(e) => { setDataTexto(mascaraData(e.target.value)); setErroPorta(null); }}
                  placeholder="dia / mês / ano"
                  className="w-full outline-none"
                  style={{ ...campo, letterSpacing: '.08em' }}
                />

                {erroPorta && (
                  <p style={{
                    marginTop: 22, padding: '14px 16px', borderRadius: 14,
                    background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.4)',
                    fontFamily: T.serif, fontSize: 19, lineHeight: 1.4,
                  }}>{erroPorta}</p>
                )}

                <Rodape>
                  <span style={{ opacity: iso && !entrando ? 1 : 0.35, pointerEvents: iso && !entrando ? 'auto' : 'none' }}>
                    {/* O botao fala no genero da crianca escolhida, e nao no do
                      prototipo. Sem sexo cadastrado ele fica no parenteses:
                      feio, e melhor do que chutar o genero da filha de alguem. */}
                  <Cta
                    texto={entrando ? 'Um instante'
                      : escolhido.sexo === 'F' ? 'É ela'
                      : escolhido.sexo === 'M' ? 'É ele'
                      : item.cta}
                    onClick={() => void confirmarCrianca()} />
                  </span>
                </Rodape>
              </>
            ) : (
              <>
                <p style={rotulo}>Nome da criança</p>
                <input
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="comece a escrever o nome"
                  autoComplete="off" autoCorrect="off" autoCapitalize="words"
                  className="w-full outline-none"
                  style={campo}
                />

                <div style={{ marginTop: 24, minHeight: 130 }}>
                  {termo.trim().length > 0 && termo.trim().length < MINIMO_BUSCA && (
                    <p className="text-[14px]" style={{ color: 'rgba(255,255,255,.7)' }}>
                      Escreva pelo menos {MINIMO_BUSCA} letras.
                    </p>
                  )}
                  {buscandoNome && termo.trim().length >= MINIMO_BUSCA && (
                    <p className="text-[14px]" style={{ color: 'rgba(255,255,255,.7)' }}>Procurando...</p>
                  )}
                  {!buscandoNome && procurou && achados.length === 0 && (
                    <p style={{ fontFamily: T.serif, fontSize: 19, lineHeight: 1.45, color: 'rgba(255,255,255,.9)' }}>
                      Não achei ninguém com esse nome. Tente escrever de outro jeito,
                      ou só o primeiro nome.
                    </p>
                  )}
                  {!buscandoNome && achados.map((c) => (
                    <button
                      key={c.aluno_id}
                      onClick={() => { setEscolhido(c); setErroPorta(null); }}
                      className="w-full text-left"
                      style={{
                        borderTop: '1px solid rgba(255,255,255,.24)',
                        borderBottom: '1px solid rgba(255,255,255,.24)',
                        marginTop: -1, padding: '15px 0',
                      }}
                    >
                      <p style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, margin: '0 0 2px' }}>{c.nome_completo}</p>
                      <p className="text-[13px] m-0" style={{ color: 'rgba(255,255,255,.76)' }}>{c.turma}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
          );
        })()}

        {/* Ja identificada: a tela vira confirmacao. No prototipo porque a
            crianca e' inventada; de verdade porque a porta ja perguntou nome e
            data, e quem volta aqui esta so' conferindo. */}
        {item?.tipo === 'crianca' && !NA_PORTA && (
          <>
            <p style={{ fontFamily: T.serif, fontSize: 23, lineHeight: 1.55, fontWeight: 600, margin: '0 0 24px' }}>Só para eu ter certeza de quem a gente está falando.</p>
            <div style={{ borderLeft: '2px solid rgba(255,255,255,.7)', padding: '4px 0 4px 16px', margin: '16px 0 4px' }}>
              <p style={{ fontFamily: T.serif, fontSize: 29, fontWeight: 700, margin: '0 0 1px' }}>{CTX?.nomeCompleto || NOME}</p>
              <p className="text-[14px] m-0" style={{ color: 'rgba(255,255,255,.78)' }}>{TURMA}</p>
            </div>
            {/* A data so' aparece no prototipo, onde ela e' enfeite e nao confere
                nada. De verdade ela ja foi dada na porta, e pedir de novo na
                tela seguinte faria o pai achar que a primeira nao valeu. */}
            {!MODO_REAL && (
              <>
                <p className="text-[13px] mt-6" style={{ color: 'rgba(255,255,255,.74)' }}>{flex('Data de nascimento dele(a)')}</p>
                <input inputMode="numeric" placeholder="__ / __ / ____" className="w-full bg-transparent outline-none"
                  style={{ borderBottom: '1px solid rgba(255,255,255,.5)', padding: '12px 0', fontFamily: T.serif, fontSize: 22, color: '#fff', letterSpacing: '.1em', marginTop: 4 }} />
              </>
            )}
            {/* Quem volta a esta tela as vezes voltou porque errou a crianca, ou
                porque quer responder pelo outro filho. Sem esta saida ele teria
                que fechar o navegador e limpar a memoria para trocar. */}
            {MODO_REAL && (
              <button
                onClick={() => recomecar(false)}
                className="text-[13px] block"
                style={{ color: 'rgba(255,255,255,.8)', textDecoration: 'underline', textUnderlineOffset: 4, marginTop: 18 }}
              >
                Mudar o nome
              </button>
            )}
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
          // Escrever OU marcar. Nao existe terceira via, nem para a pergunta de
          // abertura, que nao tem lista: ela tambem so' passa com texto ou com o
          // "Nao sei dizer". Antes, "opcoes.length === 0" abria uma porta que
          // deixava atravessar a primeira pergunta em branco.
          //
          // Quem nao quer responder tem saida, e ela e' explicita: "Nao sei
          // dizer" ao lado. E' diferente de passar batido, e a diferenca importa
          // na leitura: o pai que diz que nao sabe esta contando uma coisa; o
          // que aperta sem ver nao esta contando nada.
          const podeAvancar = escreveu || marcadasAqui.length > 0;
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
                onChange={(e) => { setAvisoVazio(false); setTextos((t) => ({ ...t, [i]: e.target.value })); }}
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

            {/* O ATALHO DE QUEM JA RESPONDEU.
                O campo vem antes da lista, entao quem escreve termina a resposta
                no meio da tela, com o botao la' embaixo depois de seis opcoes que
                ele nem queria ver. No celular aquilo parece fim de tela, e o pai
                sai achando que acabou. Havendo texto, o proximo passo aparece
                ali mesmo, e a linha de baixo avisa que a lista continua existindo
                para quem quiser.

                SO' QUANDO HA LISTA. O atalho existe porque as opcoes separam o
                campo do botao. Na pergunta de abertura, que nao tem lista, o
                botao de baixo ja esta logo ali, e o atalho virava um segundo
                "Proxima" a dois dedos do primeiro. */}
            {escreveu && opcoes.length > 0 && (
              <div className="revela" style={{ margin: '-10px 0 26px' }}>
                <button
                  onClick={() => { if (i === ultimaPergunta) finaliza(); else avanca(); }}
                  className="inline-flex items-center gap-2.5 font-bold uppercase"
                  style={{
                    fontSize: 15, letterSpacing: '.14em', padding: '13px 24px', borderRadius: 999,
                    border: '2px solid #fff',
                    background: i === ultimaPergunta ? '#fff' : 'transparent',
                    color: i === ultimaPergunta ? '#0E3F66' : '#fff',
                  }}
                >
                  {i === ultimaPergunta ? 'Finalizar' : 'Próxima'}
                  {i === ultimaPergunta
                    ? <Check size={16} strokeWidth={3} />
                    : <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>→</span>}
                </button>
                <p className="flex items-center gap-1.5 text-[13px]" style={{ color: 'rgba(255,255,255,.74)', margin: '13px 0 0' }}>
                  <ChevronDown size={15} /> ou desça e marque o que mais parece
                </p>
              </div>
            )}

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


            {/* O botao vem LOGO DEPOIS da ultima opcao, e nao grudado no fim da
                tela. Fixo ele resolvia a dobra mas cobria a ultima opcao, e o
                pai que rolava ate' o fim da lista batia numa barra em vez do
                proximo passo. Aqui a rolagem termina exatamente no botao. */}
            <div style={{ paddingTop: 26, paddingBottom: 34 }}>
              <div className="mx-auto flex items-center justify-between gap-4" style={{ maxWidth: 560 }}>
                <button
                  onClick={() => { setMarcadas((m) => ({ ...m, [i]: [NAO_SEI] })); avanca(); }}
                  className="text-[15px]"
                  style={{ color: 'rgba(255,255,255,.82)', textDecoration: 'underline', textUnderlineOffset: 4 }}
                >
                  Não sei dizer
                </button>
                <button
                  onClick={() => {
                    if (!podeAvancar) { setAvisoVazio(true); return; }
                    if (i === ultimaPergunta) finaliza(); else avanca();
                  }}
                  className="inline-flex items-center gap-2.5 font-bold uppercase"
                  style={{
                    fontSize: 15, letterSpacing: '.14em', padding: '13px 24px', borderRadius: 999,
                    border: '2px solid #fff',
                    background: i === ultimaPergunta ? '#fff' : 'transparent',
                    color: i === ultimaPergunta ? '#0E3F66' : '#fff',
                    opacity: podeAvancar ? 1 : 0.5,
                  }}
                >
                  {i === ultimaPergunta ? 'Finalizar' : 'Próxima'}
                  {i === ultimaPergunta ? <Check size={16} strokeWidth={3} /> : <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>→</span>}
                </button>
              </div>

              {avisoVazio && (
                <p className="mx-auto" style={{
                  maxWidth: 560, marginTop: 16, padding: '13px 16px', borderRadius: 14,
                  background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.42)',
                  fontFamily: T.serif, fontSize: 18, lineHeight: 1.4, color: '#fff',
                }}>
                  Escreva alguma coisa, ou toque em <b>Não sei dizer</b> para continuar.
                </p>
              )}
            </div>
          </>
          );
        })()}
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
