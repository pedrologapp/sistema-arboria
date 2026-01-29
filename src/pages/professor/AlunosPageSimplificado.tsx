import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAlunosTurmasComStatus, type AlunoComStatusTurma } from '@/hooks/useAlunosTurmasComStatus';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const accentColor = '#6366f1';

// ============ HELPERS ============

const getStatusColor = (status: AlunoComStatusTurma['status']) => {
  switch (status) {
    case 'com_observacao':
      return '#22C55E'; // Verde - tem observações
    case 'sem_observacao':
      return '#6B7280'; // Cinza - sem observações
    default:
      return '#6B7280';
  }
};

const getAbreviatedName = (nome: string) => {
  const parts = nome.split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

const getIniciais = (nome: string) => {
  const parts = nome.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase();
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

      {/* Grid de Alunos */}
      {isLoading ? (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 p-1.5">
              <Skeleton className="w-14 h-14 rounded-full" />
              <Skeleton className="w-12 h-3 rounded" />
            </div>
          ))}
        </div>
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
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {alunosFiltrados.map((aluno) => {
            const statusColor = getStatusColor(aluno.status);
            const nomeAbreviado = getAbreviatedName(aluno.nome);
            const iniciais = getIniciais(aluno.nome);

            return (
              <button
                key={aluno.id}
                onClick={() => handleAlunoClick(aluno.id)}
                className="flex flex-col items-center gap-1 p-1.5 rounded-xl
                  hover:bg-white/5 transition-all duration-200 
                  active:scale-95 group"
              >
                <div className="relative">
                  <Avatar className="h-14 w-14 ring-2 ring-transparent group-hover:ring-white/20 transition-all">
                    <AvatarImage src={aluno.avatarUrl} className="object-cover" />
                    <AvatarFallback 
                      className="text-white text-base font-semibold"
                      style={{ backgroundColor: `${accentColor}40` }}
                    >
                      {iniciais}
                    </AvatarFallback>
                  </Avatar>
                  {/* Bolinha de status */}
                  <div 
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0d0d0d]"
                    style={{ backgroundColor: statusColor }}
                  />
                </div>
                <span className="text-white/80 text-xs font-medium text-center leading-tight">
                  {nomeAbreviado}
                </span>
              </button>
            );
          })}
        </div>
      )}

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
