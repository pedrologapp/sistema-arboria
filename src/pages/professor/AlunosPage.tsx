import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAlunosCasa } from '@/hooks/useAlunosCasa';
import { CasaBrasao } from '@/components/CasaBrasao';
import { ChatCasaCard } from '@/components/professor/ChatCasaCard';
import { AlunoStatusLinha } from '@/components/professor/AlunoStatusLinha';
import { Skeleton } from '@/components/ui/skeleton';

type StatusFiltro = 'destaque' | 'regular' | 'risco' | null;

const AlunosPage = () => {
  const navigate = useNavigate();
  const { casaMentor, casaColor } = useProfessor();
  const { data: alunos, isLoading } = useAlunosCasa();

  // Estados de filtro
  const [serieFiltro, setSerieFiltro] = useState<string | null>(null);
  const [turmaFiltro, setTurmaFiltro] = useState<string | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>(null);
  const [busca, setBusca] = useState('');

  // Séries e turmas FIXAS (sempre visíveis independente dos alunos)
  const seriesDisponiveis = ['6º', '7º', '8º', '9º'];
  const turmasDisponiveis = ['A', 'B', 'C'];

  // Filtrar alunos
  const alunosFiltrados = useMemo(() => {
    if (!alunos) return [];

    return alunos.filter(aluno => {
      if (serieFiltro && aluno.serie !== serieFiltro) return false;
      if (turmaFiltro && aluno.turma !== turmaFiltro) return false;
      if (statusFiltro && aluno.status !== statusFiltro) return false;
      if (busca && !aluno.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [alunos, serieFiltro, turmaFiltro, statusFiltro, busca]);

  // Contadores por status
  const contadores = useMemo(() => {
    if (!alunos) return { destaque: 0, regular: 0, risco: 0 };
    
    return {
      destaque: alunos.filter(a => a.status === 'destaque').length,
      regular: alunos.filter(a => a.status === 'regular').length,
      risco: alunos.filter(a => a.status === 'risco').length
    };
  }, [alunos]);

  const handleChatClick = () => {
    navigate('/professor/chat');
  };

  const handleAlunoClick = (alunoId: string) => {
    navigate(`/professor/alunos/${alunoId}`);
  };

  return (
    <div className="space-y-6 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: casaColor }} strokeWidth={1.5} />
            Alunos da Casa
          </h1>
          {casaMentor && (
            <p className="text-sm text-white/50 font-light flex items-center gap-1.5 mt-1">
              <CasaBrasao 
                brasaoUrl={casaMentor.brasao_url}
                emoji={casaMentor.emoji}
                nome={casaMentor.nome}
                size="mini"
              />
              Casa {casaMentor.nome} • {alunos?.length || 0} alunos
            </p>
          )}
        </div>
      </div>

      {/* Card de Chat da Casa */}
      {casaMentor && (
        <ChatCasaCard
          casaNome={casaMentor.nome}
          casaColor={casaColor}
          novasMensagens={0}
          onClick={handleChatClick}
        />
      )}

      {/* Seção de Filtros */}
      <div 
        className="p-4 rounded-xl space-y-4
          bg-gradient-to-r from-white/[0.04] to-transparent
          border border-white/5"
      >
        {/* Filtro por Série */}
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2 font-medium">Série</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSerieFiltro(null)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                serieFiltro === null
                  ? 'text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
              style={serieFiltro === null ? { backgroundColor: casaColor } : undefined}
            >
              Todas
            </button>
            {seriesDisponiveis.map(serie => (
              <button
                key={serie}
                onClick={() => setSerieFiltro(serie)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  serieFiltro === serie
                    ? 'text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
                style={serieFiltro === serie ? { backgroundColor: casaColor } : undefined}
              >
                {serie}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro por Turma */}
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2 font-medium">Turma</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setTurmaFiltro(null)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                turmaFiltro === null
                  ? 'text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
              style={turmaFiltro === null ? { backgroundColor: casaColor } : undefined}
            >
              Todas
            </button>
            {turmasDisponiveis.map(turma => (
              <button
                key={turma}
                onClick={() => setTurmaFiltro(turma)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  turmaFiltro === turma
                    ? 'text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
                style={turmaFiltro === turma ? { backgroundColor: casaColor } : undefined}
              >
                {turma}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro por Status */}
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2 font-medium">Status</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFiltro(null)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                statusFiltro === null
                  ? 'text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
              style={statusFiltro === null ? { backgroundColor: casaColor } : undefined}
            >
              Todos ({alunos?.length || 0})
            </button>
            <button
              onClick={() => setStatusFiltro('destaque')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                statusFiltro === 'destaque'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
              }`}
            >
              ⭐ Destaque ({contadores.destaque})
            </button>
            <button
              onClick={() => setStatusFiltro('regular')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                statusFiltro === 'regular'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
              }`}
            >
              📊 Regular ({contadores.regular})
            </button>
            <button
              onClick={() => setStatusFiltro('risco')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                statusFiltro === 'risco'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
              }`}
            >
              ⚠️ Em Risco ({contadores.risco})
            </button>
          </div>
        </div>
      </div>

      {/* Campo de Busca */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Buscar aluno..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                     text-white text-sm placeholder:text-white/40 
                     focus:outline-none focus:border-white/20 transition-colors"
          style={{
            boxShadow: busca ? `0 0 0 1px ${casaColor}30` : undefined
          }}
        />
      </div>

      {/* Lista de Alunos */}
      <div className="space-y-2">
        {isLoading ? (
          // Loading state
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="w-2.5 h-2.5 rounded-full" />
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : alunosFiltrados.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${casaColor}15` }}
            >
              <Users size={32} style={{ color: casaColor }} strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Nenhum aluno encontrado
            </h2>
            <p className="text-white/50 text-sm max-w-xs font-light">
              {busca || serieFiltro || turmaFiltro || statusFiltro
                ? 'Tente ajustar os filtros de busca'
                : 'Não há alunos cadastrados nesta casa'
              }
            </p>
          </div>
        ) : (
          // Lista de alunos
          alunosFiltrados.map(aluno => (
            <AlunoStatusLinha
              key={aluno.id}
              aluno={aluno}
              casaColor={casaColor}
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

export default AlunosPage;
