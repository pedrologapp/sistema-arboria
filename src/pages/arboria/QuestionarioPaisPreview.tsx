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

const T = {
  fundo: '#135E96',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
};

type Item =
  | { tipo: 'fala'; bloco?: string; linhas: string[]; enorme?: string; cta: string; ctaSuave?: string; rodape?: string; selo?: boolean }
  | { tipo: 'crianca'; cta: string }
  | { tipo: 'transicao'; enorme: string; linha?: string; cta: string }
  | { tipo: 'pergunta'; bloco: string; texto: string; instr?: string; opcoes: string[] };

const FLUXO: Item[] = [
  // ---------------------------------------------------------------- entrada
  { tipo: 'fala', selo: true, enorme: 'Olá!',
    linhas: ['Eu sou o Arboria.', 'E hoje quero conhecer melhor o seu filho(a)!'], cta: 'Vamos lá' },

  { tipo: 'fala', bloco: 'Um momento',
    linhas: [
      'Você conhece ele(a) de um jeito que mais ninguém conhece.',
      'Do que ele(a) brinca quando ninguém manda nada. O que ele(a) faz quando alguma coisa dá errado. Aquilo que ele(a) fica olhando sem parar.',
      'É disso que eu preciso.',
    ], cta: 'Continuar' },

  { tipo: 'fala', bloco: 'Um momento',
    enorme: 'Estou muito animado para conhecer ele(a) melhor.',
    linhas: [
      'Aqui não tem resposta certa. Eu não quero saber o que ele(a) já aprendeu: quero saber o jeito dele(a).',
      'E pode contar as coisas esquisitas também. Muita vez é ali que está o mais interessante.',
    ], cta: 'Continuar' },

  { tipo: 'fala', bloco: 'Antes de começar', enorme: 'Uma coisa rápida.',
    linhas: [
      'Isto não é prova e não vira nota.',
      `Quem lê o que você escrever é a professora dele(a) e a coordenação. Ele(a) nunca vê.`,
      'Queremos entender ele(a) melhor, porque é conhecendo o caminho dele(a) que a escola consegue caminhar junto.',
      'Vamos lá?',
    ],
    rodape: 'Responder é você que decide, e não responder não muda nada para ele(a). O que você escrever fica guardado com a escola, e você pode pedir para ver ou apagar quando quiser.',
    cta: 'Pode perguntar', ctaSuave: 'Saber mais' },

  { tipo: 'crianca', cta: 'É ele' },

  { tipo: 'transicao', enorme: 'Prontos para falarem de quem vocês mais amam?', cta: 'Prontos' },

  // ---------------------------------------------------------------- bloco 1
  { tipo: 'pergunta', bloco: 'O tempo dele(a)', texto: 'Pra começar leve: do que ele(a) mais gosta de brincar hoje em dia?', instr: 'Pode marcar mais de uma',
    opcoes: ['De montar e encaixar', 'De correr, subir, pular', 'De faz de conta', 'De carrinho, boneca, bichinho', 'De música e dança', 'De desenhar e pintar', 'De água, terra, massinha'] },
  { tipo: 'pergunta', bloco: 'O tempo dele(a)', texto: 'Pensa num sábado. Todo mundo em casa, ninguém pedindo nada pra ele(a). Pra onde ele(a) vai?', instr: 'Pode marcar mais de uma',
    opcoes: ['Pega brinquedo de montar', 'Vai atrás de alguém pra brincar', 'Corre, sobe, pula', 'Pega um livro, pede história', 'Quer televisão ou celular', 'Mexe em terra, água, bicho', 'Desmonta o que não é brinquedo'] },
  { tipo: 'pergunta', bloco: 'O tempo dele(a)', texto: 'Tem alguma coisa que ele(a) começa e o tempo passa e ele(a) nem vê?', instr: 'Pode marcar mais de uma',
    opcoes: ['Brinquedo de montar', 'Brincar com alguém', 'Correr, subir, pular', 'Livro, história', 'Televisão ou celular', 'Terra, água, bicho'] },
  { tipo: 'pergunta', bloco: 'O tempo dele(a)', texto: 'E o contrário: alguma coisa que ele(a) larga em cinco minutos?', instr: 'Pode marcar mais de uma',
    opcoes: ['Brinquedo de montar', 'Brincar com alguém', 'Correr, subir, pular', 'Livro, história', 'Televisão ou celular', 'Terra, água, bicho'] },

  { tipo: 'transicao', enorme: `Estou adorando saber essas coisas sobre o ${NOME}!`, cta: 'Continuar' },

  // ---------------------------------------------------------------- bloco 2
  { tipo: 'pergunta', bloco: 'Quando alguma coisa dá errado', texto: 'Lembra da última vez que ele(a) quis fazer alguma coisa sozinho(a) e não deu certo? O que aconteceu depois?',
    opcoes: ['Tentou de novo', 'Chorou', 'Ficou bravo, jogou longe', 'Chamou alguém', 'Largou e foi fazer outra coisa', 'Ficou olhando parado'] },
  { tipo: 'pergunta', bloco: 'Quando alguma coisa dá errado', texto: 'Sabe quando ele(a) trava? Fica emburrado(a), chateado(a), e nada anda. Nessas horas, o que costuma funcionar pra ele(a) voltar ao normal?', instr: 'Pode marcar mais de uma',
    opcoes: ['Mostrar fazendo, sem falar muito', 'Explicar falando', 'Fazer junto, segurando a mão', 'Distrair com algo que gosta', 'Deixar sozinho um pouco', 'Colo'] },
  { tipo: 'pergunta', bloco: 'Como ele(a) pede e como conta', texto: 'Quando ele(a) quer alguma coisa e você ainda não entendeu o quê, como ele(a) faz pra te mostrar?',
    opcoes: ['Fala', 'Aponta', 'Pega pela mão e leva', 'Traz o objeto e mostra', 'Pega sozinho', 'Fica manhoso até alguém perceber'] },
  { tipo: 'pergunta', bloco: 'Como ele(a) pede e como conta', texto: 'Fim da tarde, ele(a) chega da escola e você pergunta como foi. O que costuma acontecer?',
    opcoes: ['Conta sem a gente perguntar', 'Conta se a gente perguntar', 'Conta um pedacinho só', 'Conta, mas é difícil de entender', 'Não conta'] },

  { tipo: 'transicao', enorme: 'Eu sei que temos um caminho longo pela frente, mas de pouquinho em pouquinho faremos essa árvore crescer juntos...', cta: 'Continuar' },

  // ---------------------------------------------------------------- bloco 3
  { tipo: 'pergunta', bloco: 'Casa e fora de casa', texto: 'Tem uma coisa que quase todo pai percebe: a criança em casa e a criança fora de casa às vezes parecem duas. Acontece com ele(a)?',
    opcoes: ['Fala muito mais em casa', 'É mais quieto em casa', 'É mais agitado em casa', 'É mais agitado fora', 'É bem parecido nos dois'] },
  { tipo: 'pergunta', bloco: 'Casa e fora de casa', texto: 'No corre-corre do dia, o que ele(a) já faz sozinho(a) sem ninguém mandar?', instr: 'Pode marcar mais de uma',
    opcoes: ['Come sozinho', 'Se veste, ou tenta', 'Escolhe a roupa', 'Guarda os brinquedos', 'Escova os dentes', 'Ainda faz tudo com ajuda'] },
  { tipo: 'pergunta', bloco: 'Casa e fora de casa', texto: 'Aniversário, parquinho, um lugar cheio de criança que ele(a) não conhece. O que ele(a) faz nos primeiros minutos?',
    opcoes: ['Entra na brincadeira logo', 'Fica olhando antes de entrar', 'Fica perto de você', 'Chama alguém pra brincar', 'Brinca sozinho do lado'] },

  { tipo: 'transicao', enorme: 'Está quase acabando!', cta: 'Continuar' },

  // ---------------------------------------------------------------- bloco 4
  { tipo: 'pergunta', bloco: 'O que ele(a) percebe', texto: 'Quando alguém da casa está triste ou bravo, mesmo sem falar nada, ele(a) percebe?',
    opcoes: ['Vai perto', 'Pergunta o que houve', 'Fica quieto', 'Fica agitado também', 'Parece não perceber'] },
  { tipo: 'pergunta', bloco: 'O que ele(a) percebe', texto: 'Você mudou um móvel de lugar, guardou um brinquedo em outro canto. Ele(a) nota?',
    opcoes: ['Repara e fala', 'Repara e arruma', 'Fica incomodado até arrumarem', 'Só repara se alguém falar', 'Não repara'] },
  { tipo: 'pergunta', bloco: 'O que ele(a) percebe', texto: 'Toca uma música em casa, do nada. O que ele(a) faz?', instr: 'Pode marcar mais de uma',
    opcoes: ['Dança no ritmo', 'Canta junto ou tenta', 'Para pra ouvir', 'Continua o que fazia', 'Bate em algo fazendo som', 'Pede pra desligar'] },
];

