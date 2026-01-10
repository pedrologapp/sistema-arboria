import { Bell } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';

const ProfessorHeader = () => {
  const { faseAtual, institutionName } = useProfessor();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d]/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-lg mx-auto">
        {/* Linha 1: Logo, Fase, Notificações */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌳</span>
            <span className="font-semibold text-white">Arbória</span>
          </div>

          {/* Badge da Fase Atual */}
          {faseAtual?.inteligencia && (
            <div
              className="px-3 py-1 rounded-full text-xs font-medium border"
              style={{
                backgroundColor: `${faseAtual.inteligencia.cor_hex}20`,
                borderColor: `${faseAtual.inteligencia.cor_hex}40`,
                color: faseAtual.inteligencia.cor_hex || '#fff'
              }}
            >
              {faseAtual.inteligencia.emoji} Fase {faseAtual.inteligencia.nome}
            </div>
          )}

          <button className="p-2 text-white/60 hover:text-white transition-colors">
            <Bell size={20} />
          </button>
        </div>

        {/* Linha 2: Nome da instituição */}
        {institutionName && (
          <div className="px-4 pb-2 -mt-1">
            <span className="text-xs text-white/40">{institutionName}</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default ProfessorHeader;
