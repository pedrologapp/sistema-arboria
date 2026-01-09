import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MensagemAutor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  cargos_casa?: { cargo: string; ativo: boolean }[];
}

interface Mensagem {
  id: string;
  conteudo: string;
  created_at: string;
  tipo: string | null;
  fixada: boolean | null;
  autor: MensagemAutor;
}

interface MensagemBubbleProps {
  mensagem: Mensagem;
  isMe: boolean;
  casaColor: string;
  agruparComAnterior?: boolean;
}

const CARGO_BADGE: Record<string, string> = {
  lider: '🦅',
  vice: '👑',
  coordenador: '⭐',
  embaixador: '🌍',
};

export const MensagemBubble = ({ 
  mensagem, 
  isMe, 
  casaColor, 
  agruparComAnterior = false 
}: MensagemBubbleProps) => {
  const nomeAutor = mensagem.autor?.full_name || 'Usuário';
  const cargoAtivo = mensagem.autor?.cargos_casa?.find(c => c.ativo);
  const cargoBadge = cargoAtivo?.cargo ? CARGO_BADGE[cargoAtivo.cargo] : null;
  const hora = format(new Date(mensagem.created_at), 'HH:mm');
  
  const isAnuncio = mensagem.tipo === 'anuncio';

  // Estilo do container baseado em quem enviou
  const containerClass = isMe 
    ? 'flex flex-col items-end' 
    : 'flex flex-col items-start';

  // Estilo da bolha
  const getBubbleStyle = () => {
    if (isAnuncio) {
      return 'bg-yellow-500/20 border border-yellow-500/30 text-white';
    }
    if (isMe) {
      return 'text-white';
    }
    return 'bg-white/10 text-white';
  };

  return (
    <div className={`${containerClass} ${agruparComAnterior ? 'mt-0.5' : 'mt-4'}`}>
      {/* Header: Avatar + Nome + Badge + Hora (só se não agrupar) */}
      {!agruparComAnterior && (
        <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          <Avatar className="h-6 w-6">
            <AvatarImage src={mensagem.autor?.avatar_url || undefined} />
            <AvatarFallback className="bg-white/10 text-white/70 text-xs">
              {nomeAutor.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className={`flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
            <span className="text-white/90 text-sm font-medium">
              {isMe ? 'Você' : nomeAutor}
            </span>
            {cargoBadge && (
              <span className="text-sm">{cargoBadge}</span>
            )}
            <span className="text-white/40 text-xs">{hora}</span>
          </div>
        </div>
      )}

      {/* Bolha da mensagem */}
      <div 
        className={`
          max-w-[85%] px-3 py-2 rounded-2xl
          ${getBubbleStyle()}
          ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}
          ${agruparComAnterior && isMe ? 'mr-8' : ''}
          ${agruparComAnterior && !isMe ? 'ml-8' : ''}
        `}
        style={isMe && !isAnuncio ? { backgroundColor: casaColor } : undefined}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {mensagem.conteudo}
        </p>
      </div>
    </div>
  );
};
