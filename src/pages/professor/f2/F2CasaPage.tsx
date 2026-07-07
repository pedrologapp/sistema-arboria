import { Home } from 'lucide-react';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { useProfessor } from '@/contexts/ProfessorContext';
import { corDaCasa } from '@/config/f2Reforma';

/**
 * Aba SUA CASA (Fundamental 2, reforma). Placeholder honesto do increment 1:
 * a aba existe para a navegação de 4 abas funcionar ponta a ponta. O painel da
 * Casa (canal, mentorados, agregados) chega numa próxima rodada.
 */
const F2CasaPage = () => {
  const { casaMentor } = useProfessor();
  const cor = corDaCasa(casaMentor?.id);

  return (
    <div className="pt-10 text-center space-y-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
        style={{ backgroundColor: t.accentSoft, boxShadow: t.shadowSm }}
      >
        <Home size={30} style={{ color: cor }} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.accentText }}>
          Sua Casa
        </p>
        <h1 className="text-xl font-bold mt-1" style={{ color: t.text }}>
          {casaMentor?.nome ? `Casa ${casaMentor.nome}` : 'Sua Casa'}
        </h1>
        <p className="text-sm mt-2 max-w-xs mx-auto leading-relaxed" style={{ color: t.textMuted }}>
          O painel da sua Casa está em construção. Em breve você acompanha aqui os seus mentorados
          e a vida da Casa.
        </p>
      </div>
    </div>
  );
};

export default F2CasaPage;
