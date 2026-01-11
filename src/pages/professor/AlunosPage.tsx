import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Trophy } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAlunosCasa } from '@/hooks/useAlunosCasa';
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
  const { casaMentor, casaColor } = useProfessor();
  const { data: alunos, isLoading } = useAlunosCasa();
  const { bannerComeceAqui } = useAlertasAlunos();

  // Estados de filtro
  const [serieFiltro, setSerieFiltro] = useState<string | null>(null);
  const [turmaFiltro, setTurmaFiltro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Séries e turmas FIXAS
  const seriesDisponiveis = ['6º', '7º', '8º', '9º'];
  const turmasDisponiveis = ['A', 'B', 'C'];

  // Filtrar e ordenar alunos por pontuação (ranking)
  const alunosFiltrados = useMemo(() => {
    if (!alunos) return [];

    return alunos
      .filter(aluno => {
        if (serieFiltro && !aluno.serie.startsWith(serieFiltro)) return false;
        if (turmaFiltro && aluno.turma !== turmaFiltro) return false;
        if (busca && !aluno.nome.toLowerCase().includes(busca.toLowerCase())) return false;
        return true;
      })
      // Ordenar por pontuação DECRESCENTE, depois por nome A-Z
      .sort((a, b) => {
        if (b.pontosTotais !== a.pontosTotais) {
          return b.pontosTotais - a.pontosTotais;
        }
        return a.nome.localeCompare(b.nome);
      });
  }, [alunos, serieFiltro, turmaFiltro, busca]);

  const handleChatClick = () => {
    navigate('/professor/chat');
  };

  const handleAlunoClick = (alunoId: string) => {
    navigate(`/professor/alunos/${alunoId}`);
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
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs uppercase tracking-wider w-12 flex-shrink-0">
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
              {busca || serieFiltro || turmaFiltro
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

      {/* Modal de alunos sem observação */}
      {bannerComeceAqui && (
        <AlunosSemObservacaoModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          faseNome={bannerComeceAqui.faseNome}
          faseEmoji={bannerComeceAqui.faseEmoji}
          alunos={bannerComeceAqui.alunos}
          onAlunoClick={handleAlunoClick}
        />
      )}
    </div>
  );
};

export default AlunosPage;
