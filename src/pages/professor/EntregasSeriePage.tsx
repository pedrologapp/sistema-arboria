import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { ChevronLeft, Loader2, Check, Lock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const EntregasSeriePage = () => {
  const { serie } = useParams();
  const navigate = useNavigate();
  const { profile, casaMentor, faseAtual } = useProfessor();

  const semanaAtual = faseAtual?.semana_atual || 1;

  // Contar entregas pendentes por semana
  const { data: contagemPorSemana, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['entregas-por-semana', serie, profile?.institution_id, casaMentor?.id],
    queryFn: async () => {
      if (!profile?.institution_id) return { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

      // Buscar missões que o professor pode avaliar
      let missaoQuery = supabase
        .from('missoes')
        .select('id, semana')
        .eq('institution_id', profile.institution_id);

      if (casaMentor?.id) {
        missaoQuery = missaoQuery.or(`tipo_missao.eq.geral,tipo_missao.is.null,casa_id.eq.${casaMentor.id}`);
      } else {
        missaoQuery = missaoQuery.or('tipo_missao.eq.geral,tipo_missao.is.null');
      }

      const { data: missoes } = await missaoQuery;
      const missaoIds = missoes?.map(m => m.id) || [];

      if (missaoIds.length === 0) {
        return { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
      }

      // Buscar entregas pendentes
      const { data: entregas } = await supabase
        .from('entregas')
        .select(`
          id,
          missao_id,
          aluno:profiles!entregas_aluno_id_fkey(serie)
        `)
        .in('missao_id', missaoIds)
        .eq('status', 'pendente');

      // Mapear missao_id para semana
      const missaoSemanaMap: Record<string, number> = {};
      missoes?.forEach(m => {
        if (m.semana) missaoSemanaMap[m.id] = m.semana;
      });

      // Filtrar por série e contar por semana (inclui 0 para extras)
      const contagem: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
      entregas?.forEach(e => {
        const alunoSerie = parseInt(e.aluno?.serie?.replace(/\D/g, '') || '0');
        const semana = missaoSemanaMap[e.missao_id];
        if (alunoSerie === Number(serie) && semana !== undefined && semana >= 0 && semana <= 4) {
          contagem[semana]++;
        }
      });

      return contagem;
    },
    enabled: !!profile?.institution_id,
    refetchInterval: 60000, // Polling a cada 60 segundos
  });

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-24">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/professor/entregas')} 
            className="text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-white">{serie}º Ano</h1>
        </div>
        
        {/* Botão de refresh */}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-5 h-5 text-white", isFetching && "animate-spin")} />
        </button>
      </div>

      <div className="p-4">
        {/* Fase atual */}
        {faseAtual && (
          <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
            <p className="text-white/60 text-xs uppercase tracking-wide">Fase Atual</p>
            <p className="text-white font-medium">
              {faseAtual.inteligencia?.emoji} {faseAtual.inteligencia?.nome}
            </p>
          </div>
        )}

        <p className="text-white/40 text-sm uppercase tracking-wide mb-3">
          Selecione a Semana
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((semana) => {
              const pendentes = contagemPorSemana?.[semana] || 0;
              const isAtiva = semana === semanaAtual;
              const isPassada = semana < semanaAtual;
              const isFutura = semana > semanaAtual;

              return (
                <button
                  key={semana}
                  onClick={() => navigate(`/professor/entregas/serie/${serie}/semana/${semana}`)}
                  className={cn(
                    "w-full p-4 rounded-xl text-left transition-colors flex items-center justify-between",
                    isAtiva 
                      ? "bg-blue-500/10 border border-blue-500/30" 
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  )}
                >
                  <div>
                    <p className="text-white font-medium flex items-center gap-2">
                      📅 Semana {semana}
                      {isAtiva && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                          atual
                        </span>
                      )}
                    </p>
                    <p className="text-white/40 text-sm">
                      {pendentes > 0 
                        ? `${pendentes} entrega${pendentes !== 1 ? 's' : ''} pendente${pendentes !== 1 ? 's' : ''}`
                        : 'Nenhuma entrega pendente'
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {pendentes > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
                        {pendentes}
                      </span>
                    )}
                    
                    {isAtiva && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                    {isPassada && <Check className="w-4 h-4 text-white/30" />}
                    {isFutura && <Lock className="w-4 h-4 text-white/20" />}
                  </div>
                </button>
              );
            })}

            {/* Separador */}
            <div className="my-4 border-t border-white/10" />

            {/* Card Extra */}
            {(() => {
              const pendentes = contagemPorSemana?.[0] || 0;
              return (
                <button
                  onClick={() => navigate(`/professor/entregas/serie/${serie}/semana/extra`)}
                  className="w-full p-4 rounded-xl text-left transition-colors flex items-center justify-between bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 hover:from-yellow-500/20 hover:to-orange-500/20"
                >
                  <div>
                    <p className="text-yellow-400 font-medium flex items-center gap-2">
                      ⭐ Extra
                    </p>
                    <p className="text-white/40 text-sm">
                      {pendentes > 0 
                        ? `${pendentes} entrega${pendentes !== 1 ? 's' : ''} pendente${pendentes !== 1 ? 's' : ''}`
                        : 'Nenhuma entrega pendente'
                      }
                    </p>
                  </div>
                  
                  {pendentes > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
                      {pendentes}
                    </span>
                  )}
                </button>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default EntregasSeriePage;
