import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Maximize2, X, RotateCcw, CalendarDays } from 'lucide-react';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { formatTurmaLabel } from '@/lib/infantil';
import type { PanoramaTurma } from '@/hooks/useF2Panorama';

/**
 * O CALENDÁRIO (panorama) do F2: TODAS as turmas de uma vez, cada uma com a
 * trilha inteira deitada num eixo de MESES. O que já passou fica à esquerda da
 * reta "hoje"; o que vem, à direita. À esquerda de cada turma, a FASE ATUAL. A
 * bandeira na cor da Casa do mentor marca a SUA FASE, com a data.
 *
 * POSICIONAMENTO (honesto): a fase ATUAL de cada turma fica na reta "hoje". As
 * demais se espalham pela cadência (institution_settings.f2_dias_por_encontro,
 * senão ~5 semanas por capítulo) SÓ PARA O LAYOUT. Onde o capítulo TEM data real
 * (capitulo_turma_config.data_evento), o marcador ancora na data real e o rótulo
 * usa a data real; onde não há data, mostra "a definir" (NUNCA inventa data).
 *
 * SÓ LEITURA / SÓ APRESENTAÇÃO. Recebe os dados já resolvidos pelo useF2Panorama.
 */

const DIAS_MES = 30.44;

// Geometria compartilhada (px) : usada no retrato rolável e na tela cheia.
const LABEL_COL = 132;
const GAP = 10;
const LANE_H = 58;
// Folga NO TOPO do gráfico: a reta "hoje" e as bandeiras "sua fase" sobem acima
// dos nós. Sem esta reserva, o clip do contêiner (overflow) corta o topo.
const TOP_PAD = 22;

function mvFromDate(d: Date, baseYear: number): number {
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return (d.getFullYear() - baseYear) * 12 + d.getMonth() + (d.getDate() - 1) / dim;
}
const parseData = (s: string): Date => new Date(`${s}T12:00:00`);

/** "4 ago": data curta pt-BR (meio-dia local evita salto de fuso do YYYY-MM-DD). */
const dataCurta = (d: string | null): string | null =>
  d ? format(parseData(d), 'd MMM', { locale: ptBR }) : null;

