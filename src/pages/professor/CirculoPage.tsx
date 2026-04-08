import { useNavigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { Eye, ChevronRight, MessageSquare, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SERIES_F2 = [
  { numero: 6, label: '6º Ano' },
  { numero: 7, label: '7º Ano' },
  { numero: 8, label: '8º Ano' },
  { numero: 9, label: '9º Ano' },
];

const CirculoPage = () => {
  const { faseAtual } = useProfessor();
  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Observar</h1>
        {faseAtual?.inteligencia && (
          <p className="text-xs text-white/30 mt-0.5">
            Fase {faseAtual.numero_fase} — {faseAtual.inteligencia.nome} — Semana {faseAtual.semana_atual || 1}
          </p>
        )}
      </div>

      {/* Observacao Semanal */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-violet-500" />
          <p className="text-[10px] font-semibold text-violet-400/80 uppercase tracking-widest">
            Observacao Semanal
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SERIES_F2.map((serie) => (
            <button
              key={serie.numero}
              onClick={() => navigate(`/professor/circulo/serie/${serie.numero}`)}
              className="p-5 rounded-xl text-center bg-[#252547] border border-violet-500/10
                hover:border-violet-500/30 hover:bg-violet-500/[0.06]
                transition-all active:scale-[0.97]"
            >
              <p className="text-3xl font-bold text-white">{serie.numero}º</p>
              <p className="text-xs text-white/40 mt-1">ANO</p>
            </button>
          ))}
        </div>

        <p className="text-[10px] text-white/20 text-center mt-2">
          Selecione a serie para registrar a observacao da semana
        </p>
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
