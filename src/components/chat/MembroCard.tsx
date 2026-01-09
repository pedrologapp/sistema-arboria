import { cn } from '@/lib/utils';
import { StatusIndicator } from './StatusIndicator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle } from 'lucide-react';

interface CargoInfo {
  cargo: string;
  ativo: boolean;
}

interface Membro {
  id: string;
  nome: string | null;
  sobrenome: string | null;
  full_name: string | null;
  avatar_url: string | null;
  ultima_atividade: string | null;
  cargos_casa?: CargoInfo[];
}

interface MembroCardProps {
  membro: Membro;
  isMe: boolean;
  onIniciarConversa: (usuarioId: string) => void;
  casaColor?: string;
}

const CARGO_INFO: Record<string, { emoji: string; label: string }> = {
  lider: { emoji: '🦅', label: 'Líder' },
  vice: { emoji: '👑', label: 'Vice-Líder' },
  coordenador: { emoji: '⭐', label: 'Coordenador' },
  embaixador: { emoji: '🌍', label: 'Embaixador' },
};

export const MembroCard = ({ membro, isMe, onIniciarConversa, casaColor }: MembroCardProps) => {
  const nomeExibido = membro.nome || membro.full_name || 'Usuário';
  const nomeCompleto = membro.nome && membro.sobrenome 
    ? `${membro.nome} ${membro.sobrenome}` 
    : nomeExibido;
  const iniciais = nomeExibido.slice(0, 2).toUpperCase();
  
  const cargoAtivo = membro.cargos_casa?.find(c => c.ativo);
  const cargoInfo = cargoAtivo?.cargo ? CARGO_INFO[cargoAtivo.cargo] : null;
  
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg transition-all",
        "bg-white/5 hover:bg-white/10",
        isMe && "ring-1 ring-white/20"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Avatar com indicador de status */}
        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={membro.avatar_url || undefined} alt={nomeCompleto} />
            <AvatarFallback className="bg-white/10 text-white/70 text-sm">
              {iniciais}
            </AvatarFallback>
          </Avatar>
          {/* Status indicator no canto do avatar */}
          <div className="absolute -bottom-0.5 -right-0.5 border-2 border-background rounded-full">
            <StatusIndicator 
              ultimaAtividade={membro.ultima_atividade} 
              size="sm" 
            />
          </div>
        </div>
        
        {/* Informações do membro */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white/90 font-medium truncate">
              {nomeCompleto}
            </span>
            {isMe && (
              <span className="text-white/40 text-xs">(você)</span>
            )}
          </div>
          {cargoInfo && (
            <span className="text-sm text-white/60">
              {cargoInfo.emoji} {cargoInfo.label}
            </span>
          )}
        </div>
      </div>
      
      {/* Botão de DM (não mostrar para si mesmo) */}
      {!isMe && (
        <button 
          onClick={() => onIniciarConversa(membro.id)}
          className={cn(
            "p-2 rounded-lg transition-colors flex-shrink-0",
            "bg-white/10 hover:bg-white/20 active:scale-95"
          )}
          style={{ 
            backgroundColor: casaColor ? `${casaColor}20` : undefined,
          }}
        >
          <MessageCircle className="w-4 h-4 text-white/70" />
        </button>
      )}
    </div>
  );
};
