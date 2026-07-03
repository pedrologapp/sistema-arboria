import { useNavigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { Eye, ChevronRight, MessageSquare, AlertCircle, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const SERIES_F2 = [
  { numero: 6, label: '6º Ano' },
  { numero: 7, label: '7º Ano' },
  { numero: 8, label: '8º Ano' },
  { numero: 9, label: '9º Ano' },
];

const CirculoPage = () => {
  const { profile, faseAtual } = useProfessor();
  const navigate = useNavigate();
  const semanaAtual = faseAtual?.semana_atual || 1;

  // Buscar observações feitas por série nesta semana
  const { data: observacoesPorSerie = {} } = useQuery({
    queryKey: ['observacoes-por-serie', profile?.id, faseAtual?.id, semanaAtual],
    queryFn: async () => {
      if (!profile?.id || !faseAtual?.id) return {};
      const { data } = await supabase
        .from('observacao_semanal')
        .select('serie, turma, status')
        .eq('professor_id', profile.id)
        .eq('fase_id', faseAtual.id)
        .eq('semana', semanaAtual);

      // Agrupar por série: contar turmas com observação enviada
      const resultado: Record<number, { enviadas: number; rascunhos: number }> = {};
      (data || []).forEach(o => {
        const s = parseInt(o.serie);
        if (!resultado[s]) resultado[s] = { enviadas: 0, rascunhos: 0 };
        if (o.status === 'enviada') resultado[s].enviadas++;
        else resultado[s].rascunhos++;
      });
      return resultado;
    },
    enabled: !!profile?.id && !!faseAtual?.id,
  });

  // Buscar total de turmas por série
  const { data: turmasPorSerie = {} } = useQuery({
    queryKey: ['turmas-por-serie', profile?.institution_id],
    queryFn: async () => {
      if (!profile?.institution_id) return {};
      const { data } = await supabase
        .from('profiles')
        .select('serie, turma')
        .eq('institution_id', profile.institution_id)
        .eq('segmento', 'fundamental2')
        .not('casa_id', 'is', null)
        .not('turma', 'is', null);

      const resultado: Record<number, Set<string>> = {};
      (data || []).forEach(d => {
        const s = parseInt(d.serie || '0');
        if (!resultado[s]) resultado[s] = new Set();
        if (d.turma) resultado[s].add(d.turma);
      });

      const final: Record<number, number> = {};
      Object.entries(resultado).forEach(([s, turmas]) => {
        final[parseInt(s)] = turmas.size;
      });
      return final;
    },
    enabled: !!profile?.institution_id,
    staleTime: 120000,
  });

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Observar</h1>
        {faseAtual?.inteligencia && (
          <p className="text-xs text-white/30 mt-0.5">
            Fase {faseAtual.numero_fase}: {faseAtual.inteligencia.nome}
          </p>
        )}
      </div>

      {/* Info da semana */}
      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <p className="text-xs text-blue-300">Todas as observações feitas aqui são para a <span className="font-bold">Semana {semanaAtual}</span> da fase atual.</p>
      </div>

      {/* Observacao Semanal */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-violet-500" />
          <p className="text-[10px] font-semibold text-violet-400/80 uppercase tracking-widest">
            Observação Semanal. Semana {semanaAtual}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SERIES_F2.map((serie) => {
            const obs = observacoesPorSerie[serie.numero];
            const totalTurmas = turmasPorSerie[serie.numero] || 0;
            const enviadas = obs?.enviadas || 0;
            const rascunhos = obs?.rascunhos || 0;
            const todasFeitas = totalTurmas > 0 && enviadas >= totalTurmas;

            return (
              <button
                key={serie.numero}
                onClick={() => navigate(`/professor/circulo/serie/${serie.numero}`)}
                className={cn(
                  "p-5 rounded-xl text-center border transition-all active:scale-[0.97]",
                  todasFeitas
                    ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/15"
                    : enviadas > 0 || rascunhos > 0
                    ? "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15"
                    : "bg-[#252547] border-violet-500/10 hover:border-violet-500/30 hover:bg-violet-500/[0.06]"
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <p className="text-3xl font-bold text-white">{serie.numero}°</p>
                  {todasFeitas && <Check className="w-5 h-5 text-green-400" />}
                </div>
                <p className="text-xs text-white/40 mt-1">ANO</p>
                {totalTurmas > 0 && (
                  <p className={cn("text-[10px] mt-1.5 font-medium",
                    todasFeitas ? "text-green-400/70" : enviadas > 0 ? "text-amber-400/70" : "text-white/25"
                  )}>
                    {enviadas}/{totalTurmas} {totalTurmas === 1 ? 'turma' : 'turmas'}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quer relatar algo? */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-cyan-500" />
          <p className="text-[10px] font-semibold text-cyan-400/80 uppercase tracking-widest">
            Relato do Professor
          </p>
        </div>

        <button
          onClick={() => navigate('/professor/circulo/relato')}
          className="w-full flex items-center gap-4 p-4 rounded-xl text-left
            bg-[#252547] border border-violet-500/10
            hover:border-cyan-500/30 hover:bg-cyan-500/[0.06]
            transition-all active:scale-[0.98]"
        >
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(6,182,212,0.12)' }}>
            <MessageSquare className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            <p className="text-white/90 text-sm font-medium">Quer relatar algo?</p>
            <p className="text-white/35 text-[11px] mt-0.5">Escreva um relato e vincule a um aluno</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20" />
        </button>
      </div>

      {/* Reportes dos alunos */}
      <ReportesQuickView navigate={navigate} />
    </div>
  );
};

// Preview dos reportes abertos
const ReportesQuickView = ({ navigate }: { navigate: (path: string) => void }) => {
  const { data: abertos = 0 } = useQuery({
    queryKey: ['reportes-abertos-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('reportes_mentor')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aberto');
      return count || 0;
    },
    staleTime: 60000,
  });

  if (abertos === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-1 h-3.5 rounded-full bg-red-500" />
        <p className="text-[10px] font-semibold text-red-400/80 uppercase tracking-widest">
          Reportes dos Alunos
        </p>
      </div>

      <button
        onClick={() => navigate('/professor/reportes')}
        className="w-full flex items-center gap-4 p-4 rounded-xl text-left
          bg-[#252547] border border-red-500/15
          hover:border-red-500/30 hover:bg-red-500/[0.06]
          transition-all active:scale-[0.98]"
      >
        <div className="p-2.5 rounded-lg bg-red-500/12">
          <AlertCircle className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1">
          <p className="text-white/90 text-sm font-medium">{abertos} reporte{abertos > 1 ? 's' : ''} aberto{abertos > 1 ? 's' : ''}</p>
          <p className="text-white/35 text-[11px] mt-0.5">Alunos reportaram algo ao mentor</p>
        </div>
        <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
          {abertos}
        </span>
      </button>
    </div>
  );
};

export default CirculoPage;
