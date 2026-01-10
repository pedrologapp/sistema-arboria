import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';

interface FeedbackRefazerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefazer: () => void;
  missaoTitulo: string;
  feedbackProfessor?: string | null;
}

const FeedbackRefazerModal = ({
  isOpen,
  onClose,
  onRefazer,
  missaoTitulo,
  feedbackProfessor
}: FeedbackRefazerModalProps) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full relative border border-yellow-500/30"
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
              <div className="flex items-center justify-center gap-2 text-2xl mb-2">
                <RotateCcw className="w-7 h-7 text-yellow-400" />
                <span>REFAZER</span>
              </div>
              <p className="text-white/60 text-sm line-clamp-2">{missaoTitulo}</p>
            </div>

            {/* Mensagem */}
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 text-center mb-6">
              <p className="text-yellow-300 text-sm">
                O professor pediu para você refazer esta atividade
              </p>
            </div>

            {/* Feedback do Professor */}
            {feedbackProfessor ? (
              <div className="mb-6">
                <p className="text-white/40 text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
                  💬 Orientações do Professor
                </p>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-white/80 text-sm italic leading-relaxed">
                    "{feedbackProfessor}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-6 text-center">
                <p className="text-white/40 text-sm">
                  Revise as instruções da missão e tente novamente.
                </p>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={onRefazer}
                className="flex-1 py-3 bg-yellow-600 text-white rounded-xl font-medium hover:bg-yellow-700 transition-colors"
              >
                Refazer Agora
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeedbackRefazerModal;
