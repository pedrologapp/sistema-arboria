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
const NOME = 'Arthur';
const TURMA = 'Maternal 2 B';
const NAO_SEI = '__nao_sei__';
const OUTRO_CUIDADOR = 'Outra pessoa que cuida dele(a)';
// ------------------------------------------------------------------ FLEXAO
// O app sabe de quem se trata, entao o texto inteiro fala no genero da crianca
// em vez de empurrar "(a)" para o pai ler. As frases sao escritas com a marca
// "ele(a)" e a flexao acontece aqui: no masculino o parenteses cai, no feminino
// a ultima vogal vira "a". Quem escrever pergunta nova so precisa usar a marca.
// No produto o sexo vem do cadastro da crianca; aqui o ?sexo=F testa o feminino.
const SEXO: 'M' | 'F' =
  new URLSearchParams(window.location.search).get('sexo')?.toUpperCase() === 'F' ? 'F' : 'M';
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
  | { tipo: 'fala'; revelar?: boolean; linhas: string[]; enorme?: string; cta: string; ctaSuave?: string; rodape?: string }
  | { tipo: 'crianca'; cta: string }
  | { tipo: 'respondente'; chave: string; titulo: string; sub?: string; opcoes: string[]; livre?: string; cta: string }
  | { tipo: 'transicao'; enorme: string; linha?: string; cta: string }
  | { tipo: 'pergunta'; cena?: string; texto: string; instr?: string; opcoes: string[]; outra?: string; convite?: string };

