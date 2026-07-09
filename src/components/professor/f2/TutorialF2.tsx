import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, Sprout, Play, Trophy, Crown, MessageCircle, Route as RouteIcon } from 'lucide-react';
import { infantilTheme as t } from '@/styles/infantilTheme';

const EVENTO = 'abrir-tutorial-f2';

/** Abre o tutorial do F2 de qualquer lugar (ícone Ajuda do header, Configurações). */
export const abrirTutorialF2 = () => {
  window.dispatchEvent(new CustomEvent(EVENTO));
};

/* As 8 cores canônicas (mesmo conjunto do santuário do F2). */
const CORES_8 = ['#1E3A8A', '#047857', '#7C3AED', '#7F1D1D', '#B8860B', '#78350F', '#0891B2', '#EA580C'];

/* ---------- a marca (logo) pra abertura centralizada ---------- */
const Marca = ({ cor, tam = 66 }: { cor: string; tam?: number }) => (
  <svg viewBox="0 0 100 100" style={{ width: tam, height: tam }} aria-hidden="true">
    <path d="M30 79 L50 27 L70 79" stroke={cor} strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M50 27 C50 16 58 9 68 8 C69 19 61 26 50 27 Z" fill={cor} />
  </svg>
);

/* ---------- mini-ilustrações (miniaturas das telas reais do mentor) ---------- */

/* Arboria: o panorama das turmas + o capítulo de agora. */
const MiniArboria = ({ cor }: { cor: string }) => (
  <div className="w-[82%] rounded-2xl p-3 text-[11px]" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}>
    <p className="text-[9px] uppercase tracking-wide font-bold mb-1.5" style={{ color: t.textFaint }}>Suas turmas</p>
    <div className="space-y-1.5">
      {[
        { turma: '7º Ano · A', selo: 'Sua vez', forte: true },
        { turma: '8º Ano · B', selo: 'A caminho', forte: false },
      ].map((r, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg p-1.5" style={{ backgroundColor: t.surface, border: `1px solid ${r.forte ? cor : t.border}` }}>
          <span className="w-5 h-5 rounded-md flex-shrink-0" style={{ backgroundColor: r.forte ? cor : t.silencio }} />
          <b className="flex-1 text-[10px]" style={{ color: t.text }}>{r.turma}</b>
          <span className="text-[8px] rounded-full px-1.5 py-0.5 font-semibold" style={r.forte ? { backgroundColor: cor, color: '#FFF' } : { backgroundColor: t.surfaceAlt, color: t.textFaint }}>{r.selo}</span>
        </div>
      ))}
    </div>
    <div className="rounded-xl p-2.5 flex items-center gap-2 mt-2" style={{ backgroundColor: cor, color: '#FFF' }}>
      <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
        <Play size={11} strokeWidth={2.25} fill="#FFF" />
      </span>
      <span>
        <b className="block text-[11px]">O capítulo de agora</b>
        <span className="text-[8.5px] opacity-85">a jornada da vez, encontro a encontro</span>
      </span>
    </div>
  </div>
);

/* Inteligências: o santuário das 8 Casas. */
const MiniSantuario = ({ cor }: { cor: string }) => (
  <div className="w-[82%] rounded-2xl p-3 text-center" style={{ backgroundColor: '#322B8F', boxShadow: t.shadowMd }}>
    <div className="flex gap-1 justify-center mb-2">
      {CORES_8.map((c, i) => (
        <span
          key={i}
          className="w-4 h-4 rounded-full flex items-center justify-center text-[6.5px] font-bold"
          style={i === 4 ? { backgroundColor: '#FFF', color: c } : { backgroundColor: `${c}55`, border: '1px solid rgba(255,255,255,0.4)', color: '#FFF' }}
        >
          {i + 1}
        </span>
      ))}
    </div>
    <p className="font-serif text-[13.5px]" style={{ color: '#FFF' }}>Casa Naturalista</p>
    <div className="rounded-full mx-auto my-1.5" style={{ width: 40, height: 4, backgroundColor: cor }} />
    <p className="text-[8.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
      "Não é sobre bichos e plantas. É sobre COMO o aluno classifica o mundo."
    </p>
  </div>
);

