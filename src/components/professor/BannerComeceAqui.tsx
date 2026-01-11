import { ArrowRight, Hand } from 'lucide-react';
import { motion } from 'framer-motion';

interface AlunoSimples {
  id: string;
  nome: string;
  avatarUrl?: string;
}

interface BannerComeceAquiProps {
  faseNome: string;
  faseEmoji: string;
  quantidade: number;
  alunos: AlunoSimples[];
  onVerLista: () => void;
}

export const BannerComeceAqui = ({
  faseNome,
  faseEmoji,
  quantidade,
  onVerLista
}: BannerComeceAquiProps) => {
  if (quantidade === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 mb-3"
      style={{ backgroundColor: '#1E3A5F' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Hand className="w-5 h-5 text-blue-300" />
            <span className="font-semibold text-white">
              {faseEmoji} Fase {faseNome} — Comece por aqui
            </span>
          </div>
          <p className="text-blue-200 text-sm">
            {quantidade} {quantidade === 1 ? 'aluno ainda não foi observado' : 'alunos ainda não foram observados'} nesta fase
          </p>
        </div>
        <button
          onClick={onVerLista}
          className="flex items-center gap-1 text-sm text-blue-300 hover:text-white transition-colors whitespace-nowrap mt-1"
        >
          Ver lista
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
