import { X, FileText, ExternalLink } from 'lucide-react';
import AnimatedTextCycle from '@/components/ui/animated-text-cycle';

interface FaseAtual {
  inteligencia?: {
    nome?: string;
  };
}

interface ConteudoModalProps {
  isOpen: boolean;
  onClose: () => void;
  faseAtual: FaseAtual | null;
}

const pilares = ['Consciência', 'Integralidade', 'Necessidade', 'Acreditar'];

const ConteudoModal = ({ isOpen, onClose, faseAtual }: ConteudoModalProps) => {
  if (!isOpen) return null;

  // URLs dos PDFs por semana (podem vir do banco ou ser estáticas)
  const materiais = [
    { semana: 1, titulo: 'Material da primeira semana', url: '/pdfs/semana-1.pdf' },
    { semana: 2, titulo: 'Material da segunda semana', url: '/pdfs/semana-2.pdf' },
    { semana: 3, titulo: 'Material da terceira semana', url: '/pdfs/semana-3.pdf' },
    { semana: 4, titulo: 'Material da quarta semana', url: '/pdfs/semana-4.pdf' },
  ];

  const handleOpenPdf = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#1a1a1a] rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              📚 Conteúdo
            </h3>
            <p className="text-white/40 text-xs mt-0.5">
              Materiais da {faseAtual?.inteligencia?.nome || 'fase atual'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Essência do Arboria */}
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              🌳 Essência do Arboria
            </p>
            
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
              <p className="text-white/80 text-sm italic text-center mb-1">
                "O Projeto Arboria é construído
              </p>
              <p className="text-white/80 text-sm italic text-center mb-6">
                sobre o pilar da"
              </p>
              
              <div className="flex justify-center min-h-[40px] items-center">
                <AnimatedTextCycle
                  words={pilares}
                  interval={3000}
                  className="text-2xl font-bold text-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Materiais por Semana */}
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              📅 Materiais por Semana
            </p>
            
            <div className="space-y-2">
              {materiais.map((material) => (
                <button
                  key={material.semana}
                  onClick={() => handleOpenPdf(material.url)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-colors flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      Semana {material.semana}
                    </p>
                    <p className="text-white/40 text-sm">
                      {material.titulo}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/30" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-white/10 text-white text-sm rounded-xl font-medium hover:bg-white/20 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConteudoModal;
