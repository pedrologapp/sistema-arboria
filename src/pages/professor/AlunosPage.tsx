import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Search, Trophy, Star } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAlunosComEstado, estadosFiltroConfig, type EstadoCalculado } from '@/hooks/useAlunosComEstado';
import { useAlertasAlunos } from '@/hooks/useAlertasAlunos';
import { CasaBrasao } from '@/components/CasaBrasao';
import { ChatCasaCard } from '@/components/professor/ChatCasaCard';
import { AlertBoxes } from '@/components/professor/AlertBoxes';
import { BannerComeceAqui } from '@/components/professor/BannerComeceAqui';
import { AlunosSemObservacaoModal } from '@/components/professor/AlunosSemObservacaoModal';
import { AlunoStatusLinha } from '@/components/professor/AlunoStatusLinha';
import { Skeleton } from '@/components/ui/skeleton';

const AlunosPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { casaMentor, casaColor } = useProfessor();
  const { data: alunos, isLoading } = useAlunosComEstado();
  const { bannerComeceAqui } = useAlertasAlunos();

  // Estados de filtro
  const [serieFiltro, setSerieFiltro] = useState<string | null>(null);
  const [turmaFiltro, setTurmaFiltro] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Ler filtro de estado da URL (para navegação do grid 2x2)
  useEffect(() => {
    const estadoParam = searchParams.get('estado');
    if (estadoParam) {
      setEstadoFiltro(estadoParam);
      // Limpar URL após aplicar
      searchParams.delete('estado');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Séries e turmas FIXAS
  const seriesDisponiveis = ['6º', '7º', '8º', '9º'];
  const turmasDisponiveis = ['A', 'B', 'C'];

  // Filtrar base (sem estado) para contagem
  const alunosFiltradosBase = useMemo(() => {
    if (!alunos) return [];

    return alunos.filter(aluno => {
      if (serieFiltro && !aluno.serie.startsWith(serieFiltro)) return false;
      if (turmaFiltro && aluno.turma !== turmaFiltro) return false;
      if (busca && !aluno.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [alunos, serieFiltro, turmaFiltro, busca]);

  // Contagem por estado (baseado nos filtros de série/turma/busca)
  const contagemPorEstado = useMemo(() => {
    const contagem: Record<string, number> = { todos: alunosFiltradosBase.length };
    
    estadosFiltroConfig.forEach(config => {
      if (config.id) {
        contagem[config.id] = alunosFiltradosBase.filter(a => {
          // Agrupar primeira_obs e neutro com sem_observacao
          if (config.id === 'sem_observacao') {
            return ['sem_observacao', 'primeira_obs', 'neutro'].includes(a.estadoCalculado);
          }
          return a.estadoCalculado === config.id;
        }).length;
      }
    });
    
    return contagem;
  }, [alunosFiltradosBase]);

  // Filtrar e ordenar alunos por pontuação (ranking) + estado
  const alunosFiltrados = useMemo(() => {
    let filtrados = alunosFiltradosBase;

    // Aplicar filtro de estado
    if (estadoFiltro) {
      filtrados = filtrados.filter(aluno => {
        // Agrupar primeira_obs e neutro com sem_observacao
        if (estadoFiltro === 'sem_observacao') {
          return ['sem_observacao', 'primeira_obs', 'neutro'].includes(aluno.estadoCalculado);
        }
        return aluno.estadoCalculado === estadoFiltro;
      });
    }

    // Ordenar por pontuação DECRESCENTE, depois por nome A-Z
    return filtrados.sort((a, b) => {
      if (b.pontosTotais !== a.pontosTotais) {
        return b.pontosTotais - a.pontosTotais;
      }
      return a.nome.localeCompare(b.nome);
    });
  }, [alunosFiltradosBase, estadoFiltro]);

  const handleChatClick = () => {
    navigate('/professor/chat');
  };

  const handleAlunoClick = (alunoId: string) => {
    navigate(`/professor/alunos/${alunoId}`);
  };

  // Atalho: ir direto para registro de observação (usado pelo banner "Seu olhar importa")
  const handleAlunoObservarDireto = (alunoId: string) => {
    navigate(`/professor/circulo/aluno/${alunoId}`);
  };

  return (
    <div className="space-y-4 pt-4 pb-24">
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

      {/* Banner "Comece por aqui" */}
      {bannerComeceAqui && (
        <BannerComeceAqui
          faseNome={bannerComeceAqui.faseNome}
          faseEmoji={bannerComeceAqui.faseEmoji}
          quantidade={bannerComeceAqui.quantidade}
          onVerLista={() => setModalOpen(true)}
        />
      )}

      {/* Sistema de Alertas */}
      <AlertBoxes onAlunoClick={handleAlunoClick} />

      {/* Card de Chat da Casa */}
      {casaMentor && (
        <ChatCasaCard
          casaNome={casaMentor.nome}
          casaColor={casaColor}
          novasMensagens={0}
          onClick={handleChatClick}
        />
      )}

      {/* Título do Ranking */}
      <div className="flex items-center gap-2 pt-2">
        <Trophy className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />
        <span className="text-white/40 text-xs uppercase tracking-wider font-medium">
          Ranking de Pontos
        </span>
      </div>

      {/* Seção de Filtros */}
      <div className="space-y-3">
        {/* Série */}
        <div className="space-y-1.5">
          <span className="text-white/40 text-xs uppercase tracking-wider">
            Série
          </span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSerieFiltro(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                serieFiltro === null
                  ? 'text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
              style={serieFiltro === null ? { backgroundColor: casaColor } : undefined}
            >
              Todas
            </button>
            {seriesDisponiveis.map(serie => (
              <button
                key={serie}
                onClick={() => setSerieFiltro(serie)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  serieFiltro === serie
                    ? 'text-white'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                }`}
                style={serieFiltro === serie ? { backgroundColor: casaColor } : undefined}
              >
                {serie}
              </button>
            ))}
          </div>
        </div>

        {/* Turma */}
        <div className="space-y-1.5">
          <span className="text-white/40 text-xs uppercase tracking-wider">
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
              style={turmaFiltro === null ? { backgroundColor: casaColor } : undefined}
            >
              Todas
            </button>
            {turmasDisponiveis.map(turma => (
              <button
                key={turma}
                onClick={() => setTurmaFiltro(turma)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  turmaFiltro === turma
                    ? 'text-white'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                }`}
                style={turmaFiltro === turma ? { backgroundColor: casaColor } : undefined}
              >
                {turma}
              </button>
            ))}
          </div>
        </div>

        {/* Estado */}
        <div className="space-y-1.5">
          <span className="text-white/40 text-xs uppercase tracking-wider">
            Estado
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {estadosFiltroConfig.map(config => {
              const isSelected = estadoFiltro === config.id;
              const count = config.id ? contagemPorEstado[config.id] : contagemPorEstado.todos;
              
              return (
                <button
                  key={config.id || 'todos'}
                  onClick={() => setEstadoFiltro(config.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium 
                    flex items-center gap-1.5 transition-colors ${
                    isSelected
                      ? 'text-white border'
                      : 'bg-gray-700/50 text-white/70 hover:bg-gray-600/50'
                  }`}
                  style={isSelected ? {
                    backgroundColor: config.corFundo,
                    borderColor: config.cor
                  } : undefined}
                >
                  {/* Ícone (bolinha ou estrela) */}
                  {config.icone === 'circle' && (
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.cor }}
                    />
                  )}
                  {config.icone === 'circle-empty' && (
                    <span 
                      className="w-2 h-2 rounded-full border"
                      style={{ borderColor: config.cor }}
                    />
                  )}
                  {config.icone === 'star' && (
                    <Star 
                      className="w-3 h-3" 
                      style={{ color: config.cor }} 
                      fill={config.cor} 
                      strokeWidth={0}
                    />
                  )}
                  
                  {/* Texto do filtro */}
                  <span>{config.label}</span>
                  
                  {/* Contagem */}
                  <span className={isSelected ? 'text-white/60' : 'text-white/40'}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

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

      {/* Lista de Alunos (Ranking) */}
      <div className="space-y-0.5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 px-3">
              <Skeleton className="w-6 h-4" />
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : alunosFiltrados.length === 0 ? (
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
              {busca || serieFiltro || turmaFiltro || estadoFiltro
                ? 'Tente ajustar os filtros de busca'
                : 'Não há alunos cadastrados nesta casa'
              }
            </p>
          </div>
        ) : (
          alunosFiltrados.map((aluno, index) => (
            <AlunoStatusLinha
              key={aluno.id}
              posicao={index + 1}
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

      {/* Modal de alunos sem observação - vai DIRETO para registro */}
      {bannerComeceAqui && (
        <AlunosSemObservacaoModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          faseNome={bannerComeceAqui.faseNome}
          faseEmoji={bannerComeceAqui.faseEmoji}
          alunos={bannerComeceAqui.alunos}
          onAlunoClick={handleAlunoObservarDireto}
        />
      )}
    </div>
  );
};

export default AlunosPage;
