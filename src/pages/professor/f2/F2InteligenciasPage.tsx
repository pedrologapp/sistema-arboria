import { BookOpen } from 'lucide-react';
import { infantilTheme as t } from '@/styles/infantilTheme';

/**
 * Aba INTELIGÊNCIAS (Fundamental 2, reforma). Placeholder honesto do increment 1:
 * a aba existe para a navegação de 4 abas funcionar ponta a ponta. O estudo das
 * 8 inteligências (conteúdo por Casa) chega numa próxima rodada.
 */
const F2InteligenciasPage = () => (
  <div className="pt-10 text-center space-y-4">
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
      style={{ backgroundColor: t.accentSoft, boxShadow: t.shadowSm }}
    >
      <BookOpen size={30} style={{ color: t.accent }} strokeWidth={1.5} />
    </div>
    <div>
      <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.accentText }}>
        Inteligências
      </p>
      <h1 className="text-xl font-bold mt-1" style={{ color: t.text }}>
        Estudo das inteligências
      </h1>
      <p className="text-sm mt-2 max-w-xs mx-auto leading-relaxed" style={{ color: t.textMuted }}>
        O material de estudo das 8 inteligências, por Casa, está em construção. Em breve você aprofunda
        aqui o olhar sobre cada mecanismo.
      </p>
    </div>
  </div>
);

export default F2InteligenciasPage;
