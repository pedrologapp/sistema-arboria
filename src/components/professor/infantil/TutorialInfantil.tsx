import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, Sprout } from 'lucide-react';
import { infantilTheme as t } from '@/styles/infantilTheme';

const EVENTO = 'abrir-tutorial-infantil';

/** Abre o tutorial de qualquer lugar (ícone Ajuda do header, Configurações). */
export const abrirTutorialInfantil = () => {
  window.dispatchEvent(new CustomEvent(EVENTO));
};

type Variante = 'infantil' | 'f1';

interface Cfg {
  unid: string;        // 'exploração' | 'módulo'
  unidCap: string;     // 'Exploração' | 'Módulo'
  pessoa: string;      // 'criança' | 'aluno'
  pessoaArt: string;   // 'a criança' | 'o aluno'
  daPessoa: string;    // 'da criança' | 'do aluno'
  home: string;        // 'Arboria' | 'Academia'
  trilhaTit: string;   // 'As 8 explorações do ano' | 'Os 8 superpoderes/talentos do ano'
  intelPre: string;    // '' | 'Inteligência '
  turmaEx: string;     // 'Grupo IV · A' | '1º Ano · A'
  faixaNota: string;   // '' | ' (superpoderes no 1º ao 3º, talentos no 4º e 5º)'
}

const montarCfg = (variante: Variante, faixa1: boolean): Cfg => {
  if (variante === 'f1') {
    return {
      unid: 'módulo',
      unidCap: 'Módulo',
      pessoa: 'aluno',
      pessoaArt: 'o aluno',
      daPessoa: 'do aluno',
      home: 'Academia',
      trilhaTit: faixa1 ? 'Os 8 superpoderes do ano' : 'Os 8 talentos do ano',
      intelPre: 'Inteligência ',
      turmaEx: faixa1 ? '2º Ano · A' : '5º Ano · A',
      faixaNota: ' (superpoderes no 1º ao 3º, talentos no 4º e 5º)',
    };
  }
  return {
    unid: 'exploração',
    unidCap: 'Exploração',
    pessoa: 'criança',
    pessoaArt: 'a criança',
    daPessoa: 'da criança',
    home: 'Arboria',
    trilhaTit: 'As 8 explorações do ano',
    intelPre: '',
    turmaEx: 'Grupo IV · A',
    faixaNota: '',
  };
};

/* ---------- a marca (logo) pra abertura centralizada ---------- */
const Marca = ({ tam = 66 }: { tam?: number }) => (
  <svg viewBox="0 0 100 100" style={{ width: tam, height: tam }} aria-hidden="true">
    <path d="M30 79 L50 27 L70 79" stroke={t.accent} strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M50 27 C50 16 58 9 68 8 C69 19 61 26 50 27 Z" fill={t.accent} />
  </svg>
);

const CORES_8 = ['#1E3A8A', '#047857', '#7C3AED', '#7F1D1D', '#B8860B', '#78350F', '#0891B2', '#EA580C'];

/* ---------- mini-ilustrações (miniaturas das telas reais) ---------- */

const MiniHome = ({ cfg }: { cfg: Cfg }) => (
  <div className="w-[82%] rounded-2xl p-3 text-[11px]" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}>
    <p className="text-[9px] uppercase tracking-wide font-bold mb-1" style={{ color: t.accentText }}>Escolha a turma</p>
    <div className="flex gap-1.5">
      <span className="flex-1 rounded-lg py-1.5 text-center text-[10px] font-semibold" style={{ backgroundColor: t.accent, color: '#FFF' }}>{cfg.turmaEx}</span>
      <span className="flex-1 rounded-lg py-1.5 text-center text-[10px] font-semibold" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, color: t.textMuted }}>{cfg.turmaEx.replace('A', 'B')}</span>
    </div>
    <p className="text-[9px] uppercase tracking-wide font-bold mt-2 mb-1" style={{ color: t.textFaint }}>{cfg.unidCap} 1 de 8 · {cfg.intelPre}Linguística</p>
    <div className="rounded-xl p-2.5 flex items-center gap-2" style={{ backgroundColor: t.accent, color: '#FFF' }}>
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px]" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>▶</span>
      <span>
        <b className="block text-[11px]">Iniciar aula</b>
        <span className="text-[8.5px] opacity-85">registre a turma no ritmo da sala</span>
      </span>
    </div>
  </div>
);

