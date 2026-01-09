import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Canal {
  id: string;
  nome: string;
  icone: string | null;
  tipo: string | null;
  apenas_lideranca: boolean | null;
  descricao: string | null;
}

interface CanalItemProps {
  canal: Canal;
  naoLidas?: number;
  onClick: () => void;
  casaColor?: string;
}

export const CanalItem = ({ canal, naoLidas = 0, onClick, casaColor }: CanalItemProps) => {
  const icone = canal.icone || '💬';
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
        "bg-white/5 hover:bg-white/10 active:scale-[0.98]",
        "text-left"
      )}
    >
      {/* Ícone do canal */}
      <span className="text-lg flex-shrink-0">{icone}</span>
      
      {/* Nome do canal */}
      <span className="flex-1 text-white/90 font-medium truncate">
        {canal.nome}
      </span>
      
      {/* Ícone de cadeado se apenas liderança */}
      {canal.apenas_lideranca && (
        <Lock className="w-4 h-4 text-yellow-500/70 flex-shrink-0" />
      )}
      
      {/* Badge de não lidas */}
      {naoLidas > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center text-white bg-red-500">
          {naoLidas > 99 ? '99+' : naoLidas}
        </span>
      )}
    </button>
  );
};
