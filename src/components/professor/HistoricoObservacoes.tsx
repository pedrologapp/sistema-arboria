import { useState } from 'react';
import { History, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import HistoricoCompletoModal from './HistoricoCompletoModal';

interface Observacao {
  id: string;
  data: string;
  sinal: string;
  valencia: string;
}

interface FaseHistorico {
  faseNome: string;
  observacoes: Observacao[];
  totalPositivas: number;
  totalAtencao: number;
}

interface HistoricoObservacoesProps {
  observacoes: Observacao[];
  fases?: FaseHistorico[];
  faseAtualNome?: string;
  onVerTudo: () => void;
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

const HistoricoObservacoes = ({
  observacoes,
  fases,
  faseAtualNome = 'Fase Atual',
  onVerTudo,
  casaColor
}: HistoricoObservacoesProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  // Calcular estatísticas
  const totalPositivas = observacoes.filter(
    o => o.valencia === 'positivo' || o.valencia === 'positiva'
  ).length;
  const totalAtencao = observacoes.filter(
    o => o.valencia === 'atencao' || o.valencia === 'negativa' || o.valencia === 'negativo'
  ).length;
  const total = observacoes.length;

  // Última observação
  const ultimaObs = observacoes[0];
  const tempoRelativo = ultimaObs
    ? formatDistanceToNow(new Date(ultimaObs.data), { addSuffix: true, locale: ptBR })
    : null;

  // Gerar bolinhas visuais (máx 8)
  const maxBolinhas = 8;
  const bolasPositivas = Math.min(totalPositivas, maxBolinhas);
  const bolasVaziasPositivas = maxBolinhas - bolasPositivas;
  const bolasAtencao = Math.min(totalAtencao, maxBolinhas);
  const bolasVaziasAtencao = maxBolinhas - bolasAtencao;

  // Preparar dados para o modal
  const fasesModal: FaseHistorico[] = fases || [
    {
      faseNome: faseAtualNome,
      observacoes,
      totalPositivas,
      totalAtencao
    }
  ];

  if (observacoes.length === 0) {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
          <History className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span className="uppercase tracking-wide">Histórico da Fase</span>
        </div>
        <p className="text-white/30 text-sm">Nenhuma observação registrada ainda</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
        <History className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span className="uppercase tracking-wide">Histórico da Fase</span>
      </div>
      
      {/* Card com Resumo Visual */}
      <div className="rounded-xl bg-white/5 border border-violet-500/10 p-4">
        {/* Total */}
        <p className="text-white/60 text-sm mb-3">
          Total: <span className="text-white/80 font-medium">{total} observações</span>
        </p>
        
        {/* Barras de Bolinhas */}
        <div className="space-y-2 mb-4">
          {/* Positivas */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[...Array(bolasPositivas)].map((_, i) => (
                <div
                  key={`pos-${i}`}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: '#22C55E' }}
                />
              ))}
              {[...Array(bolasVaziasPositivas)].map((_, i) => (
                <div
                  key={`pos-empty-${i}`}
                  className="w-2.5 h-2.5 rounded-full bg-white/10"
                />
              ))}
            </div>
            <span className="text-white/50 text-xs">{totalPositivas} positivas</span>
          </div>
          
          {/* Atenção */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[...Array(bolasAtencao)].map((_, i) => (
                <div
                  key={`atc-${i}`}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: '#EF4444' }}
                />
              ))}
              {[...Array(bolasVaziasAtencao)].map((_, i) => (
                <div
                  key={`atc-empty-${i}`}
                  className="w-2.5 h-2.5 rounded-full bg-white/10"
                />
              ))}
            </div>
            <span className="text-white/50 text-xs">{totalAtencao} atenção</span>
          </div>
        </div>
        
        {/* Última Observação */}
        {ultimaObs && (
          <p className="text-white/40 text-xs mb-3">
            Última: "<span className="text-white/60">{ultimaObs.sinal}</span>" ({tempoRelativo})
          </p>
        )}
        
        {/* Botão Ver Histórico Completo */}
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 text-white/40 text-xs hover:text-white/60 transition-colors"
        >
          <span>Ver histórico completo</span>
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Modal de Histórico Completo */}
      <HistoricoCompletoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        fases={fasesModal}
        casaColor={casaColor}
      />
    </div>
  );
};

export default HistoricoObservacoes;
