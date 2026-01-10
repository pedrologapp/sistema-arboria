import { X } from 'lucide-react';

interface TurmaEntrega {
  turma: string;
  entregaram: number;
  total: number;
  percentual: number;
}

interface SerieEntrega {
  serie: number;
  turmas: TurmaEntrega[];
}

interface EntregasPorTurmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  dados: SerieEntrega[];
}

const EntregasPorTurmaModal = ({ isOpen, onClose, dados }: EntregasPorTurmaModalProps) => {
  if (!isOpen) return null;

  // Cor da barra baseada no percentual
  const getBarColor = (percent: number) => {
    if (percent >= 80) return 'bg-green-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Cor do texto baseada no percentual
  const getTextColor = (percent: number) => {
    if (percent >= 80) return 'text-green-400';
    if (percent >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#1a1a1a] rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-semibold flex items-center gap-2">
            📊 Entregas por Turma
          </h3>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de séries e turmas */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {dados.map(serie => (
            <div key={serie.serie}>
              {/* Título da série */}
              <p className="text-white/60 text-sm font-medium mb-2">
                {serie.serie}º ANO
              </p>
              
              {/* Turmas */}
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {serie.turmas.length === 0 ? (
                  <p className="p-3 text-white/40 text-sm text-center">
                    Sem alunos cadastrados
                  </p>
                ) : (
                  serie.turmas.map((turma, index) => (
                    <div 
                      key={turma.turma}
                      className={`p-3 ${index > 0 ? 'border-t border-white/10' : ''}`}
                    >
                      {/* Linha com turma e percentual */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium">
                          Turma {turma.turma}
                        </span>
                        <span className={`font-bold ${getTextColor(turma.percentual)}`}>
                          {turma.percentual}%
                        </span>
                      </div>
                      
                      {/* Barra de progresso */}
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                        <div 
                          className={`h-full rounded-full transition-all ${getBarColor(turma.percentual)}`}
                          style={{ width: `${turma.percentual}%` }}
                        />
                      </div>
                      
                      {/* Texto de quantos entregaram */}
                      <p className="text-white/40 text-xs">
                        {turma.entregaram}/{turma.total} alunos entregaram
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntregasPorTurmaModal;
