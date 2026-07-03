import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, Sprout } from 'lucide-react';
import { infantilTheme as t } from '@/styles/infantilTheme';

const VISTO_KEY = 'infantil-tutorial-v1';
const EVENTO = 'abrir-tutorial-infantil';

/** Abre o tutorial de qualquer lugar (ícone Ajuda do header, Configurações). */
export const abrirTutorialInfantil = () => {
  window.dispatchEvent(new CustomEvent(EVENTO));
};

/* ---------- mini-ilustrações (miniaturas das telas reais) ---------- */

const MiniArboria = () => (
  <div className="w-[82%] rounded-2xl p-3 text-[11px]" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}>
    <p className="text-[9px] uppercase tracking-wide font-bold mb-1" style={{ color: t.accentText }}>Escolha a turma</p>
    <div className="flex gap-1.5">
      <span className="flex-1 rounded-lg py-1.5 text-center text-[10px] font-semibold" style={{ backgroundColor: t.accent, color: '#FFF' }}>Grupo IV · A</span>
      <span className="flex-1 rounded-lg py-1.5 text-center text-[10px] font-semibold" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, color: t.textMuted }}>Grupo IV · B</span>
    </div>
    <p className="text-[9px] uppercase tracking-wide font-bold mt-2 mb-1" style={{ color: t.textFaint }}>Fase 1 de 8 · Linguística</p>
    <div className="rounded-xl p-2.5 flex items-center gap-2" style={{ backgroundColor: t.accent, color: '#FFF' }}>
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px]" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>▶</span>
      <span>
        <b className="block text-[11px]">Iniciar aula</b>
        <span className="text-[8.5px] opacity-85">registre a turma no ritmo da sala</span>
      </span>
    </div>
  </div>
);

