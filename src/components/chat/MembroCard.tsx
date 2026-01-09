import { getStatusOnline } from '@/utils/statusOnline';

interface Membro {
  id: string;
  nome: string | null;
  sobrenome: string | null;
  full_name: string | null;
  avatar_url: string | null;
  ultima_atividade: string | null;
  cargos_casa?: { cargo: string; ativo: boolean }[];
}

interface MembroCardProps {
  membro: Membro;
  isMe: boolean;
  onIniciarConversa: (usuarioId: string) => void;
  casaColor?: string;
}

const CARGO_EMOJI: Record<string, string> = {
  lider: '🦅 Líder',
  vice: '👑 Vice-Líder',
  coordenador: '⭐ Coordenador',
  embaixador: '🌍 Embaixador',
};

export const MembroCard = ({ membro, isMe, onIniciarConversa }: MembroCardProps) => {
  const status = getStatusOnline(membro.ultima_atividade);
  const nomeExibido = membro.nome || membro.full_name || 'Usuário';
  const cargoAtivo = membro.cargos_casa?.find(c => c.ativo);
  const cargoLabel = cargoAtivo?.cargo ? CARGO_EMOJI[cargoAtivo.cargo] : null;

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Status indicator */}
        <div 
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: status.cor }}
        />
        
        {/* Avatar pequeno */}
        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/70 flex-shrink-0">
          {nomeExibido.charAt(0).toUpperCase()}
        </div>
        
        {/* Nome + Cargo na mesma linha */}
        <span className="text-white text-sm truncate">{nomeExibido}</span>
        
        {cargoLabel && (
          <span className="text-white/60 text-sm flex-shrink-0">
            {cargoLabel}
          </span>
        )}
        
        {isMe && (
          <span className="text-white/40 text-xs flex-shrink-0">(você)</span>
        )}
      </div>
      
      {/* Botão DM */}
      {!isMe && (
        <button 
          onClick={() => {
            console.log('🔵 Botão DM clicado! Membro:', membro.id, nomeExibido);
            onIniciarConversa(membro.id);
          }}
          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors flex-shrink-0"
        >
          💬
        </button>
      )}
    </div>
  );
};
