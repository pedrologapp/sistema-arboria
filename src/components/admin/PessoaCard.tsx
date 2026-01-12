import { ChevronRight, User } from 'lucide-react';

interface PessoaCardProps {
  nome: string;
  avatarUrl?: string | null;
  subtitulo: string;
  onClick?: () => void;
}

const PessoaCard = ({ nome, avatarUrl, subtitulo, onClick }: PessoaCardProps) => {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-colors flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt={nome} className="w-full h-full object-cover" />
        ) : (
          <User className="w-5 h-5 text-white/40" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{nome}</p>
        <p className="text-white/50 text-sm truncate">{subtitulo}</p>
      </div>
      
      <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0" />
    </button>
  );
};

export default PessoaCard;
