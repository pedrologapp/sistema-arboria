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

interface Fase {
  id: string;
  numero_fase: number;
  semana_atual: number | null;
  ativo: boolean;
  data_inicio: string;
  data_fim: string;
  inteligencia: {
    id: number;
    nome: string;
    cor_hex: string | null;
    brasao_url: string | null;
    emoji: string | null;
  } | null;
  status: 'futura' | 'atual' | 'passada';
}

const MissoesPage = () => {
  const navigate = useNavigate();
  const { profile, casaColor, isLoading: contextLoading } = useStudent();
  const [fases, setFases] = useState<Fase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFases = useCallback(async () => {
    if (!profile?.institution_id) return;

    try {
      setError(null);
      
      // Buscar todas as fases da instituição com dados da inteligência
      const { data, error: fetchError } = await supabase
        .from('fases')
        .select(`
          id,
          numero_fase,
          semana_atual,
          ativo,
          data_inicio,
          data_fim,
          inteligencias:inteligencia_id (
            id,
            nome,
            cor_hex,
            brasao_url,
            emoji
          )
        `)
        .eq('institution_id', profile.institution_id)
        .order('numero_fase', { ascending: false });

      if (fetchError) throw fetchError;

      // Encontrar a fase atual (ativo = true)
      const faseAtual = data?.find(f => f.ativo);
      const numeroFaseAtual = faseAtual?.numero_fase || 0;

      // Mapear e determinar status de cada fase
      const fasesComStatus: Fase[] = (data || []).map(fase => {
        let status: 'futura' | 'atual' | 'passada';
        
        if (fase.ativo) {
          status = 'atual';
        } else if (fase.numero_fase > numeroFaseAtual) {
          status = 'futura';
        } else {
          status = 'passada';
        }

        return {
          id: fase.id,
          numero_fase: fase.numero_fase,
          semana_atual: fase.semana_atual,
          ativo: fase.ativo,
          data_inicio: fase.data_inicio,
          data_fim: fase.data_fim,
          inteligencia: fase.inteligencias as Fase['inteligencia'],
          status
        };
      });

      setFases(fasesComStatus);
    } catch (err) {
      console.error('Error fetching fases:', err);
      setError('Não foi possível carregar as fases. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.institution_id]);

  useEffect(() => {
    fetchFases();
    clearAppBadge();
  }, [fetchFases]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFases();
    setRefreshing(false);
  };

  const handleFaseClick = (fase: Fase) => {
    if (fase.status === 'futura') {
      toast.error('Esta fase ainda não começou');
      return;
    }
    navigate(`/aluno/missoes/fase/${fase.id}`);
  };

  // Ordenar: atual primeiro, depois passadas (mais recentes primeiro), depois futuras
  const fasesOrdenadas = useMemo(() => {
    const atual = fases.filter(f => f.status === 'atual');
    const passadas = fases.filter(f => f.status === 'passada').sort((a, b) => b.numero_fase - a.numero_fase);
    const futuras = fases.filter(f => f.status === 'futura').sort((a, b) => a.numero_fase - b.numero_fase);
    return [...atual, ...passadas, ...futuras];
  }, [fases]);

  if (contextLoading || isLoading) {
    return (
      <div className="py-6 space-y-6 mt-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-10 w-10 bg-white/10 rounded-full animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white/10 rounded-xl animate-pulse" />
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
            onClick={fetchFases}
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

      {/* Lista de Fases */}
      <div className="space-y-3">
        {fasesOrdenadas.map((fase, index) => {
          const corFase = fase.inteligencia?.cor_hex || casaColor;
          const isFutura = fase.status === 'futura';
          const isAtual = fase.status === 'atual';
          const isPassada = fase.status === 'passada';

          return (
            <motion.button
              key={fase.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleFaseClick(fase)}
              disabled={isFutura}
              className={cn(
                'w-full p-4 rounded-xl border text-left transition-all relative overflow-hidden',
                isFutura && 'opacity-50 cursor-not-allowed bg-gray-800/50 border-gray-700',
                isAtual && 'border-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
                isPassada && 'bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 active:scale-[0.98]'
              )}
              style={isAtual ? { 
                backgroundColor: `${corFase}15`, 
                borderColor: corFase 
              } : undefined}
            >
              <div className="flex items-center gap-4">
                {/* Brasão */}
                <div className={cn(isFutura && 'opacity-50')}>
                  <CasaBrasao
                    brasaoUrl={fase.inteligencia?.brasao_url}
                    emoji={fase.inteligencia?.emoji}
                    nome={fase.inteligencia?.nome}
                    size="medium"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span 
                      className={cn(
                        'font-semibold text-base',
                        isFutura ? 'text-gray-400' : 'text-white'
                      )}
                      style={isAtual ? { color: corFase } : undefined}
                    >
                      {fase.inteligencia?.nome || `Fase ${fase.numero_fase}`}
                    </span>
                    {isAtual && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs px-2 py-0.5"
                        style={{ backgroundColor: `${corFase}30`, color: corFase }}
                      >
                        atual
                      </Badge>
                    )}
                  </div>
                  
                  <p className={cn(
                    'text-sm mt-0.5',
                    isFutura ? 'text-gray-500' : 'text-white/50'
                  )}>
                    {isFutura && 'Fase futura'}
                    {isAtual && `Semana ${fase.semana_atual || 1} de 4`}
                    {isPassada && 'Concluída'}
                  </p>
                </div>

                {/* Ícone de status */}
                <div className="flex-shrink-0">
                  {isFutura && (
                    <Lock className="w-5 h-5 text-gray-500" />
                  )}
                  {isAtual && (
                    <ChevronRight className="w-5 h-5" style={{ color: corFase }} />
                  )}
                  {isPassada && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Empty state */}
      {fasesOrdenadas.length === 0 && (
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
