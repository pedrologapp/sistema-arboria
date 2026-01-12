import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ChevronRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useStudent } from '@/contexts/StudentContext';

/**
 * Placeholder para a página de seleção de semana dentro de uma fase
 * Será implementado na Parte 2 do novo fluxo de missões
 */
const MissoesFasePage = () => {
  const { faseId } = useParams();
  const navigate = useNavigate();
  const { casaColor } = useStudent();

  return (
    <div className="py-6 space-y-5 mt-4">
      {/* Header com voltar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno/missoes')}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Selecione a Semana</h1>
      </div>

      {/* Placeholder - será substituído na Parte 2 */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((semana) => (
          <motion.div
            key={semana}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: semana * 0.05 }}
            className={cn(
              'w-full p-4 rounded-xl border text-left transition-all',
              semana === 1 
                ? 'border-2 cursor-pointer hover:scale-[1.02]' 
                : 'bg-gray-800/50 border-gray-700 opacity-50 cursor-not-allowed'
            )}
            style={semana === 1 ? { 
              backgroundColor: `${casaColor}15`, 
              borderColor: casaColor 
            } : undefined}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span 
                  className={cn(
                    'font-semibold',
                    semana === 1 ? 'text-white' : 'text-gray-400'
                  )}
                >
                  Semana {semana}
                </span>
                {semana === 1 && (
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${casaColor}30`, color: casaColor }}
                  >
                    atual
                  </span>
                )}
              </div>
              {semana === 1 ? (
                <ChevronRight className="w-5 h-5" style={{ color: casaColor }} />
              ) : (
                <Lock className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </motion.div>
        ))}

        {/* Seção Extra */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 cursor-pointer hover:bg-amber-500/15 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-amber-300">Extra</span>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-400" />
          </div>
        </motion.div>
      </div>

      <p className="text-center text-white/40 text-sm mt-8">
        Fase ID: {faseId}
        <br />
        <span className="text-xs">(Placeholder - implementação completa virá na Parte 2)</span>
      </p>
    </div>
  );
};

export default MissoesFasePage;
