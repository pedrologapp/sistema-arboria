import { Bell } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';

const ProfessorHeaderSimplificado = () => {
  const { faseAtual, institutionName, isLoading, segmento } = useProfessor();

  // Label do segmento
  const segmentoLabel = segmento === 'infantil' ? 'Infantil' : 
                         segmento === 'fundamental1' ? 'Fundamental 1' : '';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d] border-b border-white/10">
      <div className="flex flex-col px-4 py-2 max-w-lg mx-auto">
        {/* Linha 1: Logo + Fase + Notificações */}
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl">🌳</span>
            <span className="font-semibold text-white text-sm">Projeto Arboria</span>
          </div>

          {/* Fase + Notificações */}
          <div className="flex items-center gap-3">
            {/* Fase (texto simples com cor) */}
            {isLoading ? (
              <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
            ) : faseAtual?.inteligencia ? (
              <span 
                className="text-sm font-medium"
                style={{ color: faseAtual.inteligencia.cor_hex || '#fff' }}
              >
                Fase {faseAtual.inteligencia.nome}
              </span>
            ) : null}
            
            {/* Sino */}
            <button className="relative p-1 text-white/60 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Linha 2: Nome da instituição + Segmento */}
        <div className="flex items-center gap-2 ml-7 -mt-0.5">
          {institutionName && (
            <p className="text-xs text-white/40">
              {institutionName}
            </p>
          )}
          {segmentoLabel && (
            <>
              <span className="text-xs text-white/20">•</span>
              <span className="text-xs text-white/40">{segmentoLabel}</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default ProfessorHeaderSimplificado;
