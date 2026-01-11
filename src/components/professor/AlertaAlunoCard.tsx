import { ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AlertaAlunoCardProps {
  aluno: {
    id: string;
    nome: string;
    avatarUrl?: string;
    serie: string;
    turma: string;
  };
  motivo: string;
  tipoAlerta: 'precisa_atencao' | 'celebrar' | 'nao_esquecer';
  onClick: () => void;
}

export const AlertaAlunoCard = ({ aluno, motivo, tipoAlerta, onClick }: AlertaAlunoCardProps) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getBorderColor = () => {
    switch (tipoAlerta) {
      case 'precisa_atencao': return 'border-red-500/30';
      case 'celebrar': return 'border-amber-500/30';
      case 'nao_esquecer': return 'border-orange-500/30';
    }
  };

  const getHoverColor = () => {
    switch (tipoAlerta) {
      case 'precisa_atencao': return 'hover:bg-red-500/10';
      case 'celebrar': return 'hover:bg-amber-500/10';
      case 'nao_esquecer': return 'hover:bg-orange-500/10';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg bg-black/20 border ${getBorderColor()} ${getHoverColor()} transition-all duration-200 group`}
    >
      {/* Avatar */}
      <Avatar className="w-9 h-9 flex-shrink-0">
        <AvatarImage src={aluno.avatarUrl} alt={aluno.nome} />
        <AvatarFallback className="bg-white/10 text-white/70 text-xs font-medium">
          {getInitials(aluno.nome)}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium truncate">
            {aluno.nome}
          </span>
          <span className="text-white/40 text-xs flex-shrink-0">
            {aluno.serie}{aluno.turma}
          </span>
        </div>
        <p className="text-white/50 text-xs truncate mt-0.5">
          {motivo}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight 
        className="w-4 h-4 text-white/30 flex-shrink-0 group-hover:text-white/60 transition-colors" 
      />
    </button>
  );
};
