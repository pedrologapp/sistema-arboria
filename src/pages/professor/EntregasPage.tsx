import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { Loader2 } from 'lucide-react';

const EntregasPage = () => {
  const navigate = useNavigate();
  const { profile, casaMentor } = useProfessor();

  // Contar entregas pendentes por série
  const { data: contagemPorSerie, isLoading } = useQuery({
    queryKey: ['entregas-por-serie', profile?.institution_id, casaMentor?.id],
    queryFn: async () => {
      if (!profile?.institution_id) return { 6: 0, 7: 0, 8: 0, 9: 0 };

      // Buscar missões que o professor pode avaliar (gerais + da casa mentor)
      let missaoQuery = supabase
        .from('missoes')
        .select('id')
        .eq('institution_id', profile.institution_id);

      if (casaMentor?.id) {
        missaoQuery = missaoQuery.or(`tipo_missao.eq.geral,tipo_missao.is.null,casa_id.eq.${casaMentor.id}`);
      } else {
        missaoQuery = missaoQuery.or('tipo_missao.eq.geral,tipo_missao.is.null');
      }

      const { data: missoes } = await missaoQuery;
      const missaoIds = missoes?.map(m => m.id) || [];

      if (missaoIds.length === 0) {
        return { 6: 0, 7: 0, 8: 0, 9: 0 };
      }

      // Buscar entregas pendentes com série do aluno
      const { data: entregas } = await supabase
        .from('entregas')
        .select('id, aluno:profiles!entregas_aluno_id_fkey(serie)')
        .in('missao_id', missaoIds)
        .eq('status', 'pendente');

      // Agrupar por série (extraindo número)
      const contagem: Record<number, number> = { 6: 0, 7: 0, 8: 0, 9: 0 };
      entregas?.forEach(e => {
        const serieStr = e.aluno?.serie || '';
        const serieNum = parseInt(serieStr.replace(/\D/g, '') || '0');
        if (serieNum >= 6 && serieNum <= 9) {
          contagem[serieNum]++;
        }
      });

      return contagem;
    },
    enabled: !!profile?.institution_id
  });

  const totalPendentes = Object.values(contagemPorSerie || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-24">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          ✏️ Entregas para Avaliar
        </h1>
        {totalPendentes > 0 && (
          <p className="text-white/40 text-sm mt-1">
            {totalPendentes} entrega{totalPendentes !== 1 ? 's' : ''} pendente{totalPendentes !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="p-4">
        <p className="text-white/40 text-sm uppercase tracking-wide mb-4">
          Selecione a Série
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[6, 7, 8, 9].map((serie) => {
              const pendentes = contagemPorSerie?.[serie] || 0;

              return (
                <button
                  key={serie}
                  onClick={() => navigate(`/professor/entregas/serie/${serie}`)}
                  className="p-6 bg-white/5 border border-white/10 rounded-xl text-center hover:bg-white/10 transition-colors relative"
                >
                  <p className="text-3xl font-bold text-white">{serie}º</p>
                  <p className="text-white/40 text-sm">ano</p>
                  
                  {/* Badge de pendentes */}
                  {pendentes > 0 && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
                      {pendentes}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Legenda */}
        <div className="mt-6 flex items-center gap-2 text-white/30 text-xs">
          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
            N
          </div>
          <span>= entregas pendentes de avaliação</span>
        </div>
      </div>
    </div>
  );
};

export default EntregasPage;
