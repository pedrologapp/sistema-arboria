// ============================================================
// QuestionarioPaisPreview (/arboria/coleta/pais/preview)
//
// O questionario dos pais como o pai veria no celular: tela cheia, ceu de fundo,
// tipografia editorial, uma pergunta por vez. PROTOTIPO: nao grava nada, nao esta
// vinculado a turma nenhuma, e so o dono da plataforma abre.
//
// A crianca de exemplo e' fixa (Arthur, Maternal 2 B). Quando isto virar produto,
// o link sera unico por crianca e o nome vira do banco.
// ============================================================
import { useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';

const CEU = '/arboria/ceu.png';

const T = {
  fundo: '#135E96',
  branco: '#ffffff',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
};

type Item =
  | { tipo: 'fala'; bloco?: string; linhas: string[]; enorme?: string; cta: string; ctaSuave?: string; rodape?: string }
  | { tipo: 'crianca'; cta: string }
  | { tipo: 'pergunta'; bloco: string; texto: string; instr?: string; opcoes: string[] };

const ENTRADA: Item[] = [
  { tipo: 'fala', enorme: 'Olá!', linhas: ['Eu sou o Arboria.', 'Hoje eu queria conhecer melhor o seu filho(a).'], cta: 'Vamos lá' },
  {
    tipo: 'fala', bloco: 'Um momento',
    linhas: [
      'Você conhece ele(a) de um jeito que mais ninguém conhece.',
      'Do que ele(a) brinca quando ninguém manda nada. O que ele(a) faz quando alguma coisa dá errado. Aquilo que ele(a) fica olhando sem parar.',
      'É disso que eu preciso.',
    ],
    cta: 'Continuar',
  },
  {
    tipo: 'fala', bloco: 'Um momento',
    enorme: 'Estou muito animado para conhecer ele(a) melhor.',
    linhas: ['Vai ser uma jornada incrível!', 'Aqui não tem resposta certa. Eu não quero saber o que ele(a) já aprendeu: quero saber o jeito dele(a).'],
    cta: 'Continuar',
  },
  {
    tipo: 'fala', bloco: 'Antes de começar',
    enorme: 'Uma coisa rápida.',
    linhas: [
      'Isto não é prova e não vira nota.',
      'Quem lê o que você escrever é a professora dele(a) e a coordenação. Ele(a) nunca vê.',
      'Queremos entender ele(a) melhor, porque é conhecendo o caminho dele(a) que a escola consegue caminhar junto.',
      'Vamos lá?',
    ],
    rodape:
      'Responder é você que decide, e não responder não muda nada para ele(a). O que você escrever fica guardado com a escola, e você pode pedir para ver ou apagar quando quiser.',
    cta: 'Pode perguntar', ctaSuave: 'Saber mais',
  },
  { tipo: 'crianca', cta: 'É ele' },
];

const PERGUNTAS: Item[] = [
  { tipo: 'pergunta', bloco: 'O tempo dele(a)', texto: 'Do que ele(a) mais gosta de brincar hoje em dia?', instr: 'Pode marcar mais de uma',
    opcoes: ['De montar e encaixar', 'De correr, subir, pular', 'De faz de conta', 'De carrinho, boneca, bichinho', 'De música e dança', 'De desenhar e pintar', 'De água, terra, massinha'] },
  { tipo: 'pergunta', bloco: 'O tempo dele(a)', texto: 'No fim de semana, quando ninguém está pedindo nada pra ele(a), o que ele(a) vai fazer?', instr: 'Pode marcar mais de uma',
    opcoes: ['Pega brinquedo de montar', 'Vai atrás de alguém pra brincar', 'Corre, sobe, pula', 'Pega um livro, pede história', 'Quer televisão ou celular', 'Mexe em terra, água, bicho', 'Desmonta o que não é brinquedo'] },
  { tipo: 'pergunta', bloco: 'O tempo dele(a)', texto: 'Tem alguma coisa que ele(a) faz por muito tempo, sem enjoar?', instr: 'Pode marcar mais de uma',
    opcoes: ['Brinquedo de montar', 'Brincar com alguém', 'Correr, subir, pular', 'Livro, história', 'Televisão ou celular', 'Terra, água, bicho'] },
  { tipo: 'pergunta', bloco: 'O tempo dele(a)', texto: 'E tem alguma coisa que ele(a) larga rapidinho?', instr: 'Pode marcar mais de uma',
    opcoes: ['Brinquedo de montar', 'Brincar com alguém', 'Correr, subir, pular', 'Livro, história', 'Televisão ou celular', 'Terra, água, bicho'] },
  { tipo: 'pergunta', bloco: 'Quando alguma coisa dá errado', texto: 'Da última vez que ele(a) tentou fazer alguma coisa sozinho(a) e não conseguiu, o que aconteceu?',
    opcoes: ['Tentou de novo', 'Chorou', 'Ficou bravo, jogou longe', 'Chamou alguém', 'Largou e foi fazer outra coisa', 'Ficou olhando parado'] },
  { tipo: 'pergunta', bloco: 'Quando alguma coisa dá errado', texto: 'O que funciona pra ele(a) destravar quando fica assim?', instr: 'Pode marcar mais de uma',
    opcoes: ['Mostrar fazendo, sem falar muito', 'Explicar falando', 'Fazer junto, segurando a mão', 'Distrair com algo que gosta', 'Deixar sozinho um pouco', 'Colo'] },
  { tipo: 'pergunta', bloco: 'Como ele(a) pede e como conta', texto: 'Quando ele(a) quer alguma coisa, como pede?',
    opcoes: ['Fala', 'Aponta', 'Pega pela mão e leva', 'Traz o objeto e mostra', 'Pega sozinho', 'Fica manhoso até alguém perceber'] },
  { tipo: 'pergunta', bloco: 'Como ele(a) pede e como conta', texto: 'Quando ele(a) volta da escola, conta o que aconteceu lá?',
    opcoes: ['Conta sem a gente perguntar', 'Conta se a gente perguntar', 'Conta um pedacinho só', 'Conta, mas é difícil de entender', 'Não conta'] },
  { tipo: 'pergunta', bloco: 'Casa e fora de casa', texto: 'Ele(a) é diferente em casa e fora de casa?',
    opcoes: ['Fala muito mais em casa', 'É mais quieto em casa', 'É mais agitado em casa', 'É mais agitado fora', 'É bem parecido nos dois'] },
  { tipo: 'pergunta', bloco: 'Casa e fora de casa', texto: 'O que ele(a) já faz sozinho(a) em casa?', instr: 'Pode marcar mais de uma',
    opcoes: ['Come sozinho', 'Se veste, ou tenta', 'Escolhe a roupa', 'Guarda os brinquedos', 'Escova os dentes', 'Ainda faz tudo com ajuda'] },
  { tipo: 'pergunta', bloco: 'Casa e fora de casa', texto: 'Num lugar com crianças que ele(a) não conhece, o que faz?',
    opcoes: ['Entra na brincadeira logo', 'Fica olhando antes de entrar', 'Fica perto de você', 'Chama alguém pra brincar', 'Brinca sozinho do lado'] },
  { tipo: 'pergunta', bloco: 'Casa e fora de casa', texto: 'Quando alguém da casa fica triste ou bravo, ele(a) percebe?',
    opcoes: ['Vai perto', 'Pergunta o que houve', 'Fica quieto', 'Fica agitado também', 'Parece não perceber'] },
  { tipo: 'pergunta', bloco: 'Detalhe e som', texto: 'Ele(a) repara quando alguma coisa muda de lugar em casa?',
    opcoes: ['Repara e fala', 'Repara e arruma', 'Fica incomodado até arrumarem', 'Só repara se alguém falar', 'Não repara'] },
  { tipo: 'pergunta', bloco: 'Detalhe e som', texto: 'Quando toca música em casa, o que ele(a) faz?', instr: 'Pode marcar mais de uma',
    opcoes: ['Dança no ritmo', 'Canta junto ou tenta', 'Para pra ouvir', 'Continua o que fazia', 'Bate em algo fazendo som', 'Pede pra desligar'] },
];

const TOTAL = PERGUNTAS.length;

const QuestionarioPaisPreview = () => {
  const [i, setI] = useState(0);            // 0..4 entrada, 5.. perguntas, fim
  const [marcadas, setMarcadas] = useState<Record<number, string[]>>({});
  const [abertos, setAbertos] = useState<Record<number, boolean>>({});
  const [textos, setTextos] = useState<Record<number, string>>({});

  const nEntrada = ENTRADA.length;
  const idxPergunta = i - nEntrada;
  const noFim = idxPergunta >= TOTAL;
  const item = noFim ? null : idxPergunta < 0 ? ENTRADA[i] : PERGUNTAS[idxPergunta];

  const alterna = (op: string) => {
    setMarcadas((m) => {
      const atual = m[idxPergunta] ?? [];
      return { ...m, [idxPergunta]: atual.includes(op) ? atual.filter((x) => x !== op) : [...atual, op] };
    });
  };

  const marcadasAqui = marcadas[idxPergunta] ?? [];

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        backgroundColor: T.fundo,
        backgroundImage: `linear-gradient(180deg, rgba(6,38,66,.22) 0%, rgba(6,38,66,0) 34%), url("${CEU}")`,
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center top, center',
        color: '#fff',
      }}
    >
      {/* horizonte */}
      <div className="absolute pointer-events-none" style={{ left: '-14%', right: '-14%', bottom: '-110px', height: 210, borderRadius: '50%', background: '#3E8F63', opacity: 0.55, zIndex: 0 }} />
      <div className="absolute pointer-events-none" style={{ left: '-14%', right: '-14%', bottom: '-140px', height: 222, borderRadius: '50%', background: '#1F6141', zIndex: 0 }} />

      {/* passaros */}
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

        {/* topo */}
        <div className="flex items-center justify-between mb-5" style={{ minHeight: 28 }}>
          {i > 0 ? (
            <button onClick={() => setI((v) => v - 1)} className="p-1 -ml-1" style={{ color: 'rgba(255,255,255,.88)' }} aria-label="Voltar">
              <ChevronLeft size={19} />
            </button>
          ) : <span />}
          {idxPergunta >= 0 && !noFim && (
            <span className="text-[12px] tabular-nums" style={{ color: 'rgba(255,255,255,.76)', letterSpacing: '.06em' }}>
              {String(idxPergunta + 1).padStart(2, '0')} / {TOTAL}
            </span>
          )}
        </div>

        {/* fio de progresso */}
        {idxPergunta >= 0 && (
          <div className="mb-6" style={{ height: 1, background: 'rgba(255,255,255,.28)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: -0.5, height: 2, background: '#fff', width: `${(Math.min(idxPergunta + 1, TOTAL) / TOTAL) * 100}%`, transition: 'width .5s cubic-bezier(.22,.61,.36,1)' }} />
          </div>
        )}

        {/* ---------- FIM ---------- */}
        {noFim && (
          <>
            <p style={{ fontFamily: T.serif, fontSize: 44, lineHeight: 1.02, letterSpacing: '-.022em', margin: '0 0 16px' }}>Obrigado!</p>
            <p style={{ fontFamily: T.serif, fontSize: 21, lineHeight: 1.45, margin: '0 0 15px' }}>Recebi tudo. A professora do Arthur já vai ficar com o que você me contou.</p>
            <p style={{ fontFamily: T.serif, fontSize: 21, lineHeight: 1.45, margin: '0 0 15px' }}>No fim do semestre eu te mando o que a gente foi vendo, e também o que ainda não apareceu.</p>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,.74)' }}>Se quiser mudar alguma resposta, é só entrar de novo pelo mesmo link.</p>
            <div className="mt-auto pt-7">
              <button onClick={() => { setI(0); setMarcadas({}); setTextos({}); setAbertos({}); }}
                className="text-[13px] font-bold uppercase" style={{ letterSpacing: '.16em', color: 'rgba(255,255,255,.72)', borderBottom: '2px solid rgba(255,255,255,.4)', paddingBottom: 6 }}>
                Recomeçar
              </button>
            </div>
          </>
        )}

        {/* ---------- FALA ---------- */}
        {item && item.tipo === 'fala' && (
          <>
            {i === 0 && (
              <div className="flex items-center gap-2 mb-6">
                <svg viewBox="0 0 100 100" className="w-5 h-5" style={{ color: '#fff' }} aria-hidden>
                  <path d="M30 79 L50 27 L70 79" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="M50 27 C50 16 58 9 68 8 C69 19 61 26 50 27 Z" fill="currentColor" />
                </svg>
                <span className="text-[10.5px] font-bold uppercase" style={{ letterSpacing: '.24em', color: 'rgba(255,255,255,.82)' }}>Arboria</span>
              </div>
            )}
            {item.bloco && <p className="text-[10.5px] font-bold uppercase mb-5" style={{ letterSpacing: '.22em', color: 'rgba(255,255,255,.76)' }}>{item.bloco}</p>}
            {item.enorme && (
              <p style={{ fontFamily: T.serif, fontSize: item.enorme.length > 20 ? 32 : 44, lineHeight: 1.05, letterSpacing: '-.022em', margin: '0 0 16px' }}>{item.enorme}</p>
            )}
            {item.linhas.map((l, k) => (
              <p key={k} style={{ fontFamily: T.serif, fontSize: 21, lineHeight: 1.45, margin: '0 0 15px' }}>{l}</p>
            ))}
            {item.rodape && (
              <p className="text-[11.5px] mt-5" style={{ color: 'rgba(255,255,255,.66)', lineHeight: 1.5, maxWidth: '34ch' }}>{item.rodape}</p>
            )}
            <div className="mt-auto pt-7">
              {item.ctaSuave && (
                <span className="text-[13px] font-bold uppercase mr-6" style={{ letterSpacing: '.16em', color: 'rgba(255,255,255,.72)', borderBottom: '2px solid rgba(255,255,255,.4)', paddingBottom: 6 }}>{item.ctaSuave}</span>
              )}
              <button onClick={() => setI((v) => v + 1)} className="text-[13px] font-bold uppercase" style={{ letterSpacing: '.16em', color: '#fff', borderBottom: '2px solid #fff', paddingBottom: 6 }}>
                {item.cta}
              </button>
            </div>
          </>
        )}

        {/* ---------- CRIANÇA ---------- */}
        {item && item.tipo === 'crianca' && (
          <>
            <p className="text-[10.5px] font-bold uppercase mb-5" style={{ letterSpacing: '.22em', color: 'rgba(255,255,255,.76)' }}>Quem é ele(a)</p>
            <p style={{ fontFamily: T.serif, fontSize: 21, lineHeight: 1.45, margin: '0 0 15px' }}>Só para eu ter certeza de quem a gente está falando.</p>
            <div style={{ borderLeft: '2px solid rgba(255,255,255,.7)', padding: '4px 0 4px 16px', margin: '16px 0 4px' }}>
              <p style={{ fontFamily: T.serif, fontSize: 27, margin: '0 0 1px' }}>Arthur</p>
              <p className="text-[14px] m-0" style={{ color: 'rgba(255,255,255,.78)' }}>Maternal 2 B</p>
            </div>
            <p className="text-[13px] mt-6" style={{ color: 'rgba(255,255,255,.74)' }}>Data de nascimento dele(a)</p>
            <input
              inputMode="numeric" placeholder="__ / __ / ____"
              className="w-full bg-transparent outline-none"
              style={{ borderBottom: '1px solid rgba(255,255,255,.5)', padding: '12px 0', fontFamily: T.serif, fontSize: 22, color: '#fff', letterSpacing: '.1em', marginTop: 4 }}
            />
            <div className="mt-auto pt-7">
              <button onClick={() => setI((v) => v + 1)} className="text-[13px] font-bold uppercase" style={{ letterSpacing: '.16em', color: '#fff', borderBottom: '2px solid #fff', paddingBottom: 6 }}>
                {item.cta}
              </button>
            </div>
          </>
        )}

        {/* ---------- PERGUNTA ---------- */}
        {item && item.tipo === 'pergunta' && (
          <>
            <p className="text-[10.5px] font-bold uppercase mb-2.5" style={{ letterSpacing: '.22em', color: 'rgba(255,255,255,.76)' }}>{item.bloco}</p>
            <p style={{ fontFamily: T.serif, fontSize: 28, lineHeight: 1.24, letterSpacing: '-.012em', margin: '0 0 6px', textWrap: 'balance' as never }}>{item.texto}</p>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,.74)', margin: '0 0 20px' }}>{item.instr ?? 'Escolha uma'}</p>

            <div>
              {item.opcoes.map((op, k) => {
                const on = marcadasAqui.includes(op);
                return (
                  <button
                    key={op}
                    onClick={() => alterna(op)}
                    className="w-full flex items-center justify-between gap-3.5 text-left"
                    style={{
                      minHeight: 56, padding: '15px 0',
                      borderBottom: '1px solid rgba(255,255,255,.24)',
                      borderTop: k === 0 ? '1px solid rgba(255,255,255,.24)' : undefined,
                      fontFamily: T.serif, fontSize: 18.5, lineHeight: 1.35,
                      color: on ? '#fff' : 'rgba(255,255,255,.86)',
                    }}
                  >
                    <span>{op}</span>
                    <span style={{ flex: 'none', width: 22, height: 2, background: on ? '#fff' : 'transparent' }} />
                  </button>
                );
              })}
            </div>

            {abertos[idxPergunta] ? (
              <div className="mt-4">
                <p className="text-[12.5px] mb-2" style={{ color: 'rgba(255,255,255,.74)', letterSpacing: '.06em' }}>Quer contar como é?</p>
                <textarea
                  value={textos[idxPergunta] ?? ''}
                  onChange={(e) => setTextos((t) => ({ ...t, [idxPergunta]: e.target.value }))}
                  rows={2} placeholder="uma frase basta"
                  className="w-full bg-transparent outline-none resize-none"
                  style={{ borderBottom: '1px solid rgba(255,255,255,.42)', fontFamily: T.serif, fontSize: 17, color: '#fff', paddingBottom: 4 }}
                />
              </div>
            ) : (
              <button onClick={() => setAbertos((a) => ({ ...a, [idxPergunta]: true }))} className="flex items-center gap-2.5 mt-4 text-[14.5px]" style={{ color: 'rgba(255,255,255,.86)' }}>
                <span className="text-[17px] leading-none">+</span>
                <span style={{ textDecoration: 'underline', textUnderlineOffset: 4 }}>Quer contar como é?</span>
              </button>
            )}

            <button onClick={() => setI((v) => v + 1)} className="mt-4 text-[14.5px] self-start" style={{ color: 'rgba(255,255,255,.78)', textDecoration: 'underline', textUnderlineOffset: 4 }}>
              Não sei dizer
            </button>

            <div className="mt-auto pt-7">
              <button onClick={() => setI((v) => v + 1)} className="flex items-center gap-2 text-[13px] font-bold uppercase" style={{ letterSpacing: '.16em', color: '#fff', borderBottom: '2px solid #fff', paddingBottom: 6 }}>
                {marcadasAqui.length > 0 ? <>Próxima <Check size={14} /></> : 'Pular esta'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* aviso de protótipo */}
      <div className="relative text-center pb-4 text-[11px]" style={{ color: 'rgba(255,255,255,.55)', zIndex: 2 }}>
        protótipo · nada é gravado
      </div>
    </div>
  );
};

export default QuestionarioPaisPreview;