const MiniTrilha = () => {
  const nos = [
    { n: '✓', cor: '#1E3A8A', label: 'Linguística · concluída', forte: false },
    { n: '2', cor: '#047857', label: 'Lógico-Matemática · em andamento', forte: true },
    { n: '3', cor: '', label: 'Espacial · a seguir', forte: false },
    { n: '4', cor: '', label: 'Musical · a seguir', forte: false },
  ];
  return (
    <div className="w-[82%] rounded-2xl p-3" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}>
      <p className="text-[9px] uppercase tracking-wide font-bold mb-2" style={{ color: t.accentText }}>As 8 explorações do ano</p>
      <div className="space-y-1.5">
        {nos.map((no, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
              style={
                no.cor
                  ? { backgroundColor: no.cor, color: '#FFF', boxShadow: no.forte ? `0 0 0 3px ${t.accentSoft}` : 'none' }
                  : { backgroundColor: t.surface, border: `1.5px solid ${t.silencio}`, color: t.textFaint }
              }
            >
              {no.n}
            </span>
            <span style={{ color: no.forte ? t.text : t.textFaint, fontWeight: no.forte ? 700 : 400 }}>{no.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MiniAula = () => (
  <div className="w-[82%] rounded-2xl overflow-hidden text-[10px]" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}>
    <div style={{ height: 3, backgroundColor: '#047857' }} />
    <div className="p-3 space-y-1.5">
      <p className="text-[9px]" style={{ color: t.textFaint }}>
        ● Aula em andamento · <b style={{ color: '#065F46' }}>Fase Lógico-Matemática</b>
      </p>
      {[
        { ini: 'AL', nome: 'Alice Fontes', selo: true },
        { ini: 'BE', nome: 'Bernardo Lima', campo: true },
        { ini: 'CE', nome: 'Cecília Ramos' },
      ].map((c, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg p-1.5" style={{ backgroundColor: t.surface, border: `1px solid ${c.campo ? t.accent : t.border}` }}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[7.5px] font-bold flex-shrink-0" style={{ backgroundColor: t.accentSoft, color: t.accentText }}>
            {c.ini}
          </span>
          <span className="min-w-0">
            <b className="block text-[9.5px]" style={{ color: t.text }}>{c.nome}</b>
            {c.selo && <span className="text-[8px]" style={{ color: t.presenteText }}>🌱 registrado hoje</span>}
            {c.campo && <span className="text-[8px]" style={{ color: t.textFaint }}>Como Bernardo entrou na atividade hoje?|</span>}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const CORES_8 = ['#1E3A8A', '#047857', '#7C3AED', '#7F1D1D', '#B8860B', '#78350F', '#0891B2', '#EA580C'];
const MiniSantuario = () => (
  <div className="w-[82%] rounded-2xl p-3 text-center" style={{ backgroundColor: '#322B8F', boxShadow: t.shadowMd }}>
    <div className="flex gap-1 justify-center mb-2">
      {CORES_8.map((c, i) => (
        <span
          key={i}
          className="w-4 h-4 rounded-full flex items-center justify-center text-[6.5px] font-bold"
          style={i === 1 ? { backgroundColor: '#FFF', color: c } : { backgroundColor: `${c}55`, border: '1px solid rgba(255,255,255,0.4)', color: '#FFF' }}
        >
          {i + 1}
        </span>
      ))}
    </div>
    <p className="font-serif text-[14px]" style={{ color: '#FFF' }}>Lógico-Matemática</p>
    <div className="rounded-full mx-auto my-1.5" style={{ width: 40, height: 4, backgroundColor: '#75B5A3' }} />
    <p className="text-[8.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
      "Não é sobre números. É sobre COMO a criança encadeia o pensamento."
    </p>
  </div>
);

const MiniDiario = () => (
  <div className="w-[82%] rounded-2xl p-3" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}>
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[7.5px] font-bold" style={{ backgroundColor: t.accentSoft, color: t.accentText }}>MC</span>
      <b className="text-[10px]" style={{ color: t.text }}>Maria Clara</b>
      <span className="text-[8px]" style={{ color: t.textFaint }}>· 12 momentos</span>
    </div>
    <div className="text-center mb-1.5">
      <span className="text-[7.5px] rounded-full px-2 py-0.5" style={{ backgroundColor: t.accentSoft, color: t.accentText }}>Fase Linguística</span>
    </div>
    {[
      'Narrou a brincadeira inteira enquanto montava: "agora ele sobe, agora cai"...',
      'Corrigiu a colega quando mudou a palavra da história de sempre.',
    ].map((txt, i) => (
      <div key={i} className="rounded-r-lg p-1.5 mb-1 max-w-[90%] text-[8.5px] leading-relaxed" style={{ backgroundColor: t.surfaceAlt, borderLeft: `2.5px solid ${t.accent}`, color: t.text }}>
        {txt}
      </div>
    ))}
  </div>
);

/* ---------- as 7 páginas (aprovadas pelo Fundador em 03/07) ---------- */

interface Pagina {
  titulo: string;
  corpo: React.ReactNode | null;
  ilus: React.ReactNode;
  fundo: string;
}

const PAGINAS: Pagina[] = [
  {
    titulo: 'Bem-vindos ao Arboria',
    corpo: null,
    fundo: t.accentSoft,
    ilus: (
      <svg viewBox="0 0 100 100" style={{ width: 72, height: 72 }} aria-hidden="true">
        <path d="M30 79 L50 27 L70 79" stroke={t.accent} strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M50 27 C50 16 58 9 68 8 C69 19 61 26 50 27 Z" fill={t.accent} />
      </svg>
    ),
  },
  {
    titulo: 'Arboria — o seu dia começa aqui.',
    fundo: t.bg,
    ilus: <MiniArboria />,
    corpo: (
      <>
        É o painel da prática: <b>escolha a turma</b>, veja em qual fase ela está e toque em{' '}
        <b>Iniciar aula</b> quando for registrar. Cada turma tem a própria trilha.
      </>
    ),
  },
  {
    titulo: '"O ano" — a trilha das 8 explorações.',
    fundo: t.bg,
    ilus: <MiniTrilha />,
    corpo: (
      <>
        A turma atravessa <b>8 fases no ano</b>, uma por mecanismo. Você começa e finaliza cada
        fase quando sentir que é hora — e a virada é um momento bonito, pode confiar.
        <span className="block mt-2.5 italic text-[13px]" style={{ color: t.accentText }}>
          A fase é da TURMA — nunca da criança.
        </span>
      </>
    ),
  },
  {
    titulo: 'A aula — toque no nome, escreva, pronto.',
    fundo: t.bg,
    ilus: <MiniAula />,
    corpo: (
      <>
        Na aula, a turma aparece em lista. <b>Tocou numa criança, abre o campo</b>: escreva como
        ela chegou (pode ditar pelo microfone!) e toque em Guardar. O brotinho acende.{' '}
        <b>Quem você não registrar, tudo bem</b> — ninguém precisa registrar todo mundo.
        <span className="block mt-2.5 italic text-[13px]" style={{ color: t.accentText }}>
          Registre o caminho, não o resultado.
        </span>
      </>
    ),
  },
  {
    titulo: 'Fase — o lugar de estudar o mecanismo.',
    fundo: t.accentDeep,
    ilus: <MiniSantuario />,
    corpo: (
      <>
        A aba escura é o seu <b>santuário de estudo</b>: o que é o mecanismo da fase, como ele
        aparece na sala, o que NÃO é sinal. Toque nos números pra conhecer os 8 — a qualquer
        momento do ano.
        <span className="block mt-2.5 italic text-[13px]" style={{ color: t.accentText }}>
          Não é lista pra diagnosticar criança — é lente pro seu olhar.
        </span>
      </>
    ),
  },
  {
    titulo: 'Diário — a história de cada criança.',
    fundo: t.bg,
    ilus: <MiniDiario />,
    corpo: (
      <>
        Cada criança tem um <b>diário estilo conversa</b>: tudo que você (e sua colega de sala)
        já escreveram, fase a fase. Registre a qualquer hora — não precisa estar em aula. Errou?{' '}
        <b>Segure o balão</b> pra corrigir.
      </>
    ),
  },
  {
    titulo: 'O essencial, pra levar no bolso.',
    fundo: t.accentSoft,
    ilus: (
      <div className="text-center px-6">
        <Sprout size={34} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: t.accent }} />
        <p className="font-serif italic text-[13.5px] leading-relaxed" style={{ color: t.accentText }}>
          "Nada do que você enxerga se perde — vira história."
        </p>
      </div>
    ),
    corpo: (
      <>
        <b>1.</b> A fase é da turma — nunca da criança.
        <br />
        <b>2.</b> Registre o caminho, não o resultado: "chegou assim", não "foi bem".
        <br />
        <b>3.</b> Silêncio não é ausência — a criança sem registro está só esperando o contexto
        dela.
      </>
    ),
  },
];

/**
 * TUTORIAL DO PROFESSOR — "o caderninho de bolso" (aprovado pelo Fundador 03/07).
 *
 * Abre SOZINHO na primeira entrada (localStorage) e fica sempre à mão: ícone
 * Ajuda no header + Configurações → "Como usar o Arboria". Swipe entre páginas,
 * "Pular" sempre visível — tutorial nunca é prisão.
 */
const TutorialInfantil = () => {
  const [aberto, setAberto] = useState(false);
  const [pg, setPg] = useState(0);
  const toqueRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Primeira entrada: abre sozinho, uma vez
    try {
      if (!localStorage.getItem(VISTO_KEY)) setAberto(true);
    } catch {
      /* sem localStorage */
    }
    // Reabrível de qualquer lugar (header, Configurações)
    const abrir = () => {
      setPg(0);
      setAberto(true);
    };
    window.addEventListener(EVENTO, abrir);
    return () => window.removeEventListener(EVENTO, abrir);
  }, []);

  const fechar = () => {
    try {
      localStorage.setItem(VISTO_KEY, 'ok');
    } catch {
      /* segue */
    }
    setAberto(false);
  };

  if (!aberto) return null;

  const p = PAGINAS[pg];
  const ultima = pg === PAGINAS.length - 1;

  const onTouchStart = (e: React.TouchEvent) => {
    toqueRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const ini = toqueRef.current;
    toqueRef.current = null;
    if (!ini) return;
    const dx = e.changedTouches[0].clientX - ini.x;
    const dy = e.changedTouches[0].clientY - ini.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    if (dx < 0 && !ultima) setPg(pg + 1);
    if (dx > 0 && pg > 0) setPg(pg - 1);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ backgroundColor: t.bg }}
      role="dialog"
      aria-modal="true"
      aria-label="Como usar o Arboria"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex-1 flex flex-col max-w-lg w-full mx-auto px-6 pt-6 pb-6 pb-safe overflow-y-auto">
        {/* Topo */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10.5px] uppercase font-semibold" style={{ color: t.accentText, letterSpacing: '0.3em' }}>
            Como usar o Arboria
          </p>
          <button onClick={fechar} className="flex items-center gap-1 text-xs p-2 -m-2" style={{ color: t.textFaint }}>
            Pular <X size={14} />
          </button>
        </div>

        {/* Página (key reinicia a entrada) */}
        <div key={pg} className="flex-1 flex flex-col tab-in-fade">
          <div
            className="rounded-2xl flex items-center justify-center mb-5 flex-shrink-0"
            style={{ backgroundColor: p.fundo, height: 250, transition: 'background-color 400ms ease' }}
          >
            {p.ilus}
          </div>

          <h2
            className={`font-serif leading-snug ${p.corpo ? 'text-[23px] mb-3' : 'text-[27px] text-center mt-2'}`}
            style={{ color: t.text }}
          >
            {p.titulo}
          </h2>

          {p.corpo && (
            <p className="text-sm leading-relaxed" style={{ color: t.textMuted }}>
              {p.corpo}
            </p>
          )}

          {/* Navegação */}
          <div className="mt-auto pt-5 flex items-center justify-between">
            <button
              onClick={() => setPg(Math.max(0, pg - 1))}
              className="flex items-center gap-0.5 text-sm py-2.5 pr-3"
              style={{ color: t.textFaint, visibility: pg === 0 ? 'hidden' : 'visible' }}
            >
              <ChevronLeft size={15} /> Voltar
            </button>
            <div className="flex gap-1.5" aria-hidden="true">
              {PAGINAS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPg(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === pg ? 16 : 6,
                    height: 6,
                    backgroundColor: i === pg ? t.accent : t.border,
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => (ultima ? fechar() : setPg(pg + 1))}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5"
              style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
            >
              {ultima ? (
                <>
                  Começar <Sprout size={15} strokeWidth={2} />
                </>
              ) : (
                'Avançar ›'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialInfantil;
