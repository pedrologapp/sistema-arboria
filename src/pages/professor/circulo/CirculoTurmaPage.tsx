import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const CirculoTurmaPage = () => {
  const { serie } = useParams<{ serie: string }>();
  const { profile } = useProfessor();
  const navigate = useNavigate();

  const serieNumero = parseInt(serie || '6');

  const { data: turmas, isLoading } = useQuery({
    queryKey: ['circulo-turmas', profile?.institution_id, serieNumero],
    queryFn: async () => {
      if (!profile?.institution_id) return [];

      // Buscar turmas diretamente de profiles (mesma fonte que missoes)
      const { data, error } = await supabase
        .from('profiles')
        .select('turma')
        .eq('institution_id', profile.institution_id)
        .eq('segmento', 'fundamental2')
        .ilike('serie', `%${serieNumero}%`)
        .not('casa_id', 'is', null)
        .not('turma', 'is', null);

      if (error) throw error;

      // Agrupar e contar por turma
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

  return (
    <div className="p-4 space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/professor/circulo')}
          className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-white">{serieNumero}o Ano</h1>
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
          {turmas.map(turma => (
            <button
              key={turma.turma_letra}
              onClick={() => navigate(`/professor/circulo/serie/${serieNumero}/turma/${turma.turma_letra}`)}
              className="p-5 rounded-xl text-center bg-[#252547] border border-violet-500/10
                hover:border-white/20 hover:bg-white/[0.06] transition-all active:scale-[0.97]"
            >
              <p className="text-2xl font-bold text-white">Turma {turma.turma_letra}</p>
              <p className="text-xs text-white/40 mt-1">{turma.count} alunos</p>
            </button>
          ))}
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
