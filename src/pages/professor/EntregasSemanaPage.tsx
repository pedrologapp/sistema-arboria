import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CasaBrasao } from '@/components/CasaBrasao';

const EntregasSemanaPage = () => {
  const { serie, semana } = useParams();
  const navigate = useNavigate();
  const { profile, casaMentor } = useProfessor();

  const isExtra = semana === 'extra';
  const semanaNumber = isExtra ? 0 : Number(semana);

  // Buscar inteligências (casas)
  const { data: inteligencias } = useQuery({
    queryKey: ['inteligencias'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex, brasao_url')
        .order('ordem');
      return data;
    }
  });

  // Contar entregas pendentes por tipo (geral vs individual por casa)
  const { data: contagem, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['entregas-por-tipo', serie, semana, profile?.institution_id, casaMentor?.id],
    queryFn: async () => {
      if (!profile?.institution_id) return { gerais: 0, porCasa: {} };

      // Buscar missões com dados de tipo e casa
      let missaoQuery = supabase
        .from('missoes')
        .select('id, tipo_missao, casa_id, semana')
        .eq('institution_id', profile.institution_id)
        .eq('semana', semanaNumber);

      if (casaMentor?.id) {
        missaoQuery = missaoQuery.or(`tipo_missao.eq.geral,tipo_missao.is.null,casa_id.eq.${casaMentor.id}`);
      } else {
        missaoQuery = missaoQuery.or('tipo_missao.eq.geral,tipo_missao.is.null');
      }

      const { data: missoes } = await missaoQuery;
      const missaoIds = missoes?.map(m => m.id) || [];

      if (missaoIds.length === 0) {
        return { gerais: 0, porCasa: {} };
      }

      // Buscar entregas PENDENTES DE AVALIAÇÃO (nota IS NULL)
      const { data: entregas } = await supabase
        .from('entregas')
        .select(`
          id,
          missao_id,
          nota,
          aluno:profiles!entregas_aluno_id_fkey(serie)
        `)
        .in('missao_id', missaoIds)
        .is('nota', null);

      // Mapear missao_id para tipo e casa
      const missaoMap: Record<string, { tipo: string | null; casaId: number | null }> = {};
      missoes?.forEach(m => {
        missaoMap[m.id] = { tipo: m.tipo_missao, casaId: m.casa_id };
      });

      // Contar
      let gerais = 0;
      const porCasa: Record<number, number> = {};

      entregas?.forEach(e => {
        const alunoSerie = parseInt(e.aluno?.serie?.replace(/\D/g, '') || '0');
        if (alunoSerie !== Number(serie)) return;

        const missaoInfo = missaoMap[e.missao_id];
        if (!missaoInfo) return;

        if (missaoInfo.tipo === 'geral' || !missaoInfo.tipo) {
          gerais++;
        } else if (missaoInfo.casaId) {
          porCasa[missaoInfo.casaId] = (porCasa[missaoInfo.casaId] || 0) + 1;
        }
      });

      return { gerais, porCasa };
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
            onClick={() => navigate(`/professor/entregas/serie/${serie}`)} 
            className="text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-white">
            {isExtra ? '⭐ Extra' : `Semana ${semana}`} • {serie}º Ano
          </h1>
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <p className="text-white/40 text-sm uppercase tracking-wide">
            {isExtra ? 'Entregas Extra' : `Entregas da Semana ${semana}`}
          </p>

          {/* GERAL */}
          {(() => {
            const hasPendentes = (contagem?.gerais || 0) > 0;
            return (
              <button
                onClick={() => navigate(`/professor/entregas/serie/${serie}/semana/${semana}/geral`)}
                className={cn(
                  "w-full p-4 rounded-xl text-left transition-colors flex items-center justify-between border",
                  hasPendentes
                    ? "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
                    : "bg-white/5 border-white/10 hover:bg-white/10 opacity-60"
                )}
              >
                <div>
                  <p className={cn("font-medium text-lg", hasPendentes ? "text-white" : "text-white/50")}>
                    📋 GERAL
                  </p>
                  <p className={cn("text-sm", hasPendentes ? "text-yellow-400" : "text-white/30")}>
                    {hasPendentes
                      ? `${contagem?.gerais} entrega${(contagem?.gerais || 0) !== 1 ? 's' : ''} pendente${(contagem?.gerais || 0) !== 1 ? 's' : ''}`
                      : 'Nenhuma pendente'
                    }
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {hasPendentes && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
                      {contagem?.gerais}
                    </span>
                  )}
                  <ChevronRight className={cn("w-5 h-5", hasPendentes ? "text-white/40" : "text-white/20")} />
                </div>
              </button>
            );
          })()}

          {/* INDIVIDUAL (por Casa) */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-white/40 text-sm uppercase tracking-wide mb-3">
              🏠 Individual (por Casa)
            </p>

            <div className="space-y-2">
              {inteligencias?.map((int) => {
                const pendentes = contagem?.porCasa?.[int.id] || 0;
                const hasPendentes = pendentes > 0;

                return (
                  <button
                    key={int.id}
                    onClick={() => navigate(`/professor/entregas/serie/${serie}/semana/${semana}/casa/${int.id}`)}
                    className={cn(
                      "w-full p-3 rounded-xl text-left flex items-center justify-between border transition-colors",
                      hasPendentes 
                        ? "bg-white/10 border-white/20 hover:bg-white/15" 
                        : "bg-white/5 border-white/5 hover:bg-white/10 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <CasaBrasao 
                        brasaoUrl={int.brasao_url}
                        emoji={int.emoji}
                        nome={int.nome}
                        size="medium"
                      />
                      <div>
                        <p className={cn("font-medium", hasPendentes ? "text-white" : "text-white/50")}>
                          {int.nome}
                        </p>
                        <p className={cn("text-xs", hasPendentes ? "text-yellow-400" : "text-white/30")}>
                          {hasPendentes 
                            ? `${pendentes} entrega${pendentes !== 1 ? 's' : ''} pendente${pendentes !== 1 ? 's' : ''}`
                            : 'Nenhuma pendente'
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {hasPendentes && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
                          {pendentes}
                        </span>
                      )}
                      <ChevronRight className={cn("w-5 h-5", hasPendentes ? "text-white/40" : "text-white/20")} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Empty state */}
          {(contagem?.gerais === 0 && Object.keys(contagem?.porCasa || {}).length === 0) && (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-white/40">Nenhuma entrega pendente nesta semana</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EntregasSemanaPage;
