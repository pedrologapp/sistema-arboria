import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Maximize2, X, RotateCcw, CalendarDays, ChevronDown } from 'lucide-react';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { formatTurmaLabel } from '@/lib/infantil';
import type { PanoramaTurma } from '@/hooks/useF2Panorama';

/**
 * O CALENDÁRIO (panorama) do F2: TODAS as turmas de uma vez, cada uma como uma
 * FITA de fases coladas em SEQUÊNCIA (posição 1..N da trilha da turma), pra ler
 * como "a próxima fase é a seguinte". Os blocos ficam contíguos (encostados),
 * cada um na cor da Casa. A fita não posiciona por data: a ordem é a sequência.
 *
 * A DATA é sempre o INÍCIO da fase (capitulo_turma_config.data_evento). Ela não
 * move o bloco no tempo: ela ROTULA o início daquela fase. Mostramos ao menos o
 * início da fase ATUAL (na coluna da esquerda) e o da fase do MENTOR (na bandeira
 * "sua fase"). Onde não há data, "a definir" (NUNCA inventa data).
 *
 * Estados: CONCLUÍDA = sólido na cor; AGORA = a fase em destaque (bloco realçado,
 * mais alto, com o marcador "hoje"); A CAMINHO = esmaecido (fill baixo + contorno
 * na cor cheia, legível até nas Casas claras). A Casa do MENTOR ganha a bandeira.
 *
 * SÓ LEITURA / SÓ APRESENTAÇÃO. Recebe os dados já resolvidos pelo useF2Panorama.
 * O mesmo Gráfico serve o retrato rolável e a tela cheia landscape.
 */

// Geometria compartilhada (px): usada no retrato rolável e na tela cheia.
const LABEL_COL = 138;
const GAP = 10;
const LANE_H = 60;
// Altura dos blocos da fita e da fase AGORA (realçada, mais alta).
const H_BASE = 22;
const H_AGORA = 30;
// Folga NO TOPO do gráfico: a bandeira "sua fase" e o marcador "hoje" sobem acima
// da fita. Sem esta reserva, o clip do contêiner (overflow) corta o topo.
const TOP_PAD = 24;
// Divisória fina (branca, = cor da superfície) entre blocos coloridos da fita.
const DIVISORIA = 2;
const RAIO = 7;

const parseData = (s: string): Date => new Date(`${s}T12:00:00`);

/** "4 jul": data curta pt-BR (meio-dia local evita salto de fuso do YYYY-MM-DD). */
const dataCurta = (d: string | null): string | null =>
  d ? format(parseData(d), 'd MMM', { locale: ptBR }) : null;