const FLUXO_BRUTO: Item[] = [
  // ---------------------------------------------------------------- entrada
  // A primeira tela precisa dizer QUEM esta falando e DE ONDE vem, senao o pai
  // recebe um desconhecido pedindo intimidade sobre o filho. Quem da confianca
  // aqui nao e' o Arboria: e' a escola. As linhas entram uma depois da outra,
  // como alguem falando, em vez de um bloco de texto de uma vez.
  { tipo: 'fala', revelar: true, enorme: 'Olá!',
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
      'E não tem resposta certa aqui.',
      'Eu não quero saber o que ele(a) já aprendeu: quero saber o jeito dele(a).',
      'E pode contar as coisas esquisitas também. Muita vez é ali que está o mais interessante.',
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

  { tipo: 'crianca', cta: 'É ele' },

  { tipo: 'respondente', chave: 'responde',
    titulo: 'E quem está me contando hoje?',
    sub: 'Pergunto porque cada um vê uma parte diferente do dia dele(a).',
    opcoes: ['A mãe', 'O pai', 'Os dois juntos', 'A avó ou o avô', OUTRO_CUIDADOR],
    livre: OUTRO_CUIDADOR, cta: 'Continuar' },

  // Cerca de uma em cada seis respostas seria dada sobre horas que quem esta
  // respondendo nao viu, e dada com confianca. Esta tela corrige mais vies do
  // que qualquer reescrita de item.
  { tipo: 'respondente', chave: 'tempo',
    titulo: `E durante a semana, quem fica mais tempo com ${NOME}?`,
    sub: 'Pergunto porque quem passa mais horas junto vê coisas que os outros não veem.',
    opcoes: ['Eu mesmo', 'A mãe', 'O pai', 'A avó ou o avô', 'Uma babá ou outra pessoa que cuida', 'Fica dividido, ninguém mais que os outros'],
    cta: 'Continuar' },

  { tipo: 'transicao',
    enorme: `Ah, ${NOME}!`,
    linha: `Estou animado para ${CONHECE_LO} melhor. Prontos para falarem de quem vocês mais amam?`,
    cta: 'Prontos' },

  // ============================================================
  // AS OITO CENAS (v2, 13/08/2026)
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
    opcoes: ['Fez de novo do mesmo jeito', 'Virou a coisa e tentou por outro lado', 'Levou até você e pôs na sua mão', 'Foi pegar alguma coisa pra ajudar', 'Ficou olhando aquilo um tempo antes de mexer', 'Deixou pra lá e foi pra outra brincadeira'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `Essa semana ${NOME} quis uma coisa que estava em cima, alta demais pra ele(a).`,
    texto: 'O que ele(a) tentou primeiro?',
    convite: 'Me conta essa cena',
    opcoes: ['Foi com o corpo: esticou, pulou, subiu no que tinha perto', 'Trouxe uma coisa pra alcançar: cadeira, banquinho, ou puxou o pano', 'Pegou você pela mão e levou até lá', 'Ficou apontando e falando até alguém ir', 'Ficou olhando pra coisa, esperando alguém ver', 'Deixou pra lá e foi fazer outra coisa'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `Teve um dia esses dias em que ${NOME} quis alguma coisa e você não estava entendendo o que era. Ele(a) sabia bem o que queria.`,
    texto: 'Como ele(a) te mostrou?',
    convite: 'Me conta o que era, e como você descobriu',
    instr: 'Pode marcar mais de uma',
    opcoes: ['Apontou de longe', 'Apontou e ficou olhando pra você', 'Pegou você pela mão e levou até lá', 'Trouxe o objeto e pôs na sua mão', 'Fez o gesto da coisa, imitou o que ela faz', 'Repetiu a mesma palavra até você entender'],
    outra: 'De outro jeito' },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre ${NOME}!`, cta: 'Continuar' },

  { tipo: 'pergunta',
    cena: 'Tem coisas que vocês fazem sempre na mesma ordem. Esses dias mudou sem querer: chegou visita, faltou tempo, alguém fez de outro jeito.',
    texto: `O que ${NOME} fez?`,
    convite: 'Me conta o que aconteceu',
    opcoes: ['Refez do jeito de sempre, por conta dele(a)', 'Pôs a mão de quem estava fazendo de volta no lugar', 'Falou não e apontou o que estava errado', 'Riu e foi junto do jeito novo', 'Seguiu no que estava fazendo, sem mudar nada', 'Saiu de perto'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: `Essa semana ${NOME} estava no meio de alguma coisa e parou do nada, por conta própria. Ninguém chamou ele(a).`,
    texto: 'Da última vez que isso aconteceu, o que foi que fez ele(a) parar?',
    convite: 'Me conta essa vez',
    opcoes: ['Um barulho que veio de fora', 'Um bicho, uma planta, alguma coisa viva', 'Alguém chegando ou saindo', 'Uma música, alguém cantando', 'Uma luz, uma sombra, alguma coisa se mexendo', 'Alguma coisa que estava diferente do normal ali'],
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
    opcoes: ['Ficou olhando de longe um tempo antes de chegar perto', 'Foi direto, sem pensar duas vezes', 'Ficou colado em você antes de ir', 'Pegou um brinquedo e levou até a outra criança', 'Começou a fazer o que a outra criança estava fazendo', 'Brincou do lado, cada um no seu'],
    outra: 'De outro jeito' },

  { tipo: 'pergunta',
    cena: 'Criança dessa idade copia o que vê, e cada uma copia uma coisa diferente da mesma cena.',
    texto: `A última vez que você viu ${NOME} copiando alguém, o que foi que ele(a) copiou?`,
    convite: 'Me conta o que ele(a) copiou',
    instr: 'Pode marcar mais de uma',
    opcoes: ['Uma palavra, um jeito de falar', 'Um gesto, um jeito de mexer a mão', 'Uma tarefa, na ordem em que viu', 'O jeito de sentar, de andar', 'Onde a pessoa botou as coisas', 'O jeito de cuidar de alguém'],
    outra: 'De outro jeito' },

  { tipo: 'transicao', enorme: 'Está quase acabando!', cta: 'Continuar' },

  { tipo: 'pergunta',
    cena: 'No último lugar em que vocês foram juntos, mesmo que tenha sido o mercado ou a casa de alguém. Voltaram, e passaram uns dias.',
    texto: 'Depois disso, em casa, ele(a) trouxe alguma coisa daquilo de volta?',
    convite: 'Me conta o que ele(a) trouxe de lá',
    instr: 'Pode marcar mais de uma',
    opcoes: ['Fez o movimento que viu alguém fazendo lá', 'Repetiu o som ou a música que ouviu', 'Procurou em casa uma coisa parecida com a de lá', 'Brincou de ser aquilo', 'Falou uma palavra solta daquilo, dias depois', 'Não trouxe nada de lá dessa vez'],
    outra: 'De outro jeito' },
];

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
        .pausa-frase { animation: surge 1.1s cubic-bezier(.22,.61,.36,1) .4s both; }
        .pausa-linha { animation: surge 1.1s cubic-bezier(.22,.61,.36,1) 1.6s both; }
        .cta-forte { animation: surge .9s cubic-bezier(.22,.61,.36,1) 2.8s both; }
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
            <p className="fim-5 text-[13px]" style={{ color: 'rgba(255,255,255,.74)' }}>Se quiser mudar alguma resposta, é só entrar de novo pelo mesmo link.</p>
            <Rodape>
              <span className="fim-5"><Cta texto="Voltar ao início" suave onClick={() => setI(0)} /></span>
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
        {item?.tipo === 'fala' && (
          <>
            {item.enorme && <p style={{ fontFamily: T.serif, fontSize: item.enorme.length > 20 ? 35 : 47, lineHeight: 1.08, letterSpacing: '-.022em', margin: '0 0 26px' }}>{item.enorme}</p>}
            {item.linhas.map((l, k) => (
              <p key={k} className={item.revelar ? 'revela' : undefined}
                style={{
                  fontFamily: T.serif, fontSize: 23, lineHeight: 1.55, fontWeight: 600, margin: '0 0 24px',
                  animationDelay: item.revelar ? (0.8 + k * 1.7) + 's' : undefined,
                }}>{l}</p>
            ))}
            {item.rodape && <p className="text-[11.5px] mt-5" style={{ color: 'rgba(255,255,255,.66)', lineHeight: 1.5, maxWidth: '34ch' }}>{item.rodape}</p>}
            <Rodape>
              {/* "Saber mais" abre o texto completo. Antes ele avancava igual ao outro
                  botao, o que fazia a saida de quem quer ler virar armadilha. */}
              {item.ctaSuave && <Cta texto={item.ctaSuave} suave onClick={() => setVerMais(true)} />}
              <Cta texto={item.cta} onClick={avanca} />
            </Rodape>
          </>
        )}

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
          const outroOlhar =
            item.chave === 'tempo' &&
            escolhido !== null &&
            escolhido !== 'Eu mesmo' &&
            escolhido !== 'Fica dividido, ninguém mais que os outros' &&
            escolhido !== escolhas['responde'];
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
            {item.cena && (
              <p style={{ fontFamily: T.serif, fontSize: 24, lineHeight: 1.32, fontWeight: 700, letterSpacing: '-.01em', margin: '0 0 12px' }}>{item.cena}</p>
            )}
            <p style={{ fontFamily: T.serif, fontSize: 24, lineHeight: 1.32, fontWeight: 700, letterSpacing: '-.01em', margin: '0 0 6px' }}>{item.texto}</p>
            <p className="text-[14px]" style={{ color: 'rgba(255,255,255,.8)', margin: '0 0 22px' }}>{item.instr ?? 'Escolha uma'}</p>

            {/* Lista de linhas, sem caixa: o peso visual fica no texto e nao no
                container. Quem carrega a marcacao e' o circulo. Vazio ele ja diz
                "isto se escolhe" antes de o pai tocar; verde com check ele diz
                "escolhido" sem depender de o pai comparar dois tons de branco,
                que foi onde o teste com um pai de verdade falhou. */}
            <div>
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

            {abertos[i] || escolheuOutra ? (
              <div className="mt-6">
                <p style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{item.convite ?? 'Tem história aí? Me conta.'}</p>
                <p className="text-[13.5px] mb-3" style={{ color: 'rgba(255,255,255,.7)', fontStyle: 'italic' }}>
                  tipo: “no papel ele erra a conta, mas se eu pergunto de cabeça ele acerta na hora”
                </p>
                <textarea
                  value={textos[i] ?? ''}
                  onChange={(e) => setTextos((t) => ({ ...t, [i]: e.target.value }))}
                  rows={3}
                  placeholder="escreva o quanto quiser"
                  className="w-full bg-transparent outline-none resize-y"
                  style={{ borderBottom: '1px solid rgba(255,255,255,.42)', fontFamily: T.serif, fontSize: 19, color: '#fff', paddingBottom: 6 }}
                />
              </div>
            ) : (
              // O "+" sozinho nao dizia que ali se aperta. A segunda linha resolve.
              <button onClick={() => setAbertos((a) => ({ ...a, [i]: true }))} className="flex items-start gap-3 mt-6 text-left" style={{ color: '#fff' }}>
                <span className="flex items-center justify-center flex-none" style={{ width: 30, height: 30, borderRadius: 999, border: '2px solid rgba(255,255,255,.7)', fontSize: 19, lineHeight: 1, paddingBottom: 2, marginTop: 2 }}>+</span>
                <span>
                  <span className="block" style={{ fontFamily: T.serif, fontSize: 19, fontWeight: 600, lineHeight: 1.3 }}>{item.convite ?? 'Tem história aí? Me conta.'}</span>
                  <span className="block text-[13px] mt-1" style={{ color: 'rgba(255,255,255,.72)', textDecoration: 'underline', textUnderlineOffset: 3 }}>clique aqui para escrever</span>
                </span>
              </button>
            )}

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

            <div className="pt-6 flex items-center justify-between gap-4 flex-wrap">
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
