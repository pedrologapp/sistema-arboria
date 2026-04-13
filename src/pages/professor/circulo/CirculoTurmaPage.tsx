import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const CirculoTurmaPage = () => {
  const { serie } = useParams<{ serie: string }>();
  const { profile, faseAtual } = useProfessor();
  const navigate = useNavigate();

  const serieNumero = parseInt(serie || '6');
  const semanaAtual = faseAtual?.semana_atual || 1;

  const { data: turmas, isLoading } = useQuery({
    queryKey: ['circulo-turmas', profile?.institution_id, serieNumero],
    queryFn: async () => {
      if (!profile?.institution_id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('turma')
        .eq('institution_id', profile.institution_id)
        .eq('segmento', 'fundamental2')
        .ilike('serie', `%${serieNumero}%`)
        .not('casa_id', 'is', null)
        .not('turma', 'is', null);

      if (error) throw error;

      const contagem: Record<string, number> = {};
      (data || []).forEach(d => {
        if (d.turma) contagem[d.turma] = (contagem[d.turma] || 0) + 1;
      });

      return Object.entries(contagem)
        .map(([turma_letra, count]) => ({ turma_letra, count }))
        .sort((a, b) => a.turma_letra.localeCompare(b.turma_letra));
    },
    enabled: !!profile?.institution_id,
    staleTime: 120000,
  });

  // Verificar quais turmas já tiveram observação enviada nesta semana
  const { data: observacoesFeitas = [] } = useQuery({
    queryKey: ['observacoes-feitas', profile?.id, faseAtual?.id, serieNumero, semanaAtual],
    queryFn: async () => {
      if (!profile?.id || !faseAtual?.id) return [];
      const { data } = await supabase
        .from('observacao_semanal')
        .select('turma, status')
        .eq('professor_id', profile.id)
        .eq('fase_id', faseAtual.id)
        .eq('serie', `${serieNumero}`)
        .eq('semana', semanaAtual);
      return data || [];
    },
    enabled: !!profile?.id && !!faseAtual?.id,
  });

  const getStatusTurma = (turmaLetra: string) => {
    const obs = observacoesFeitas.find(o => o.turma === turmaLetra);
    if (!obs) return 'pendente';
    return obs.status === 'enviada' ? 'enviada' : 'rascunho';
  };

  return (
    <div className="p-4 space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/professor/circulo')}
          className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-white">{serieNumero}° Ano</h1>
          <p className="text-xs text-white/40">Observação da Semana {semanaAtual}</p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <p className="text-xs text-blue-300">Todas as observações feitas aqui são para a <span className="font-bold">Semana {semanaAtual}</span> da fase atual.</p>
      </div>

      <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-1">
        Selecione a turma
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />)}
        </div>
      ) : turmas && turmas.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {turmas.map(turma => {
            const status = getStatusTurma(turma.turma_letra);
            const enviada = status === 'enviada';
            const rascunho = status === 'rascunho';

            return (
              <button
                key={turma.turma_letra}
                onClick={() => navigate(`/professor/circulo/serie/${serieNumero}/turma/${turma.turma_letra}`)}
                className={cn(
                  "p-5 rounded-xl text-center border transition-all active:scale-[0.97]",
                  enviada
                    ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/15"
                    : rascunho
                    ? "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15"
                    : "bg-[#252547] border-violet-500/10 hover:border-white/20 hover:bg-white/[0.06]"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-bold text-white">Turma {turma.turma_letra}</p>
                  {enviada && <Check className="w-5 h-5 text-green-400" />}
                </div>
                <p className={cn("text-xs mt-1", enviada ? "text-green-400/60" : rascunho ? "text-amber-400/60" : "text-white/40")}>
                  {turma.count} alunos
                  {enviada && ' · Observação enviada'}
                  {rascunho && ' · Rascunho salvo'}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
          <p className="text-white/40 text-sm">Nenhuma turma encontrada</p>
        </div>
      )}
    </div>
  );
};

export default CirculoTurmaPage;
