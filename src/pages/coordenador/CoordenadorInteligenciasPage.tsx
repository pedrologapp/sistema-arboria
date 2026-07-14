import { Sparkles } from 'lucide-react';
import { coordenadorTheme as t } from '@/styles/coordenadorTheme';

/**
 * Aba INTELIGÊNCIAS do coordenador. PLACEHOLDER neste passo.
 * Vai reusar a página da Fase do Infantil (o santuário dos 8 mecanismos),
 * adaptada ao coordenador. Construção em passo próprio.
 */
const CoordenadorInteligenciasPage = () => (
  <div className="pt-3">
    <h1 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Georgia, serif', color: t.ink }}>
      Inteligências
    </h1>
    <div
      className="rounded-2xl p-8 flex flex-col items-center text-center"
      style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}
    >
      <span
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
        style={{ backgroundColor: t.accentDim, color: t.accent2 }}
      >
        <Sparkles size={22} strokeWidth={1.75} />
      </span>
      <p className="text-sm font-medium" style={{ color: t.ink }}>
        Em breve
      </p>
      <p className="mt-2 text-[13px] leading-relaxed max-w-xs" style={{ color: t.mut }}>
        O santuário dos oito mecanismos, para o coordenador estudar as inteligências junto com os
        professores.
      </p>
    </div>
  </div>
);

export default CoordenadorInteligenciasPage;
