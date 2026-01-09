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

const CARGO_LABEL: Record<string, string> = {
  lider: 'Líder',
  vice: 'Vice',
  coordenador: 'Coord',
  embaixador: 'Embaixador',
};

export const MensagemBubble = ({ 
  mensagem, 
  isMe, 
  casaColor, 
  agruparComAnterior = false 
}: MensagemBubbleProps) => {
  const nomeAutor = mensagem.autor?.full_name || 'Usuário';
  const cargoAtivo = mensagem.autor?.cargos_casa?.find(c => c.ativo);
  const cargoKey = cargoAtivo?.cargo;
  const hora = format(new Date(mensagem.created_at), 'HH:mm');
  const isAnuncio = mensagem.tipo === 'anuncio';

  // Mensagem agrupada (continuação do mesmo autor)
  if (agruparComAnterior) {
    return (
      <div className="group flex hover:bg-white/5 px-2 py-0.5">
        <div className="pl-[52px]">
          <p className="text-white/90 text-sm whitespace-pre-wrap break-words">
            {mensagem.conteudo}
          </p>
        </div>
      </div>
    );
  }

  // Mensagem com header completo
  return (
    <div className={`group flex gap-3 hover:bg-white/5 px-2 pt-3 pb-1 ${
      isAnuncio ? 'bg-yellow-500/10 border-l-2 border-yellow-500' : ''
    }`}>
      {/* Avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={mensagem.autor?.avatar_url || undefined} />
        <AvatarFallback 
          className="text-white font-medium"
          style={{ backgroundColor: casaColor }}
        >
          {nomeAutor.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        {/* Header: Nome + Cargo + Hora */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white">
            {nomeAutor}
          </span>
          
          {cargoKey && CARGO_BADGE[cargoKey] && (
            <span className="text-sm text-white/60">
              {CARGO_BADGE[cargoKey]} {CARGO_LABEL[cargoKey]}
            </span>
          )}
          
          <span className="text-xs text-white/40">
            • {hora}
          </span>
        </div>
        
        {/* Conteúdo da mensagem */}
        <p className="text-white/90 text-sm whitespace-pre-wrap break-words mt-0.5">
          {mensagem.conteudo}
        </p>
      </div>
    </div>
  );
};
