import { useState, useMemo } from 'react';
import { ArrowLeft, ChevronRight, Eye } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CasaBrasao } from '@/components/CasaBrasao';
import MissaoDetalhesModal from '@/components/professor/MissaoDetalhesModal';

type StatusAluno = 'completou' | 'aguardando' | 'pendente' | 'sem_missao';

interface AlunoComStatus {
  id: string;
  nome: string;
  sobrenome: string | null;
  serie: string | null;
  turma: string | null;
  avatar_url: string | null;
  status: StatusAluno;
  entregou: number;
  total: number;
}

interface Inteligencia {
  id: number;
  nome: string;
  emoji: string;
  cor_hex: string;
  brasao_url: string | null;
}

const AlunosPorTipoPage = () => {
  const { serie, semana, casaId } = useParams<{ serie: string; semana: string; casaId?: string }>();
  const navigate = useNavigate();
  const { casaMentor, casaColor, profile } = useProfessor();
  const [turmaFiltro, setTurmaFiltro] = useState<string>('todas');
  const [showMissaoModal, setShowMissaoModal] = useState(false);

  // Detectar se é semana extra
  const isExtra = semana === 'extra';
  const semanaNumber = isExtra ? 0 : Number(semana);

  // Determina se é tipo geral ou individual
  const tipo = casaId ? 'individual' : 'geral';

  // Buscar dados da casa (se for individual)
  const { data: casaInfo } = useQuery({
    queryKey: ['casa-info', casaId],
    queryFn: async () => {
      if (!casaId) return null;
      const { data, error } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex, brasao_url')
        .eq('id', Number(casaId))
        .maybeSingle();
      if (error) throw error;
      return data as Inteligencia | null;
    },
    enabled: !!casaId
  });

  // Buscar alunos com status de missão
  const { data: alunosComStatus, isLoading } = useQuery({
    queryKey: ['alunos-status', profile?.institution_id, serie, semana, tipo, casaId, casaMentor?.id],
    queryFn: async (): Promise<{ alunos: AlunoComStatus[]; missaoIds: string[] }> => {
      if (!profile?.institution_id || !casaMentor?.id) return { alunos: [], missaoIds: [] };

      // 1. Buscar alunos — para missões gerais: todos da série; para individuais: só da casa
      let alunosQuery = supabase
        .from('profiles')
        .select('id, nome, sobrenome, serie, turma, avatar_url, casa_id')
        .eq('institution_id', profile.institution_id)
        .not('casa_id', 'is', null);

      // Se for individual, filtrar pela casa específica
      if (tipo === 'individual' && casaId) {
        alunosQuery = alunosQuery.eq('casa_id', Number(casaId));
      }

      // Filtrar por série
      if (serie) {
        alunosQuery = alunosQuery.ilike('serie', `%${serie}%`);
      }

      const { data: alunos, error: alunosError } = await alunosQuery;
      if (alunosError) throw alunosError;

      if (!alunos || alunos.length === 0) return { alunos: [], missaoIds: [] };

      // 2. Buscar missões da semana/tipo
      let missoesQuery = supabase
        .from('missoes')
        .select('id')
        .eq('institution_id', profile.institution_id)
        .eq('casa_id', casaMentor.id)
        .eq('semana', semanaNumber)
        .or(`serie_filtro.eq.${serie},serie_filtro.is.null`)
        .eq('tipo_missao', tipo);

      // Se for individual, filtrar pela inteligência cross
      if (tipo === 'individual' && casaId) {
        missoesQuery = missoesQuery.eq('inteligencia_cross', Number(casaId));
      }

      const { data: missoes, error: missoesError } = await missoesQuery;
      if (missoesError) throw missoesError;

      const missaoIds = missoes?.map(m => m.id) || [];

      // 3. Buscar entregas dessas missões
      let entregas: { aluno_id: string; missao_id: string; status: string | null; nota: number | null }[] = [];
      if (missaoIds.length > 0) {
        const { data, error: entregasError } = await supabase
          .from('entregas')
          .select('aluno_id, missao_id, status, nota')
          .in('missao_id', missaoIds);
        if (entregasError) throw entregasError;
        entregas = data || [];
      }

      // 4. Calcular status de cada aluno
      const totalMissoes = missaoIds.length;
      
      const resultado: AlunoComStatus[] = alunos.map(aluno => {
      const entregasAluno = entregas.filter(e => e.aluno_id === aluno.id);
      // Contar missões ÚNICAS entregues (ignorar múltiplas entregas da mesma missão)
      const missoesEntregues = new Set(entregasAluno.map(e => e.missao_id));
      const quantasEntregou = missoesEntregues.size;
        
        let status: StatusAluno;
        
        if (totalMissoes === 0) {
          status = 'sem_missao';
        } else if (quantasEntregou === totalMissoes) {
          const todasAvaliadas = entregasAluno.every(e => e.nota !== null);
          status = todasAvaliadas ? 'completou' : 'aguardando';
        } else if (quantasEntregou > 0) {
          status = 'aguardando'; // Parcial
        } else {
          status = 'pendente'; // Nenhuma entrega
        }

        return {
          id: aluno.id,
          nome: aluno.nome || '',
          sobrenome: aluno.sobrenome,
          serie: aluno.serie,
          turma: aluno.turma,
          avatar_url: aluno.avatar_url,
          status,
          entregou: quantasEntregou,
          total: totalMissoes
        };
      });

      // Ordenar: pendentes primeiro, depois aguardando, depois completou
      const alunosOrdenados = resultado.sort((a, b) => {
        const ordem: Record<StatusAluno, number> = { pendente: 0, aguardando: 1, completou: 2, sem_missao: 3 };
        return ordem[a.status] - ordem[b.status];
      });

      return { alunos: alunosOrdenados, missaoIds };
    },
    enabled: !!profile?.institution_id && !!casaMentor?.id && !!serie && !!semana
  });

  // Extrair missaoIds e alunos
  const alunos = alunosComStatus?.alunos ?? [];
  const missaoIds = alunosComStatus?.missaoIds ?? [];

  // Filtrar por turma
  const alunosFiltrados = useMemo(() => {
    if (!alunos.length) return [];
    if (turmaFiltro === 'todas') return alunos;
    return alunos.filter(a => a.turma === turmaFiltro);
  }, [alunos, turmaFiltro]);

  // Extrair turmas únicas para o filtro
  const turmasUnicas = useMemo(() => {
    if (!alunos.length) return [];
    const turmas = new Set(alunos.map(a => a.turma).filter(Boolean));
    return Array.from(turmas).sort() as string[];
  }, [alunos]);

  // Título do header
  const headerTitle = tipo === 'geral' 
    ? 'Geral' 
    : casaInfo?.nome || 'Carregando...';

  const cores: Record<StatusAluno, string> = {
    completou: 'bg-green-500',
    aguardando: 'bg-yellow-500',
    pendente: 'bg-red-500',
    sem_missao: 'bg-white/20'
  };

  const handleAlunoClick = (alunoId: string) => {
    const origem = tipo === 'geral' ? 'geral' : 'casa';
    const params = new URLSearchParams({ origem });
    if (casaId) params.append('casaId', casaId);
    navigate(`/professor/missoes/serie/${serie}/semana/${semana}/aluno/${alunoId}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E]">
      {/* Header */}
      <div className="p-4 border-b border-violet-500/10">
        <div className="flex items-center justify-between">
          {/* Lado esquerdo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(`/professor/missoes/serie/${serie}/semana/${semana}`)}
              className="p-2 -ml-2 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                {tipo === 'individual' && casaInfo && (
                  <CasaBrasao 
                    brasaoUrl={casaInfo.brasao_url}
                    emoji={casaInfo.emoji}
                    nome={casaInfo.nome}
                    size="mini"
                  />
                )}
                {tipo === 'geral' && ''}
                {headerTitle}
              </h1>
              <p className="text-white/40 text-xs">{isExtra ? 'Extra' : `Semana ${semana}`} • {serie}º Ano</p>
            </div>
          </div>

          {/* Botão Ver Missão */}
          <button
            onClick={() => setShowMissaoModal(true)}
            disabled={missaoIds.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-violet-500/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Eye className="w-4 h-4" />
            <span className="text-xs">Ver Missão</span>
          </button>
        </div>
      </div>

      {/* Filtro de Turma - sempre visível */}
      <div className="p-4 border-b border-violet-500/10">
        <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Turma</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTurmaFiltro('todas')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              turmaFiltro === 'todas' 
                ? "bg-blue-600 text-white" 
                : "bg-white/5 text-white/60 hover:bg-white/10"
            )}
          >
            Todas
          </button>
          {turmasUnicas.map(turma => (
            <button
              key={turma}
              onClick={() => setTurmaFiltro(turma || 'todas')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                turmaFiltro === turma 
                  ? "bg-blue-600 text-white" 
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              )}
            >
              {turma}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Alunos */}
      <div className="p-2">
        {isLoading && (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && alunosFiltrados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${casaColor}20` }}
            >
              <span className="text-2xl text-white/30">--</span>
            </div>
            <p className="text-white/60 mb-2">Nenhum aluno encontrado</p>
            <p className="text-white/40 text-sm">
              {turmaFiltro !== 'todas' 
                ? 'Tente outro filtro de turma' 
                : 'Não há alunos nesta série/casa'}
            </p>
          </div>
        )}

        {!isLoading && alunosFiltrados.length > 0 && (
          <div className="space-y-0.5">
            {alunosFiltrados.map(aluno => (
              <button
                key={aluno.id}
                onClick={() => handleAlunoClick(aluno.id)}
                className="w-full flex items-center gap-3 py-2.5 px-3 hover:bg-white/5 rounded-lg transition-colors"
              >
                {/* Bolinha de status */}
                <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", cores[aluno.status])} />
                
                {/* Avatar */}
                {aluno.avatar_url ? (
                  <img 
                    src={aluno.avatar_url} 
                    alt=""
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0" 
                  />
                ) : (
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                    style={{ backgroundColor: casaColor }}
                  >
                    {aluno.nome?.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Nome + Série/Turma */}
                <div className="flex-1 flex items-center min-w-0">
                  <span className="text-white text-sm font-medium truncate">
                    {aluno.nome} {aluno.sobrenome}
                  </span>
                  <span className="text-white/40 text-xs ml-2 flex-shrink-0">
                    {aluno.serie}º{aluno.turma}
                  </span>
                </div>
                
                {/* Badge X/Y */}
                {aluno.total > 0 && (
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded border",
                    aluno.status === 'completou' && "bg-green-500/20 text-green-400 border-green-500/30",
                    aluno.status === 'aguardando' && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                    aluno.status === 'pendente' && "bg-red-500/20 text-red-400 border-red-500/30",
                    aluno.status === 'sem_missao' && "bg-white/10 text-white/40 border-violet-500/10"
                  )}>
                    {aluno.entregou}/{aluno.total}
                  </span>
                )}
                
                {/* Seta */}
                <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Legenda */}
      {!isLoading && alunosFiltrados.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d] to-transparent pointer-events-none">
          <div className="flex items-center justify-center gap-4 text-xs text-white/40">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Completou</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Aguardando</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Pendente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-white/20" />
              <span>Sem missão</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Missão */}
      <MissaoDetalhesModal
        isOpen={showMissaoModal}
        onClose={() => setShowMissaoModal(false)}
        missaoIds={missaoIds}
      />
    </div>
  );
};

export default AlunosPorTipoPage;
