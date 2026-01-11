import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight, Circle } from 'lucide-react';

interface AlertaFaseAnteriorCardProps {
  aluno: {
    id: string;
    nome: string;
    avatarUrl?: string;
    serie: string;
    turma: string;
  };
  faseAnteriorNome: string;
  faseAnteriorEmoji: string;
  motivo: string;
  observadoFaseAtual: boolean;
  onClick: () => void;
}

export const AlertaFaseAnteriorCard = ({
  aluno,
  faseAnteriorNome,
  faseAnteriorEmoji,
  motivo,
  observadoFaseAtual,
  onClick
}: AlertaFaseAnteriorCardProps) => {
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors text-left border-l-2 border-orange-500"
    >
      <Avatar className="h-10 w-10 border border-orange-500/30">
        <AvatarImage src={aluno.avatarUrl} alt={aluno.nome} />
        <AvatarFallback className="bg-orange-900/50 text-orange-200 text-xs">
          {getInitials(aluno.nome)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-white truncate">{aluno.nome}</span>
          <span className="text-xs text-orange-300 whitespace-nowrap">
            {aluno.serie} {aluno.turma}
          </span>
        </div>

        <p className="text-xs text-orange-200/80 mt-0.5">
          {faseAnteriorEmoji} Fase {faseAnteriorNome} (anterior)
        </p>

        <p className="text-sm text-orange-100 mt-1 line-clamp-1">
          {motivo}
        </p>

        <div className="flex items-center gap-1.5 mt-2">
          <Circle 
            className={`w-2.5 h-2.5 ${observadoFaseAtual ? 'fill-green-400 text-green-400' : 'fill-gray-400 text-gray-400'}`} 
          />
          <span className={`text-xs ${observadoFaseAtual ? 'text-green-300' : 'text-gray-400'}`}>
            {observadoFaseAtual ? 'Já observado na fase atual' : 'Ainda não observado na fase atual'}
          </span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-orange-300 mt-1 flex-shrink-0" />
    </button>
  );
};
