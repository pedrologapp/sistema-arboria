import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  CheckCircle, 
  ChevronRight, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CasaBrasao } from '@/components/CasaBrasao';
import { toast } from 'sonner';
import { clearAppBadge } from '@/hooks/useAppBadge';
import { useNotificacoes } from '@/hooks/useNotificacoes';

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
  data_inicio: string;
  data_fim: string;
}

interface ItemFase {
  inteligencia: Inteligencia;
  fase: Fase | null;
  status: 'futura' | 'atual' | 'passada';
}

const MissoesPage = () => {
  const navigate = useNavigate();
  const { profile, isLoading: contextLoading } = useStudent();
  const { getNotificacoesFase } = useNotificacoes();
  const [itens, setItens] = useState<ItemFase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.institution_id) return;

    try {
      setError(null);

      // Extrair número da série do aluno (ex: "6º ano" → 6)
      const serieNum = profile.serie ? parseInt(String(profile.serie).replace(/\D/g, ''), 10) : null;
      const segmento = profile.segmento || 'fundamental2';
      
      const { data: inteligencias, error: intError } = await supabase
        .from('inteligencias')
        .select('id, nome, cor_hex, brasao_url, emoji')
        .order('id');

      if (intError) throw intError;

      // Buscar ano letivo das settings ou fallback
      const { data: settings } = await supabase
        .from('institution_settings')
        .select('ano_letivo_atual')
        .eq('institution_id', profile.institution_id)
        .single();
      const anoLetivoAtual = settings?.ano_letivo_atual || new Date().getFullYear();

      // Buscar fases filtradas por série e segmento do aluno
      let query = supabase
        .from('fases')
        .select('id, numero_fase, semana_atual, ativo, inteligencia_id, data_inicio, data_fim')
        .eq('institution_id', profile.institution_id)
        .eq('ano_letivo', anoLetivoAtual)
        .eq('segmento', segmento);

      if (serieNum) {
        query = query.eq('serie', serieNum);
      }

      const { data: fases, error: fasesError } = await query;

      if (fasesError) throw fasesError;

      // Determinar status pela data atual
      const hoje = new Date();
      hoje.setHours(12, 0, 0, 0);
      
      const itensLista: ItemFase[] = (fases || []).map(fase => {
        const inteligencia = inteligencias?.find(i => i.id === fase.inteligencia_id);
        if (!inteligencia) return null;
        
        const inicio = new Date(fase.data_inicio + 'T12:00:00');
        const fim = new Date(fase.data_fim + 'T12:00:00');
        
        let status: 'futura' | 'atual' | 'passada' = 'futura';
        
        if (hoje >= inicio && hoje <= fim) {
          status = 'atual';
        } else if (hoje > fim) {
          status = 'passada';
        }
        
        return {
          inteligencia,
          fase,
          status
        };
      }).filter(Boolean) as ItemFase[];

      // Ordenar por numero_fase
      setItens(itensLista.sort((a, b) => 
        (a.fase?.numero_fase ?? 999) - (b.fase?.numero_fase ?? 999)
      ));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Não foi possível carregar as fases. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.institution_id, profile?.serie, profile?.segmento]);

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

  const itensOrdenados = useMemo(() => {
    // Ordenar TODAS as fases por numero_fase, igual ao admin
    // Inteligências sem fase configurada ficam no final
    return [...itens].sort((a, b) => {
      const numA = a.fase?.numero_fase ?? 999;
      const numB = b.fase?.numero_fase ?? 999;
      return numA - numB;
    });
  }, [itens]);

  if (contextLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-24 bg-[#1E293B] rounded animate-pulse" />
          <div className="h-8 w-8 bg-[#1E293B] rounded-full animate-pulse" />
        </div>
        <div className="h-4 w-32 bg-[#1E293B] rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-[72px] bg-[#1E293B] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-5 py-6">
        <div className="p-6 rounded-xl border border-red-500/20 bg-[#1E293B] text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-400" />
          <p className="text-[#94A3B8] text-sm mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={fetchData}
            className="border-[#334155] text-[#94A3B8] hover:bg-[#283548]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-5 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white tracking-tight">Missões</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={cn(
            'p-2 rounded-full hover:bg-[#1E293B] transition-colors',
            refreshing && 'opacity-50'
          )}
        >
          <RefreshCw className={cn('w-4 h-4 text-[#64748B]', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Section title */}
      <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-widest mb-4">
        Selecione a Fase
      </p>

      {/* List */}
      <div className="space-y-3">
        {itensOrdenados.map((item, index) => {
          const isFutura = item.status === 'futura';
          const isAtual = item.status === 'atual';
          const isPassada = item.status === 'passada';
          
          // Buscar notificações para esta fase
          const notificacoes = item.fase ? getNotificacoesFase(item.fase.id) : null;
          const pendentes = notificacoes?.pendentes || 0;
          const aprovadas = notificacoes?.aprovadas || 0;

          // Cor da inteligência para usar em elementos dinâmicos
          const corInteligencia = item.inteligencia.cor_hex || '#22C55E';

          return (
            <motion.button
              key={item.inteligencia.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleFaseClick(item)}
              disabled={isFutura}
              style={isAtual ? {
                background: `linear-gradient(to right, ${corInteligencia}18, #1E293B)`,
                borderColor: `${corInteligencia}50`
              } : undefined}
              className={cn(
                'w-full py-5 px-4 rounded-xl text-left transition-all relative overflow-hidden border',
                isFutura && 'cursor-not-allowed bg-[#1E293B]/50 opacity-50 border-transparent',
                isAtual && 'border hover:brightness-110',
                isPassada && 'bg-[#1E293B] hover:bg-[#283548] border-transparent'
              )}
            >
              {/* Badges de notificação - posição melhorada */}
              {!isFutura && (pendentes > 0 || aprovadas > 0) && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                  {pendentes > 0 && (
                    <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 shadow-lg shadow-red-500/30">
                      {pendentes > 99 ? '99+' : pendentes}
                    </span>
                  )}
                  {aprovadas > 0 && (
                    <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold px-1.5 shadow-lg shadow-emerald-500/30">
                      {aprovadas > 99 ? '99+' : aprovadas}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4">
                {/* Brasão com ring na cor da inteligência */}
                <div 
                  className={cn('transition-all rounded-full', isFutura && 'opacity-40 grayscale')}
                  style={isAtual ? {
                    boxShadow: `0 0 0 2px #0A0A0A, 0 0 0 4px ${corInteligencia}60`
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'text-[15px] font-medium',
                      isFutura && 'text-[#64748B]',
                      (isAtual || isPassada) && 'text-white'
                    )}>
                      {item.inteligencia.nome}
                    </span>
                    {isAtual && (
                      <span 
                        className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md backdrop-blur-sm border"
                        style={{
                          backgroundColor: `${corInteligencia}15`,
                          color: corInteligencia,
                          borderColor: `${corInteligencia}30`
                        }}
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          <span 
                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                            style={{ backgroundColor: corInteligencia }}
                          />
                          <span 
                            className="relative inline-flex rounded-full h-1.5 w-1.5"
                            style={{ backgroundColor: corInteligencia }}
                          />
                        </span>
                        ATIVA
                      </span>
                    )}
                  </div>
                  
                  <p className={cn(
                    'text-[13px] mt-0.5',
                    isFutura && 'text-[#475569]',
                    isAtual && 'text-[#94A3B8]',
                    isPassada && 'text-[#64748B]'
                  )}>
                    {isFutura && 'Fase futura'}
                    {isAtual && item.fase && `Fase atual — Semana ${item.fase.semana_atual || 1} de 4`}
                    {isPassada && 'Concluída'}
                  </p>
                </div>

                {/* Status icons */}
                <div className="flex-shrink-0">
                  {isFutura && <Lock className="w-4 h-4 text-[#475569]" />}
                  {isAtual && <ChevronRight className="w-5 h-5" style={{ color: corInteligencia }} />}
                  {isPassada && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <ChevronRight className="w-4 h-4 text-[#64748B]" />
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-xl bg-[#1E293B] text-center"
        >
          <h3 className="font-medium text-[15px] text-white mb-2">
            Nenhuma fase disponível
          </h3>
          <p className="text-[#64748B] text-[13px]">
            As fases serão liberadas em breve.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default MissoesPage;
