import { useEffect, useId, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Target,
  Package,
  Compass,
  Eye,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import type { AtividadePlanoItem } from '@/hooks/useTurmaAtividadePlano';
import { infantilTheme as t } from '@/styles/infantilTheme';

/**
 * Card de ATIVIDADE do plano da turma, expansível.
 *
 * Recolhido: número da ordem + nome (+ objetivo em uma linha).
 * Aberto: um CARROSSEL, um ponto por tela. As seções entram na ordem Objetivo,
 * Como conduzir, Materiais, O que observar (ordem pedida pelo Fundador). Ela
 * desliza o dedo, usa as setas ou os BOTÕES DE ATALHO do topo para pular direto
 * ao ponto que quer.
 * O PDF, quando existe, é um botão fixo (não uma tela do carrossel).
 *
 * Só entram no carrossel/atalhos as seções COM conteúdo. Se sobra uma só, ela
 * aparece direta, sem carrossel/bolinhas. Card sem nenhum detalhe mantém a linha
 * honesta de "sem detalhes".
 *
 * Serve os DOIS ambientes do app do professor com um só componente:
 *  - 'claro'  → cockpit "Hoje" (aba Arboria), pele neutra do infantilTheme.
 *  - 'escuro' → santuário das Inteligências, índigo profundo, texto em branco.
 * No escuro aceita `corAcento` (a cor oficial da inteligência) para tingir o
 * número, os rótulos e os controles, amarrando o card à identidade da tela.
 *
 * GESTO ISOLADO: o app usa deslizar horizontal para trocar de inteligência
 * (santuário) e de aba (layout), via onTouchStart/onTouchEnd em ancestrais. Os
 * handlers de gesto ficam na RAIZ do conteúdo aberto do card (chips + carrossel
 * + rodapé + PDF + beiradas). Qualquer arraste HORIZONTAL que comece em qualquer
 * ponto do card aberto chama stopPropagation e NUNCA borbulha para o swipe da
 * página/aba. O arraste VERTICAL é deixado passar de propósito: o scroll da
 * página nunca é sequestrado (só stopPropagation, jamais preventDefault).
 *
 * Acessível: cabeçalho é <button> com aria-expanded/aria-controls; os atalhos
 * são <button> em role=tablist; as setas são <button> com aria-label; o carrossel
 * é navegável por teclado (setas) e respeita prefers-reduced-motion.
 */

type Variante = 'claro' | 'escuro';

interface Paleta {
  cardBg: string;
  cardBorder: string;
  badgeBg: string;
  badgeColor: string;
  nome: string;
  objetivoFaint: string;
  chevron: string;
  divisor: string;
  rotulo: string;
  corpo: string;
  pdfBg: string;
  pdfColor: string;
  pdfBorder: string;
  concluidaColor: string;
  concluidaBg: string;
  /** Pílula "Agora" da atividade da vez. */
  agoraBg: string;
  agoraColor: string;
  /** Chip de atalho ativo. */
  chipOnBg: string;
  chipOnColor: string;
  /** Chip de atalho inativo. */
  chipBg: string;
  chipColor: string;
  chipBorder: string;
  /** Setas do carrossel. */
  setaBg: string;
  setaColor: string;
  setaBorder: string;
  /** Bolinhas de posição. */
  dotOn: string;
  dotOff: string;
}

/**
 * Cor de texto legível sobre um fundo sólido. Serve a pílula "Agora" na variante
 * escura: `corAcento` pode ser uma inteligência de cor clara, onde texto branco
 * some. Estima a luminância relativa e devolve texto escuro em fundo claro.
 * Se a cor não for um hex de 6 dígitos, mantém o branco (fallback seguro).
 */
const corLegivelSobre = (hex?: string): string => {
  if (!hex) return '#FFFFFF';
  const m = hex.replace('#', '');
  if (m.length !== 6 || /[^0-9a-fA-F]/.test(m)) return '#FFFFFF';
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? '#1A2233' : '#FFFFFF';
};

const paletaClaro = (): Paleta => ({
  cardBg: t.surfaceAlt,
  cardBorder: t.border,
  badgeBg: t.accentSoft,
  badgeColor: t.accentText,
  nome: t.text,
  objetivoFaint: t.textFaint,
  chevron: t.textMuted,
  divisor: t.border,
  rotulo: t.accentText,
  corpo: t.textMuted,
  pdfBg: t.accentSoft,
  pdfColor: t.accentText,
  pdfBorder: t.accentBorder,
  concluidaColor: t.presenteText,
  concluidaBg: 'rgba(34,160,107,0.12)',
  agoraBg: t.accent,
  agoraColor: '#FFFFFF',
  chipOnBg: t.accent,
  chipOnColor: '#FFFFFF',
  chipBg: t.surface,
  chipColor: t.textMuted,
  chipBorder: t.border,
  setaBg: t.surface,
  setaColor: t.accentText,
  setaBorder: t.accentBorder,
  dotOn: t.accent,
  dotOff: t.border,
});

const paletaEscuro = (corAcento?: string): Paleta => ({
  cardBg: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.18)',
  badgeBg: corAcento ?? 'rgba(255,255,255,0.16)',
  badgeColor: '#FFFFFF',
  nome: '#FFFFFF',
  objetivoFaint: 'rgba(255,255,255,0.68)',
  chevron: 'rgba(255,255,255,0.75)',
  divisor: 'rgba(255,255,255,0.16)',
  rotulo: corAcento ?? 'rgba(255,255,255,0.9)',
  corpo: 'rgba(255,255,255,0.9)',
  pdfBg: 'rgba(255,255,255,0.12)',
  pdfColor: '#FFFFFF',
  pdfBorder: 'rgba(255,255,255,0.3)',
  concluidaColor: '#8CE0B4',
  concluidaBg: 'rgba(140,224,180,0.16)',
  agoraBg: corAcento ?? 'rgba(255,255,255,0.2)',
  agoraColor: corAcento ? corLegivelSobre(corAcento) : '#FFFFFF',
  chipOnBg: corAcento ?? 'rgba(255,255,255,0.92)',
  chipOnColor: '#FFFFFF',
  chipBg: 'rgba(255,255,255,0.08)',
  chipColor: 'rgba(255,255,255,0.82)',
  chipBorder: 'rgba(255,255,255,0.22)',
  setaBg: 'rgba(255,255,255,0.1)',
  setaColor: '#FFFFFF',
  setaBorder: 'rgba(255,255,255,0.3)',
  dotOn: corAcento ?? '#FFFFFF',
  dotOff: 'rgba(255,255,255,0.28)',
});

