import { ClipboardList, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';

const MissoesPage = () => {
  const navigate = useNavigate();
  const { casaColor } = useProfessor();

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Missões</h1>
        <button
          onClick={() => navigate('/professor/missoes/nova')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: casaColor,
            color: '#fff'
          }}
        >
          <Plus size={18} />
          Nova
        </button>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${casaColor}20` }}
        >
          <ClipboardList size={40} style={{ color: casaColor }} />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Nenhuma missão criada
        </h2>
        <p className="text-white/50 text-sm mb-6 max-w-xs">
          Crie sua primeira missão para os alunos da sua casa
        </p>
        <button
          onClick={() => navigate('/professor/missoes/nova')}
          className="px-6 py-3 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: casaColor,
            color: '#fff'
          }}
        >
          Criar Primeira Missão
        </button>
      </div>
    </div>
  );
};

export default MissoesPage;
