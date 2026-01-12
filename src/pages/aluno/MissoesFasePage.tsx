import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ChevronRight, Star, Calendar, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useStudent } from '@/contexts/StudentContext';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CasaBrasao } from '@/components/CasaBrasao';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Inteligencia {
  id: number;
  nome: string;
  cor_hex: string | null;
  brasao_url: string | null;
  emoji: string | null;
}

interface FaseData {
  id: string;
  numero_fase: number;
  semana_atual: number | null;
  ativo: boolean | null;
  inteligencia: Inteligencia;
}

interface SemanaInfo {
  numero: number;
  status: 'futura' | 'atual' | 'passada';
  totalMissoes: number;
  concluidas: number;
}

const MissoesFasePage = () => {
  const { faseId } = useParams();
  const navigate = useNavigate();
  const { profile } = useStudent();

  const [fase, setFase] = useState<FaseData | null>(null);
  const [semanas, setSemanas] = useState<SemanaInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const determinarStatusSemana = (
    numeroSemana: number,
    semanaAtual: number | null,
    faseEhAtiva: boolean | null
  ): 'futura' | 'atual' | 'passada' => {
    // Se a fase não é a atual (passada), todas as semanas são liberadas
    if (!faseEhAtiva) return 'passada';
    
    const semAtual = semanaAtual || 1;
    
    if (numeroSemana > semAtual) return 'futura';
    if (numeroSemana === semAtual) return 'atual';
    return 'passada';
  };

  const fetchData = useCallback(async () => {
    if (!faseId || !profile?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Buscar dados da fase com inteligência
      const { data: faseData, error: faseError } = await supabase
        .from('fases')
        .select(`
          id,
          numero_fase,
          semana_atual,
          ativo,
          inteligencia:inteligencias!inteligencia_id (
            id, nome, cor_hex, brasao_url, emoji
          )
        `)
        .eq('id', faseId)
        .single();

      if (faseError) throw faseError;
      if (!faseData) {
        setError('Fase não encontrada');
        return;
      }

      // Transformar dados
      const faseFormatada: FaseData = {
        id: faseData.id,
        numero_fase: faseData.numero_fase,
        semana_atual: faseData.semana_atual,
        ativo: faseData.ativo,
        inteligencia: faseData.inteligencia as unknown as Inteligencia
      };

      setFase(faseFormatada);

      // Buscar missões liberadas da fase
      const { data: missoes, error: missoesError } = await supabase
        .from('missoes')
        .select('id, semana')
        .eq('fase_id', faseId)
        .eq('status', 'liberada');

      if (missoesError) throw missoesError;

      // Buscar entregas aprovadas do aluno para essas missões
      const missaoIds = missoes?.map(m => m.id) || [];
      let entregasAprovadas: { missao_id: string }[] = [];

      if (missaoIds.length > 0) {
        const { data: entregas, error: entregasError } = await supabase
          .from('entregas')
          .select('missao_id')
          .eq('aluno_id', profile.id)
          .in('missao_id', missaoIds)
          .eq('status', 'aprovada');

        if (entregasError) throw entregasError;
        entregasAprovadas = entregas || [];
      }

      // Gerar array de 4 semanas com contagens
      const semanasInfo: SemanaInfo[] = [1, 2, 3, 4].map(num => {
        const missoesDaSemana = missoes?.filter(m => m.semana === num) || [];
        const concluidas = entregasAprovadas.filter(e => 
          missoesDaSemana.some(m => m.id === e.missao_id)
        ).length;

        return {
          numero: num,
          status: determinarStatusSemana(num, faseFormatada.semana_atual, faseFormatada.ativo),
          totalMissoes: missoesDaSemana.length,
          concluidas
        };
      });

      setSemanas(semanasInfo);
    } catch (err) {
      console.error('Erro ao carregar dados da fase:', err);
      setError('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [faseId, profile?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSemanaClick = (semana: SemanaInfo) => {
    if (semana.status === 'futura') {
      toast.error('Esta semana ainda não começou');
      return;
    }
    navigate(`/aluno/missoes/fase/${faseId}/semana/${semana.numero}`);
  };

  const handleExtraClick = () => {
    navigate(`/aluno/missoes/fase/${faseId}/extra`);
  };

  const corFase = fase?.inteligencia?.cor_hex || '#3B82F6';

  // Loading state
  if (isLoading) {
    return (
      <div className="py-6 space-y-5 mt-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="flex flex-col items-center gap-3 mb-6">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-40" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !fase) {
    return (
      <div className="py-6 space-y-5 mt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/aluno/missoes')}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Voltar</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-white/60 mb-4">{error || 'Fase não encontrada'}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-5 mt-4">
      {/* Header com voltar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno/missoes')}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Fase {fase.inteligencia.nome}</h1>
      </div>

      {/* Brasão e título centralizado */}
      <div className="flex flex-col items-center gap-3 mb-2">
        <div style={{ filter: `drop-shadow(0 0 12px ${corFase}60)` }}>
          <CasaBrasao
            brasaoUrl={fase.inteligencia.brasao_url}
            emoji={fase.inteligencia.emoji}
            nome={fase.inteligencia.nome}
            size="large"
          />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold" style={{ color: corFase }}>
            Fase {fase.inteligencia.nome}
          </h2>
          <p className="text-white/60 text-sm">Semanas 1-4</p>
        </div>
      </div>

      {/* Título da seção */}
      <p className="text-white/80 font-medium text-sm uppercase tracking-wide">
        Selecione a Semana
      </p>

      {/* Lista de semanas */}
      <div className="space-y-3">
        {semanas.map((semana, index) => {
          const isAtual = semana.status === 'atual';
          const isFutura = semana.status === 'futura';
          const isPassada = semana.status === 'passada';
          const completouTodas = semana.concluidas === semana.totalMissoes && semana.totalMissoes > 0;

          return (
            <motion.button
              key={semana.numero}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSemanaClick(semana)}
              disabled={isFutura}
              className={cn(
                'w-full p-4 rounded-xl text-left transition-all relative overflow-hidden',
                // BLOQUEADA
                isFutura && 'cursor-not-allowed bg-[#1F2937] border border-transparent',
                // ATUAL
                isAtual && 'border-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
                // PASSADA
                isPassada && 'bg-white/[0.03] border border-white/10 cursor-pointer hover:bg-white/[0.08] active:scale-[0.98]'
              )}
              style={isAtual ? { 
                background: `linear-gradient(135deg, ${corFase}25 0%, ${corFase}10 100%)`,
                borderColor: corFase,
                boxShadow: `0 0 20px ${corFase}20`
              } : undefined}
            >
              <div className="flex items-center gap-4">
                {/* Ícone Calendar */}
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  isFutura && 'bg-gray-700/50',
                  isAtual && 'bg-white/10',
                  isPassada && 'bg-white/5'
                )}>
                  <Calendar className={cn(
                    'w-5 h-5',
                    isFutura && 'text-gray-500 opacity-50',
                    isAtual && 'text-white',
                    isPassada && 'text-white/70'
                  )} />
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
                      Semana {semana.numero}
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
                    {isFutura && 'Bloqueada'}
                    {(isAtual || isPassada) && semana.totalMissoes > 0 && (
                      <>
                        {semana.totalMissoes} {semana.totalMissoes === 1 ? 'missão' : 'missões'} disponíveis
                        {' • '}
                        {semana.concluidas}/{semana.totalMissoes} concluídas
                      </>
                    )}
                    {(isAtual || isPassada) && semana.totalMissoes === 0 && 'Nenhuma missão ainda'}
                  </p>
                </div>

                {/* Ícones de status */}
                <div className="flex-shrink-0">
                  {isFutura && <Lock className="w-5 h-5 text-gray-600" />}
                  {isAtual && <ChevronRight className="w-5 h-5" style={{ color: corFase }} />}
                  {isPassada && (
                    <div className="flex items-center gap-1">
                      {completouTodas ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-white/40" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Separador */}
      <div className="border-t border-white/10 my-2" />

      {/* Card Extra */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        onClick={handleExtraClick}
        className="w-full p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 cursor-pointer hover:bg-amber-500/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-base text-amber-300">Extra</span>
            <p className="text-sm mt-0.5 text-amber-400/70">
              Missões extras para ganhar mais pontos
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-400 flex-shrink-0" />
        </div>
      </motion.button>
    </div>
  );
};

export default MissoesFasePage;
