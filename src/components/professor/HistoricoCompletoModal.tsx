import { X, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ObservacaoHistorico {
  id: string;
  data: string;
  sinal: string;
  valencia: string;
}

interface FaseHistorico {
  faseNome: string;
  observacoes: ObservacaoHistorico[];
  totalPositivas: number;
  totalAtencao: number;
}

interface HistoricoCompletoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fases: FaseHistorico[];
  casaColor: string;
}

const getValenciaColor = (valencia: string): string => {
  switch (valencia) {
    case 'positiva':
    case 'positivo':
      return '#22C55E'; // Verde
    case 'atencao':
    case 'negativa':
    case 'negativo':
      return '#EF4444'; // Vermelho
    default:
      return '#6B7280'; // Cinza
  }
};

const HistoricoCompletoModal = ({
  isOpen,
  onClose,
  fases,
  casaColor
}: HistoricoCompletoModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <History className="w-5 h-5" style={{ color: casaColor }} />
            Histórico de Observações
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 space-y-6 pr-2">
          {fases.map((fase, index) => (
            <div key={index}>
              {/* Header da Fase */}
              <div className="mb-3">
                <p className="text-white/80 font-medium text-sm">
                  {index === 0 ? 'FASE ATUAL: ' : 'FASE ANTERIOR: '}
                  {fase.faseNome}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {fase.observacoes.length} observações ({fase.totalPositivas} positivas, {fase.totalAtencao} atenção)
                </p>
              </div>
              
              {/* Separador */}
              <div className="h-px bg-white/10 mb-3" />
              
              {/* Lista de Observações */}
              <div className="space-y-1.5">
                {fase.observacoes.map((obs) => {
                  const dataFormatada = format(new Date(obs.data), "dd/MM", { locale: ptBR });
                  const corValencia = getValenciaColor(obs.valencia);
                  
                  return (
                    <div 
                      key={obs.id} 
                      className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-white/40 text-xs w-10">{dataFormatada}</span>
                        <span className="text-white/80 text-sm">{obs.sinal}</span>
                      </div>
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: corValencia }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {fases.length === 0 && (
            <p className="text-white/40 text-sm text-center py-8">
              Nenhuma observação registrada ainda.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HistoricoCompletoModal;