const TOTAL = FLUXO.filter((x) => x.tipo === 'pergunta').length;
const numeroDaPergunta = (i: number) => FLUXO.slice(0, i + 1).filter((x) => x.tipo === 'pergunta').length;

const QuestionarioPaisPreview = () => {
  const [i, setI] = useState(0);
  const [marcadas, setMarcadas] = useState<Record<number, string[]>>({});
  const [abertos, setAbertos] = useState<Record<number, boolean>>({});
  const [textos, setTextos] = useState<Record<number, string>>({});

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
  const Cta = ({ texto, suave, onClick }: { texto: string; suave?: boolean; onClick: () => void }) => (
    <button onClick={onClick} className="text-[13px] font-bold uppercase" style={{
      letterSpacing: '.16em', paddingBottom: 6, marginRight: suave ? 24 : 0,
      color: suave ? 'rgba(255,255,255,.72)' : '#fff',
      borderBottom: `2px solid ${suave ? 'rgba(255,255,255,.4)' : '#fff'}`,
    }}>{texto}</button>
  );
  const Selo = () => (
    <div className="flex items-center gap-2 mb-6">
      <svg viewBox="0 0 100 100" className="w-5 h-5" style={{ color: '#fff' }} aria-hidden>
        <path d="M30 79 L50 27 L70 79" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M50 27 C50 16 58 9 68 8 C69 19 61 26 50 27 Z" fill="currentColor" />
      </svg>
      <span className="text-[10.5px] font-bold uppercase" style={{ letterSpacing: '.24em', color: 'rgba(255,255,255,.82)' }}>Arboria</span>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{
      backgroundColor: T.fundo,
      backgroundImage: `linear-gradient(180deg, rgba(6,38,66,.22) 0%, rgba(6,38,66,0) 34%), url("${CEU}")`,
      backgroundSize: 'cover, cover', backgroundPosition: 'center top, center', color: '#fff',
    }}>
      <div className="absolute pointer-events-none" style={{ left: '-14%', right: '-14%', bottom: '-110px', height: 210, borderRadius: '50%', background: '#3E8F63', opacity: 0.55, zIndex: 0 }} />
      <div className="absolute pointer-events-none" style={{ left: '-14%', right: '-14%', bottom: '-140px', height: 222, borderRadius: '50%', background: '#1F6141', zIndex: 0 }} />

      <div className="absolute pointer-events-none passaros-voo" style={{ top: '11%', left: '7%', width: 70, opacity: 0.42, zIndex: 1 }} aria-hidden>
        <svg viewBox="0 0 90 30" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" className="w-full block">
          <path d="M4 12c3-4 6-4 8 0 2-4 5-4 8 0" /><path d="M34 5c2.4-3.2 4.8-3.2 6.4 0 1.6-3.2 4-3.2 6.4 0" /><path d="M62 20c2-2.6 4-2.6 5.4 0 1.4-2.6 3.4-2.6 5.4 0" />
        </svg>
      </div>
      <style>{`
        @keyframes voo { from { transform: translate(0,0) } to { transform: translate(200px,-30px) } }
        .passaros-voo { animation: voo 46s linear infinite alternate; }
        @media (prefers-reduced-motion: reduce) { .passaros-voo { animation: none } }
      `}</style>

      <div className="relative flex-1 flex flex-col w-full max-w-lg mx-auto px-6 pt-8 pb-7" style={{ zIndex: 2 }}>

        <div className="flex items-center justify-between mb-5" style={{ minHeight: 28 }}>
          {i > 0 ? (
            <button onClick={() => setI((v) => v - 1)} className="p-1 -ml-1" style={{ color: 'rgba(255,255,255,.88)' }} aria-label="Voltar"><ChevronLeft size={19} /></button>
          ) : <span />}
          {ehPergunta && (
            <span className="text-[12px] tabular-nums" style={{ color: 'rgba(255,255,255,.76)', letterSpacing: '.06em' }}>
              {String(num).padStart(2, '0')} / {TOTAL}
            </span>
          )}
        </div>

        {ehPergunta && (
          <div className="mb-6" style={{ height: 1, background: 'rgba(255,255,255,.28)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: -0.5, height: 2, background: '#fff', width: `${(num / TOTAL) * 100}%`, transition: 'width .5s cubic-bezier(.22,.61,.36,1)' }} />
          </div>
        )}

        {/* ---------- FIM ---------- */}
        {noFim && (
          <>
            <Selo />
            <p style={{ fontFamily: T.serif, fontSize: 44, lineHeight: 1.02, letterSpacing: '-.022em', margin: '0 0 16px' }}>Obrigado!</p>
            <p style={{ fontFamily: T.serif, fontSize: 21, lineHeight: 1.45, margin: '0 0 15px' }}>Recebi tudo. A professora do {NOME} já vai ficar com o que você me contou.</p>
            <p style={{ fontFamily: T.serif, fontSize: 21, lineHeight: 1.45, margin: '0 0 15px' }}>No fim do semestre eu te mando o que a gente foi vendo, e também o que ainda não apareceu.</p>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,.74)' }}>Se quiser mudar alguma resposta, é só entrar de novo pelo mesmo link.</p>
            <div className="mt-auto pt-7">
              <Cta texto="Recomeçar" suave onClick={() => { setI(0); setMarcadas({}); setTextos({}); setAbertos({}); }} />
            </div>
          </>
        )}

        {/* ---------- TRANSIÇÃO ---------- */}
        {item?.tipo === 'transicao' && (
          <>
            <Selo />
            <p style={{ fontFamily: T.serif, fontSize: item.enorme.length > 34 ? 34 : 40, lineHeight: 1.08, letterSpacing: '-.024em', margin: '0 0 14px' }}>{item.enorme}</p>
            {item.linha && <p style={{ fontFamily: T.serif, fontSize: 21, lineHeight: 1.45, margin: 0 }}>{item.linha}</p>}
            <div className="mt-auto pt-7"><Cta texto={item.cta} onClick={avanca} /></div>
          </>
        )}

        {/* ---------- FALA ---------- */}
        {item?.tipo === 'fala' && (
          <>
            {item.selo && <Selo />}
            {item.bloco && <p className="text-[10.5px] font-bold uppercase mb-5" style={{ letterSpacing: '.22em', color: 'rgba(255,255,255,.76)' }}>{item.bloco}</p>}
            {item.enorme && <p style={{ fontFamily: T.serif, fontSize: item.enorme.length > 20 ? 32 : 44, lineHeight: 1.05, letterSpacing: '-.022em', margin: '0 0 16px' }}>{item.enorme}</p>}
            {item.linhas.map((l, k) => <p key={k} style={{ fontFamily: T.serif, fontSize: 21, lineHeight: 1.45, margin: '0 0 15px' }}>{l}</p>)}
            {item.rodape && <p className="text-[11.5px] mt-5" style={{ color: 'rgba(255,255,255,.66)', lineHeight: 1.5, maxWidth: '34ch' }}>{item.rodape}</p>}
            <div className="mt-auto pt-7">
              {item.ctaSuave && <Cta texto={item.ctaSuave} suave onClick={avanca} />}
              <Cta texto={item.cta} onClick={avanca} />
            </div>
          </>
        )}

        {/* ---------- CRIANÇA ---------- */}
        {item?.tipo === 'crianca' && (
          <>
            <p className="text-[10.5px] font-bold uppercase mb-5" style={{ letterSpacing: '.22em', color: 'rgba(255,255,255,.76)' }}>Quem é ele(a)</p>
            <p style={{ fontFamily: T.serif, fontSize: 21, lineHeight: 1.45, margin: '0 0 15px' }}>Só para eu ter certeza de quem a gente está falando.</p>
            <div style={{ borderLeft: '2px solid rgba(255,255,255,.7)', padding: '4px 0 4px 16px', margin: '16px 0 4px' }}>
              <p style={{ fontFamily: T.serif, fontSize: 27, margin: '0 0 1px' }}>{NOME}</p>
              <p className="text-[14px] m-0" style={{ color: 'rgba(255,255,255,.78)' }}>{TURMA}</p>
            </div>
            <p className="text-[13px] mt-6" style={{ color: 'rgba(255,255,255,.74)' }}>Data de nascimento dele(a)</p>
            <input inputMode="numeric" placeholder="__ / __ / ____" className="w-full bg-transparent outline-none"
              style={{ borderBottom: '1px solid rgba(255,255,255,.5)', padding: '12px 0', fontFamily: T.serif, fontSize: 22, color: '#fff', letterSpacing: '.1em', marginTop: 4 }} />
            <div className="mt-auto pt-7"><Cta texto={item.cta} onClick={avanca} /></div>
          </>
        )}

        {/* ---------- PERGUNTA ---------- */}
        {item?.tipo === 'pergunta' && (
          <>
            <p className="text-[10.5px] font-bold uppercase mb-2.5" style={{ letterSpacing: '.22em', color: 'rgba(255,255,255,.76)' }}>{item.bloco}</p>
            <p style={{ fontFamily: T.serif, fontSize: 26, lineHeight: 1.26, letterSpacing: '-.012em', margin: '0 0 6px' }}>{item.texto}</p>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,.74)', margin: '0 0 20px' }}>{item.instr ?? 'Escolha uma'}</p>

            <div>
              {item.opcoes.map((op, k) => {
                const on = marcadasAqui.includes(op);
                return (
                  <button key={op} onClick={() => alterna(op)} className="w-full flex items-center justify-between gap-3.5 text-left"
                    style={{
                      minHeight: 56, padding: '15px 0',
                      borderBottom: '1px solid rgba(255,255,255,.24)',
                      borderTop: k === 0 ? '1px solid rgba(255,255,255,.24)' : undefined,
                      fontFamily: T.serif, fontSize: 18.5, lineHeight: 1.35,
                      color: on ? '#fff' : 'rgba(255,255,255,.86)',
                    }}>
                    <span>{op}</span>
                    <span style={{ flex: 'none', width: 22, height: 2, background: on ? '#fff' : 'transparent' }} />
                  </button>
                );
              })}
            </div>

            {abertos[i] ? (
              <div className="mt-4">
                <p className="text-[12.5px] mb-1" style={{ color: 'rgba(255,255,255,.78)', letterSpacing: '.04em' }}>Tem história aí? Me conta.</p>
                <p className="text-[12px] mb-2" style={{ color: 'rgba(255,255,255,.6)', fontStyle: 'italic' }}>
                  tipo: “no papel ele erra a conta, mas se eu pergunto de cabeça ele acerta na hora”
                </p>
                <textarea value={textos[i] ?? ''} onChange={(e) => setTextos((t) => ({ ...t, [i]: e.target.value }))}
                  rows={2} placeholder="uma frase basta" className="w-full bg-transparent outline-none resize-none"
                  style={{ borderBottom: '1px solid rgba(255,255,255,.42)', fontFamily: T.serif, fontSize: 17, color: '#fff', paddingBottom: 4 }} />
              </div>
            ) : (
              <button onClick={() => setAbertos((a) => ({ ...a, [i]: true }))} className="flex items-center gap-2.5 mt-4 text-[14.5px]" style={{ color: 'rgba(255,255,255,.86)' }}>
                <span className="text-[17px] leading-none">+</span>
                <span style={{ textDecoration: 'underline', textUnderlineOffset: 4 }}>Tem história aí? Me conta.</span>
              </button>
            )}

            <button onClick={avanca} className="mt-4 text-[14.5px] self-start" style={{ color: 'rgba(255,255,255,.78)', textDecoration: 'underline', textUnderlineOffset: 4 }}>
              Não sei dizer
            </button>

            <div className="mt-auto pt-7">
              <button onClick={avanca} className="flex items-center gap-2 text-[13px] font-bold uppercase"
                style={{ letterSpacing: '.16em', color: '#fff', borderBottom: '2px solid #fff', paddingBottom: 6 }}>
                {marcadasAqui.length > 0 ? <>Próxima <Check size={14} /></> : 'Pular esta'}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="relative text-center pb-4 text-[11px]" style={{ color: 'rgba(255,255,255,.55)', zIndex: 2 }}>
        protótipo · nada é gravado
      </div>
    </div>
  );
};

export default QuestionarioPaisPreview;
