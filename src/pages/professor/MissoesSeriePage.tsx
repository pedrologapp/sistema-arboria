import { ArrowLeft, Check, Lock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CasaBrasao } from '@/components/CasaBrasao';

interface ContagemSemana {
  missoes: number;
  entregas: number;
  total: number;
}

const MissoesSeriePage = () => {
  const { serie } = useParams<{ serie: string }>();
  const navigate = useNavigate();
  const { casaMentor, casaColor, profile, faseAtual } = useProfessor();

  // Contar missões e entregas por semana
  const { data: contagemPorSemana, isLoading } = useQuery({
    queryKey: ['contagem-semanas', serie, casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      // 1. Buscar missões da série para a casa do mentor
      const { data: missoes, error: missaoError } = await supabase
        .from('missoes')
        .select('id, semana')
        .eq('institution_id', profile!.institution_id!)
        .eq('casa_id', casaMentor!.id)
        .or(`serie_filtro.eq.${serie},serie_filtro.is.null`);

      if (missaoError) throw missaoError;

      // 2. Buscar entregas dessas missões
      const missaoIds = missoes?.map(m => m.id) || [];
      let entregas: { missao_id: string }[] = [];
      
      if (missaoIds.length > 0) {
        const { data: entregasData, error: entregasError } = await supabase
          .from('entregas')
          .select('missao_id')
          .in('missao_id', missaoIds);
        
        if (entregasError) throw entregasError;
        entregas = entregasData || [];
      }

      // 3. Contar alunos da série na casa do mentor
      const { count: totalAlunos, error: alunosError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', profile!.institution_id!)
        .eq('casa_id', casaMentor!.id)
        .ilike('serie', `%${serie}%`);

      if (alunosError) throw alunosError;

      // 4. Agrupar por semana
      const contagem: Record<number, ContagemSemana> = {
        1: { missoes: 0, entregas: 0, total: totalAlunos || 0 },
        2: { missoes: 0, entregas: 0, total: totalAlunos || 0 },
        3: { missoes: 0, entregas: 0, total: totalAlunos || 0 },
        4: { missoes: 0, entregas: 0, total: totalAlunos || 0 },
      };

      missoes?.forEach(m => {
        if (m.semana && contagem[m.semana]) {
          contagem[m.semana].missoes++;
          contagem[m.semana].entregas += entregas?.filter(e => e.missao_id === m.id).length || 0;
        }
      });

      return contagem;
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id && !!serie
  });

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate('/professor/missoes')}
          className="p-2 -ml-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-white flex-1">{serie}º Ano</h1>
      </div>

      {/* Fase atual */}
      {faseAtual && (
        <p className="text-white/40 text-sm flex items-center gap-1.5">
          <CasaBrasao 
            brasaoUrl={faseAtual.inteligencia?.brasao_url}
            emoji={faseAtual.inteligencia?.emoji}
            nome={faseAtual.inteligencia?.nome}
            size="mini"
          />
          FASE {faseAtual.inteligencia?.nome?.toUpperCase()} • Semanas 1-4
        </p>
      )}

      {/* Título da seção */}
      <p className="text-white/60 text-sm uppercase tracking-wide">
        Selecione a Semana
      </p>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Lista de Semanas */}
      {!isLoading && (
        <div className="space-y-3">
          {(() => {
            // Semana atual vem da fase ativa
            const semanaAtual = faseAtual?.semana_atual || 1;
            
            return [1, 2, 3, 4].map((semana) => {
              const dados = contagemPorSemana?.[semana];
              const totalEsperado = (dados?.total || 0) * (dados?.missoes || 0);
              
              // Estados da semana baseados na semana atual da fase
              const isAtiva = semana === semanaAtual;
              const isPassada = semana < semanaAtual;
              const isFutura = semana > semanaAtual;

              return (
                <button
                  key={semana}
                  onClick={() => navigate(`/professor/missoes/serie/${serie}/semana/${semana}`)}
                  className={cn(
                    "w-full p-4 rounded-xl text-left transition-colors flex items-center justify-between",
                    isAtiva 
                      ? "bg-blue-500/10 border border-blue-500/30" 
                      : "bg-white/5 border border-white/5 hover:bg-white/10"
                  )}
                >
                  <div>
                    <p className="text-white font-medium flex items-center gap-2">
                      📅 Semana {semana}
                      {isAtiva && <span className="text-xs text-blue-400">(atual)</span>}
                    </p>
                    <p className="text-white/40 text-sm mt-1">
                      {dados?.missoes || 0} {(dados?.missoes || 0) === 1 ? 'missão' : 'missões'} • {dados?.entregas || 0}/{totalEsperado} entregaram
                    </p>
                  </div>
                  
                  {/* Indicadores */}
                  {isAtiva && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  )}
                  {isPassada && (
                    <Check size={18} className="text-white/30" />
                  )}
                  {isFutura && (
                    <Lock size={18} className="text-white/20" />
                  )}
                </button>
              );
            });
          })()}
        </div>
      )}

      {/* Dica */}
      <p className="text-white/30 text-xs text-center mt-4">
        Clique em uma semana para ver as missões
      </p>
    </div>
  );
};

export default MissoesSeriePage;
