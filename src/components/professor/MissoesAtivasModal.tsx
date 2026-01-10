import { X } from 'lucide-react';

interface MissoesAtivasModalProps {
  isOpen: boolean;
  onClose: () => void;
  dados: {
    serie: number;
    semanaAtiva: number;
    missoesAtivas: number;
  }[];
}

const MissoesAtivasModal = ({ isOpen, onClose, dados }: MissoesAtivasModalProps) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#1a1a1a] rounded-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-semibold flex items-center gap-2">
            📋 Missões Ativas
          </h3>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de séries */}
        <div className="p-4 space-y-3">
          {dados.map(item => (
            <div 
              key={item.serie}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-semibold text-lg">
                    {item.serie}º Ano
                  </p>
                  <p className="text-white/40 text-sm flex items-center gap-1 mt-1">
                    🔵 Semana {item.semanaAtiva} ativa
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${item.missoesAtivas > 0 ? 'text-green-400' : 'text-white/40'}`}>
                    {item.missoesAtivas}
                  </p>
                  <p className="text-white/40 text-xs">
                    {item.missoesAtivas === 1 ? 'missão' : 'missões'}
                  </p>
                </div>
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

export default MissoesAtivasModal;
