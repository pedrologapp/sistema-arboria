import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Send, 
  RefreshCw,
  Calendar,
  Target,
  Star,
  Zap,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import FeedbackAprovadoModal from '@/components/aluno/FeedbackAprovadoModal';
import FeedbackRefazerModal from '@/components/aluno/FeedbackRefazerModal';
import { clearAppBadge } from '@/hooks/useAppBadge';

interface Missao {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: 'principal' | 'secundaria' | 'bonus';
  pontos_base: number;
  data_prazo: string;
  data_liberacao: string;
  requer_arquivo: boolean;
  requer_texto: boolean;
  permite_atrasada: boolean;
  casa_id: number | null;
  casa_nome: string | null;
  casa_emoji: string | null;
  casa_cor: string | null;
  status_entrega: 'pendente' | 'enviada' | 'aprovada' | 'refazer';
  ja_entregou: boolean;
  atrasada: boolean;
}

type FilterType = 'todas' | 'pendentes' | 'enviadas' | 'aprovadas';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Clock;
}

const getStatusConfig = (missao: Missao): StatusConfig => {
  if (!missao.ja_entregou) {
    if (missao.atrasada) {
      return { 
        label: 'Atrasada', 
        color: 'text-red-400', 
        bgColor: 'bg-red-500/20',
        icon: AlertCircle 
      };
    }
    return { 
      label: 'Pendente', 
      color: 'text-yellow-400', 
      bgColor: 'bg-yellow-500/20',
      icon: Clock 
    };
  }
  
  switch (missao.status_entrega) {
    case 'pendente':
      return { 
        label: 'Enviada', 
        color: 'text-blue-400', 
        bgColor: 'bg-blue-500/20',
        icon: Send 
      };
    case 'aprovada':
      return { 
        label: 'Aprovada ✓', 
        color: 'text-green-400', 
        bgColor: 'bg-green-500/20',
        icon: CheckCircle2 
      };
    case 'refazer':
      return { 
        label: 'Refazer', 
        color: 'text-orange-400', 
        bgColor: 'bg-orange-500/20',
        icon: RefreshCw 
      };
    default:
      return { 
        label: 'Pendente', 
        color: 'text-yellow-400', 
        bgColor: 'bg-yellow-500/20',
        icon: Clock 
      };
  }
};

const getTipoConfig = (tipo: string) => {
  switch (tipo) {
    case 'principal':
      return { 
        emoji: '🎯', 
        bgColor: 'bg-indigo-500/20', 
        textColor: 'text-indigo-300',
        icon: Target
      };
    case 'secundaria':
      return { 
        emoji: '⭐', 
        bgColor: 'bg-purple-500/20', 
        textColor: 'text-purple-300',
        icon: Star
      };
    case 'bonus':
      return { 
        emoji: '⚡', 
        bgColor: 'bg-amber-500/20', 
        textColor: 'text-amber-300',
        icon: Zap
      };
    default:
      return { 
        emoji: '📋', 
        bgColor: 'bg-white/10', 
        textColor: 'text-white/60',
        icon: Target
      };
  }
};

const filterLabels: Record<FilterType, string> = {
  todas: 'Todas',
  pendentes: 'Pendentes',
  enviadas: 'Enviadas',
  aprovadas: 'Aprovadas'
};

const MissoesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { casaColor, isLoading: contextLoading } = useStudent();
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('todas');
  const [buscandoEntrega, setBuscandoEntrega] = useState(false);

  // Estado para modal de aprovada
  const [modalAprovada, setModalAprovada] = useState<{
    isOpen: boolean;
    missaoTitulo: string;
    nota: number;
    pontos: number;
    feedback: string | null;
  } | null>(null);

  // Estado para modal de refazer
  const [modalRefazer, setModalRefazer] = useState<{
    isOpen: boolean;
    missaoId: string;
    missaoTitulo: string;
    feedback: string | null;
  } | null>(null);

  const fetchMissoes = useCallback(async () => {
    if (!user?.id) return;

    try {
      setError(null);
      const { data, error: fetchError } = await supabase.rpc('get_missoes_do_aluno', {
        p_aluno_id: user.id,
      });

      if (fetchError) throw fetchError;
      setMissoes((data as Missao[]) || []);
    } catch (err) {
      console.error('Error fetching missoes:', err);
      setError('Não foi possível carregar as missões. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMissoes();
    // Limpar badge do ícone do app ao entrar na página
    clearAppBadge();
  }, [fetchMissoes]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMissoes();
    setRefreshing(false);
  };

  // Handler para clique na missão
  const handleMissaoClick = async (missao: Missao) => {
    // Se missão aprovada → buscar entrega e abrir modal
    if (missao.status_entrega === 'aprovada') {
      setBuscandoEntrega(true);
      try {
        const { data: entrega } = await supabase
          .from('entregas')
          .select('nota, pontos_concedidos, feedback_professor')
          .eq('missao_id', missao.id)
          .eq('aluno_id', user?.id)
          .order('numero_tentativa', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (entrega) {
          setModalAprovada({
            isOpen: true,
            missaoTitulo: missao.titulo,
            nota: entrega.nota || 0,
            pontos: entrega.pontos_concedidos || 0,
            feedback: entrega.feedback_professor
          });
        } else {
          // Se não encontrar entrega, navegar normalmente
          navigate(`/aluno/missoes/${missao.id}`);
        }
      } catch (err) {
        console.error('Erro ao buscar entrega:', err);
        navigate(`/aluno/missoes/${missao.id}`);
      } finally {
        setBuscandoEntrega(false);
      }
      return;
    }

    // Se missão refazer → buscar entrega e abrir modal
    if (missao.ja_entregou && missao.status_entrega === 'refazer') {
      setBuscandoEntrega(true);
      try {
        const { data: entrega } = await supabase
          .from('entregas')
          .select('feedback_professor')
          .eq('missao_id', missao.id)
          .eq('aluno_id', user?.id)
          .order('numero_tentativa', { ascending: false })
          .limit(1)
          .maybeSingle();

        setModalRefazer({
          isOpen: true,
          missaoId: missao.id,
          missaoTitulo: missao.titulo,
          feedback: entrega?.feedback_professor || null
        });
      } catch (err) {
        console.error('Erro ao buscar entrega:', err);
        navigate(`/aluno/missoes/${missao.id}`);
      } finally {
        setBuscandoEntrega(false);
      }
      return;
    }

    // Outros status → navegar normalmente
    navigate(`/aluno/missoes/${missao.id}`);
  };

  // Filter counts
  const filterCounts = useMemo(() => ({
    todas: missoes.length,
    pendentes: missoes.filter(m => !m.ja_entregou).length,
    enviadas: missoes.filter(m => m.ja_entregou && m.status_entrega === 'pendente').length,
    aprovadas: missoes.filter(m => m.status_entrega === 'aprovada').length,
  }), [missoes]);

  // Filtered missions
  const filteredMissoes = useMemo(() => {
    switch (activeFilter) {
      case 'pendentes':
        return missoes.filter(m => !m.ja_entregou);
      case 'enviadas':
        return missoes.filter(m => m.ja_entregou && m.status_entrega === 'pendente');
      case 'aprovadas':
        return missoes.filter(m => m.status_entrega === 'aprovada');
      default:
        return missoes;
    }
  }, [missoes, activeFilter]);

  const getEmptyMessage = (filter: FilterType) => {
    switch (filter) {
      case 'pendentes':
        return 'pendente';
      case 'enviadas':
        return 'aguardando avaliação';
      case 'aprovadas':
        return 'aprovada ainda';
      default:
        return 'disponível';
    }
  };

  const getEmptyDescription = (filter: FilterType) => {
    switch (filter) {
      case 'pendentes':
        return 'Parabéns! Você completou todas as suas missões! 🎉';
      case 'enviadas':
        return 'Nenhuma missão aguardando avaliação do professor.';
      case 'aprovadas':
        return 'Continue fazendo as missões para ver elas aqui!';
      default:
        return 'Novas missões serão liberadas em breve.';
    }
  };

  if (contextLoading || isLoading) {
    return (
      <div className="py-6 space-y-6">
        {/* Skeleton for tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 w-24 bg-white/10 rounded-full animate-pulse flex-shrink-0" />
          ))}
        </div>
        {/* Skeleton for cards */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="text-white/80 mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={fetchMissoes}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="py-6 space-y-5">
        {/* Header with refresh */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">🎯 Minhas Missões</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn(
              'p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors',
              refreshing && 'opacity-50'
            )}
          >
            <RefreshCw className={cn('w-5 h-5', refreshing && 'animate-spin')} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {(Object.keys(filterLabels) as FilterType[]).map(filter => {
            const count = filterCounts[filter];
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all flex-shrink-0',
                  'border',
                  isActive
                    ? 'text-white border-transparent'
                    : 'bg-transparent border-white/20 text-white/60 hover:text-white hover:border-white/40'
                )}
                style={isActive ? { backgroundColor: casaColor } : undefined}
              >
                {filterLabels[filter]}
                {count > 0 && (
                  <span className={cn(
                    'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
                    isActive ? 'bg-white/20' : 'bg-white/10'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mission List */}
        {filteredMissoes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-xl border border-white/10 bg-white/5 text-center"
          >
            <div className="text-5xl mb-4">
              {activeFilter === 'aprovadas' ? '🏆' : activeFilter === 'pendentes' ? '✅' : '📭'}
            </div>
            <h3 className="font-medium text-lg mb-2">
              Nenhuma missão {getEmptyMessage(activeFilter)}
            </h3>
            <p className="text-white/60 text-sm">
              {getEmptyDescription(activeFilter)}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredMissoes.map((missao, index) => {
                const statusConfig = getStatusConfig(missao);
                const tipoConfig = getTipoConfig(missao.tipo);
                const StatusIcon = statusConfig.icon;

                return (
                  <motion.button
                    key={missao.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleMissaoClick(missao)}
                    className={cn(
                      'w-full p-4 rounded-xl border bg-white/5 text-left transition-all',
                      'hover:bg-white/10 active:scale-[0.98]',
                      missao.atrasada && !missao.ja_entregou 
                        ? 'border-red-500/50 bg-red-500/5' 
                        : 'border-white/10'
                    )}
                  >
                    {/* Header: Type Badge + Points */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn(
                        'text-xs px-2.5 py-1 rounded-full flex items-center gap-1',
                        tipoConfig.bgColor,
                        tipoConfig.textColor
                      )}>
                        {tipoConfig.emoji} {missao.tipo}
                      </span>
                      <span 
                        className="text-sm font-bold"
                        style={{ color: casaColor }}
                      >
                        {missao.pontos_base} pts
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-medium text-white mb-3 line-clamp-2">
                      {missao.titulo}
                    </h3>

                    {/* Footer: Deadline + Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Prazo: {format(new Date(missao.data_prazo), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                      
                      <div className={cn(
                        'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full',
                        statusConfig.bgColor,
                        statusConfig.color
                      )}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{statusConfig.label}</span>
                      </div>
                    </div>

                    {/* Chevron indicator */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5 text-white/40" />
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Summary footer */}
        {missoes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="pt-4 border-t border-white/10 text-center text-sm text-white/50"
          >
            {filterCounts.pendentes} pendente{filterCounts.pendentes !== 1 ? 's' : ''} • {filterCounts.aprovadas} aprovada{filterCounts.aprovadas !== 1 ? 's' : ''}
          </motion.div>
        )}
      </div>

      {/* Modal de Missão Aprovada */}
      {modalAprovada && (
        <FeedbackAprovadoModal
          isOpen={modalAprovada.isOpen}
          onClose={() => setModalAprovada(null)}
          missaoTitulo={modalAprovada.missaoTitulo}
          nota={modalAprovada.nota}
          pontosConquistados={modalAprovada.pontos}
          feedbackProfessor={modalAprovada.feedback}
        />
      )}

      {/* Modal de Refazer */}
      {modalRefazer && (
        <FeedbackRefazerModal
          isOpen={modalRefazer.isOpen}
          onClose={() => setModalRefazer(null)}
          onRefazer={() => {
            const missaoId = modalRefazer.missaoId;
            setModalRefazer(null);
            navigate(`/aluno/missoes/${missaoId}`);
          }}
          missaoTitulo={modalRefazer.missaoTitulo}
          feedbackProfessor={modalRefazer.feedback}
        />
      )}

      {/* Loading overlay ao buscar entrega */}
      {buscandoEntrega && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}
    </>
  );
};

export default MissoesPage;
