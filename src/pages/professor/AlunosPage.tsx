import { Users } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';

const AlunosPage = () => {
  const { casaMentor, casaColor } = useProfessor();

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Alunos da Casa</h1>
          {casaMentor && (
            <p className="text-sm text-white/50">
              {casaMentor.emoji} {casaMentor.nome}
            </p>
          )}
        </div>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${casaColor}20` }}
        >
          <Users size={40} style={{ color: casaColor }} />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Lista de Alunos
        </h2>
        <p className="text-white/50 text-sm max-w-xs">
          A lista de alunos da casa será implementada no Prompt 5.6
        </p>
      </div>
    </div>
  );
};

export default AlunosPage;
