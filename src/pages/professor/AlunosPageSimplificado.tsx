import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, ChevronRight } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAlunosTurmas } from '@/hooks/useAlunosTurmas';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

const AlunosPageSimplificado = () => {
  const navigate = useNavigate();
  const { turmasVinculadas, segmento } = useProfessor();
  const { data: alunos, isLoading } = useAlunosTurmas();

  // Estados de filtro
  const [turmaFiltro, setTurmaFiltro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const accentColor = '#6366f1';

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
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alunos, turmaFiltro, busca]);

  const handleAlunoClick = (alunoId: string) => {
    // Para Infantil/F1, vai direto para registro de observação
    navigate(`/professor/circulo/aluno/${alunoId}`);
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
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-1" />
                <Skeleton className="h-3 w-16" />
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
            <button
              key={aluno.id}
              onClick={() => handleAlunoClick(aluno.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl
                bg-gradient-to-r from-white/[0.06] to-white/[0.02]
                border border-white/10 hover:border-white/20
                transition-all duration-200 active:scale-[0.98]"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={aluno.avatarUrl} />
                <AvatarFallback 
                  className="text-white text-sm font-medium"
                  style={{ backgroundColor: `${accentColor}30` }}
                >
                  {aluno.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <span className="text-white font-medium block">{aluno.nome}</span>
                <span className="text-white/50 text-xs">
                  {aluno.serie} {aluno.turma} • {aluno.turmaNome}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </button>
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