/* Diário: a grade de alunos + o balão do registro. */
const MiniDiario = ({ cor }: { cor: string }) => (
  <div className="w-[82%] rounded-2xl p-3" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}>
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[7.5px] font-bold" style={{ backgroundColor: `${cor}22`, color: cor }}>JP</span>
      <b className="text-[10px]" style={{ color: t.text }}>João Pedro</b>
      <span className="text-[8px]" style={{ color: t.textFaint }}>· 9 momentos</span>
    </div>
    <div className="text-center mb-1.5">
      <span className="text-[7.5px] rounded-full px-2 py-0.5" style={{ backgroundColor: `${cor}18`, color: cor }}>Pergunta do dia · como ele começou?</span>
    </div>
    {[
      'Desmontou o problema em partes antes de responder, do fim pro começo.',
      'Trouxe um exemplo próprio que ninguém tinha citado na roda.',
    ].map((txt, i) => (
      <div key={i} className="rounded-r-lg p-1.5 mb-1 max-w-[92%] text-[8.5px] leading-relaxed" style={{ backgroundColor: t.surfaceAlt, borderLeft: `2.5px solid ${cor}`, color: t.text }}>
        {txt}
      </div>
    ))}
  </div>
);

/* Sua Casa: pontuação, ranking, membros, líderes, chat. */
const MiniCasa = ({ cor }: { cor: string }) => (
  <div className="w-[82%] rounded-2xl overflow-hidden text-[10px]" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}>
    <div className="p-3" style={{ background: `linear-gradient(135deg, ${cor}, ${cor}CC)` }}>
      <p className="text-[8.5px] uppercase tracking-wide font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>A Casa que você mentora</p>
      <div className="flex items-end gap-2 mt-1">
        <b className="font-serif text-[18px]" style={{ color: '#FFF' }}>1.240 pts</b>
        <span className="text-[8.5px] mb-0.5 flex items-center gap-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
          <Trophy size={9} /> 2º de 8
        </span>
      </div>
    </div>
    <div className="p-2.5 space-y-1">
      {[
        { ini: 'AL', nome: 'Alice Fontes', cargo: 'Líder', lider: true },
        { ini: 'RA', nome: 'Rafael Souza', cargo: '', lider: false },
      ].map((m, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[7.5px] font-bold flex-shrink-0" style={{ backgroundColor: `${cor}22`, color: cor }}>{m.ini}</span>
          <b className="flex-1 text-[9.5px]" style={{ color: t.text }}>{m.nome}</b>
          {m.lider && <span className="text-[8px] flex items-center gap-0.5 font-semibold" style={{ color: cor }}><Crown size={9} /> {m.cargo}</span>}
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-lg p-1.5 mt-1" style={{ backgroundColor: t.surfaceAlt }}>
        <MessageCircle size={13} style={{ color: cor }} />
        <span className="text-[9px]" style={{ color: t.textMuted }}>Chat da Casa</span>
      </div>
    </div>
  </div>
);

/* O capítulo: a jornada (encontros) + alocar/observar. */
const MiniCapitulo = ({ cor }: { cor: string }) => (
  <div className="w-[82%] rounded-2xl p-3" style={{ backgroundColor: '#241F5C', boxShadow: t.shadowMd }}>
    <div className="flex items-center gap-1.5 mb-2">
      <RouteIcon size={13} style={{ color: cor }} />
      <p className="text-[9px] uppercase tracking-wide font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>A jornada · 4 encontros</p>
    </div>
    <div className="space-y-1.5">
      {[
        { n: '✓', label: 'Abertura do tema', ativo: false, done: true },
        { n: '2', label: 'Divisão em frentes', ativo: true, done: false },
        { n: '3', label: 'Produção em grupos', ativo: false, done: false },
      ].map((e, i) => (
        <div key={i} className="flex items-center gap-2 text-[9.5px]">
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
            style={e.done
              ? { backgroundColor: cor, color: '#FFF' }
              : e.ativo
                ? { backgroundColor: '#FFF', color: cor, boxShadow: `0 0 0 3px ${cor}66` }
                : { backgroundColor: 'transparent', border: '1.5px solid rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.6)' }}
          >
            {e.n}
          </span>
          <span style={{ color: e.ativo ? '#FFF' : 'rgba(255,255,255,0.65)', fontWeight: e.ativo ? 700 : 400 }}>{e.label}</span>
        </div>
      ))}
    </div>
    <div className="rounded-lg p-2 mt-2 text-[8.5px] leading-relaxed" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}>
      Toque num aluno pra alocar na frente, dividir os grupos e registrar o que você observa.
    </div>
  </div>
);

/* ---------- as páginas ---------- */

interface Pagina {
  centrado?: boolean;
  fundo: string;
  conteudo?: React.ReactNode; // páginas "statement" (centralizadas)
  ilus?: React.ReactNode; // páginas de detalhe
  titulo?: string;
  corpo?: React.ReactNode;
}

const fraseC = (children: React.ReactNode) => (
  <div className="font-serif text-[20px] leading-normal text-center" style={{ color: t.accentText, maxWidth: '24ch' }}>
    {children}
  </div>
);
const pancoraC = (children: React.ReactNode) => (
  <p className="italic text-[13.5px] text-center" style={{ color: t.accentText, maxWidth: '26ch' }}>
    {children}
  </p>
);
const grifo = (cor: string) => ({ color: cor, fontWeight: 600 });

const construirPaginas = (cor: string): Pagina[] => [
  {
    centrado: true,
    fundo: t.accentSoft,
    conteudo: (
      <>
        <Marca cor={cor} />
        <div className="font-serif text-[27px] leading-tight text-center" style={{ color: t.text }}>
          Bem-vindo(a)<br />ao Arboria
        </div>
      </>
    ),
  },
  {
    centrado: true,
    fundo: t.accentSoft,
    conteudo: fraseC(
      <>
        Como mentor de uma Casa, você acompanha o aluno pelo modo <b>como ele pensa</b>, sem nota e sem rótulo, e guarda isso ao longo dos anos.
      </>
    ),
  },
  {
    centrado: true,
    fundo: t.bg,
    conteudo: (
      <>
        {fraseC(
          <>
            A Casa é um <b>mecanismo de pensar</b>, nunca uma etiqueta. É a porta que abre mais fácil no aluno, jamais um teto.
          </>
        )}
        {pancoraC('Você já enxerga isso na sala. Aqui, o que você vê não se perde mais.')}
      </>
    ),
  },
  {
    fundo: t.bg,
    ilus: (
      <div className="w-[80%] space-y-2 text-[11px]">
        {[
          { c: cor, ic: '◔', tt: 'Arboria', ss: 'suas turmas, o ano e o capítulo de agora' },
          { c: '#322B8F', ic: '◎', tt: 'Inteligências', ss: 'o santuário das 8 Casas: estudo' },
          { c: '#177A50', ic: '✎', tt: 'Diário', ss: 'o registro vivo de cada aluno' },
          { c: cor, ic: '⌂', tt: 'Sua Casa', ss: 'a Casa que você mentora' },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl p-2.5" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] flex-shrink-0" style={{ backgroundColor: r.c, color: '#FFF' }}>{r.ic}</span>
            <span><b className="text-[12px]" style={{ color: t.text }}>{r.tt}</b><br /><span className="text-[9.5px]" style={{ color: t.textFaint }}>{r.ss}</span></span>
          </div>
        ))}
      </div>
    ),
    titulo: 'O app do mentor tem quatro abas',
    corpo: (
      <>
        Você acompanha o dia na <b>Arboria</b>, <b>estuda</b> em Inteligências, tudo que vê <b>vira história</b> no Diário, e cuida da sua gente em <b>Sua Casa</b>.
      </>
    ),
  },
  {
    fundo: t.bg,
    ilus: <MiniArboria cor={cor} />,
    titulo: 'Arboria: seu panorama',
    corpo: (
      <>
        Suas turmas com o selo de quem está na vez, o calendário do ano e o <b>capítulo de agora</b>, tudo em uma tela. É por aqui que você entra pra conduzir.
        <span className="block mt-2.5 italic text-[13px]" style={grifo(cor)}>
          O panorama primeiro; o detalhe depois.
        </span>
      </>
    ),
  },
  {
    fundo: t.accentDeep,
    ilus: <MiniSantuario cor={cor} />,
    titulo: 'Inteligências: as 8 Casas',
    corpo: (
      <>
        O santuário de estudo: o que é cada Casa, como ela aparece na sala e o que NÃO é sinal. Toque nos números pra percorrer as oito.
        <span className="block mt-2.5 italic text-[13px]" style={{ color: t.accentText }}>
          Não é lista pra diagnosticar: é lente pro seu olhar.
        </span>
      </>
    ),
  },
  {
    fundo: t.bg,
    ilus: <MiniDiario cor={cor} />,
    titulo: 'Diário: tudo vira história',
    corpo: (
      <>
        Na grade de alunos, toque num nome e registre como ele chegou. A <b>pergunta do dia</b> e os <b>inícios de frase</b> ajudam a começar, e você pode anexar a <b>foto do trabalho</b>.
        <span className="block mt-2.5 italic text-[13px]" style={grifo(cor)}>
          Registre o caminho, não o resultado.
        </span>
      </>
    ),
  },
  {
    fundo: t.bg,
    ilus: <MiniCasa cor={cor} />,
    titulo: 'Sua Casa: a sua gente',
    corpo: (
      <>
        A Casa que você mentora: a pontuação, o lugar no ranking, os membros, os líderes e o chat pra falar com todos. É o time que caminha com você o ano inteiro.
        <span className="block mt-2.5 italic text-[13px]" style={grifo(cor)}>
          A Casa reúne; ela nunca separa por valor.
        </span>
      </>
    ),
  },
  {
    fundo: t.accentDeep,
    ilus: <MiniCapitulo cor={cor} />,
    titulo: 'O capítulo: conduza a jornada',
    corpo: (
      <>
        Ao administrar um capítulo você vê a <b>jornada</b> encontro a encontro, <b>aloca os alunos</b> nos temas e frentes, divide em <b>grupos</b> e <b>observa</b> enquanto acontece.
        <span className="block mt-2.5 italic text-[13px]" style={{ color: t.accentText }}>
          O que o aluno conta de si é porta, nunca prova.
        </span>
      </>
    ),
  },
  {
    fundo: t.accentSoft,
    ilus: (
      <div className="text-center px-6">
        <Sprout size={34} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: cor }} />
        <p className="font-serif italic text-[13.5px] leading-relaxed" style={{ color: t.accentText }}>
          "A Casa é a porta que abre mais fácil, nunca o teto do aluno."
        </p>
      </div>
    ),
    titulo: 'Pra levar no bolso',
    corpo: (
      <>
        <b>1.</b> A Casa é mecanismo de pensar, nunca rótulo nem teto.
        <br />
        <b>2.</b> Registre o COMO, não o resultado.
        <br />
        <b>3.</b> Silêncio não é ausência: pode ser um canal bloqueado.
        <br />
        <b>4.</b> O autorrelato do aluno é porta, não prova.
      </>
    ),
  },
  {
    centrado: true,
    fundo: t.accentSoft,
    conteudo: (
      <>
        {fraseC(
          <>
            O Arboria é o <b>caminho</b>, nunca o final. Comece pequeno, uma cena por vez, e você vai fazer parte da história de cada aluno.
          </>
        )}
        {pancoraC('Enxergar um aluno é o trabalho mais importante da escola. É o seu.')}
      </>
    ),
  },
];

