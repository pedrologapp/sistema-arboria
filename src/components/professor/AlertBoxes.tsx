import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useAlertasAlunos, AlertaAluno } from '@/hooks/useAlertasAlunos';
import { AlertaAlunoCard } from './AlertaAlunoCard';
import { Skeleton } from '@/components/ui/skeleton';

interface AlertBoxesProps {
  onAlunoClick: (alunoId: string) => void;
}

interface AlertBoxConfig {
  id: 'precisa_atencao' | 'celebrar' | 'nao_esquecer';
  icon: string;
  iconEmpty: string;
  label: string;
  emptyMessage: string;
  colorActive: string;
  colorHover: string;
}

const alertConfigs: AlertBoxConfig[] = [
  {
    id: 'precisa_atencao',
    icon: '🔴',
    iconEmpty: '✓',
    label: 'Precisam de você',
    emptyMessage: 'Nenhum aluno precisa de atenção agora',
    colorActive: '#8B0000',
    colorHover: '#A00000'
  },
  {
    id: 'celebrar',
    icon: '✨',
    iconEmpty: '✓',
    label: 'Celebre',
    emptyMessage: 'Nenhuma descoberta ou confirmação recente',
    colorActive: '#B8860B',
    colorHover: '#D4A00A'
  },
  {
    id: 'nao_esquecer',
    icon: '🟡',
    iconEmpty: '✓',
    label: 'Não esqueça',
    emptyMessage: 'Todos os alunos foram observados recentemente',
    colorActive: '#CC7000',
    colorHover: '#E08000'
  }
];

export const AlertBoxes = ({ onAlunoClick }: AlertBoxesProps) => {
  const { precisaAtencao, celebrar, naoEsquecer, totais, isLoading } = useAlertasAlunos();
  const [openBox, setOpenBox] = useState<string | null>(null);

  const getAlertasByType = (type: string): AlertaAluno[] => {
    switch (type) {
      case 'precisa_atencao': return precisaAtencao;
      case 'celebrar': return celebrar;
      case 'nao_esquecer': return naoEsquecer;
      default: return [];
    }
  };

  const getCountByType = (type: string): number => {
    switch (type) {
      case 'precisa_atencao': return totais.precisaAtencao;
      case 'celebrar': return totais.celebrar;
      case 'nao_esquecer': return totais.naoEsquecer;
      default: return 0;
    }
  };

  const handleToggle = (boxId: string, count: number) => {
    if (count === 0) return; // Não expande se vazio
    setOpenBox(prev => prev === boxId ? null : boxId);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alertConfigs.map(config => {
        const count = getCountByType(config.id);
        const alertas = getAlertasByType(config.id);
        const isEmpty = count === 0;
        const isOpen = openBox === config.id;
        
        return (
          <div key={config.id} className="overflow-hidden rounded-xl">
            {/* Trigger/Header */}
            <button
              onClick={() => handleToggle(config.id, count)}
              disabled={isEmpty}
              className="w-full flex items-center justify-between px-4 py-3 transition-all duration-200"
              style={{ 
                backgroundColor: isEmpty ? '#333333' : config.colorActive,
                cursor: isEmpty ? 'default' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!isEmpty) {
                  e.currentTarget.style.backgroundColor = config.colorHover;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isEmpty ? '#333333' : config.colorActive;
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">
                  {isEmpty ? config.iconEmpty : config.icon}
                </span>
                <span className="text-white text-sm font-medium">
                  {config.label}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${isEmpty ? 'text-white/50' : 'text-white'}`}>
                  {count}
                </span>
                {!isEmpty && (
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-white/70" />
                  </motion.div>
                )}
              </div>
            </button>

            {/* Content */}
            <AnimatePresence>
              {isOpen && !isEmpty && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                  style={{ backgroundColor: `${config.colorActive}40` }}
                >
                  <div className="p-3 space-y-2">
                    {alertas.map(alerta => (
                      <AlertaAlunoCard
                        key={alerta.id}
                        aluno={alerta.aluno}
                        motivo={alerta.motivo}
                        tipoAlerta={config.id}
                        onClick={() => onAlunoClick(alerta.aluno.id)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state message (shown below when empty) */}
            {isEmpty && (
              <div 
                className="px-4 py-2 text-xs text-white/40"
                style={{ backgroundColor: '#2a2a2a' }}
              >
                {config.emptyMessage}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
