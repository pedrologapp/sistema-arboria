import { ChevronRight } from 'lucide-react';
import type { AlunoComStatus } from '@/hooks/useAlunosCasa';

interface AlunoStatusLinhaProps {
  aluno: AlunoComStatus;
  onClick: () => void;
  casaColor: string;
}

const getStatusConfig = (status: AlunoComStatus['status']) => {
  switch (status) {
    case 'destaque':
      return {
        cor: 'bg-green-500',
        icone: '⭐'
      };
    case 'risco':
      return {
        cor: 'bg-red-500',
        icone: '⚠️'
      };
    default:
      return {
        cor: 'bg-yellow-500',
        icone: '📊'
      };
  }
};

export const AlunoStatusLinha = ({ aluno, onClick, casaColor }: AlunoStatusLinhaProps) => {
  const config = getStatusConfig(aluno.status);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-2.5 px-3 
        hover:bg-white/5 rounded-lg transition-colors group"
    >
      {/* Bolinha de status */}
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.cor}`} />
      
      {/* Avatar pequeno - 32px */}
      {aluno.avatarUrl ? (
        <img 
          src={aluno.avatarUrl} 
          alt={aluno.nome}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
          style={{ backgroundColor: `${casaColor}40` }}
        >
          {aluno.nome.charAt(0).toUpperCase()}
        </div>
      )}
      
      {/* Nome + Série/Turma (em linha) */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-white text-sm font-medium truncate">
          {aluno.nome}
        </span>
        <span className="text-white/40 text-xs flex-shrink-0">
          {aluno.serie}{aluno.turma}
        </span>
      </div>
      
      {/* Status emoji + Pontos */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs">{config.icone}</span>
        <span className="text-green-400 text-sm font-semibold">
          {aluno.pontosTotais}pts
        </span>
      </div>
      
      {/* Seta */}
      <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors" />
    </button>
  );
};
