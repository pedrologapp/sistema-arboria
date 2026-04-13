import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FeedbackAprovadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  missaoTitulo: string;
  nota: number;
  pontosConquistados: number;
  feedbackProfessor?: string | null;
}

const FeedbackAprovadoModal = ({
  isOpen,
  onClose,
  missaoTitulo,
  nota,
  pontosConquistados,
  feedbackProfessor
}: FeedbackAprovadoModalProps) => {

  // Confetti ao abrir
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22C55E', '#F59E0B', '#8B5CF6', '#3B82F6', '#EC4899'],
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#12122A]/95 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1E1E3A] rounded-2xl p-6 max-w-sm w-full relative border border-green-500/30"
          >
            {/* Botão fechar */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <motion.p
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="text-2xl mb-2"
              >
                PARABÉNS!
              </motion.p>
              <p className="text-white/60 text-sm line-clamp-2">{missaoTitulo}</p>
            </div>

            {/* Nota e Pontos */}
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-5 text-center mb-6">
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
                className="text-5xl font-bold text-white mb-2"
              >
                {nota}<span className="text-2xl text-white/60">/10</span>
              </motion.p>
              <div className="flex items-center justify-center gap-2 text-green-400 text-lg">
                <Trophy className="w-5 h-5" />
                <span>+{pontosConquistados} pontos!</span>
              </div>
            </div>

            {/* Feedback do Professor */}
            {feedbackProfessor ? (
              <div className="mb-6">
                <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                  Feedback do Professor
                </p>
                <div className="bg-white/5 border border-violet-500/10 rounded-xl p-4">
                  <p className="text-white/80 text-sm italic leading-relaxed">
                    "{feedbackProfessor}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-6 text-center">
                <p className="text-white/40 text-sm">
                  O professor não deixou comentários adicionais.
                </p>
              </div>
            )}

            {/* Botão OK */}
            <button
              onClick={onClose}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              Continuar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeedbackAprovadoModal;