/**
 * TUTORIAL DO MENTOR (Fundamental 2, reforma, atrás do flag F2_REFORMA_ATIVA).
 *
 * Irmão do TutorialInfantil: mesmo shell (modal em passos, mini-ilustrações das
 * telas reais, pele clara do infantilTheme, swipe, "Pular" sempre visível), mas
 * com as QUATRO abas do mentor (Arboria, Inteligências, Diário, Sua Casa) mais o
 * capítulo. A cor da Casa que o mentor mentora entra como acento (prop `cor`).
 *
 * Componente próprio (não uma variante do TutorialInfantil) porque os conceitos
 * do F2 divergem bastante (Casa, capítulo, ranking, chat): manter separado deixa
 * o Infantil/F1 intocados. Abre sozinho na 1ª entrada (localStorage próprio) e é
 * reabrível pelo ícone Ajuda do header e por Configurações.
 */
const TutorialF2 = ({ cor = t.accent }: { cor?: string }) => {
  const [aberto, setAberto] = useState(false);
  const [pg, setPg] = useState(0);
  const toqueRef = useRef<{ x: number; y: number } | null>(null);

  const paginas = useMemo(() => construirPaginas(cor), [cor]);
  const VISTO_KEY = 'arboria-tutorial-f2-v1';

  useEffect(() => {
    try {
      if (!localStorage.getItem(VISTO_KEY)) setAberto(true);
    } catch {
      /* sem localStorage */
    }
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

  const p = paginas[pg];
  const ultima = pg === paginas.length - 1;

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
      <div
        className="flex-1 flex flex-col max-w-lg w-full mx-auto px-6 pb-6 pb-safe overflow-y-auto"
        style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }}
      >
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
          {p.centrado ? (
            <div
              className="rounded-2xl flex-1 flex flex-col items-center justify-center text-center gap-5 px-7 py-8"
              style={{ backgroundColor: p.fundo, transition: 'background-color 400ms ease' }}
            >
              {p.conteudo}
            </div>
          ) : (
            <>
              <div
                className="rounded-2xl flex items-center justify-center mb-5 flex-shrink-0"
                style={{ backgroundColor: p.fundo, height: 250, transition: 'background-color 400ms ease' }}
              >
                {p.ilus}
              </div>
              <h2 className="font-serif leading-snug text-[23px] mb-3" style={{ color: t.text }}>
                {p.titulo}
              </h2>
              {p.corpo && (
                <p className="text-sm leading-relaxed texto-justificado" style={{ color: t.textMuted }}>
                  {p.corpo}
                </p>
              )}
            </>
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
              {paginas.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPg(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === pg ? 16 : 6,
                    height: 6,
                    backgroundColor: i === pg ? cor : t.border,
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => (ultima ? fechar() : setPg(pg + 1))}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5"
              style={{ backgroundColor: cor, color: '#FFFFFF', boxShadow: t.shadowMd }}
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

export default TutorialF2;
