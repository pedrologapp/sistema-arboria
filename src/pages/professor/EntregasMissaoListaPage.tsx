import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const EntregasMissaoListaPage = () => {
  const { serie, semana, casaId } = useParams();
  const navigate = useNavigate();
  const { profile, casaMentor } = useProfessor();

  const isGeral = !casaId;
  const tipoLabel = isGeral ? 'Geral' : 'Individual';

  // Buscar missões com entregas
  const { data: missoes, isLoading } = useQuery({
    queryKey: ['missoes-com-entregas', serie, semana, casaId, profile?.institution_id],
    queryFn: async () => {
      if (!profile?.institution_id) return [];

      let query = supabase
        .from('missoes')
        .select(`
          id,
          titulo,
          pontos_base,
          tipo_missao,
          casa_id,
          serie_filtro
        `)
        .eq('institution_id', profile.institution_id)
        .eq('semana', Number(semana));

      if (isGeral) {
        query = query.or('tipo_missao.eq.geral,tipo_missao.is.null');
      } else {
        query = query.eq('tipo_missao', 'individual').eq('casa_id', Number(casaId));
      }

      const { data: missoesData } = await query;

      if (!missoesData || missoesData.length === 0) return [];

      // Para cada missão, buscar entregas
      const missoesComEntregas = await Promise.all(
        missoesData.map(async (missao) => {
          const { data: entregas } = await supabase
            .from('entregas')
            .select(`
              id,
              status,
              nota,
              aluno:profiles!entregas_aluno_id_fkey(serie)
            `)
            .eq('missao_id', missao.id);

          // Filtrar por série do aluno
          const entregasFiltradas = entregas?.filter(e => {
            const alunoSerie = parseInt(e.aluno?.serie?.replace(/\D/g, '') || '0');
            return alunoSerie === Number(serie);
          }) || [];

          const pendentes = entregasFiltradas.filter(e => e.status === 'pendente' || e.nota === null).length;
          const avaliadas = entregasFiltradas.filter(e => e.nota !== null).length;
          const total = entregasFiltradas.length;

          return {
            ...missao,
            pendentes,
            avaliadas,
            total
          };
        })
      );

      // Filtrar apenas missões que têm entregas
      return missoesComEntregas.filter(m => m.total > 0);
    },
    enabled: !!profile?.institution_id
  });

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button 
          onClick={() => navigate(`/professor/entregas/serie/${serie}/semana/${semana}`)} 
          className="text-white/60 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-white">
          {tipoLabel} • Semana {semana} • {serie}º
        </h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      ) : (
        <div className="p-4">
          <p className="text-white/40 text-sm uppercase tracking-wide mb-3">
            Missões com Entregas
          </p>

          {missoes && missoes.length > 0 ? (
            <div className="space-y-3">
              {missoes.map((missao) => (
                <button
                  key={missao.id}
                  onClick={() => navigate(`/professor/entregas/missao/${missao.id}?serie=${serie}`)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium mb-2 truncate">{missao.titulo}</h3>
                      
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {missao.pendentes > 0 && (
                          <span className="text-red-400 flex items-center gap-1">
                            🔴 {missao.pendentes} pendente{missao.pendentes !== 1 ? 's' : ''}
                          </span>
                        )}
                        {missao.avaliadas > 0 && (
                          <span className="text-green-400 flex items-center gap-1">
                            ✅ {missao.avaliadas} avaliada{missao.avaliadas !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Barra de progresso */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                          <span>{missao.total} entrega{missao.total !== 1 ? 's' : ''}</span>
                          <span>{missao.avaliadas}/{missao.total} avaliadas</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${missao.total > 0 ? (missao.avaliadas / missao.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-white/40">Nenhuma missão com entregas</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EntregasMissaoListaPage;
