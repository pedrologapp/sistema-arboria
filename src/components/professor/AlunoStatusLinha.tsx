import { ChevronRight, Star } from 'lucide-react';
import type { AlunoComStatus } from '@/hooks/useAlunosCasa';

interface AlunoStatusLinhaProps {
  posicao: number;
  aluno: AlunoComStatus;
  onClick: () => void;
  casaColor: string;
}

const getStatusColor = (status: AlunoComStatus['status']) => {
  switch (status) {
    case 'destaque':
      return '#22C55E';
    case 'risco':
      return '#EF4444';
    case 'regular':
      return '#EAB308';
    default:
      return '#6B7280';
  }
};

export const AlunoStatusLinha = ({ posicao, aluno, onClick, casaColor }: AlunoStatusLinhaProps) => {
  const statusColor = getStatusColor(aluno.status);

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
      
      {/* Avatar com bolinha de status */}
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
        {/* Bolinha de status */}
        <div 
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0d0d]"
          style={{ backgroundColor: statusColor }}
        />
      </div>
      
      {/* Nome + Série/Turma + Casa */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium truncate">
            {aluno.nome}
          </span>
          <span className="text-white/40 text-xs flex-shrink-0">
            {aluno.serie}{aluno.turma}
          </span>
        </div>
        <span className={`text-[11px] ${aluno.casaNome ? 'text-white/40' : 'text-white/25 italic'}`}>
          {aluno.casaNome || 'Não designado'}
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
