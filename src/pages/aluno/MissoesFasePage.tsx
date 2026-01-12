import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ChevronRight, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useStudent } from '@/contexts/StudentContext';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CasaBrasao } from '@/components/CasaBrasao';

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

      const faseFormatada: FaseData = {
        id: faseData.id,
        numero_fase: faseData.numero_fase,
        semana_atual: faseData.semana_atual,
        ativo: faseData.ativo,
        inteligencia: faseData.inteligencia as unknown as Inteligencia
      };

      setFase(faseFormatada);

      const { data: missoes, error: missoesError } = await supabase
        .from('missoes')
        .select('id, semana')
        .eq('fase_id', faseId)
        .eq('status', 'liberada');

      if (missoesError) throw missoesError;

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-5 py-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-[#1E293B] rounded-full animate-pulse" />
          <div className="h-5 w-32 bg-[#1E293B] rounded animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#1E293B] rounded-full animate-pulse" />
          <div className="h-5 w-40 bg-[#1E293B] rounded animate-pulse" />
          <div className="h-3 w-24 bg-[#1E293B] rounded animate-pulse" />
        </div>
        <div className="h-3 w-32 bg-[#1E293B] rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[76px] bg-[#1E293B] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !fase) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-5 py-6">
        <button
          onClick={() => navigate('/aluno/missoes')}
          className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Voltar</span>
        </button>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-[#64748B] text-sm mb-4">{error || 'Fase não encontrada'}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#283548] text-sm text-white transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-5 py-6 pb-24">
      {/* Back button */}
      <button
        onClick={() => navigate('/aluno/missoes')}
        className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Voltar</span>
      </button>

      {/* Centered header */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <CasaBrasao
          brasaoUrl={fase.inteligencia.brasao_url}
          emoji={fase.inteligencia.emoji}
          nome={fase.inteligencia.nome}
          size="medium"
        />
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Fase {fase.inteligencia.nome}
          </h1>
          <p className="text-xs text-[#9CA3AF] uppercase tracking-widest mt-1">
            Semanas 1-4
          </p>
        </div>
      </div>

      {/* Section title */}
      <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-widest mb-4">
        Selecione a Semana
      </p>

      {/* Weeks list */}
      <div className="space-y-3">
        {semanas.map((semana, index) => {
          const isAtual = semana.status === 'atual';
          const isFutura = semana.status === 'futura';
          const isPassada = semana.status === 'passada';
          const completouTodas = semana.concluidas === semana.totalMissoes && semana.totalMissoes > 0;

          return (
            <motion.button
              key={semana.numero}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleSemanaClick(semana)}
              disabled={isFutura}
              className={cn(
                'w-full py-5 px-4 rounded-xl text-left transition-all',
                isFutura && 'cursor-not-allowed bg-[#1E293B]/50 opacity-50',
                isAtual && 'bg-[#1E293B] border border-[#3B82F6]/30 hover:bg-[#283548]',
                isPassada && 'bg-[#1E293B] hover:bg-[#283548]'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[15px] font-medium',
                      isFutura && 'text-[#64748B]',
                      (isAtual || isPassada) && 'text-white'
                    )}>
                      Semana {semana.numero}
                    </span>
                    {isAtual && (
                      <span className="text-sm text-[#3B82F6]">· atual</span>
                    )}
                  </div>
                  
                  <p className={cn(
                    'text-[13px] mt-1',
                    isFutura && 'text-[#475569]',
                    (isAtual || isPassada) && 'text-[#94A3B8]'
                  )}>
                    {isFutura && 'Bloqueada'}
                    {(isAtual || isPassada) && semana.totalMissoes > 0 && (
                      <>
                        {semana.totalMissoes} {semana.totalMissoes === 1 ? 'missão' : 'missões'} · {semana.concluidas}/{semana.totalMissoes} concluídas
                      </>
                    )}
                    {(isAtual || isPassada) && semana.totalMissoes === 0 && 'Nenhuma missão ainda'}
                  </p>
                </div>

                {/* Status icon */}
                <div className="flex-shrink-0">
                  {isFutura && <Lock className="w-4 h-4 text-[#475569]" />}
                  {isAtual && <ChevronRight className="w-4 h-4 text-[#3B82F6]" />}
                  {isPassada && (
                    completouTodas 
                      ? <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                      : <ChevronRight className="w-4 h-4 text-[#64748B]" />
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="h-px bg-[#334155] my-6" />

      {/* Extra card */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        onClick={handleExtraClick}
        className="w-full py-5 px-4 rounded-xl bg-[#1E293B] border border-[#F59E0B]/10 
                   hover:bg-[#283548] transition-all text-left"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[15px] font-medium text-white">Extra</span>
            <p className="text-[13px] text-[#94A3B8] mt-1">
              Missões extras para ganhar mais pontos
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#F59E0B]/60" />
        </div>
      </motion.button>
    </div>
  );
};

export default MissoesFasePage;
