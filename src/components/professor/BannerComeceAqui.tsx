import { ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface BannerComeceAquiProps {
  faseNome: string;
  faseEmoji: string;
  quantidade: number;
  onVerLista: () => void;
}

export const BannerComeceAqui = ({
  quantidade,
  onVerLista
}: BannerComeceAquiProps) => {
  // Não renderiza se não há alunos aguardando
  if (quantidade === 0) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onVerLista}
      className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all hover:brightness-110"
      style={{ backgroundColor: '#1E3A5F' }}
    >
      {/* Lado esquerdo */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-300" />
        <span className="text-white font-medium text-sm">
          Seu olhar importa
        </span>
      </div>

      {/* Lado direito */}
      <div className="flex items-center gap-3">
        <span className="text-blue-200 text-sm">
          {quantidade} {quantidade === 1 ? 'aguarda' : 'aguardam'}
        </span>
        <ArrowRight className="w-4 h-4 text-blue-300" />
      </div>
    </motion.button>
  );
};