/** Nome de mês abreviado, capitalizado e sem ponto: "Ago". */
const mesLabel = (y: number, m0: number): string => {
  const raw = format(new Date(y, m0, 1), 'MMM', { locale: ptBR }).replace('.', '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

interface PassoLaid {
  passo: PanoramaTurma['passos'][number];
  frac: number; // 0..1 no eixo
  ancorada: boolean; // posicionada por data real
}
interface TurmaLaid {
  turma: PanoramaTurma;
  passos: PassoLaid[];
  railStart: number;
  railEnd: number;
}
interface Layout {
  turmas: TurmaLaid[];
  meses: { frac: number; label: string }[];
  hojeFrac: number;
}

/** Calcula as posições no eixo de meses. Pura (sem I/O), memoizável. */
function montarLayout(turmas: PanoramaTurma[], cadenciaDias: number, hoje: Date): Layout {
  const baseYear = hoje.getFullYear();
  const hojeMv = mvFromDate(hoje, baseYear);
  const cad = (cadenciaDias > 0 ? cadenciaDias : 35) / DIAS_MES;

  let min = hojeMv;
  let max = hojeMv;

  const comMv = turmas.map((turma) => {
    const passos = turma.passos.map((passo) => {
      const ehAtual = turma.ordemAtual >= 1 && passo.posicao === turma.ordemAtual;
      let mv: number;
      let ancorada = false;
      if (ehAtual) {
        // A fase atual fica SEMPRE na reta "hoje".
        mv = hojeMv;
      } else if (passo.data) {
        // Data real: ancora e rotula pela data.
        mv = mvFromDate(parseData(passo.data), baseYear);
        ancorada = true;
      } else {
        // Sem data: só espalha pela cadência (layout).
        mv = hojeMv + (passo.posicao - turma.ordemAtual) * cad;
      }
      min = Math.min(min, mv);
      max = Math.max(max, mv);
      return { passo, mv, ancorada };
    });
    return { turma, passos };
  });

  let axisMin = min - 0.5;
  let axisMax = max + 0.5;
  if (axisMax - axisMin < 1) axisMax = axisMin + 1;
  const span = axisMax - axisMin;
  const frac = (mv: number) => Math.min(1, Math.max(0, (mv - axisMin) / span));

  const turmasLaid: TurmaLaid[] = comMv.map(({ turma, passos }) => {
    const laid = passos.map((p) => ({ passo: p.passo, frac: frac(p.mv), ancorada: p.ancorada }));
    const fracs = laid.map((l) => l.frac);
    return {
      turma,
      passos: laid,
      railStart: fracs.length ? Math.min(...fracs) : 0,
      railEnd: fracs.length ? Math.max(...fracs) : 0,
    };
  });

  const meses: { frac: number; label: string }[] = [];
  for (let k = Math.floor(axisMin); k <= Math.ceil(axisMax); k++) {
    const center = k + 0.5;
    if (center < axisMin || center > axisMax) continue;
    const y = baseYear + Math.floor(k / 12);
    const m0 = ((k % 12) + 12) % 12;
    meses.push({ frac: frac(center), label: mesLabel(y, m0) });
  }

  return { turmas: turmasLaid, meses, hojeFrac: frac(hojeMv) };
}

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
// Nó da trilha
// ============================================================
const No = ({ p, mentorCor }: { p: PassoLaid; mentorCor: string }) => {
  const { passo } = p;
  const base: React.CSSProperties = {
    width: 13,
    height: 13,
    borderRadius: '50%',
    boxSizing: 'border-box',
  };
  if (passo.ehMentor) {
    // Sua fase: sólido na cor da Casa do mentor, com anel discreto.
    return (
      <span
        style={{
          ...base,
          width: 16,
          height: 16,
          backgroundColor: mentorCor,
          border: '2px solid #FFFFFF',
          boxShadow: `0 0 0 3px ${mentorCor}33`,
        }}
      />
    );
  }
  if (passo.estado === 'concluida') {
    return <span style={{ ...base, backgroundColor: passo.cor, border: '2px solid #FFFFFF' }} />;
  }
  if (passo.estado === 'agora') {
    return (
      <span
        style={{
          ...base,
          width: 17,
          height: 17,
          backgroundColor: passo.cor,
          border: '2px solid #FFFFFF',
          boxShadow: `0 0 0 3px ${passo.cor}2E`,
        }}
      />
    );
  }
  // a caminho: contorno na cor da Casa
  return <span style={{ ...base, backgroundColor: t.surface, border: `2px solid ${passo.cor}` }} />;
};

// ============================================================
// Uma turma (lane)
// ============================================================
const Lane = ({
  turmaLaid,
  mentorCor,
  onClick,
  ativo,
}: {
  turmaLaid: TurmaLaid;
  mentorCor: string;
  onClick: () => void;
  ativo: boolean;
}) => {
  const { turma, passos, railStart, railEnd } = turmaLaid;
  const label = formatTurmaLabel(turma.serie, turma.turma_letra) || turma.nome;
  const mentor = passos.find((p) => p.passo.ehMentor);
  const suaData = mentor ? dataCurta(mentor.passo.data) : null;

  let faseAtualTxt: string;
  let corAtual = t.silencio;
  if (turma.ordemAtual < 1) faseAtualTxt = 'Não começou';
  else if (turma.ordemAtual > turma.total) faseAtualTxt = 'Ano concluído';
  else {
    faseAtualTxt = turma.casaAtualNome ? `Casa ${turma.casaAtualNome}` : `Fase ${turma.ordemAtual}`;
    const at = passos.find((p) => p.passo.posicao === turma.ordemAtual);
    corAtual = at?.passo.cor ?? t.silencio;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      aria-label={`${label}. Fase atual: ${faseAtualTxt}. Abrir a turma.`}
      className="grid items-center text-left w-full"
      style={{
        gridTemplateColumns: `${LABEL_COL}px 1fr`,
        columnGap: GAP,
        height: LANE_H,
        borderTop: `1px solid ${t.surfaceAlt}`,
        backgroundColor: ativo ? t.accentSoft : 'transparent',
      }}
    >
      {/* rótulo: turma + fase atual */}
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
            </span>
          </span>
        </span>
      </span>

      {/* trilha */}
      <span className="relative block h-full">
        {/* rail */}
        <span
          aria-hidden
          className="absolute"
          style={{
            top: '50%',
            left: `${railStart * 100}%`,
            width: `${Math.max(0, railEnd - railStart) * 100}%`,
            height: 2,
            backgroundColor: t.surfaceSunken,
            borderRadius: 2,
            transform: 'translateY(-50%)',
          }}
        />
        {passos.map((p) => (
          <span
            key={`${p.passo.posicao}-${p.passo.inteligenciaId}`}
            aria-hidden
            className="absolute"
            style={{ top: '50%', left: `${p.frac * 100}%`, transform: 'translate(-50%, -50%)', zIndex: 2 }}
          >
            <No p={p} mentorCor={mentorCor} />
          </span>
        ))}
        {/* bandeira: sua fase */}
        {mentor && (
          <span
            aria-hidden
            className="absolute flex flex-col items-center whitespace-nowrap"
            style={{
              top: 2,
              left: `${mentor.frac * 100}%`,
              transform: 'translateX(-50%)',
              zIndex: 4,
            }}
          >
            <span
              className="text-[8px] uppercase tracking-wide font-bold leading-none"
              style={{ color: mentorCor }}
            >
              sua fase
            </span>
            <span
              className="text-[10px] font-bold tabular-nums leading-none mt-0.5"
              style={{ color: mentorCor }}
            >
              {suaData ?? 'a definir'}
            </span>
          </span>
        )}
      </span>
    </button>
  );
};

// ============================================================
// O gráfico (fluido: preenche a largura que receber)
// ============================================================
const Grafico = ({
  layout,
  mentorCor,
  onTurmaClick,
  turmaSel,
}: {
  layout: Layout;
  mentorCor: string;
  onTurmaClick: (id: string) => void;
  turmaSel: string | null;
}) => (
  <div style={{ paddingTop: TOP_PAD }}>
    {/* área das lanes com a reta "hoje" atravessando. O TOP_PAD acima reserva
        espaço pro rótulo "hoje" e as bandeiras "sua fase", que sobem além do topo. */}
    <div className="relative">
      <span
        aria-hidden
        className="absolute z-10"
        style={{
          top: 0,
          bottom: 0,
          left: `calc(${LABEL_COL + GAP}px + (100% - ${LABEL_COL + GAP}px) * ${layout.hojeFrac})`,
          width: 2,
          backgroundColor: t.presenteText,
        }}
      >
        <span
          className="absolute text-[8px] font-bold uppercase tracking-wide px-1"
          style={{
            top: -2,
            left: '50%',
            transform: 'translate(-50%, -100%)',
            color: t.presenteText,
            backgroundColor: t.surface,
          }}
        >
          hoje
        </span>
      </span>

      {layout.turmas.map((tl) => (
        <Lane
          key={tl.turma.turma_id}
          turmaLaid={tl}
          mentorCor={mentorCor}
          ativo={turmaSel === tl.turma.turma_id}
          onClick={() => onTurmaClick(tl.turma.turma_id)}
        />
      ))}
    </div>

    {/* eixo de meses */}
    <div
      className="grid items-center"
      style={{
        gridTemplateColumns: `${LABEL_COL}px 1fr`,
        columnGap: GAP,
        paddingTop: 8,
        marginTop: 4,
        borderTop: `1px solid ${t.border}`,
      }}
    >
      <span />
      <span className="relative block" style={{ height: 16 }}>
        {layout.meses.map((m, i) => (
          <span
            key={i}
            className="absolute text-[10px] font-bold"
            style={{
              top: 0,
              left: `${m.frac * 100}%`,
              transform: 'translateX(-50%)',
              color: Math.abs(m.frac - layout.hojeFrac) < 0.06 ? t.presenteText : t.textFaint,
            }}
          >
            {m.label}
          </span>
        ))}
      </span>
    </div>
  </div>
);

// ============================================================
// Overlay TELA CHEIA (landscape, padrão YouTube)
// ============================================================
const TelaCheia = ({
  layout,
  mentorCor,
  onTurmaClick,
  turmaSel,
  onFechar,
}: {
  layout: Layout;
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
              Todas as suas turmas, no tempo
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
          <Grafico layout={layout} mentorCor={mentorCor} onTurmaClick={onTurmaClick} turmaSel={turmaSel} />
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
  cadenciaDias,
  mentorCor,
  onTurmaClick,
  turmaSel,
  mode = 'inline',
}: {
  turmas: PanoramaTurma[];
  cadenciaDias: number;
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(
    () => montarLayout(turmas, cadenciaDias, new Date()),
    [turmas, cadenciaDias]
  );

  if (turmas.length === 0) return null;

  // MODO BOTÃO: ação secundária que abre o calendário completo em tela cheia.
  if (mode === 'button') {
    return (
      <>
        <button
          type="button"
          onClick={() => setCheia(true)}
          aria-label="Abrir o calendário de todas as turmas em tela cheia"
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
              O ano de todas as turmas, no tempo
            </span>
          </span>
          <Maximize2 size={16} style={{ color: t.textFaint }} className="flex-shrink-0" />
        </button>

        {cheia && (
          <TelaCheia
            layout={layout}
            mentorCor={mentorCor}
            onTurmaClick={(id) => {
              // Tocar numa turma no calendário fecha a tela cheia e leva ao detalhe.
              setCheia(false);
              onTurmaClick(id);
            }}
            turmaSel={turmaSel}
            onFechar={() => setCheia(false)}
          />
        )}
      </>
    );
  }

  // Largura mínima do gráfico no retrato: garante que os meses respirem e a
  // faixa role horizontalmente quando não couber. ~64px por mês.
  const minPlot = Math.max(360, layout.meses.length * 64);
  const minWidth = LABEL_COL + GAP + minPlot;

  return (
    <section aria-label="Calendário das turmas">
      <div className="flex items-center justify-between mb-2 px-1">
        <div>
          <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: t.textFaint }}>
            Calendário
          </p>
          <p className="text-[11px]" style={{ color: t.textFaint }}>
            Cada turma no tempo. A reta verde é hoje.
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
              layout={layout}
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
          <RotateCcw size={11} /> Arraste para o lado ou toque em Tela cheia para ver o ano inteiro.
        </p>
      </div>

      {cheia && (
        <TelaCheia
          layout={layout}
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