interface SecaoDef {
  key: string;
  /** Rótulo curto do chip de atalho. */
  chip: string;
  /** Título completo dentro da tela. */
  titulo: string;
  Icone: typeof Target;
  texto: string | null;
}

const AtividadeCard = ({
  atividade,
  numero,
  variante,
  corAcento,
  defaultAberto = false,
  concluida = false,
  corrente = false,
}: {
  atividade: AtividadePlanoItem;
  /** Posição exibida no selo (1-based). */
  numero: number;
  variante: Variante;
  /** Só no escuro: cor oficial da inteligência, para tingir selo e rótulos. */
  corAcento?: string;
  defaultAberto?: boolean;
  /** A atividade já foi marcada como concluída para a turma (finalizar aula). */
  concluida?: boolean;
  /** É a atividade DA VEZ: ganha borda de acento e a pílula "Agora". */
  corrente?: boolean;
}) => {
  const [aberto, setAberto] = useState(defaultAberto);
  const [indice, setIndice] = useState(0);
  const conteudoId = useId();
  const p = variante === 'escuro' ? paletaEscuro(corAcento) : paletaClaro();

  // Ordem de USO, não de planejamento: como fazer primeiro. Só entram as seções
  // com conteúdo real.
  const secoes: SecaoDef[] = (
    [
      { key: 'objetivo', chip: 'Objetivo', titulo: 'Objetivo', Icone: Target, texto: atividade.objetivo },
      { key: 'conduzir', chip: 'Conduzir', titulo: 'Como conduzir', Icone: Compass, texto: atividade.comoConduzir },
      { key: 'materiais', chip: 'Materiais', titulo: 'Materiais', Icone: Package, texto: atividade.materiais },
      { key: 'observar', chip: 'Observar', titulo: 'O que observar', Icone: Eye, texto: atividade.oQueObservar },
    ] as SecaoDef[]
  ).filter((s) => !!s.texto && !!s.texto.trim());

  const n = secoes.length;
  const temCarrossel = n >= 2;
  const temDetalhe = n > 0 || !!atividade.pdfUrl;

  // O índice nunca pode passar do total (defensivo: seções são estáveis, mas
  // se mudarem, não deixamos o trilho fora do fim).
  useEffect(() => {
    if (indice > n - 1) setIndice(Math.max(0, n - 1));
  }, [indice, n]);

  // Destaque leve na corrente: a borda ganha a cor de acento (nunca na concluída).
  const destaque = corrente && !concluida;
  const corDestaque = variante === 'escuro' ? corAcento ?? '#FFFFFF' : t.accent;
  const borda = destaque ? corDestaque : p.cardBorder;

  const ir = (delta: number) => {
    setIndice((atual) => {
      const alvo = atual + delta;
      if (alvo < 0 || alvo > n - 1) return atual;
      return alvo;
    });
  };

  // Abre/fecha. Ao RECOLHER, o trilho volta para o Objetivo (seção 0): reabrir
  // sempre começa na ordem escolhida pelo Fundador, não na última seção vista.
  const alternar = () => {
    if (aberto) setIndice(0);
    setAberto((v) => !v);
  };

  // ---- GESTO ISOLADO A PARTIR DA RAIZ DO CARD ABERTO ----------------------
  // Estes handlers vivem no contêiner do conteúdo ABERTO (chips + carrossel +
  // rodapé + PDF + beiradas). Qualquer gesto HORIZONTAL que comece em qualquer
  // ponto do card aberto é isolado com stopPropagation, então nunca borbulha
  // para o swipe de inteligência (santuário) nem para o swipe de aba (layout).
  // O gesto VERTICAL é deixado passar de propósito: o scroll da página nunca é
  // sequestrado (só usamos stopPropagation, jamais preventDefault).
  const toqueRef = useRef<{ x: number; y: number } | null>(null);
  const mouseRef = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const t0 = e.touches[0];
    toqueRef.current = { x: t0.clientX, y: t0.clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const ini = toqueRef.current;
    if (!ini) return;
    const t0 = e.touches[0];
    const dx = t0.clientX - ini.x;
    const dy = t0.clientY - ini.y;
    // Assim que o gesto se revela horizontal, isola já no meio do movimento.
    // Enquanto for vertical (scroll), deixa borbular normalmente.
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) e.stopPropagation();
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const ini = toqueRef.current;
    toqueRef.current = null;
    if (!ini) return;
    const fim = e.changedTouches[0];
    const dx = fim.clientX - ini.x;
    const dy = fim.clientY - ini.y;
    // Só um gesto claramente horizontal é tratado como swipe: isola (para não
    // trocar inteligência/aba) e, se houver carrossel, muda de seção.
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      e.stopPropagation();
      ir(dx < 0 ? 1 : -1);
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    mouseRef.current = e.clientX;
  };
  const onMouseUp = (e: React.MouseEvent) => {
    const x0 = mouseRef.current;
    mouseRef.current = null;
    if (x0 === null) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 40) {
      e.stopPropagation();
      ir(dx < 0 ? 1 : -1);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      ir(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      ir(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setIndice(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setIndice(n - 1);
    }
  };

  const renderConteudo = (s: SecaoDef) => (
    <>
      <div className="flex items-center gap-1.5 mb-1">
        <s.Icone size={13} strokeWidth={1.75} style={{ color: p.rotulo }} aria-hidden="true" />
        <span
          className="text-[10.5px] uppercase font-bold"
          style={{ color: p.rotulo, letterSpacing: '0.08em' }}
        >
          {s.titulo}
        </span>
      </div>
      {/* Texto com teto de altura + rolagem: textos longos (ex: "conduzir") não
          esticam mais a tela. Curto aparece inteiro; longo rola dentro da caixa. */}
      <div className="max-h-[240px] overflow-y-auto overscroll-contain pr-1">
        <p className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: p.corpo }}>
          {s.texto}
        </p>
      </div>
    </>
  );

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: p.cardBg,
        border: `1px solid ${borda}`,
        boxShadow: destaque ? `0 0 0 1px ${borda}` : undefined,
      }}
    >
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-controls={conteudoId}
        className="w-full text-left p-3 flex items-center gap-2.5 transition-colors"
      >
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
          style={{ backgroundColor: p.badgeBg, color: p.badgeColor, opacity: concluida ? 0.65 : 1 }}
        >
          {numero}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium" style={{ color: p.nome }}>
            {atividade.nome}
          </span>
          {atividade.objetivo && !aberto && !concluida && (
            <span className="block text-[11px] truncate" style={{ color: p.objetivoFaint }}>
              {atividade.objetivo}
            </span>
          )}
        </span>
        {destaque && (
          <span
            className="flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ backgroundColor: p.agoraBg, color: p.agoraColor }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: p.agoraColor }}
              aria-hidden="true"
            />
            <span className="text-[10.5px] font-bold uppercase" style={{ letterSpacing: '0.06em' }}>
              Agora
            </span>
          </span>
        )}
        {concluida && (
          <span
            className="flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ backgroundColor: p.concluidaBg, color: p.concluidaColor }}
          >
            <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" />
            <span className="text-[10.5px] font-semibold">concluída</span>
          </span>
        )}
        <ChevronDown
          size={18}
          className="flex-shrink-0 transition-transform"
          style={{ color: p.chevron, transform: aberto ? 'rotate(180deg)' : 'none' }}
          aria-hidden="true"
        />
      </button>

      {aberto && (
        <div
          id={conteudoId}
          className="px-3 pb-3.5 pt-0.5"
          style={{ borderTop: `1px solid ${p.divisor}` }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
        >
          <div className="pt-1" />

          {!temDetalhe && (
            <p className="text-[13px] italic" style={{ color: p.objetivoFaint }}>
              Sem detalhes cadastrados para esta atividade ainda.
            </p>
          )}

          {/* ATALHOS: pulam direto para a seção. Só quando há mais de uma. */}
          {temCarrossel && (
            <div className="flex flex-wrap gap-1.5 mb-3" role="tablist" aria-label="Atalhos da atividade">
              {secoes.map((s, k) => {
                const ativo = k === indice;
                return (
                  <button
                    key={s.key}
                    type="button"
                    role="tab"
                    aria-selected={ativo}
                    aria-controls={`${conteudoId}-slide-${k}`}
                    onClick={() => setIndice(k)}
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
                    style={{
                      backgroundColor: ativo ? p.chipOnBg : p.chipBg,
                      color: ativo ? p.chipOnColor : p.chipColor,
                      border: `1px solid ${ativo ? p.chipOnBg : p.chipBorder}`,
                    }}
                  >
                    {s.chip}
                  </button>
                );
              })}
            </div>
          )}

          {/* CARROSSEL: um ponto por tela. */}
          {temCarrossel ? (
            <>
              <div
                className="overflow-hidden"
                role="group"
                aria-roledescription="Carrossel de seções"
                aria-label={`${secoes[Math.min(indice, n - 1)]?.titulo ?? ''}, ${Math.min(indice, n - 1) + 1} de ${n}`}
                tabIndex={0}
                onKeyDown={onKeyDown}
              >
                <div
                  className="flex transition-transform duration-300 ease-out motion-reduce:transition-none"
                  style={{
                    width: `${n * 100}%`,
                    transform: `translateX(-${indice * (100 / n)}%)`,
                  }}
                >
                  {secoes.map((s, k) => (
                    <div
                      key={s.key}
                      id={`${conteudoId}-slide-${k}`}
                      role="tabpanel"
                      aria-roledescription="slide"
                      aria-label={`${s.titulo}, ${k + 1} de ${n}`}
                      aria-hidden={k !== indice}
                      className="flex-shrink-0"
                      style={{ width: `${100 / n}%` }}
                    >
                      <div className="min-h-[104px] pr-0.5">{renderConteudo(s)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rodapé: setas + bolinhas de posição. */}
              <div
                className="mt-3 pt-2.5 flex items-center justify-between"
                style={{ borderTop: `1px solid ${p.divisor}` }}
              >
                <button
                  type="button"
                  onClick={() => ir(-1)}
                  disabled={indice === 0}
                  aria-label="Seção anterior"
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity disabled:opacity-35"
                  style={{ backgroundColor: p.setaBg, color: p.setaColor, border: `1px solid ${p.setaBorder}` }}
                >
                  <ChevronLeft size={17} strokeWidth={2} aria-hidden="true" />
                </button>

                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {secoes.map((s, k) => (
                    <span
                      key={s.key}
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: k === indice ? 18 : 6,
                        backgroundColor: k === indice ? p.dotOn : p.dotOff,
                      }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => ir(1)}
                  disabled={indice === n - 1}
                  aria-label="Próxima seção"
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity disabled:opacity-35"
                  style={{ backgroundColor: p.setaBg, color: p.setaColor, border: `1px solid ${p.setaBorder}` }}
                >
                  <ChevronRight size={17} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            n === 1 && <div>{renderConteudo(secoes[0])}</div>
          )}

          {/* PDF: botão fixo, fora do carrossel, sempre visível quando aberto. */}
          {atividade.pdfUrl && (
            <a
              href={atividade.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold"
              style={{ backgroundColor: p.pdfBg, color: p.pdfColor, border: `1px solid ${p.pdfBorder}` }}
            >
              <FileText size={15} strokeWidth={1.75} aria-hidden="true" />
              Abrir material em PDF
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default AtividadeCard;
