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
import { calcularSemanaAtualDaFase, agoraBrasil } from '@/utils/timezone';
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
  semanaCalculada: number;
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

      // Buscar fases filtradas por segmento do aluno
      // Não filtrar por ano_letivo (pode estar desatualizado no settings)
      // Incluir fases com serie=NULL (compartilhadas) e serie específica do aluno
      let query = supabase
        .from('fases')
        .select('id, numero_fase, semana_atual, ativo, inteligencia_id, data_inicio, data_fim, serie')
        .eq('institution_id', profile.institution_id)
        .eq('segmento', segmento);

      if (serieNum) {
        query = query.or(`serie.eq.${serieNum},serie.is.null`);
      }

      const { data: fases, error: fasesError } = await query;

      // Deduplicate: if same numero_fase has both serie-specific and serie=null, prefer specific
      const fasesDedup = new Map<number, typeof fases extends (infer T)[] ? T : never>();
      for (const fase of (fases || [])) {
        const existing = fasesDedup.get(fase.numero_fase);
        if (!existing || (fase.serie !== null && existing.serie === null)) {
          fasesDedup.set(fase.numero_fase, fase);
        }
      }

      // Determinar status pela data atual
      const hoje = agoraBrasil();
      hoje.setHours(12, 0, 0, 0);
      
      const itensLista: ItemFase[] = Array.from(fasesDedup.values()).map(fase => {
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
          status,
          semanaCalculada: fase.data_inicio ? calcularSemanaAtualDaFase(fase.data_inicio, fase.data_fim) : 1
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
      <div className="min-h-screen bg-[#1A1A2E] px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-24 bg-[#252547] rounded animate-pulse" />
          <div className="h-8 w-8 bg-[#252547] rounded-full animate-pulse" />
        </div>
        <div className="h-4 w-32 bg-[#252547] rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-[140px] bg-[#252547] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] px-5 py-6">
        <div className="p-6 rounded-xl border border-red-500/20 bg-[#252547] text-center">
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
    <div className="min-h-screen bg-[#1A1A2E] px-5 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white tracking-tight">Missões</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={cn(
            'p-2 rounded-full hover:bg-[#252547] transition-colors',
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

      {/* Grid 2x4 */}
      <div className="grid grid-cols-2 gap-3">
        {itensOrdenados.map((item, index) => {
          const isFutura = item.status === 'futura';
          const isAtual = item.status === 'atual';
          const isPassada = item.status === 'passada';

          const notificacoes = item.fase ? getNotificacoesFase(item.fase.id) : null;
          const pendentes = notificacoes?.pendentes || 0;
          const aprovadas = notificacoes?.aprovadas || 0;

          const corInteligencia = item.inteligencia.cor_hex || '#22C55E';

          return (
            <motion.button
              key={item.inteligencia.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => handleFaseClick(item)}
              disabled={isFutura}
              style={{
                background: isAtual
                  ? `linear-gradient(160deg, ${corInteligencia}20, #1E293B)`
                  : undefined,
                borderColor: isAtual ? `${corInteligencia}50` : undefined,
              }}
              className={cn(
                'relative flex flex-col items-center gap-2.5 p-4 pt-5 pb-4 rounded-2xl text-center transition-all border overflow-hidden',
                isFutura && 'cursor-not-allowed bg-[#252547]/50 opacity-50 border-transparent',
                isAtual && 'border',
                isPassada && 'bg-[#252547] hover:bg-[#283548] border-transparent'
              )}
            >
              {/* Badges */}
              {!isFutura && (pendentes > 0 || aprovadas > 0) && (
                <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                  {pendentes > 0 && (
                    <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 shadow-lg shadow-red-500/30">
                      {pendentes > 99 ? '99+' : pendentes}
                    </span>
                  )}
                  {aprovadas > 0 && (
                    <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold px-1 shadow-lg shadow-emerald-500/30">
                      {aprovadas > 99 ? '99+' : aprovadas}
                    </span>
                  )}
                </div>
              )}

              {/* Brasão */}
              <div
                className={cn('transition-all rounded-full', isFutura && 'opacity-40 grayscale')}
                style={isAtual ? {
                  boxShadow: `0 0 0 2px #1A1A2E, 0 0 0 3px ${corInteligencia}60`
                } : undefined}
              >
                <CasaBrasao
                  brasaoUrl={item.inteligencia.brasao_url}
                  emoji={item.inteligencia.emoji}
                  nome={item.inteligencia.nome}
                  size="medium"
                />
              </div>

              {/* Nome */}
              <span className={cn(
                'text-[13px] font-semibold leading-tight',
                isFutura && 'text-[#64748B]',
                (isAtual || isPassada) && 'text-white'
              )}>
                {item.inteligencia.nome}
              </span>

              {/* Status */}
              {isAtual && (
                <span
                  className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border"
                  style={{
                    backgroundColor: `${corInteligencia}15`,
                    color: corInteligencia,
                    borderColor: `${corInteligencia}30`
                  }}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: corInteligencia }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: corInteligencia }} />
                  </span>
                  S{item.semanaCalculada || 1}/4
                </span>
              )}
              {isPassada && (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              )}
              {isFutura && (
                <Lock className="w-3.5 h-3.5 text-[#475569]" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Empty state */}
      {itensOrdenados.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-xl bg-[#252547] text-center"
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