function usePrefersReducedMotion(): boolean {
  const [reduz, setReduz] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduz(mq.matches);
    const on = () => setReduz(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduz;
}

// ============================================================
// Um bloco da fita (uma fase). Cor da Casa, cantos só nas pontas da fita.
// As divisórias entre blocos são o "gap" branco do contêiner (a superfície).
// ============================================================
const Bloco = ({
  p,
  first,
  last,
  mentorCor,
}: {
  p: PanoramaTurma['passos'][number];
  first: boolean;
  last: boolean;
  mentorCor: string;
}) => {
  const agora = p.estado === 'agora';
  // Cantos: arredonda só as pontas da fita; o bloco AGORA é uma peça "levantada"
  // (arredondada nos 4 cantos, mais alta) que se destaca da fita reta.
  const radius = agora
    ? RAIO
    : `${first ? RAIO : 0}px ${last ? RAIO : 0}px ${last ? RAIO : 0}px ${first ? RAIO : 0}px`;

  const base: React.CSSProperties = {
    flex: '1 1 0',
    minWidth: 0,
    height: H_BASE,
    borderRadius: radius,
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: 1,
  };

  let style: React.CSSProperties;
  if (agora) {
    // AGORA: a fase mais visível. Cor cheia, peça mais alta e levantada, anel
    // branco por dentro e sombra pra "subir" da fita. É onde está o hoje.
    style = {
      ...base,
      height: H_AGORA,
      backgroundColor: p.cor,
      boxShadow: `inset 0 0 0 2px #FFFFFF, 0 2px 6px ${p.cor}66`,
      zIndex: 3,
    };
  } else if (p.estado === 'concluida') {
    // CONCLUÍDA: sólido na cor da Casa.
    style = { ...base, backgroundColor: p.cor };
  } else {
    // A CAMINHO: esmaecido (fill baixo) com contorno na cor cheia por dentro
    // (inset), legível mesmo nas Casas de tom claro. Sem alterar o layout.
    style = {
      ...base,
      backgroundColor: `${p.cor}24`,
      boxShadow: `inset 0 0 0 1.5px ${p.cor}`,
    };
  }

  // A Casa do MENTOR ganha um anel extra na cor do mentor (a bandeira "sua fase"
  // acima reforça a marca). Somado ao anel do estado quando houver.
  if (p.ehMentor) {
    const anelMentor = `inset 0 0 0 2px ${mentorCor}`;
    style = {
      ...style,
      boxShadow: style.boxShadow ? `${style.boxShadow}, ${anelMentor}` : anelMentor,
    };
  }

  return <span aria-hidden style={style} />;
};

// ============================================================
// Uma turma (lane): à esquerda a FASE ATUAL (+ início); à direita a fita.
// ============================================================
const Lane = ({
  turma,
  mentorCor,
  onClick,
  ativo,
}: {
  turma: PanoramaTurma;
  mentorCor: string;
  onClick: () => void;
  ativo: boolean;
}) => {
  const label = formatTurmaLabel(turma.serie, turma.turma_letra) || turma.nome;
  const passos = turma.passos;
  const total = passos.length;

  const idxAgora = passos.findIndex((p) => p.estado === 'agora');
  const idxMentor = passos.findIndex((p) => p.ehMentor);
  const mentor = idxMentor >= 0 ? passos[idxMentor] : null;
  const suaData = mentor ? dataCurta(mentor.data) : null;

  // Centro horizontal de um bloco: os blocos preenchem a faixa em partes iguais.
  const centroPct = (idx: number): number => (total > 0 ? ((idx + 0.5) / total) * 100 : 50);

  // Fase atual: rótulo, cor e início (data como rótulo, nunca posição).
  let faseAtualTxt: string;
  let corAtual = t.silencio;
  let dataAtual: string | null = null;
  if (turma.ordemAtual < 1) faseAtualTxt = 'Não começou';
  else if (turma.ordemAtual > turma.total) faseAtualTxt = 'Ano concluído';
  else {
    faseAtualTxt = turma.casaAtualNome ? `Casa ${turma.casaAtualNome}` : `Fase ${turma.ordemAtual}`;
    const at = idxAgora >= 0 ? passos[idxAgora] : passos.find((p) => p.posicao === turma.ordemAtual);
    corAtual = at?.cor ?? t.silencio;
    dataAtual = at ? dataCurta(at.data) : null;
  }

  const aria =
    `${label}. Fase atual: ${faseAtualTxt}` +
    (dataAtual ? `, inicia em ${dataAtual}` : turma.ordemAtual >= 1 && turma.ordemAtual <= turma.total ? ', início a definir' : '') +
    (mentor ? `. Sua fase (mentor): Casa ${mentor.nome}, ${suaData ? `inicia em ${suaData}` : 'início a definir'}` : '') +
    '. Abrir a turma.';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      aria-label={aria}
      className="grid items-center text-left w-full"
      style={{
        gridTemplateColumns: `${LABEL_COL}px 1fr`,
        columnGap: GAP,
        height: LANE_H,
        borderTop: `1px solid ${t.surfaceAlt}`,
        backgroundColor: ativo ? t.accentSoft : 'transparent',
      }}
    >
      {/* rótulo: turma + fase atual + início da fase atual */}
      <span className="min-w-0 pl-1">
        <span className="block text-[13px] font-bold leading-none truncate" style={{ color: t.text }}>
          {label}
        </span>
        <span className="flex items-center gap-1.5 mt-1.5">
          <span
            className="rounded-full flex-shrink-0"
            style={{ width: 8, height: 8, backgroundColor: corAtual }}
          />
          <span className="min-w-0">
            <span className="block text-[8px] uppercase tracking-wide font-bold" style={{ color: t.textFaint }}>
              Fase atual
            </span>
            <span className="block text-[11px] leading-tight truncate" style={{ color: t.textMuted }}>
              {faseAtualTxt}
              {turma.ordemAtual >= 1 && turma.ordemAtual <= turma.total && (
                <span style={{ color: t.textFaint }}>
                  {dataAtual ? ` · inicia ${dataAtual}` : ' · início a definir'}
                </span>
              )}
            </span>
          </span>
        </span>
      </span>

      {/* fita de fases (sequência contígua) */}
      <span className="relative block h-full">
        {/* a fita em si: blocos coladas, divisórias = gap (superfície branca) */}
        <span
          aria-hidden
          className="absolute flex items-center"
          style={{
            left: 0,
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            height: H_AGORA,
            gap: DIVISORIA,
          }}
        >
          {passos.map((p, i) => (
            <Bloco
              key={`${p.posicao}-${p.inteligenciaId}`}
              p={p}
              first={i === 0}
              last={i === total - 1}
              mentorCor={mentorCor}
            />
          ))}
        </span>

        {/* marcador "hoje" sobre o bloco da fase AGORA */}
        {idxAgora >= 0 && (
          <span
            aria-hidden
            className="absolute flex flex-col items-center whitespace-nowrap"
            style={{ top: 0, left: `${centroPct(idxAgora)}%`, transform: 'translateX(-50%)', zIndex: 5 }}
          >
            <span
              className="text-[8px] font-bold uppercase tracking-wide px-1.5 rounded-full leading-tight"
              style={{ color: '#FFFFFF', backgroundColor: t.presenteText }}
            >
              hoje
            </span>
          </span>
        )}

        {/* bandeira: sua fase (Casa do mentor) + início */}
        {mentor && idxMentor !== idxAgora && (
          <span
            aria-hidden
            className="absolute flex flex-col items-center whitespace-nowrap"
            style={{ top: 0, left: `${centroPct(idxMentor)}%`, transform: 'translateX(-50%)', zIndex: 4 }}
          >
            <span
              className="text-[8px] uppercase tracking-wide font-bold leading-none"
              style={{ color: mentorCor }}
            >
              sua fase
            </span>
            <span
              className="text-[9px] font-bold tabular-nums leading-none mt-0.5"
              style={{ color: mentorCor }}
            >
              {suaData ? `inicia ${suaData}` : 'a definir'}
            </span>
          </span>
        )}
      </span>
    </button>
  );
};

