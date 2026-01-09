import { motion } from 'framer-motion';
import { CasaBrasao } from '@/components/CasaBrasao';

interface InteligenciaBarProps {
  inteligenciaId: number;
  nome: string;
  codigo: string;
  emoji: string;
  cor: string;
  score: number;
  ehMinhaCasa: boolean;
  onClick: () => void;
  index: number;
  brasaoUrl?: string | null;
}

const InteligenciaBar = ({
  nome,
  emoji,
  cor,
  score,
  ehMinhaCasa,
  onClick,
  index,
  brasaoUrl,
}: InteligenciaBarProps) => {

  // Abbreviated names for mobile
  const nomeAbreviado = nome.length > 12 ? nome.slice(0, 11) + '.' : nome;

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`w-full p-3 rounded-xl transition-all active:scale-[0.98] ${
        ehMinhaCasa 
          ? 'bg-white/10 border border-white/20' 
          : 'bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Brasão */}
        <div className="flex-shrink-0">
          <CasaBrasao
            brasaoUrl={brasaoUrl}
            emoji={emoji}
            nome={nome}
            size="mini"
          />
        </div>

        {/* Nome e Barra */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-white/80 truncate">
              {nomeAbreviado}
            </span>
            <div className="flex items-center gap-1.5">
              {ehMinhaCasa && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                  ⭐
                </span>
              )}
              <span 
                className="text-sm font-bold" 
                style={{ color: cor }}
              >
                {Math.round(score)}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.05 + 0.2,
                ease: 'easeOut' 
              }}
              className="h-full rounded-full"
              style={{ backgroundColor: cor }}
            />
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="flex-shrink-0 text-white/30">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </motion.button>
  );
};

export default InteligenciaBar;
