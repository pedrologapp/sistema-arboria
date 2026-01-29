import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, ChevronRight } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAlunosTurmasComStatus, type AlunoComStatusTurma } from '@/hooks/useAlunosTurmasComStatus';
import { Skeleton } from '@/components/ui/skeleton';

const accentColor = '#6366f1';

// ============ COMPONENTE DE LINHA DO ALUNO ============

interface AlunoStatusLinhaSimplificadoProps {
  aluno: AlunoComStatusTurma;
  onClick: () => void;
}

const getStatusColor = (status: AlunoComStatusTurma['status']) => {
  switch (status) {
    case 'com_observacao':
      return '#22C55E'; // Verde - tem observações
    case 'sem_observacao':
      return '#6B7280'; // Cinza - sem observações
    default:
      return '#6B7280'; // Cinza
  }
};

const AlunoStatusLinhaSimplificado = ({ aluno, onClick }: AlunoStatusLinhaSimplificadoProps) => {
  const statusColor = getStatusColor(aluno.status);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-2.5 px-3 
        hover:bg-white/5 rounded-lg transition-colors group"
    >
      {/* Avatar com bolinha de status */}
      <div className="relative flex-shrink-0">
        {aluno.avatarUrl ? (
          <img 
            src={aluno.avatarUrl} 
            alt={aluno.nome}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ backgroundColor: `${accentColor}40` }}
          >
            {aluno.nome.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Bolinha de status */}
        <div 
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0d0d]"
          style={{ backgroundColor: statusColor }}
        />
      </div>
      
      {/* Nome + Série/Turma (em linha) */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-white text-sm font-medium truncate">
          {aluno.nome}
        </span>
        <span className="text-white/40 text-xs flex-shrink-0">
          {aluno.serie} {aluno.turma}
        </span>
      </div>
      
      {/* Seta */}
      <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors" />
    </button>
  );
};

// ============ PÁGINA PRINCIPAL ============

const AlunosPageSimplificado = () => {
  const navigate = useNavigate();
  const { turmasVinculadas, segmento } = useProfessor();
  const { data: alunos, isLoading } = useAlunosTurmasComStatus();

  // Estados de filtro
  const [turmaFiltro, setTurmaFiltro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  // Label do segmento
  const segmentoLabel = segmento === 'infantil' ? 'Educação Infantil' : 
                         segmento === 'fundamental1' ? 'Fundamental 1' : '';

  // Filtrar alunos
  const alunosFiltrados = useMemo(() => {
    if (!alunos) return [];

    return alunos
      .filter(aluno => {
        if (turmaFiltro && aluno.turmaId !== turmaFiltro) return false;
        if (busca && !aluno.nome.toLowerCase().includes(busca.toLowerCase())) return false;
        return true;
      });
    // Já vem ordenado pelo hook
  }, [alunos, turmaFiltro, busca]);

  const handleAlunoClick = (alunoId: string) => {
    navigate(`/professor/alunos/${alunoId}`);
  };

  return (
    <div className="space-y-4 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: accentColor }} strokeWidth={1.5} />
            Meus Alunos
          </h1>
          <p className="text-sm text-white/50 font-light mt-1">
            {segmentoLabel} • {alunos?.length || 0} alunos
          </p>
        </div>
      </div>

      {/* Filtro por Turma */}
      {turmasVinculadas && turmasVinculadas.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs uppercase tracking-wider w-12 flex-shrink-0">
            Turma
          </span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setTurmaFiltro(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                turmaFiltro === null
                  ? 'text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
              style={turmaFiltro === null ? { backgroundColor: accentColor } : undefined}
            >
              Todas
            </button>
            {turmasVinculadas.map(turma => (
              <button
                key={turma.id}
                onClick={() => setTurmaFiltro(turma.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  turmaFiltro === turma.id
                    ? 'text-white'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                }`}
                style={turmaFiltro === turma.id ? { backgroundColor: accentColor } : undefined}
              >
                {turma.serie}º {turma.turma_letra}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Campo de Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Buscar aluno..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg 
                     text-white text-sm placeholder:text-white/30 
                     focus:outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {/* Lista de Alunos */}
      <div className="space-y-0.5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 px-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))
        ) : alunosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <Users size={32} style={{ color: accentColor }} strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Nenhum aluno encontrado
            </h2>
            <p className="text-white/50 text-sm max-w-xs font-light">
              {busca || turmaFiltro
                ? 'Tente ajustar os filtros de busca'
                : 'Não há alunos nas suas turmas'
              }
            </p>
          </div>
        ) : (
          alunosFiltrados.map((aluno) => (
            <AlunoStatusLinhaSimplificado
              key={aluno.id}
              aluno={aluno}
              onClick={() => handleAlunoClick(aluno.id)}
            />
          ))
        )}
      </div>

      {/* Contador de resultados */}
      {!isLoading && alunosFiltrados.length > 0 && (
        <p className="text-center text-white/30 text-xs font-light">
          {alunosFiltrados.length} de {alunos?.length} alunos
        </p>
      )}
    </div>
  );
};

export default AlunosPageSimplificado;
