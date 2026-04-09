import { getStatusOnline } from '@/utils/statusOnline';

interface Membro {
  id: string;
  nome: string | null;
  sobrenome: string | null;
  full_name: string | null;
  avatar_url: string | null;
  ultima_atividade: string | null;
  serie?: string | null;
  turma?: string | null;
  cargos_casa?: { cargo: string; ativo: boolean }[];
}

interface MembroCardProps {
  membro: Membro;
  isMe: boolean;
  onIniciarConversa: (usuarioId: string) => void;
  casaColor?: string;
  temDmNaoLida?: boolean;
  hideStatus?: boolean;
}

const CARGO_LABEL: Record<string, string> = {
  lider: 'Lider',
  vice: 'Vice',
  coordenador: 'Coord',
  embaixador: 'Emb',
};

const CARGO_EMOJI: Record<string, string> = {
  lider: '🦅',
  coordenador: '⭐',
  embaixador: '🌍',
};

export const MembroCard = ({ membro, isMe, onIniciarConversa, casaColor, temDmNaoLida = false, hideStatus = false }: MembroCardProps) => {
  const status = getStatusOnline(membro.ultima_atividade);
  const partes = (membro.full_name || membro.nome || 'Usuario').trim().split(/\s+/);
  const nomeCurto = partes.length <= 2 ? partes.join(' ') : `${partes[0]} ${partes[1]}`;
  const cargoAtivo = membro.cargos_casa?.find(c => c.ativo);
  const cargoKey = cargoAtivo?.cargo;
  const serieNum = membro.serie?.replace(/\D/g, '') || '';

  return (
    <button
      onClick={() => !isMe && onIniciarConversa(membro.id)}
      disabled={isMe}
      className="w-full flex items-center gap-2 py-1.5 px-2.5 hover:bg-white/[0.06] transition-colors text-left disabled:hover:bg-transparent"
    >
      {/* Avatar + status */}
      <div className="relative shrink-0">
        <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10">
          {membro.avatar_url ? (
            <img src={membro.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center w-full h-full text-[10px] text-white/50">
              {nomeCurto.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {!hideStatus && status.status === 'online' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border-[1.5px] border-[#1A1A2E]" />
        )}
      </div>

      {/* Nome + serie */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-xs text-white/80 truncate">{nomeCurto}</span>
        {isMe && <span className="text-[9px] text-white/30">(voce)</span>}
        {serieNum && <span className="text-[9px] text-white/25 shrink-0">{serieNum}º{membro.turma || ''}</span>}
      </div>

      {/* Cargo */}
      {cargoKey && CARGO_LABEL[cargoKey] && (
        <span className="text-[9px] text-white/40 shrink-0">
          {CARGO_EMOJI[cargoKey]} {CARGO_LABEL[cargoKey]}
        </span>
      )}

      {/* DM icon */}
      {!isMe && (
        <div className="relative shrink-0">
          <span className="text-[11px] text-white/30">💬</span>
          {temDmNaoLida && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </div>
      )}
    </button>
  );
};
