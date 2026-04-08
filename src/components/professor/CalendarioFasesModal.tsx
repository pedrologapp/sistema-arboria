import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatarDataBrasil, calcularSemanaAtual, parseDataLocal, inicioDoDiaBrasil } from '@/utils/timezone';
import { Progress } from '@/components/ui/progress';
import { ChevronRight } from 'lucide-react';

export interface FaseComDatas {
  id: string;
  numero_fase: number;
  data_inicio: string;
  data_fim: string;
  inteligencia: {
    nome: string;
    cor_hex: string | null;
    emoji: string | null;
  } | null;
  ativo?: boolean | null;
}

interface CalendarioFasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  fases: FaseComDatas[];
  anoLetivo: number;
  onFaseClick?: (faseId: string) => void;
  modoEdicao?: boolean;
}

type FaseStatus = 'passada' | 'ativa' | 'futura';

const CalendarioFasesModal = ({
  isOpen,
  onClose,
  fases,
  anoLetivo,
  onFaseClick,
  modoEdicao = false
}: CalendarioFasesModalProps) => {
  
  const getFaseStatus = (fase: FaseComDatas): FaseStatus => {
    if (fase.ativo) return 'ativa';
    
    const hoje = inicioDoDiaBrasil();
    const fim = parseDataLocal(fase.data_fim);
    const fimDia = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 23, 59, 59, 999);
    
    if (fimDia < hoje) return 'passada';
    return 'futura';
  };

  const formatPeriodo = (dataInicio: string, dataFim: string) => {
    const inicio = formatarDataBrasil(dataInicio, 'dd/MM');
    const fim = formatarDataBrasil(dataFim, 'dd/MM');
    return `${inicio} - ${fim}`;
  };

  // Ordenar fases por numero_fase
  const fasesOrdenadas = [...fases].sort((a, b) => a.numero_fase - b.numero_fase);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0F172A] border-violet-500/10 max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-white text-center text-lg">
            Calendário {anoLetivo}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-2 -mr-2 space-y-3 pb-2">
          {fasesOrdenadas.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              Nenhuma fase configurada para este ano.
            </div>
          ) : (
            fasesOrdenadas.map((fase) => {
              const status = getFaseStatus(fase);
              const semanaAtual = fase.ativo 
                ? calcularSemanaAtual(fase.data_inicio, fase.data_fim)
                : 0;
              const progressoSemana = semanaAtual > 0 ? (semanaAtual / 4) * 100 : 0;
              const corFase = fase.inteligencia?.cor_hex || '#6366f1';

              return (
                <button
                  key={fase.id}
                  onClick={() => onFaseClick?.(fase.id)}
                  disabled={!modoEdicao}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all",
                    status === 'ativa' && "border-green-500/50 bg-green-500/10",
                    status === 'passada' && "border-violet-500/5 bg-white/[0.02] opacity-60",
                    status === 'futura' && "border-violet-500/10 bg-white/[0.04] opacity-80",
                    modoEdicao && "hover:bg-white/5 cursor-pointer",
                    !modoEdicao && "cursor-default"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Número da fase */}
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ 
                        backgroundColor: `${corFase}20`,
                        color: corFase
                      }}
                    >
                      {fase.numero_fase}
                    </div>

                    {/* Conteúdo principal */}
                    <div className="flex-1 min-w-0">
                      {/* Nome da inteligência */}
                      <div className="flex items-center gap-2">
                        {fase.inteligencia?.emoji && (
                          <span className="text-base">{fase.inteligencia.emoji}</span>
                        )}
                        <span 
                          className="font-medium truncate"
                          style={{ color: status === 'ativa' ? corFase : 'white' }}
                        >
                          {fase.inteligencia?.nome || 'Fase não definida'}
                        </span>
                        {status === 'ativa' && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full shrink-0">
                            Atual
                          </span>
                        )}
                      </div>

                      {/* Período */}
                      <div className="text-sm text-white/50 mt-1">
                        {formatPeriodo(fase.data_inicio, fase.data_fim)}
                      </div>

                      {/* Barra de progresso (apenas se ativa) */}
                      {status === 'ativa' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-white/40">Progresso</span>
                            <span className="text-green-400">Semana {semanaAtual} de 4</span>
                          </div>
                          <Progress 
                            value={progressoSemana} 
                            className="h-2 bg-white/10"
                          />
                        </div>
                      )}
                    </div>

                    {/* Seta para edição (apenas admin) */}
                    {modoEdicao && (
                      <ChevronRight className="w-5 h-5 text-white/20 mt-1 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CalendarioFasesModal;
