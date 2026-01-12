import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  CheckCircle, 
  ChevronRight, 
  Target,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CasaBrasao } from '@/components/CasaBrasao';
import { toast } from 'sonner';
import { clearAppBadge } from '@/hooks/useAppBadge';

interface Inteligencia {
  id: number;
  nome: string;
  cor_hex: string | null;
  brasao_url: string | null;
  emoji: string | null;
}

interface Fase {
  id: string;
  numero_fase: number;
  semana_atual: number | null;
  ativo: boolean;
  inteligencia_id: number;
}

interface ItemFase {
  inteligencia: Inteligencia;
  fase: Fase | null;
  status: 'futura' | 'atual' | 'passada';
}

const MissoesPage = () => {
  const navigate = useNavigate();
  const { profile, casaColor, isLoading: contextLoading } = useStudent();
  const [itens, setItens] = useState<ItemFase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.institution_id) return;

    try {
      setError(null);
      
      // Buscar todas as inteligências
      const { data: inteligencias, error: intError } = await supabase
        .from('inteligencias')
        .select('id, nome, cor_hex, brasao_url, emoji')
        .order('id');

      if (intError) throw intError;

      // Buscar fases da instituição
      const { data: fases, error: fasesError } = await supabase
        .from('fases')
        .select('id, numero_fase, semana_atual, ativo, inteligencia_id')
        .eq('institution_id', profile.institution_id);

      if (fasesError) throw fasesError;

      // Encontrar a fase atual (ativo = true)
      const faseAtual = fases?.find(f => f.ativo) || null;

      // Combinar inteligências com suas fases
      const itensLista: ItemFase[] = (inteligencias || []).map(intel => {
        const fase = fases?.find(f => f.inteligencia_id === intel.id) || null;
        
        let status: 'futura' | 'atual' | 'passada' = 'futura';
        
        if (fase) {
          if (fase.ativo) {
            status = 'atual';
          } else if (faseAtual && fase.numero_fase < faseAtual.numero_fase) {
            status = 'passada';
          } else {
            status = 'futura';
          }
        }
        // Se não tem fase, status permanece 'futura'

        return {
          inteligencia: intel,
          fase,
          status
        };
      });

      setItens(itensLista);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Não foi possível carregar as fases. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.institution_id]);

  useEffect(() => {
    fetchData();
    clearAppBadge();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleFaseClick = (item: ItemFase) => {
    if (item.status === 'futura' || !item.fase) {
      toast.error('Esta fase ainda não começou');
      return;
    }
    navigate(`/aluno/missoes/fase/${item.fase.id}`);
  };

  // Ordenar: atual primeiro, depois passadas, depois futuras (por ordem de inteligência)
  const itensOrdenados = useMemo(() => {
    const atual = itens.filter(i => i.status === 'atual');
    const passadas = itens.filter(i => i.status === 'passada').sort((a, b) => 
      (b.fase?.numero_fase || 0) - (a.fase?.numero_fase || 0)
    );
    const futuras = itens.filter(i => i.status === 'futura').sort((a, b) => 
      a.inteligencia.id - b.inteligencia.id
    );
    return [...atual, ...passadas, ...futuras];
  }, [itens]);

  if (contextLoading || isLoading) {
    return (
      <div className="py-6 space-y-6 mt-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-10 w-10 bg-white/10 rounded-full animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-20 bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 mt-4">
        <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="text-white/80 mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={fetchData}
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
    <div className="py-6 space-y-5 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6" style={{ color: casaColor }} />
          <h1 className="text-xl font-bold">Missões</h1>
        </div>
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

      {/* Título da seção */}
      <div className="pt-2">
        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">
          Selecione a Fase
        </h2>
      </div>

      {/* Lista de Inteligências/Fases */}
      <div className="space-y-3">
        {itensOrdenados.map((item, index) => {
          const corFase = item.inteligencia.cor_hex || casaColor;
          const isFutura = item.status === 'futura';
          const isAtual = item.status === 'atual';
          const isPassada = item.status === 'passada';

          return (
            <motion.button
              key={item.inteligencia.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleFaseClick(item)}
              disabled={isFutura}
              className={cn(
                'w-full p-4 rounded-xl text-left transition-all relative overflow-hidden',
                // BLOQUEADA - muito apagada
                isFutura && 'cursor-not-allowed bg-[#1F2937] border border-transparent',
                // ATUAL - vibrante e destacada
                isAtual && 'border-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
                // PASSADA - liberada mas discreta
                isPassada && 'bg-white/[0.03] border border-white/10 cursor-pointer hover:bg-white/[0.08] active:scale-[0.98]'
              )}
              style={isAtual ? { 
                background: `linear-gradient(135deg, ${corFase}25 0%, ${corFase}10 100%)`,
                borderColor: corFase,
                boxShadow: `0 0 20px ${corFase}20`
              } : undefined}
            >
              <div className="flex items-center gap-4">
                {/* Brasão com estilos condicionais */}
                <div 
                  className={cn(
                    'transition-all',
                    isFutura && 'opacity-40 grayscale-[50%]',
                    isPassada && 'opacity-80'
                  )}
                  style={isAtual ? { 
                    filter: `drop-shadow(0 0 8px ${corFase}50)` 
                  } : undefined}
                >
                  <CasaBrasao
                    brasaoUrl={item.inteligencia.brasao_url}
                    emoji={item.inteligencia.emoji}
                    nome={item.inteligencia.nome}
                    size="medium"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-semibold text-base',
                      isFutura && 'text-gray-500',
                      isAtual && 'text-white',
                      isPassada && 'text-white/90'
                    )}>
                      {item.inteligencia.nome}
                    </span>
                    
                    {isAtual && (
                      <Badge 
                        className="text-xs px-2 py-0.5 text-white font-medium border-0"
                        style={{ backgroundColor: corFase }}
                      >
                        atual
                      </Badge>
                    )}
                  </div>
                  
                  <p className={cn(
                    'text-sm mt-0.5',
                    isFutura && 'text-gray-600',
                    isAtual && 'text-white/70',
                    isPassada && 'text-white/50'
                  )}>
                    {isFutura && 'Fase futura'}
                    {isAtual && item.fase && `Semana ${item.fase.semana_atual || 1} de 4`}
                    {isPassada && 'Concluída'}
                  </p>
                </div>

                {/* Ícones de status */}
                <div className="flex-shrink-0">
                  {isFutura && <Lock className="w-5 h-5 text-gray-600" />}
                  {isAtual && <ChevronRight className="w-5 h-5" style={{ color: corFase }} />}
                  {isPassada && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <ChevronRight className="w-4 h-4 text-white/40" />
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Empty state */}
      {itensOrdenados.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-xl border border-white/10 bg-white/5 text-center"
        >
          <Target className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <h3 className="font-medium text-lg mb-2">
            Nenhuma fase disponível
          </h3>
          <p className="text-white/60 text-sm">
            As fases serão liberadas em breve.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default MissoesPage;
