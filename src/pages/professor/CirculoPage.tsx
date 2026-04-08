import { useNavigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { Eye, FileText, ChevronRight } from 'lucide-react';

const SERIES_F2 = [
  { numero: 6, label: '6o Ano' },
  { numero: 7, label: '7o Ano' },
  { numero: 8, label: '8o Ano' },
  { numero: 9, label: '9o Ano' },
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
              <p className="text-3xl font-bold text-white">{serie.numero}o</p>
              <p className="text-xs text-white/40 mt-1">ANO</p>
            </button>
          ))}
        </div>

        <p className="text-[10px] text-white/20 text-center mt-2">
          Selecione a serie para registrar a observacao da semana
        </p>
      </div>

      {/* Observacao Pessoal */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-amber-500" />
          <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-widest">
            Observacao Pessoal
          </p>
        </div>

        <button
          onClick={() => navigate('/professor/circulo/pessoal')}
          className="w-full flex items-center gap-4 p-4 rounded-xl text-left
            bg-[#252547] border border-violet-500/10
            hover:border-amber-500/30 hover:bg-amber-500/[0.06]
            transition-all active:scale-[0.98]"
        >
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
            <FileText className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-white/90 text-sm font-medium">Registrar observacao avulsa</p>
            <p className="text-white/35 text-[11px] mt-0.5">Relatar algo sobre um aluno fora do contexto da aula</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20" />
        </button>
      </div>
    </div>
  );
};

export default CirculoPage;
