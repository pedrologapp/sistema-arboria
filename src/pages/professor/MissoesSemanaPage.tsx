import { useMemo } from 'react';
import { ArrowLeft, Check, Circle, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Inteligencia {
  id: number;
  nome: string;
  emoji: string;
  cor_hex: string;
}

interface Missao {
  id: string;
  titulo: string;
  tipo_missao: string | null;
  inteligencia_cross: number | null;
}

const MissoesSemanaPage = () => {
  const { serie, semana } = useParams<{ serie: string; semana: string }>();
  const navigate = useNavigate();
  const { casaMentor, casaColor, profile, faseAtual } = useProfessor();

  // Buscar inteligências (casas)
  const { data: inteligencias } = useQuery({
    queryKey: ['inteligencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex')
        .order('id');
      if (error) throw error;
      return data as Inteligencia[];
    }
  });

  // Buscar missões da semana (sem entregas, apenas contagem)
  const { data: missoes, isLoading: loadingMissoes } = useQuery({
    queryKey: ['missoes-semana-contagem', serie, semana, casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missoes')
        .select('id, titulo, tipo_missao, inteligencia_cross')
        .eq('institution_id', profile!.institution_id!)
        .eq('casa_id', casaMentor!.id)
        .eq('semana', Number(semana))
        .or(`serie_filtro.eq.${serie},serie_filtro.is.null`);

      if (error) throw error;
      return data as Missao[];
    },
    enabled: !!profile?.institution_id && !!casaMentor?.id && !!serie && !!semana
  });

  // Contagem de missões gerais
  const totalMissoesGerais = missoes?.filter(m => m.tipo_missao === 'geral').length || 0;

  // Contagem de missões por casa
  const missoesPorCasa = useMemo(() => {
    const porCasa: Record<number, number> = {};
    missoes?.filter(m => m.tipo_missao === 'individual').forEach(m => {
      if (m.inteligencia_cross) {
        porCasa[m.inteligencia_cross] = (porCasa[m.inteligencia_cross] || 0) + 1;
      }
    });
    return porCasa;
  }, [missoes]);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(`/professor/missoes/serie/${serie}`)}
          className="p-2 -ml-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-white flex-1">
          Semana {semana} • {serie}º Ano
        </h1>
        <button
          onClick={() => navigate('/professor/missoes/nova')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{ backgroundColor: casaColor, color: '#fff' }}
        >
          <Plus size={18} />
          Nova
        </button>
      </div>

      {/* Fase atual */}
      {faseAtual && (
        <p className="text-white/40 text-sm">
          {faseAtual.inteligencia?.emoji} FASE {faseAtual.inteligencia?.nome?.toUpperCase()}
        </p>
      )}

      {/* Loading */}
      {loadingMissoes && (
        <div className="space-y-3">
          <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
        </div>
      )}

      {!loadingMissoes && (
        <>
          {/* Missão Geral */}
          <div>
            <p className="text-white/60 text-sm uppercase tracking-wide mb-3">
              Missões da Semana {semana}
            </p>

            <button
              onClick={() => {
                if (totalMissoesGerais > 0) {
                  navigate(`/professor/missoes/serie/${serie}/semana/${semana}/geral`);
                }
              }}
              disabled={totalMissoesGerais === 0}
              className={cn(
                "w-full p-4 rounded-xl text-left transition-colors",
                totalMissoesGerais > 0 
                  ? "bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30" 
                  : "bg-white/5 opacity-60 cursor-not-allowed"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium flex items-center gap-2">
                    📋 GERAL
                  </p>
                  <p className="text-white/40 text-sm mt-1">
                    {totalMissoesGerais > 0 
                      ? `${totalMissoesGerais} ${totalMissoesGerais === 1 ? 'missão' : 'missões'}`
                      : 'Nenhuma missão geral nesta semana'
                    }
                  </p>
                </div>
                
                {totalMissoesGerais > 0 ? (
                  <Check size={18} className="text-green-400" />
                ) : (
                  <Circle size={18} className="text-white/20" />
                )}
              </div>
            </button>
          </div>

          {/* Divisor */}
          <div className="border-t border-white/10" />

          {/* Missões Individuais por Casa */}
          <div>
            <p className="text-white/60 text-sm uppercase tracking-wide mb-3">
              🏠 Individual (por Casa)
            </p>

            <div className="space-y-2">
              {inteligencias?.map((inteligencia) => {
                const qtdMissoes = missoesPorCasa[inteligencia.id] || 0;
                
                return (
                  <button
                    key={inteligencia.id}
                    onClick={() => {
                      if (qtdMissoes > 0) {
                        navigate(`/professor/missoes/serie/${serie}/semana/${semana}/casa/${inteligencia.id}`);
                      }
                    }}
                    disabled={qtdMissoes === 0}
                    className={cn(
                      "w-full p-3 rounded-xl text-left transition-colors flex items-center justify-between",
                      qtdMissoes > 0 
                        ? "bg-white/5 hover:bg-white/10" 
                        : "bg-white/5 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{inteligencia.emoji}</span>
                      <div>
                        <p className="text-white font-medium">{inteligencia.nome}</p>
                        <p className="text-white/40 text-xs">
                          {qtdMissoes > 0 
                            ? `${qtdMissoes} ${qtdMissoes === 1 ? 'missão' : 'missões'}`
                            : 'Nenhuma missão'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {qtdMissoes > 0 ? (
                      <Check size={16} className="text-green-400" />
                    ) : (
                      <Circle size={16} className="text-white/20" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Empty state */}
          {missoes?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${casaColor}20` }}
              >
                <span className="text-2xl">📋</span>
              </div>
              <p className="text-white/60 mb-4">
                Nenhuma missão na Semana {semana}
              </p>
              <button
                onClick={() => navigate('/professor/missoes/nova')}
                className="px-4 py-2 rounded-lg font-medium text-sm"
                style={{ backgroundColor: casaColor, color: '#fff' }}
              >
                Criar primeira missão
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MissoesSemanaPage;