// ============================================================
// O gráfico (fluido: preenche a largura que receber). Uma fita por turma.
// ============================================================
const Grafico = ({
  turmas,
  mentorCor,
  onTurmaClick,
  turmaSel,
}: {
  turmas: PanoramaTurma[];
  mentorCor: string;
  onTurmaClick: (id: string) => void;
  turmaSel: string | null;
}) => (
  <div style={{ paddingTop: TOP_PAD }}>
    <div className="relative">
      {turmas.map((tu) => (
        <Lane
          key={tu.turma_id}
          turma={tu}
          mentorCor={mentorCor}
          ativo={turmaSel === tu.turma_id}
          onClick={() => onTurmaClick(tu.turma_id)}
        />
      ))}
    </div>

    {/* legenda dos estados: a fita é sequência, não linha do tempo proporcional */}
    <div
      className="flex items-center gap-3 flex-wrap"
      style={{ paddingTop: 8, marginTop: 4, borderTop: `1px solid ${t.border}` }}
    >
      <span className="flex items-center gap-1.5 text-[10px]" style={{ color: t.textMuted }}>
        <span style={{ width: 14, height: 10, borderRadius: 3, backgroundColor: t.textMuted, opacity: 0.55 }} />
        Concluída
      </span>
      <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: t.text }}>
        <span
          style={{
            width: 14,
            height: 12,
            borderRadius: 3,
            backgroundColor: t.accent,
            boxShadow: `inset 0 0 0 2px #FFFFFF`,
          }}
        />
        Agora
      </span>
      <span className="flex items-center gap-1.5 text-[10px]" style={{ color: t.textMuted }}>
        <span
          style={{
            width: 14,
            height: 10,
            borderRadius: 3,
            backgroundColor: `${t.textMuted}24`,
            boxShadow: `inset 0 0 0 1.5px ${t.textMuted}`,
          }}
        />
        A caminho
      </span>
    </div>
  </div>
);

