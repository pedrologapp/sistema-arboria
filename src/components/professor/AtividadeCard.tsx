import { useId, useState } from 'react';
import { ChevronDown, Target, Package, Compass, Eye, FileText, CheckCircle2 } from 'lucide-react';
import type { AtividadePlanoItem } from '@/hooks/useTurmaAtividadePlano';
import { infantilTheme as t } from '@/styles/infantilTheme';

/**
 * Card de ATIVIDADE do plano da turma, expansível.
 *
 * Recolhido: número da ordem + nome (+ objetivo em uma linha).
 * Aberto: objetivo, materiais, como conduzir, o que observar e link do PDF.
 *
 * Serve os DOIS ambientes do app do professor com um só componente:
 *  - 'claro'  → cockpit "Hoje" (aba Arboria), pele neutra do infantilTheme.
 *  - 'escuro' → santuário das Inteligências, índigo profundo, texto em branco.
 * No escuro aceita `corAcento` (a cor oficial da inteligência) para tingir o
 * número e os rótulos das seções, amarrando o card à identidade da tela.
 *
 * Acessível: o cabeçalho é um <button> com aria-expanded/aria-controls; o PDF
 * é um <a> separado, fora do botão (nunca interativo aninhado).
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
  hoverBg: string;
  /** Cor do texto/ícone da marca "concluída". */
  concluidaColor: string;
  /** Fundo suave da marca "concluída". */
  concluidaBg: string;
}

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
  hoverBg: t.surfaceSunken,
  concluidaColor: t.presenteText,
  concluidaBg: 'rgba(34,160,107,0.12)',
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
  hoverBg: 'rgba(255,255,255,0.1)',
  concluidaColor: '#8CE0B4',
  concluidaBg: 'rgba(140,224,180,0.16)',
});

/** Bloco rotulado dentro do card aberto: só renderiza se houver conteúdo. */
const Secao = ({
  Icone,
  rotulo,
  texto,
  p,
}: {
  Icone: typeof Target;
  rotulo: string;
  texto: string | null;
  p: Paleta;
}) => {
  if (!texto || !texto.trim()) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icone size={13} strokeWidth={1.75} style={{ color: p.rotulo }} />
        <span
          className="text-[10.5px] uppercase font-bold"
          style={{ color: p.rotulo, letterSpacing: '0.08em' }}
        >
          {rotulo}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: p.corpo }}>
        {texto}
      </p>
    </div>
  );
};

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
  /** É a atividade DA VEZ (destaque leve na borda). Sem efeito se concluída. */
  corrente?: boolean;
}) => {
  const [aberto, setAberto] = useState(defaultAberto);
  const conteudoId = useId();
  const p = variante === 'escuro' ? paletaEscuro(corAcento) : paletaClaro();

  const temDetalhe =
    !!(atividade.objetivo || atividade.materiais || atividade.comoConduzir || atividade.oQueObservar || atividade.pdfUrl);

  // Destaque leve na corrente: a borda ganha a cor de acento (nunca na concluída).
  const destaque = corrente && !concluida;
  const corDestaque = variante === 'escuro' ? corAcento ?? '#FFFFFF' : t.accent;
  const borda = destaque ? corDestaque : p.cardBorder;

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
        onClick={() => setAberto((v) => !v)}
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
          className="px-3 pb-3.5 pt-0.5 space-y-3.5"
          style={{ borderTop: `1px solid ${p.divisor}` }}
        >
          <div className="pt-1" />
          {!temDetalhe && (
            <p className="text-[13px] italic" style={{ color: p.objetivoFaint }}>
              Sem detalhes cadastrados para esta atividade ainda.
            </p>
          )}
          <Secao Icone={Target} rotulo="Objetivo" texto={atividade.objetivo} p={p} />
          <Secao Icone={Package} rotulo="Materiais" texto={atividade.materiais} p={p} />
          <Secao Icone={Compass} rotulo="Como conduzir" texto={atividade.comoConduzir} p={p} />
          <Secao Icone={Eye} rotulo="O que observar" texto={atividade.oQueObservar} p={p} />

          {atividade.pdfUrl && (
            <a
              href={atividade.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold"
              style={{ backgroundColor: p.pdfBg, color: p.pdfColor, border: `1px solid ${p.pdfBorder}` }}
            >
              <FileText size={15} strokeWidth={1.75} />
              Abrir material em PDF
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default AtividadeCard;
