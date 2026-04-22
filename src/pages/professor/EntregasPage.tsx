import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { clearAppBadge } from '@/hooks/useAppBadge';

const EntregasPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, casaMentor } = useProfessor();
  const [novasEntregas, setNovasEntregas] = useState(0);

  // Contar entregas pendentes por série
  const { data: contagemPorSerie, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['entregas-por-serie', profile?.institution_id, casaMentor?.id],
    queryFn: async () => {
      if (!profile?.institution_id) return { 6: 0, 7: 0, 8: 0, 9: 0 };

      // Buscar todas as missões da instituição (professor avalia todas as casas)
      const { data: missoes } = await supabase
        .from('missoes')
        .select('id')
        .eq('institution_id', profile.institution_id)
        .in('status', ['liberada', 'rascunho']);
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
    enabled: !!profile?.institution_id,
    refetchInterval: 60000, // Fallback: atualiza a cada 60 segundos
  });

  // Limpar badge do ícone do app ao entrar na página
  useEffect(() => {
    clearAppBadge();
  }, []);

  // Tempo real - escutar novas entregas
  useEffect(() => {
    if (!profile?.institution_id) return;

    let channel: any = null;
    try {
      channel = supabase
        .channel('entregas-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'entregas'
          },
          async (payload) => {
            console.log('Nova entrega recebida:', payload);

            // Buscar dados do aluno para mostrar no toast
            const { data: aluno } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', payload.new.aluno_id)
              .single();

            // Buscar dados da missão
            const { data: missao } = await supabase
              .from('missoes')
              .select('titulo')
              .eq('id', payload.new.missao_id)
              .single();

            // Mostrar notificação
            toast.info('📬 Nova entrega recebida!', {
              description: `${aluno?.full_name || 'Aluno'} - ${missao?.titulo || 'Missão'}`,
              duration: 5000,
            });

            // Incrementar contador
            setNovasEntregas(prev => prev + 1);

            // Invalidar queries
            queryClient.invalidateQueries({ queryKey: ['entregas-por-serie'] });
            queryClient.invalidateQueries({ queryKey: ['entregas-por-semana'] });
            queryClient.invalidateQueries({ queryKey: ['entregas-por-tipo'] });
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[EntregasPage] WebSocket indisponível:', err);
    }

    return () => { if (channel) try { supabase.removeChannel(channel); } catch {} };
  }, [profile?.institution_id, queryClient]);

  const totalPendentes = Object.values(contagemPorSerie || {}).reduce((a, b) => a + b, 0);

  // Resetar contador ao atualizar
  const handleRefresh = () => {
    refetch();
    setNovasEntregas(0);
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E] pb-24">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-violet-500/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            ✏️ Entregas para Avaliar
          </h1>
          {totalPendentes > 0 && (
            <p className="text-white/40 text-sm mt-1">
              {totalPendentes} entrega{totalPendentes !== 1 ? 's' : ''} pendente{totalPendentes !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Botão de refresh */}
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="relative p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-5 h-5 text-white", isFetching && "animate-spin")} />
          
          {/* Badge de novas entregas */}
          {novasEntregas > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {novasEntregas}
            </span>
          )}
        </button>
      </div>

      {/* Banner de novas entregas */}
      {novasEntregas > 0 && (
        <button
          onClick={handleRefresh}
          className="w-full p-3 bg-blue-500/20 border-b border-blue-500/30 text-blue-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-500/30 transition-colors"
        >
          🔔 {novasEntregas} nova{novasEntregas !== 1 ? 's' : ''} entrega{novasEntregas !== 1 ? 's' : ''} - Clique para atualizar
        </button>
      )}

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
                  className="p-6 bg-white/5 border border-violet-500/10 rounded-xl text-center hover:bg-white/10 transition-colors relative"
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
