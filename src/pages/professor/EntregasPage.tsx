import { PenLine } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';

const EntregasPage = () => {
  const { casaColor } = useProfessor();

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Avaliar Entregas</h1>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${casaColor}20` }}
        >
          <PenLine size={40} style={{ color: casaColor }} />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Nenhuma entrega pendente
        </h2>
        <p className="text-white/50 text-sm max-w-xs">
          Quando os alunos enviarem respostas, elas aparecerão aqui para avaliação
        </p>
      </div>
    </div>
  );
};

export default EntregasPage;
