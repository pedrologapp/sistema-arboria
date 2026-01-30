import { useState } from 'react';
import { useAlertasAlunos, AlertaAluno, AlertaFaseAnterior, AlertaExplicacao } from '@/hooks/useAlertasAlunos';
import { AlertGridCard } from './AlertGridCard';
import { AlertaDetalheModal } from './AlertaDetalheModal';
import { ExplicacaoContradicaoModal } from './ExplicacaoContradicaoModal';
import { Skeleton } from '@/components/ui/skeleton';

interface AlertBoxesProps {
  onAlunoClick: (alunoId: string) => void;
}

type AlertType = 'precisa_atencao' | 'celebrar' | 'nao_esquecer' | 'atencao_fase_anterior' | 'aguardando_explicacao';

interface AlertConfig {
  id: AlertType;
  icon: string;
  label: string;
  colorActive: string;
}

const alertConfigs: AlertConfig[] = [
  {
    id: 'precisa_atencao',
    icon: '🔴',
    label: 'Precisam de você',
    colorActive: '#8B0000'
  },
  {
    id: 'celebrar',
    icon: '✨',
    label: 'Celebre',
    colorActive: '#B8860B'
  },
  {
    id: 'nao_esquecer',
    icon: '🟡',
    label: 'Não esqueça',
    colorActive: '#CC7000'
  },
  {
    id: 'atencao_fase_anterior',
    icon: '⚠️',
    label: 'Fase anterior',
    colorActive: '#8B4000'
  },
  {
    id: 'aguardando_explicacao',
    icon: '💬',
    label: 'Aguardando você',
    colorActive: '#6B21A8'
  }
];

export const AlertBoxes = ({ onAlunoClick }: AlertBoxesProps) => {
  const { 
    precisaAtencao, 
    celebrar, 
    naoEsquecer, 
    atencaoFaseAnterior,
    aguardandoExplicacao, 
    totais, 
    badgesAtivos,
    isLoading 
  } = useAlertasAlunos();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<AlertType | null>(null);
  const [explicacaoModal, setExplicacaoModal] = useState<AlertaExplicacao | null>(null);

  const getAlertasByType = (type: AlertType): AlertaAluno[] => {
    switch (type) {
      case 'precisa_atencao': return precisaAtencao;
      case 'celebrar': return celebrar;
      case 'nao_esquecer': return naoEsquecer;
      default: return [];
    }
  };

  const getCountByType = (type: AlertType): number => {
    switch (type) {
      case 'precisa_atencao': return totais.precisaAtencao;
      case 'celebrar': return totais.celebrar;
      case 'nao_esquecer': return totais.naoEsquecer;
      case 'atencao_fase_anterior': return totais.atencaoFaseAnterior;
      case 'aguardando_explicacao': return totais.aguardandoExplicacao;
      default: return 0;
    }
  };

  const getBadgeCountByType = (type: AlertType): number => {
    switch (type) {
      case 'precisa_atencao': return badgesAtivos?.precisaAtencao || 0;
      case 'celebrar': return badgesAtivos?.celebrar || 0;
      case 'nao_esquecer': return badgesAtivos?.naoEsquecer || 0;
      case 'atencao_fase_anterior': return badgesAtivos?.atencaoFaseAnterior || 0;
      case 'aguardando_explicacao': return badgesAtivos?.aguardandoExplicacao || 0;
      default: return 0;
    }
  };

  const handleCardClick = (type: AlertType) => {
    const count = getCountByType(type);
    if (count === 0) return;
    
    setSelectedType(type);
    setModalOpen(true);
  };

  const handleExplicacaoClick = (alerta: AlertaExplicacao) => {
    setModalOpen(false);
    setExplicacaoModal(alerta);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Título da seção */}
        <h3 className="text-xs text-white/40 uppercase tracking-wider font-medium">
          Alertas da Casa
        </h3>

        {/* Grid 2x3 (ou 2x2 + 1 centralizado) */}
        <div className="grid grid-cols-2 gap-3">
          {alertConfigs.map(config => (
            <AlertGridCard
              key={config.id}
              icon={config.icon}
              label={config.label}
              count={getCountByType(config.id)}
              badgeCount={getBadgeCountByType(config.id)}
              colorActive={config.colorActive}
              onClick={() => handleCardClick(config.id)}
            />
          ))}
        </div>
      </div>

      {/* Modal de detalhes */}
      {selectedType && (
        <AlertaDetalheModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedType(null);
          }}
          tipo={selectedType}
          alertas={getAlertasByType(selectedType)}
          alertasFaseAnterior={atencaoFaseAnterior}
          alertasExplicacao={aguardandoExplicacao}
          onAlunoClick={onAlunoClick}
          onExplicacaoClick={handleExplicacaoClick}
        />
      )}

      {/* Modal de explicação */}
      {explicacaoModal && (
        <ExplicacaoContradicaoModal
          isOpen={!!explicacaoModal}
          onClose={() => setExplicacaoModal(null)}
          alerta={explicacaoModal}
        />
      )}
    </>
  );
};
