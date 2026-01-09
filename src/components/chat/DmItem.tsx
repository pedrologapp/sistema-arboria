import { cn } from '@/lib/utils';
import { StatusIndicator } from './StatusIndicator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Usuario {
  id: string;
  nome: string | null;
  sobrenome: string | null;
  full_name: string | null;
  avatar_url: string | null;
  ultima_atividade: string | null;
}

interface DmItemProps {
  usuario: Usuario;
  naoLidas?: number;
  onClick: () => void;
  casaColor?: string;
}

export const DmItem = ({ usuario, naoLidas = 0, onClick, casaColor }: DmItemProps) => {
  const nomeExibido = usuario.nome || usuario.full_name || 'Usuário';
  const iniciais = nomeExibido.slice(0, 2).toUpperCase();
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
        "bg-white/5 hover:bg-white/10 active:scale-[0.98]",
        "text-left"
      )}
    >
      {/* Avatar com indicador de status */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={usuario.avatar_url || undefined} alt={nomeExibido} />
          <AvatarFallback className="bg-white/10 text-white/70 text-sm">
            {iniciais}
          </AvatarFallback>
        </Avatar>
        {/* Status indicator no canto do avatar */}
        <div className="absolute -bottom-0.5 -right-0.5 border-2 border-background rounded-full">
          <StatusIndicator 
            ultimaAtividade={usuario.ultima_atividade} 
            size="sm" 
          />
        </div>
      </div>
      
      {/* Nome do usuário */}
      <div className="flex-1 min-w-0">
        <p className="text-white/90 font-medium truncate">
          {nomeExibido} {usuario.sobrenome || ''}
        </p>
      </div>
      
      {/* Badge de não lidas */}
      {naoLidas > 0 && (
        <span 
          className="min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center text-white"
          style={{ backgroundColor: casaColor || '#3B82F6' }}
        >
          {naoLidas > 99 ? '99+' : naoLidas}
        </span>
      )}
    </button>
  );
};
