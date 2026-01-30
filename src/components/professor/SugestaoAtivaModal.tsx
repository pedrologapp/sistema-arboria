import { AlertTriangle, ClipboardCheck, Eye, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AcaoSugerida {
  titulo: string;
  prioridade?: 'alta' | 'media' | 'baixa' | string;
}

interface SugestaoAtivaModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomeAluno: string;
  textoAcontecendo: string;
  acoesSugeridas?: AcaoSugerida[];
  onRegistrarAcao: () => void;
  onRegistrarObservacao: () => void;
  onVerDetalhes?: () => void;
}

const SugestaoAtivaModal = ({
  isOpen,
  onClose,
  nomeAluno,
  textoAcontecendo,
  acoesSugeridas = [],
  onRegistrarAcao,
  onRegistrarObservacao,
  onVerDetalhes
}: SugestaoAtivaModalProps) => {
  
  // Mapear prioridade para badge colorido
  const getPrioridadeBadge = (prioridade?: string) => {
    switch (prioridade?.toLowerCase()) {
      case 'alta':
        return <span className="text-red-400 font-semibold text-xs">[ALTA]</span>;
      case 'media':
      case 'média':
        return <span className="text-amber-400 font-semibold text-xs">[MÉDIA]</span>;
      case 'baixa':
        return <span className="text-green-400 font-semibold text-xs">[BAIXA]</span>;
      default:
        return null;
    }
  };

  const handleRegistrarAcao = () => {
    onClose();
    onRegistrarAcao();
  };

  const handleRegistrarObservacao = () => {
    onClose();
    onRegistrarObservacao();
  };

  const handleVerDetalhes = () => {
    onClose();
    onVerDetalhes?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 max-w-[90vw] sm:max-w-md p-0 gap-0" hideCloseButton>
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" strokeWidth={2} />
            <span className="text-base font-medium">Já existem sugestões para {nomeAluno}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Texto acontecendo */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-white/80 text-sm leading-relaxed">
              "{textoAcontecendo}"
            </p>
          </div>

          {/* Ações sugeridas */}
          {acoesSugeridas.length > 0 && (
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-2">
                Ações sugeridas:
              </p>
              <ul className="space-y-1.5">
                {acoesSugeridas.slice(0, 3).map((acao, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-white/80">
                    <span className="text-white/40 mt-0.5">•</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {getPrioridadeBadge(acao.prioridade)}
                      <span>{acao.titulo}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Divider e Botões */}
          <div className="border-t border-white/10 pt-3 space-y-3">
            {/* Ação principal - Registrar minha ação (largura total) */}
            <button
              onClick={handleRegistrarAcao}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4" strokeWidth={1.5} />
              <span>Registrar minha ação</span>
            </button>

            {/* Ações secundárias - lado a lado */}
            <div className="grid grid-cols-2 gap-2">
              {/* Ver detalhes */}
              <button
                onClick={handleVerDetalhes}
                className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm transition-colors flex items-center justify-center gap-2 hover:bg-white/10"
              >
                <Eye className="w-4 h-4" strokeWidth={1.5} />
                <span>Ver detalhes</span>
              </button>

              {/* Nova observação */}
              <button
                onClick={handleRegistrarObservacao}
                className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm transition-colors flex items-center justify-center gap-2 hover:bg-white/10"
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                <span>Nova observação</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SugestaoAtivaModal;