// ============================================================
// Overlay TELA CHEIA (landscape, padrão YouTube)
// ============================================================
const TelaCheia = ({
  turmas,
  mentorCor,
  onTurmaClick,
  turmaSel,
  onFechar,
}: {
  turmas: PanoramaTurma[];
  mentorCor: string;
  onTurmaClick: (id: string) => void;
  turmaSel: string | null;
  onFechar: () => void;
}) => {
  const reduz = usePrefersReducedMotion();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onFechar]);

  // Quadro girado 90deg: em retrato o aparelho vira e o gráfico ganha a largura.
  // O box interno tem largura=100vh e altura=100vw; centrado e girado, preenche
  // a viewport exatamente. prefers-reduced-motion: sem transição de entrada.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Calendário em tela cheia"
      className="fixed inset-0 z-[60]"
      style={{ backgroundColor: t.bg }}
    >
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: '100vh',
          height: '100vw',
          transform: 'translate(-50%, -50%) rotate(90deg)',
          transformOrigin: 'center center',
          transition: reduz ? 'none' : 'opacity .2s ease',
          display: 'flex',
          flexDirection: 'column',
          padding: '18px 22px',
          overflow: 'auto',
        }}
      >
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: t.textFaint }}>
              Calendário do ano
            </p>
            <p className="text-sm font-bold" style={{ color: t.text }}>
              Todas as suas turmas, na sequência das fases
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Sair da tela cheia"
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ backgroundColor: t.surface, color: t.textMuted, boxShadow: t.shadowSm }}
          >
            <X size={16} /> Sair
          </button>
        </div>

        <div
          className="rounded-2xl flex-1 min-h-0"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, padding: '10px 18px 6px' }}
        >
          <Grafico turmas={turmas} mentorCor={mentorCor} onTurmaClick={onTurmaClick} turmaSel={turmaSel} />
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================
// Cartão do panorama (retrato: compacto + rolável + botão tela cheia)
// ============================================================
const F2Panorama = ({
  turmas,
  mentorCor,
  onTurmaClick,
  turmaSel,
  mode = 'inline',
}: {
  turmas: PanoramaTurma[];
  /** Mantido por compatibilidade da API; a fita é sequência, não usa cadência. */
  cadenciaDias?: number;
  mentorCor: string;
  onTurmaClick: (id: string) => void;
  turmaSel: string | null;
  /**
   * `inline`: o cartão do calendário embutido (retrato rolável + botão tela cheia).
   * `button`: só um botão secundário (tema do shell F2) que ABRE o calendário em
   *   tela cheia. Usado na aba Arboria pra a aba não ficar tomada pelo gráfico.
   */
  mode?: 'inline' | 'button';
}) => {
  const [cheia, setCheia] = useState(false);
  const [mostrarInline, setMostrarInline] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Quantas fases tem a maior trilha: dá a largura mínima pra os blocos não
  // ficarem finos demais no retrato (a faixa rola na horizontal quando não cabe).
  const maxPassos = useMemo(
    () => turmas.reduce((m, tu) => Math.max(m, tu.passos.length), 0),
    [turmas]
  );

  if (turmas.length === 0) return null;

  // MODO BOTÃO: um botão que REVELA o painel do calendário embutido (retrato
  // rolável, com o seu próprio botão de tela cheia). Não pula pra tela cheia.
  if (mode === 'button') {
    return (
      <>
        <button
          type="button"
          onClick={() => setMostrarInline((v) => !v)}
          aria-expanded={mostrarInline}
          aria-label="Ver o calendário de todas as turmas"
          className="w-full flex items-center gap-2.5 rounded-2xl p-3 text-left transition-transform active:scale-[0.99]"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
        >
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: t.accentSoft }}
          >
            <CalendarDays size={18} style={{ color: t.accent }} strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold" style={{ color: t.text }}>
              Ver o calendário
            </span>
            <span className="block text-[11px]" style={{ color: t.textFaint }}>
              A sequência de fases de todas as turmas
            </span>
          </span>
          <ChevronDown
            size={18}
            style={{ color: t.textFaint, transform: mostrarInline ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
            className="flex-shrink-0"
          />
        </button>

        {mostrarInline && (
          <div className="mt-3">
            <F2Panorama
              turmas={turmas}
              mentorCor={mentorCor}
              onTurmaClick={onTurmaClick}
              turmaSel={turmaSel}
              mode="inline"
            />
          </div>
        )}
      </>
    );
  }

  // Largura mínima do gráfico no retrato: ~48px por fase, pra a fita respirar.
  const minPlot = Math.max(320, maxPassos * 48);
  const minWidth = LABEL_COL + GAP + minPlot;

  return (
    <section aria-label="Calendário das turmas">
      <div className="flex items-center justify-between mb-2 px-1">
        <div>
          <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: t.textFaint }}>
            Calendário
          </p>
          <p className="text-[11px]" style={{ color: t.textFaint }}>
            Cada turma na sequência das fases. A fase em destaque é a de agora.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCheia(true)}
          aria-label="Abrir o calendário em tela cheia"
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold flex-shrink-0"
          style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowSm }}
        >
          <Maximize2 size={15} /> Tela cheia
        </button>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
      >
        <div ref={scrollRef} className="overflow-x-auto" style={{ padding: '8px 16px 6px' }}>
          <div style={{ minWidth }}>
            <Grafico
              turmas={turmas}
              mentorCor={mentorCor}
              onTurmaClick={onTurmaClick}
              turmaSel={turmaSel}
            />
          </div>
        </div>
        <p
          className="flex items-center gap-1.5 text-[10px] px-4 py-2"
          style={{ color: t.textFaint, borderTop: `1px solid ${t.border}` }}
        >
          <RotateCcw size={11} /> Arraste para o lado ou toque em Tela cheia para ver a trilha inteira.
        </p>
      </div>

      {cheia && (
        <TelaCheia
          turmas={turmas}
          mentorCor={mentorCor}
          onTurmaClick={onTurmaClick}
          turmaSel={turmaSel}
          onFechar={() => setCheia(false)}
        />
      )}
    </section>
  );
};

export default F2Panorama;