const MiniTrilha = ({ cfg }: { cfg: Cfg }) => {
  const nos = [
    { n: '✓', cor: '#1E3A8A', label: `${cfg.intelPre}Linguística · concluído`, forte: false },
    { n: '2', cor: '#047857', label: `${cfg.intelPre}Lógico-Matemática · em andamento`, forte: true },
    { n: '3', cor: '', label: `${cfg.intelPre}Espacial · a seguir`, forte: false },
    { n: '4', cor: '', label: `${cfg.intelPre}Musical · a seguir`, forte: false },
  ];
  return (
    <div className="w-[82%] rounded-2xl p-3" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}>
      <p className="text-[9px] uppercase tracking-wide font-bold mb-2" style={{ color: t.accentText }}>{cfg.trilhaTit}</p>
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

const MiniAula = ({ cfg }: { cfg: Cfg }) => (
  <div className="w-[82%] rounded-2xl overflow-hidden text-[10px]" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}>
    <div style={{ height: 3, backgroundColor: '#047857' }} />
    <div className="p-3 space-y-1.5">
      <p className="text-[9px]" style={{ color: t.textFaint }}>
        ● Aula em andamento · <b style={{ color: '#065F46' }}>{cfg.intelPre}Lógico-Matemática</b>
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

const MiniSantuario = ({ cfg }: { cfg: Cfg }) => (
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
    <p className="font-serif text-[13.5px]" style={{ color: '#FFF' }}>{cfg.intelPre}Lógico-Matemática</p>
    <div className="rounded-full mx-auto my-1.5" style={{ width: 40, height: 4, backgroundColor: '#75B5A3' }} />
    <p className="text-[8.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
      "Não é sobre números. É sobre COMO {cfg.pessoaArt} encadeia o pensamento."
    </p>
  </div>
);

const MiniTreinamento = () => (
  <div className="w-[82%] rounded-2xl p-4 text-center" style={{ backgroundColor: '#322B8F', boxShadow: t.shadowMd }}>
    <div className="mx-auto mb-2.5 rounded-2xl flex items-center justify-center" style={{ width: 52, height: 52, backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', color: '#FFF' }}>
      <Sprout size={26} strokeWidth={1.75} />
    </div>
    <p className="font-serif text-[13px]" style={{ color: '#FFF' }}>Treinamento 1 · concluído</p>
    <p className="text-[8.5px] mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>uma conquista sua</p>
  </div>
);

const MiniDiario = ({ cfg }: { cfg: Cfg }) => (
  <div className="w-[82%] rounded-2xl p-3" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}>
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[7.5px] font-bold" style={{ backgroundColor: t.accentSoft, color: t.accentText }}>MC</span>
      <b className="text-[10px]" style={{ color: t.text }}>Maria Clara</b>
      <span className="text-[8px]" style={{ color: t.textFaint }}>· 12 momentos</span>
    </div>
    <div className="text-center mb-1.5">
      <span className="text-[7.5px] rounded-full px-2 py-0.5" style={{ backgroundColor: t.accentSoft, color: t.accentText }}>{cfg.unidCap} {cfg.intelPre}Linguística</span>
    </div>
    {[
      'Narrou a atividade inteira enquanto fazia: "agora ele sobe, agora cai"...',
      'Corrigiu a colega quando mudou a palavra da história de sempre.',
    ].map((txt, i) => (
      <div key={i} className="rounded-r-lg p-1.5 mb-1 max-w-[90%] text-[8.5px] leading-relaxed" style={{ backgroundColor: t.surfaceAlt, borderLeft: `2.5px solid ${t.accent}`, color: t.text }}>
        {txt}
      </div>
    ))}
  </div>
);

/* ---------- as páginas (revisão 06/07: começa pelo sentido, depois o detalhe) ---------- */

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

const construirPaginas = (cfg: Cfg): Pagina[] => [
  {
    centrado: true,
    fundo: t.accentSoft,
    conteudo: (
      <>
        <Marca />
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
        Cada criança que passa por nossas mãos carrega uma história. Nossa tarefa é ajudá-la a acreditar que <b>a sua história pode ser extraordinária</b>.
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
            E, pra isso, aprendemos a ver <b>como cada {cfg.pessoa} pensa</b>, sem nota e sem rótulo, e guardamos isso ao longo dos anos.
          </>
        )}
        {pancoraC('Você já faz isso todo dia. Aqui, o que você vê não se perde mais.')}
      </>
    ),
  },
  {
    fundo: t.bg,
    ilus: (
      <div className="w-[78%] space-y-2 text-[11px]">
        {[
          { c: '#322B8F', ic: '◎', tt: 'Inteligências', ss: 'você estuda' },
          { c: t.accent, ic: '⌂', tt: cfg.home, ss: 'você conduz e registra' },
          { c: '#177A50', ic: '✎', tt: 'Diário', ss: 'tudo vira história' },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl p-2.5" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] flex-shrink-0" style={{ backgroundColor: r.c, color: '#FFF' }}>{r.ic}</span>
            <span><b className="text-[12px]" style={{ color: t.text }}>{r.tt}</b><br /><span className="text-[9.5px]" style={{ color: t.textFaint }}>{r.ss}</span></span>
          </div>
        ))}
      </div>
    ),
    titulo: 'E o app faz isso em três abas',
    corpo: (
      <>
        Você <b>estuda</b> em Inteligências, <b>age</b> na {cfg.home}, e o que observa <b>vira a história</b> de cada {cfg.pessoa} no Diário.
      </>
    ),
  },
  {
    fundo: t.accentDeep,
    ilus: <MiniSantuario cfg={cfg} />,
    titulo: 'Inteligências: a aba de estudo',
    corpo: (
      <>
        O que é cada inteligência, como ela aparece na sala, o que NÃO é sinal. Toque nos números pra conhecer as oito.
        <span className="block mt-2.5 italic text-[13px]" style={{ color: t.accentText }}>
          Não é lista pra diagnosticar: é lente pro seu olhar.
        </span>
      </>
    ),
  },
  {
    fundo: t.accentDeep,
    ilus: <MiniTreinamento />,
    titulo: 'Os Treinamentos',
    corpo: (
      <>
        No topo dessa aba ficam os <b>Treinamentos</b>: pequenas formações com situações reais pra praticar o olhar. Cada uma concluída vira uma <b>conquista</b>.
        <span className="block mt-2.5 italic text-[13px]" style={{ color: t.accentText }}>
          Você aprende a observar sem sair da sua sala.
        </span>
      </>
    ),
  },
  {
    fundo: t.bg,
    ilus: <MiniHome cfg={cfg} />,
    titulo: `${cfg.home}: o Hoje e o ano`,
    corpo: (
      <>
        Em <b>"Hoje"</b>, {cfg.pessoaArt === 'o aluno' ? 'o' : 'a'} {cfg.unid} da vez e o botão <b>Iniciar aula</b>. Em <b>"O ano"</b>, a trilha dos 8 {cfg.unid}s da turma{cfg.faixaNota}.
        <span className="block mt-2.5 italic text-[13px]" style={{ color: t.accentText }}>
          {cfg.unidCap === 'Exploração' ? 'A exploração é da TURMA, nunca da criança.' : 'O módulo é da TURMA, nunca do aluno.'}
        </span>
      </>
    ),
  },
  {
    fundo: t.bg,
    ilus: <MiniAula cfg={cfg} />,
    titulo: 'A aula: toque, escreva, pronto',
    corpo: (
      <>
        Tocou num nome, abre o campo: escreva como {cfg.pessoaArt} chegou (pode ditar pelo microfone) e Guardar. Quem você não registrar, tudo bem.
        <span className="block mt-2.5 italic text-[13px]" style={{ color: t.accentText }}>
          Registre o caminho, não o resultado.
        </span>
      </>
    ),
  },
  {
    fundo: t.bg,
    ilus: <MiniDiario cfg={cfg} />,
    titulo: 'Diário: tudo vira história',
    corpo: (
      <>
        Cada {cfg.pessoa} tem um diário estilo conversa, {cfg.unid} a {cfg.unid}. É esse rastro que conta a história {cfg.daPessoa} pela escola. Errou? <b>Segure o balão</b> pra corrigir.
        <span className="block mt-2.5 italic text-[13px]" style={{ color: t.accentText }}>
          Nada do que você enxerga se perde.
        </span>
      </>
    ),
  },
  {
    fundo: t.accentSoft,
    ilus: (
      <div className="text-center px-6">
        <Sprout size={34} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: t.accent }} />
        <p className="font-serif italic text-[13.5px] leading-relaxed" style={{ color: t.accentText }}>
          "Nada do que você enxerga se perde: vira história."
        </p>
      </div>
    ),
    titulo: 'Pra levar no bolso',
    corpo: (
      <>
        <b>1.</b> {cfg.unidCap === 'Exploração' ? 'A exploração é da turma, nunca da criança.' : 'O módulo é da turma, nunca do aluno.'}
        <br />
        <b>2.</b> Registre o COMO, não o resultado.
        <br />
        <b>3.</b> Silêncio não é ausência.
        <br />
        <b>4.</b> Estude, aja, e tudo vira história.
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
            O Arboria é o <b>caminho</b>, nunca o final. Comece pequeno, uma cena por vez, e você vai fazer parte da história de cada {cfg.pessoa}.
          </>
        )}
        {pancoraC('Enxergar uma criança é o trabalho mais importante da escola. É o seu.')}
      </>
    ),
  },
];

/**
 * TUTORIAL DO PROFESSOR: "o caderninho de bolso". Revisão 06/07: abre pelo
 * SENTIDO (boas-vindas, a frase do Fundador, o mapa das abas) e só depois os
 * detalhes; inclui os Treinamentos; fecha no motivador. Serve Infantil e F1
 * (variante + faixa do professor). Abre sozinho na 1ª entrada (localStorage),
 * reabrível pelo ícone Ajuda e por Configurações. Swipe, "Pular" sempre visível.
 */
const TutorialInfantil = ({ variante = 'infantil', faixa1 = true }: { variante?: Variante; faixa1?: boolean }) => {
  const [aberto, setAberto] = useState(false);
  const [pg, setPg] = useState(0);
  const toqueRef = useRef<{ x: number; y: number } | null>(null);

  const cfg = useMemo(() => montarCfg(variante, faixa1), [variante, faixa1]);
  const paginas = useMemo(() => construirPaginas(cfg), [cfg]);
  const VISTO_KEY = `arboria-tutorial-${variante}-v2`;

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
  }, [VISTO_KEY]);

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
