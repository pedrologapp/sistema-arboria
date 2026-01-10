import { X, FileText, ExternalLink, BookOpen, TreePine, Calendar } from 'lucide-react';
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

// Cores variadas para cada semana
const coresSemana = [
  { bg: 'bg-blue-500/20', text: 'text-blue-400', glow: 'hover:shadow-blue-500/20' },
  { bg: 'bg-purple-500/20', text: 'text-purple-400', glow: 'hover:shadow-purple-500/20' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-400', glow: 'hover:shadow-emerald-500/20' },
  { bg: 'bg-orange-500/20', text: 'text-orange-400', glow: 'hover:shadow-orange-500/20' },
];

const ConteudoModal = ({ isOpen, onClose, faseAtual }: ConteudoModalProps) => {
  if (!isOpen) return null;

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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[rgba(26,26,30,0.85)] backdrop-blur-xl rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col border border-white/10 shadow-2xl shadow-black/50"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Conteúdo
            </h3>
            <p className="text-white/50 text-xs mt-0.5 font-light">
              Materiais da {faseAtual?.inteligencia?.nome || 'fase atual'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Essência do Arboria */}
          <div>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3 flex items-center gap-2 font-medium">
              <TreePine className="w-4 h-4" /> Essência do Arboria
            </p>
            
            <div className="relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-sm border border-white/10">
              {/* Glow decorativo no fundo */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <p className="relative text-white/70 text-sm font-light text-center mb-1">
                O Projeto Arboria é construído
              </p>
              <p className="relative text-white/70 text-sm font-light text-center mb-6">
                sobre o pilar da
              </p>
              
              <div className="relative flex justify-center min-h-[40px] items-center">
                <div className="relative">
                  {/* Glow atrás do texto */}
                  <div className="absolute inset-0 blur-xl bg-emerald-500/30 scale-150" />
                  <AnimatedTextCycle
                    words={pilares}
                    interval={3000}
                    className="relative text-2xl font-bold bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Materiais por Semana */}
          <div>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3 flex items-center gap-2 font-medium">
              <Calendar className="w-4 h-4" /> Materiais por Semana
            </p>
            
            <div className="space-y-2">
              {materiais.map((material, index) => {
                const cor = coresSemana[index % coresSemana.length];
                return (
                  <button
                    key={material.semana}
                    onClick={() => handleOpenPdf(material.url)}
                    className={`w-full p-4 rounded-xl text-left flex items-center gap-3
                      bg-gradient-to-r from-white/[0.06] to-white/[0.02]
                      backdrop-blur-sm border border-white/10
                      hover:scale-[1.02] hover:border-white/20
                      hover:shadow-lg ${cor.glow}
                      transition-all duration-300 ease-out
                      active:scale-[0.98]`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${cor.bg} flex items-center justify-center shadow-lg`}>
                      <FileText className={`w-5 h-5 ${cor.text}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">
                        Semana {material.semana}
                      </p>
                      <p className="text-white/50 text-sm font-light">
                        {material.titulo}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-white/30" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-medium text-sm text-white
              bg-gradient-to-r from-white/10 to-white/5
              border border-white/10
              hover:from-white/15 hover:to-white/10
              hover:border-white/20
              transition-all duration-300
              active:scale-[0.98]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConteudoModal;
