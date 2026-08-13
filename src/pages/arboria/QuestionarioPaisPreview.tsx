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

const O_A = FEM ? 'a' : 'o';
const CONHECE_LO = FEM ? 'conhecê-la' : 'conhecê-lo';

const T = {
  fundo: '#135E96',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
};

type Item =
  | { tipo: 'fala'; revelar?: boolean; linhas: string[]; enorme?: string; cta: string; ctaSuave?: string; rodape?: string }
  | { tipo: 'crianca'; cta: string }
  | { tipo: 'respondente'; cta: string }
  | { tipo: 'transicao'; enorme: string; linha?: string; cta: string }
  | { tipo: 'pergunta'; bloco: string; texto: string; instr?: string; opcoes: string[]; outra?: string; convite?: string };

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

  { tipo: 'respondente', cta: 'Continuar' },

  { tipo: 'transicao',
    enorme: `Ah, ${O_A} ${NOME}!`,
    linha: `Estou animado para ${CONHECE_LO} melhor. Prontos para falarem de quem vocês mais amam?`,
    cta: 'Prontos' },

  // ---------------------------------------------------------------- bloco 1
  { tipo: 'pergunta', bloco: 'O tempo dele(a)', texto: 'Pra começar leve: do que ele(a) mais gosta de brincar hoje em dia?', convite: 'Conta um pouco mais sobre essas brincadeiras', instr: 'Pode marcar mais de uma',
    opcoes: ['De montar e encaixar', 'De correr, subir, pular', 'De faz de conta', 'De carrinho, boneca, bichinho', 'De música e dança', 'De desenhar e pintar', 'De água, terra, massinha'], outra: 'Outra coisa' },
  { tipo: 'pergunta', bloco: 'O tempo dele(a)', texto: 'Pensa num sábado. Todo mundo em casa, ninguém pedindo nada pra ele(a). Pra onde ele(a) vai?', convite: 'Como costuma ser esse sábado? Me conta', instr: 'Pode marcar mais de uma',
    opcoes: ['Pega brinquedo de montar', 'Vai atrás de alguém pra brincar', 'Corre, sobe, pula', 'Pega um livro, pede história', 'Quer televisão ou celular', 'Mexe em terra, água, bicho', 'Desmonta o que não é brinquedo'], outra: 'Outra coisa' },
  { tipo: 'pergunta', bloco: 'O tempo dele(a)', texto: 'Tem alguma coisa que ele(a) começa e o tempo passa e ele(a) nem vê?', convite: 'O que acontece quando ele(a) está nisso? Me conta', instr: 'Pode marcar mais de uma',
    opcoes: ['Brinquedo de montar', 'Brincar com alguém', 'Correr, subir, pular', 'Livro, história', 'Televisão ou celular', 'Terra, água, bicho'], outra: 'Outra coisa' },
  { tipo: 'pergunta', bloco: 'O tempo dele(a)', texto: 'E o contrário: alguma coisa que ele(a) larga em cinco minutos?', convite: 'Por que você acha que ele(a) larga? Me conta', instr: 'Pode marcar mais de uma',
    opcoes: ['Brinquedo de montar', 'Brincar com alguém', 'Correr, subir, pular', 'Livro, história', 'Televisão ou celular', 'Terra, água, bicho'], outra: 'Outra coisa' },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre o ${NOME}!`, cta: 'Continuar' },

  // ---------------------------------------------------------------- bloco 2
  { tipo: 'pergunta', bloco: 'Quando alguma coisa dá errado', texto: 'Lembra da última vez que ele(a) quis fazer alguma coisa sozinho(a) e não deu certo? O que aconteceu depois?', convite: 'Me conta como foi',
    opcoes: ['Tentou de novo', 'Chorou', 'Ficou bravo, jogou longe', 'Chamou alguém', 'Largou e foi fazer outra coisa', 'Ficou olhando parado'] },
  { tipo: 'pergunta', bloco: 'Quando alguma coisa dá errado', texto: 'Sabe quando ele(a) trava? Fica emburrado(a), chateado(a), e nada anda. Nessas horas, o que costuma funcionar pra ele(a) voltar ao normal?', convite: 'O que você faz nessas horas? Me conta', instr: 'Pode marcar mais de uma',
    opcoes: ['Mostrar fazendo, sem falar muito', 'Explicar falando', 'Fazer junto, segurando a mão', 'Distrair com algo que gosta', 'Deixar sozinho um pouco', 'Colo'] },
  { tipo: 'pergunta', bloco: 'Como ele(a) pede e como conta', texto: 'Quando ele(a) quer alguma coisa e você ainda não entendeu o quê, como ele(a) faz pra te mostrar?', convite: 'Tem algum jeito que é só dele(a)? Me conta',
    opcoes: ['Fala', 'Aponta', 'Pega pela mão e leva', 'Traz o objeto e mostra', 'Pega sozinho', 'Fica manhoso até alguém perceber'] },
  { tipo: 'pergunta', bloco: 'Como ele(a) pede e como conta', texto: 'Fim da tarde, ele(a) chega da escola e você pergunta como foi. O que costuma acontecer?', convite: 'O que ele(a) costuma contar? Me conta',
    opcoes: ['Conta sem a gente perguntar', 'Conta se a gente perguntar', 'Conta um pedacinho só', 'Conta, mas é difícil de entender', 'Não conta'] },

  // A pausa que explica ao pai por que isto importa. Sem ela o questionario
  // e' so' um formulario; com ela, o pai entende o que esta ajudando a construir.
  { tipo: 'transicao',
    enorme: 'Quando eu faço essas perguntas, é porque entender cada um deles faz diferença.',
    linha: `Eu não quero que ${O_A} ${NOME} seja apenas mais um na multidão: quero que ele(a) brilhe do jeito dele(a), que não é igual ao de mais ninguém. E eu sei que temos um caminho longo pela frente, mas de pouquinho em pouquinho faremos essa árvore crescer juntos...`,
    cta: 'Continuar' },

  // ---------------------------------------------------------------- bloco 3
  { tipo: 'pergunta', bloco: 'Casa e fora de casa', texto: 'Tem uma coisa que quase todo pai percebe: a criança em casa e a criança fora de casa às vezes parecem duas. Acontece com ele(a)?', convite: 'Como é essa diferença? Me conta',
    opcoes: ['Fala muito mais em casa', 'É mais quieto em casa', 'É mais agitado em casa', 'É mais agitado fora', 'É bem parecido nos dois'] },
  { tipo: 'pergunta', bloco: 'Casa e fora de casa', texto: 'No corre-corre do dia, o que ele(a) já faz sozinho(a) sem ninguém mandar?', convite: 'Tem alguma coisa que te surpreendeu? Me conta', instr: 'Pode marcar mais de uma',
    opcoes: ['Come sozinho', 'Se veste, ou tenta', 'Escolhe a roupa', 'Guarda os brinquedos', 'Escova os dentes', 'Ainda faz tudo com ajuda'], outra: 'Outra coisa' },
  { tipo: 'pergunta', bloco: 'Casa e fora de casa', texto: 'Aniversário, parquinho, um lugar cheio de criança que ele(a) não conhece. O que ele(a) faz nos primeiros minutos?', convite: 'Como costuma ser? Me conta',
    opcoes: ['Entra na brincadeira logo', 'Fica olhando antes de entrar', 'Fica perto de você', 'Chama alguém pra brincar', 'Brinca sozinho do lado'] },

  { tipo: 'transicao', enorme: 'Está quase acabando!', cta: 'Continuar' },

  // ---------------------------------------------------------------- bloco 4
  { tipo: 'pergunta', bloco: 'O que ele(a) percebe', texto: 'Quando alguém da casa está triste ou bravo, mesmo sem falar nada, ele(a) percebe?', convite: 'Já teve uma vez marcante? Me conta',
    opcoes: ['Vai perto', 'Pergunta o que houve', 'Fica quieto', 'Fica agitado também', 'Parece não perceber'] },
  { tipo: 'pergunta', bloco: 'O que ele(a) percebe', texto: 'Você mudou um móvel de lugar, guardou um brinquedo em outro canto. Ele(a) nota?', convite: 'Me conta uma vez que isso aconteceu',
    opcoes: ['Repara e fala', 'Repara e arruma', 'Fica incomodado até arrumarem', 'Só repara se alguém falar', 'Não repara'] },
  { tipo: 'pergunta', bloco: 'O que ele(a) percebe', texto: 'Toca uma música em casa, do nada. O que ele(a) faz?', convite: 'Tem alguma música que mexe com ele(a)? Me conta', instr: 'Pode marcar mais de uma',
    opcoes: ['Dança no ritmo', 'Canta junto ou tenta', 'Para pra ouvir', 'Continua o que fazia', 'Bate em algo fazendo som', 'Pede pra desligar'] },
];

const FLUXO: Item[] = flexProfundo(FLUXO_BRUTO);

const TOTAL = FLUXO.filter((x) => x.tipo === 'pergunta').length;
const numeroDaPergunta = (i: number) => FLUXO.slice(0, i + 1).filter((x) => x.tipo === 'pergunta').length;

const QuestionarioPaisPreview = () => {
  const [i, setI] = useState(0);
  const [quemResponde, setQuemResponde] = useState<string | null>(null);
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
        {item?.tipo === 'respondente' && (
          <>
            <p style={{ fontFamily: T.serif, fontSize: 29, lineHeight: 1.24, fontWeight: 700, letterSpacing: '-.012em', margin: '0 0 6px' }}>E quem está me contando hoje?</p>
            <p className="text-[14px]" style={{ color: 'rgba(255,255,255,.8)', margin: '0 0 22px' }}>Pergunto porque cada um vê uma parte diferente do dia dele(a).</p>

            <div className="flex flex-col gap-2.5">
              {['A mãe', 'O pai', 'Os dois juntos', 'A avó ou o avô', 'Outra pessoa que cuida dele(a)'].map((quem) => {
                const rotulo = flex(quem);
                const on = quemResponde === rotulo;
                return (
                  <button
                    key={rotulo}
                    onClick={() => setQuemResponde(rotulo)}
                    className="w-full flex items-center justify-between gap-3 text-left transition-colors"
                    style={{
                      minHeight: 58, padding: '13px 16px', borderRadius: 15,
                      background: on ? '#fff' : 'rgba(255,255,255,.10)',
                      border: on ? '2px solid #fff' : '2px solid rgba(255,255,255,.34)',
                      boxShadow: on ? '0 6px 18px rgba(9,45,74,.28)' : undefined,
                      fontFamily: T.serif, fontSize: 19.5, lineHeight: 1.32, fontWeight: 600,
                      color: on ? '#0E3F66' : '#fff',
                    }}
                  >
                    <span>{rotulo}</span>
                    <span
                      className="flex items-center justify-center"
                      style={{
                        flex: 'none', width: 26, height: 26, borderRadius: 999,
                        background: on ? '#1F6141' : 'transparent',
                        border: on ? '2px solid #1F6141' : '2px solid rgba(255,255,255,.55)',
                      }}
                    >
                      {on && <Check size={15} strokeWidth={3.5} color="#fff" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <Rodape>
              <span style={{ opacity: quemResponde ? 1 : 0.35, pointerEvents: quemResponde ? 'auto' : 'none' }}>
                <Cta texto={item.cta} onClick={avanca} />
              </span>
            </Rodape>
          </>
        )}

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
            <p style={{ fontFamily: T.serif, fontSize: 29, lineHeight: 1.24, fontWeight: 700, letterSpacing: '-.012em', margin: '0 0 6px' }}>{item.texto}</p>
            <p className="text-[14px]" style={{ color: 'rgba(255,255,255,.8)', margin: '0 0 22px' }}>{item.instr ?? 'Escolha uma'}</p>

            {/* A marcacao vira o fundo inteiro, nao um risquinho. Testado com um
                pai de verdade: texto branco mais branco nao e' sinal de nada.
                Desmarcado ja mostra a bolinha vazia, para o pai entender antes
                de tocar que aquilo se escolhe. */}
            <div className="flex flex-col gap-2.5">
              {opcoes.map((op) => {
                const on = marcadasAqui.includes(op);
                return (
                  <button
                    key={op}
                    onClick={() => { alterna(op); if (op === rotuloOutra) setAbertos((a) => ({ ...a, [i]: true })); }}
                    className="w-full flex items-center justify-between gap-3 text-left transition-colors"
                    style={{
                      minHeight: 58, padding: '13px 16px', borderRadius: 15,
                      background: on ? '#fff' : 'rgba(255,255,255,.10)',
                      border: on ? '2px solid #fff' : '2px solid rgba(255,255,255,.34)',
                      boxShadow: on ? '0 6px 18px rgba(9,45,74,.28)' : undefined,
                      fontFamily: T.serif, fontSize: 19.5, lineHeight: 1.32, fontWeight: 600,
                      color: on ? '#0E3F66' : '#fff',
                      fontStyle: op === rotuloOutra ? 'italic' : 'normal',
                    }}
                  >
                    <span>{op}</span>
                    <span
                      className="flex items-center justify-center"
                      style={{
                        flex: 'none', width: 26, height: 26, borderRadius: 999,
                        background: on ? '#1F6141' : 'transparent',
                        border: on ? '2px solid #1F6141' : '2px solid rgba(255,255,255,.55)',
                      }}
                    >
                      {on && <Check size={15} strokeWidth={3.5} color="#fff" />}
                    </span>
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
