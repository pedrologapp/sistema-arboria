import { useMemo } from 'react';
import { ArrowLeft, Circle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CasaBrasao } from '@/components/CasaBrasao';

interface Inteligencia {
  id: number;
  nome: string;
  emoji: string;
  cor_hex: string;
  brasao_url: string | null;
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

  // Detectar se é semana extra
  const isExtra = semana === 'extra';
  const semanaNumber = isExtra ? 0 : Number(semana);

  // Buscar inteligências (casas)
  const { data: inteligencias } = useQuery({
    queryKey: ['inteligencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex, brasao_url')
        .order('id');
      if (error) throw error;
      return data as Inteligencia[];
    }
  });

  // Buscar missões da semana (sem entregas, apenas contagem)
  const { data: missoes, isLoading: loadingMissoes } = useQuery({
    queryKey: ['missoes-semana-contagem', serie, semanaNumber, casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missoes')
        .select('id, titulo, tipo_missao, inteligencia_cross')
        .eq('institution_id', profile!.institution_id!)
        .eq('casa_id', casaMentor!.id)
        .eq('semana', semanaNumber)
        .or(`serie_filtro.eq.${serie},serie_filtro.is.null`);

      if (error) throw error;
      return data as Missao[];
    },
    enabled: !!profile?.institution_id && !!casaMentor?.id && !!serie && semana !== undefined
  });

  // Buscar contagem de entregas por tipo
  const { data: entregasContagem } = useQuery({
    queryKey: ['entregas-contagem', profile?.institution_id, casaMentor?.id, serie, semanaNumber],
    queryFn: async () => {
      if (!profile?.institution_id || !casaMentor?.id) return null;

      // Buscar alunos da casa mentor da série
      const { data: alunos } = await supabase
        .from('profiles')
        .select('id')
        .eq('institution_id', profile.institution_id)
        .eq('casa_id', casaMentor.id)
        .ilike('serie', `%${serie}%`)
        .not('casa_id', 'is', null);

      const totalAlunos = alunos?.length || 0;
      const alunoIds = alunos?.map(a => a.id) || [];

      const missaoIds = missoes?.map(m => m.id) || [];
      
      if (missaoIds.length === 0 || alunoIds.length === 0) {
        return { geral: { entregaram: 0, total: totalAlunos }, porCasa: {} as Record<number, { entregaram: number; total: number }> };
      }

      // Buscar entregas
      const { data: entregas } = await supabase
        .from('entregas')
        .select('aluno_id, missao_id')
        .in('missao_id', missaoIds)
        .in('aluno_id', alunoIds);

      // === LÓGICA CORRIGIDA: Contar ENTREGAS totais (não alunos) ===
      
      // GERAL: Contar entregas únicas (aluno+missão) para missões gerais
      const missoesGerais = missoes?.filter(m => m.tipo_missao === 'geral').map(m => m.id) || [];
      const totalMissoesGeraisCalc = missoesGerais.length;
      
      // Set com combinação aluno_id + missao_id para evitar contar múltiplas tentativas
      const entregasGeraisUnicas = new Set(
        entregas?.filter(e => missoesGerais.includes(e.missao_id))
          .map(e => `${e.aluno_id}_${e.missao_id}`)
      );
      
      // Total esperado = missões × alunos
      const totalEsperadoGeral = totalMissoesGeraisCalc * totalAlunos;

      // INDIVIDUAL: Agrupar missões por casa primeiro
      const missoesPorCasaMap: Record<number, string[]> = {};
      missoes?.filter(m => m.tipo_missao === 'individual' && m.inteligencia_cross).forEach(m => {
        const casaId = m.inteligencia_cross!;
        if (!missoesPorCasaMap[casaId]) missoesPorCasaMap[casaId] = [];
        missoesPorCasaMap[casaId].push(m.id);
      });

      // Contar entregas para cada casa
      const porCasa: Record<number, { entregaram: number; total: number }> = {};
      Object.entries(missoesPorCasaMap).forEach(([casaIdStr, missaoIdsCasa]) => {
        const casaId = Number(casaIdStr);
        const totalMissoesCasa = missaoIdsCasa.length;
        
        // Contar entregas únicas (aluno+missão) para esta casa
        const entregasCasaUnicas = new Set(
          entregas?.filter(e => missaoIdsCasa.includes(e.missao_id))
            .map(e => `${e.aluno_id}_${e.missao_id}`)
        );
        
        porCasa[casaId] = {
          entregaram: entregasCasaUnicas.size,           // Entregas feitas
          total: totalMissoesCasa * totalAlunos           // Entregas esperadas
        };
      });

      return {
        geral: { 
          entregaram: entregasGeraisUnicas.size, 
          total: totalEsperadoGeral 
        },
        porCasa
      };
    },
    enabled: !!profile?.institution_id && !!casaMentor?.id && !!missoes && !!serie
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
          {isExtra ? '⭐ Extra' : `Semana ${semana}`} • {serie}º Ano
        </h1>
      </div>

      {/* Fase atual - esconder quando for extra */}
      {!isExtra && faseAtual && (
        <p className="text-white/40 text-sm flex items-center gap-1.5">
          <CasaBrasao 
            brasaoUrl={faseAtual.inteligencia?.brasao_url}
            emoji={faseAtual.inteligencia?.emoji}
            nome={faseAtual.inteligencia?.nome}
            size="mini"
          />
          FASE {faseAtual.inteligencia?.nome?.toUpperCase()}
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
              {isExtra ? 'Missões Extra' : `Missões da Semana ${semana}`}
            </p>

            <button
              onClick={() => {
                // Navegar para lista de alunos (novo fluxo centrado no aluno)
                navigate(`/professor/missoes/serie/${serie}/semana/${semana}/geral/alunos`);
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
                
                {totalMissoesGerais > 0 && entregasContagem?.geral ? (
                  <span className={cn(
                    "text-sm font-semibold px-2 py-1 rounded",
                    entregasContagem.geral.entregaram === entregasContagem.geral.total 
                      ? "bg-green-500/20 text-green-400"
                      : entregasContagem.geral.entregaram > 0
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                  )}>
                    {entregasContagem.geral.entregaram}/{entregasContagem.geral.total}
                  </span>
                ) : totalMissoesGerais > 0 ? (
                  <span className="text-sm font-semibold px-2 py-1 rounded bg-white/10 text-white/40">
                    ...
                  </span>
                ) : (
                  <Circle size={18} className="text-white/20" />
                )}
              </div>
            </button>
          </div>

          {/* Divisor */}
          <div className="border-t border-violet-500/10" />

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
                      // Navegar para lista de alunos da casa (novo fluxo centrado no aluno)
                      navigate(`/professor/missoes/serie/${serie}/semana/${semana}/casa/${inteligencia.id}/alunos`);
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
                      <CasaBrasao 
                        brasaoUrl={inteligencia.brasao_url}
                        emoji={inteligencia.emoji}
                        nome={inteligencia.nome}
                        size="medium"
                      />
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
                    
                    {qtdMissoes > 0 && entregasContagem?.porCasa[inteligencia.id] ? (
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded",
                        entregasContagem.porCasa[inteligencia.id].entregaram === entregasContagem.porCasa[inteligencia.id].total
                          ? "bg-green-500/20 text-green-400"
                          : entregasContagem.porCasa[inteligencia.id].entregaram > 0
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                      )}>
                        {entregasContagem.porCasa[inteligencia.id].entregaram}/{entregasContagem.porCasa[inteligencia.id].total}
                      </span>
                    ) : qtdMissoes > 0 ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/40">
                        ...
                      </span>
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
                style={{ backgroundColor: isExtra ? '#facc1520' : `${casaColor}20` }}
              >
                <span className="text-2xl">{isExtra ? '⭐' : '📋'}</span>
              </div>
              <p className="text-white/60 mb-4">
                {isExtra ? 'Nenhuma missão extra' : `Nenhuma missão na Semana ${semana}`}
              </p>
              <button
                onClick={() => navigate(`/professor/missoes/nova${isExtra ? '?semana=extra' : ''}`)}
                className="px-4 py-2 rounded-lg font-medium text-sm"
                style={{ backgroundColor: isExtra ? '#facc15' : casaColor, color: isExtra ? '#000' : '#fff' }}
              >
                Criar missão
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MissoesSemanaPage;
