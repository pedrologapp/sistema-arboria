import { ChevronRight, Star } from 'lucide-react';
import type { AlunoComEstado, EstadoCalculado } from '@/hooks/useAlunosComEstado';
import { getEstadoVisual } from '@/hooks/useAlunosComEstado';

interface AlunoStatusLinhaProps {
  posicao: number;
  aluno: AlunoComEstado;
  onClick: () => void;
  casaColor: string;
}

const EstadoIndicador = ({ estado }: { estado: EstadoCalculado }) => {
  const visual = getEstadoVisual(estado);
  
  if (visual.icone === 'star') {
    return (
      <Star 
        className="w-3.5 h-3.5" 
        style={{ color: visual.cor }} 
        fill={visual.cor}
        strokeWidth={0}
      />
    );
  }
  
  if (visual.icone === 'circle-empty') {
    return (
      <div 
        className="w-2.5 h-2.5 rounded-full border-2"
        style={{ borderColor: visual.cor }}
      />
    );
  }
  
  return (
    <div 
      className="w-2.5 h-2.5 rounded-full"
      style={{ backgroundColor: visual.cor }}
    />
  );
};

export const AlunoStatusLinha = ({ posicao, aluno, onClick, casaColor }: AlunoStatusLinhaProps) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-2.5 px-3 
        hover:bg-white/5 rounded-lg transition-colors group"
    >
      {/* Posição no ranking */}
      <span className="text-white/40 text-sm font-medium w-6 text-right flex-shrink-0">
        {posicao}
      </span>
      
      {/* Indicador de estado */}
      <div className="flex-shrink-0 w-4 flex items-center justify-center">
        <EstadoIndicador estado={aluno.estadoCalculado} />
      </div>
      
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {aluno.avatarUrl ? (
          <img 
            src={aluno.avatarUrl} 
            alt={aluno.nome}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ backgroundColor: `${casaColor}40` }}
          >
            {aluno.nome.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      
      {/* Nome + Série/Turma (em linha) */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-white text-sm font-medium truncate">
          {aluno.nome}
        </span>
        <span className="text-white/40 text-xs flex-shrink-0">
          {aluno.serie}{aluno.turma}
        </span>
      </div>
      
      {/* Pontuação com ícone Star */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
        <span className="text-yellow-400 text-sm font-semibold">
          {aluno.pontosTotais}pts
        </span>
      </div>
      
      {/* Seta */}
      <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors" />
    </button>
  );
};
