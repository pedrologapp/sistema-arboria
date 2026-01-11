import { History, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Observacao {
  id: string;
  data: string;
  sinal: string;
  valencia: string;
}

interface HistoricoObservacoesProps {
  observacoes: Observacao[];
  onVerTudo: () => void;
  casaColor: string;
}

const getValenciaColor = (valencia: string): string => {
  switch (valencia) {
    case 'positiva':
      return '#22C55E'; // Verde
    case 'atencao':
    case 'negativa':
      return '#EF4444'; // Vermelho
    default:
      return '#EAB308'; // Amarelo
  }
};

const HistoricoObservacoes = ({
  observacoes,
  onVerTudo,
  casaColor
}: HistoricoObservacoesProps) => {
  const ultimas5 = observacoes.slice(0, 5);

  if (observacoes.length === 0) {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
          <History className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span className="uppercase tracking-wide">Histórico de Observações</span>
        </div>
        <p className="text-white/30 text-sm">Nenhuma observação registrada ainda</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white/40 text-xs">
          <History className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span className="uppercase tracking-wide">Histórico de Observações</span>
        </div>
        
        {observacoes.length > 5 && (
          <button
            onClick={onVerTudo}
            className="flex items-center gap-1 text-white/40 text-xs hover:text-white/60 transition-colors"
          >
            <span>Ver tudo</span>
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
      
      {/* Lista */}
      <div className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/5">
        {ultimas5.map((obs) => {
          const dataFormatada = format(new Date(obs.data), "MMM/yy", { locale: ptBR });
          const corValencia = getValenciaColor(obs.valencia);
          
          return (
            <div key={obs.id} className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-xs w-12 capitalize">{dataFormatada}</span>
                <span className="text-white/80 text-sm">{obs.sinal}</span>
              </div>
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: corValencia }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoricoObservacoes;
