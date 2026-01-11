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
        corTexto: 'text-green-400',
        icone: '⭐',
        label: 'Destaque'
      };
    case 'risco':
      return {
        cor: 'bg-red-500',
        corTexto: 'text-red-400',
        icone: '⚠️',
        label: 'Em risco'
      };
    default:
      return {
        cor: 'bg-yellow-500',
        corTexto: 'text-yellow-400',
        icone: '📊',
        label: 'Regular'
      };
  }
};

export const AlunoStatusLinha = ({ aluno, onClick, casaColor }: AlunoStatusLinhaProps) => {
  const config = getStatusConfig(aluno.status);

  return (
    <button
      onClick={onClick}
      className="w-full p-3 rounded-xl text-left group
        bg-gradient-to-r from-white/[0.04] to-transparent
        hover:from-white/[0.08] hover:to-white/[0.02]
        border border-transparent hover:border-white/10
        transition-all duration-300
        hover:scale-[1.01] active:scale-[0.99]"
      style={{
        boxShadow: `0 2px 8px -2px ${casaColor}10`
      }}
    >
      <div className="flex items-center gap-3">
        {/* Bolinha de status */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.cor}`} />
        
        {/* Avatar */}
        {aluno.avatarUrl ? (
          <img 
            src={aluno.avatarUrl} 
            alt={aluno.nome}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-white/10"
          />
        ) : (
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 border border-white/20"
            style={{ backgroundColor: `${casaColor}40` }}
          >
            {aluno.nome.charAt(0).toUpperCase()}
          </div>
        )}
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium truncate">
              {aluno.nome}
            </span>
            <span className="text-white/40 text-sm flex-shrink-0">
              {aluno.serie}{aluno.turma}
            </span>
          </div>
          <p className={`text-sm ${config.corTexto}`}>
            {config.icone} {config.label} • {aluno.percentualEntregas}% entregas
          </p>
        </div>
        
        {/* Pontos */}
        <span className="text-green-400 font-semibold flex-shrink-0 text-sm">
          {aluno.pontosTotais} pts
        </span>
        
        {/* Seta */}
        <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors" />
      </div>
    </button>
  );
};
