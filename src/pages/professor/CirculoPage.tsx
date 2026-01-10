import { Sparkles } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';

const CirculoPage = () => {
  const { casaColor } = useProfessor();

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Círculo das Inteligências</h1>
      </div>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${casaColor}20` }}
        >
          <Sparkles size={40} style={{ color: casaColor }} />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Em Construção
        </h2>
        <p className="text-white/50 text-sm max-w-xs">
          O Círculo das Inteligências com os 15 sinais será implementado no Prompt 5.5
        </p>
        
        {/* Preview dos 15 sinais */}
        <div className="mt-8 grid grid-cols-5 gap-2">
          {['🌟', '💡', '🎯', '🔥', '⭐', '🌈', '💎', '🚀', '🎨', '🎵', '📚', '🔬', '🌿', '🤝', '🧘'].map((emoji, i) => (
            <div 
              key={i}
              className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg"
            >
              {emoji}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CirculoPage;
