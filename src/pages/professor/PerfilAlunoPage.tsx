import { ArrowLeft, User } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';

const PerfilAlunoPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { casaColor } = useProfessor();

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/professor/alunos')}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Perfil do Aluno</h1>
      </div>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${casaColor}20` }}
        >
          <User size={40} style={{ color: casaColor }} />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Em Construção
        </h2>
        <p className="text-white/50 text-sm max-w-xs">
          O perfil detalhado do aluno será implementado no Prompt 5.6
        </p>
        <p className="text-white/30 text-xs mt-4">
          ID do Aluno: {id}
        </p>
      </div>
    </div>
  );
};

export default PerfilAlunoPage;
