import { ArrowLeft, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';

const NovaMissaoPage = () => {
  const navigate = useNavigate();
  const { casaColor } = useProfessor();

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/professor/missoes')}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Nova Missão</h1>
      </div>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${casaColor}20` }}
        >
          <ClipboardList size={40} style={{ color: casaColor }} />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Em Construção
        </h2>
        <p className="text-white/50 text-sm max-w-xs">
          O formulário de criação de missões será implementado no Prompt 5.2
        </p>
      </div>
    </div>
  );
};

export default NovaMissaoPage;
