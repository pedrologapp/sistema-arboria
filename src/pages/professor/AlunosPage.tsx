import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAlunosCasa } from '@/hooks/useAlunosCasa';
import { useAlertasAlunos } from '@/hooks/useAlertasAlunos';
import { ChatCasaCard } from '@/components/professor/ChatCasaCard';
import { AlertBoxes } from '@/components/professor/AlertBoxes';
import { BannerComeceAqui } from '@/components/professor/BannerComeceAqui';
import { AlunosSemObservacaoModal } from '@/components/professor/AlunosSemObservacaoModal';
import { AlunoStatusLinha } from '@/components/professor/AlunoStatusLinha';
import { Skeleton } from '@/components/ui/skeleton';

const AlunosPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { casaMentor, casaColor, profile } = useProfessor();
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

  // Buscar canais da casa mentor para badge de notificação
  const { data: canais } = useQuery({
    queryKey: ['canais-casa-badge', casaMentor?.id],
    queryFn: async () => {
      if (!casaMentor?.id || !profile?.institution_id) return [];
      
      const { data, error } = await supabase
        .from('canais_casa')
        .select('id')
        .eq('casa_id', casaMentor.id)
        .eq('institution_id', profile.institution_id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });

  // Buscar última leitura do professor em cada canal
  const { data: leituras } = useQuery({
    queryKey: ['leituras-canais-badge', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('canal_leituras')
        .select('canal_id, ultima_leitura')
        .eq('usuario_id', profile.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  // Calcular total de mensagens não lidas nos canais
  const { data: totalCanaisNaoLidas = 0 } = useQuery({
    queryKey: ['total-canais-nao-lidas-badge', canais, leituras],
    queryFn: async () => {
      if (!canais || canais.length === 0) return 0;
      
      let total = 0;
      
      for (const canal of canais) {
        const leitura = leituras?.find(l => l.canal_id === canal.id);
        const ultimaLeitura = leitura?.ultima_leitura || '1970-01-01T00:00:00Z';
        
        const { count, error } = await supabase
          .from('mensagens_canal')
          .select('*', { count: 'exact', head: true })
          .eq('canal_id', canal.id)
          .gt('created_at', ultimaLeitura);
        
        if (!error && count !== null) {
          total += count;
        }
      }
      
      return total;
    },
    enabled: !!canais && canais.length > 0
  });

  // Calcular DMs não lidas do professor
  const { data: totalDmsNaoLidas = 0 } = useQuery({
    queryKey: ['total-dms-nao-lidas-badge', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      
      const { data: participacoes, error } = await supabase
        .from('conversa_participantes')
        .select(`
          conversa_id,
          ultima_leitura,
          conversas_privadas!inner(id, updated_at)
        `)
        .eq('usuario_id', profile.id);
      
      if (error) return 0;
      
      let count = 0;
      for (const part of participacoes || []) {
        const ultimaLeitura = part.ultima_leitura ? new Date(part.ultima_leitura).getTime() : 0;
        const updatedAt = part.conversas_privadas?.updated_at 
          ? new Date(part.conversas_privadas.updated_at).getTime() 
          : 0;
        
        if (updatedAt > ultimaLeitura) {
          count++;
        }
      }
      
      return count;
    },
    enabled: !!profile?.id
  });

  // Total de mensagens não lidas (canais + DMs)
  const totalNaoLidas = totalCanaisNaoLidas + totalDmsNaoLidas;

  // Realtime para atualizar badges
  useEffect(() => {
    if (!casaMentor?.id) return;

    const channel = supabase
      .channel('alunos-page-chat-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens_canal'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['total-canais-nao-lidas-badge'] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens_privadas'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['total-dms-nao-lidas-badge'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [casaMentor?.id, queryClient]);

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
          novasMensagens={totalNaoLidas}
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
