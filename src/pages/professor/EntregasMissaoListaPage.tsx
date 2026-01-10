import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { ChevronLeft, ChevronRight, Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import MissaoDetalhesModal from '@/components/professor/MissaoDetalhesModal';

interface AlunoAvaliacao {
  id: string;
  nome: string;
  sobrenome: string | null;
  serie: string | null;
  turma: string | null;
  avatar_url: string | null;
  status: 'pendente' | 'avaliado' | 'sem_entrega';
  entregasPendentes: number;
}

const AlunoLinha = ({ 
  aluno, 
  onClick 
}: { 
  aluno: AlunoAvaliacao; 
  onClick: () => void;
}) => {
  const temPendentes = aluno.entregasPendentes > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors",
        temPendentes 
          ? "hover:bg-white/10" 
          : "hover:bg-white/5 opacity-50"
      )}
    >
      {/* Bolinha de status */}
      <div className={cn(
        "w-2.5 h-2.5 rounded-full flex-shrink-0",
        temPendentes ? "bg-red-500" : 
        aluno.status === 'avaliado' ? "bg-green-500/50" : "bg-white/20"
      )} />

      {/* Avatar - grayscale quando stand-by */}
      {aluno.avatar_url ? (
        <img
          src={aluno.avatar_url}
          alt={aluno.nome}
          className={cn(
            "w-7 h-7 rounded-full object-cover flex-shrink-0",
            !temPendentes && "opacity-50 grayscale"
          )}
        />
      ) : (
        <div className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
          temPendentes 
            ? "bg-blue-600 text-white" 
            : "bg-white/10 text-white/40"
        )}>
          {aluno.nome.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Nome + Série/Turma - cores diferentes */}
      <div className="flex-1 flex items-center min-w-0">
        <span className={cn(
          "text-sm font-medium truncate",
          temPendentes ? "text-white" : "text-white/40"
        )}>
          {aluno.nome} {aluno.sobrenome}
        </span>
        <span className={cn(
          "text-xs ml-2 flex-shrink-0",
          temPendentes ? "text-white/40" : "text-white/20"
        )}>
          {aluno.serie}º{aluno.turma}
        </span>
      </div>

      {/* Badge de pendentes (só se tiver) */}
      {temPendentes && (
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {aluno.entregasPendentes}
        </span>
      )}

      {/* Seta - mais visível quando destacado */}
      <ChevronRight className={cn(
        "w-4 h-4 flex-shrink-0",
        temPendentes ? "text-white/30" : "text-white/10"
      )} />
    </button>
  );
};

const EntregasMissaoListaPage = () => {
  const { serie, semana, casaId } = useParams();
  const navigate = useNavigate();
  const { profile, casaMentor } = useProfessor();

  const [turmaFiltro, setTurmaFiltro] = useState<string | null>(null);
  const [showMissaoModal, setShowMissaoModal] = useState(false);

  const isGeral = !casaId;
  const isExtra = semana === 'extra';
  const semanaNumber = isExtra ? 0 : Number(semana);
  const tipoLabel = isGeral ? '📋 Geral' : `${casaMentor?.emoji || '🏠'} Individual`;

  // Buscar nome da casa se for individual
  const { data: casa } = useQuery({
    queryKey: ['casa', casaId],
    queryFn: async () => {
      if (!casaId) return null;
      const { data } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex')
        .eq('id', Number(casaId))
        .maybeSingle();
      return data;
    },
    enabled: !!casaId
  });

  // Buscar missões da semana/tipo
  const { data: missoes } = useQuery({
    queryKey: ['missoes-avaliar', serie, semana, casaId, profile?.institution_id],
    queryFn: async () => {
      if (!profile?.institution_id) return [];

      let query = supabase
        .from('missoes')
        .select('id, titulo, tipo_missao, pontos_base, descricao, instrucoes')
        .eq('institution_id', profile.institution_id)
        .eq('semana', semanaNumber);

      // Filtrar por série
      query = query.or(`serie_filtro.eq.${serie},serie_filtro.is.null`);

      if (isGeral) {
        query = query.or('tipo_missao.eq.geral,tipo_missao.is.null');
      } else {
        query = query.eq('tipo_missao', 'individual').eq('casa_id', Number(casaId));
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!profile?.institution_id
  });

  // Buscar alunos com status de avaliação
  const { data: alunos, isLoading } = useQuery({
    queryKey: ['alunos-avaliar', serie, semana, casaId, profile?.institution_id],
    queryFn: async (): Promise<AlunoAvaliacao[]> => {
      if (!profile?.institution_id) return [];

      // 1. Buscar alunos da série
      let alunosQuery = supabase
        .from('profiles')
        .select('id, nome, sobrenome, serie, turma, avatar_url, casa_id')
        .eq('institution_id', profile.institution_id)
        .ilike('serie', `${serie}%`);

      // Se for individual, filtrar por casa
      if (!isGeral && casaId) {
        alunosQuery = alunosQuery.eq('casa_id', Number(casaId));
      }

      const { data: alunosData } = await alunosQuery;

      if (!alunosData || alunosData.length === 0) return [];

      // 2. Buscar missões da semana/tipo
      const missaoIds = missoes?.map(m => m.id) || [];

      if (missaoIds.length === 0) {
        // Se não há missões, todos os alunos estão "sem_entrega"
        return alunosData.map(aluno => ({
          id: aluno.id,
          nome: aluno.nome || '',
          sobrenome: aluno.sobrenome,
          serie: aluno.serie,
          turma: aluno.turma,
          avatar_url: aluno.avatar_url,
          status: 'sem_entrega' as const,
          entregasPendentes: 0
        }));
      }

      // 3. Buscar entregas dessas missões
      const { data: entregas } = await supabase
        .from('entregas')
        .select('aluno_id, missao_id, status, nota')
        .in('missao_id', missaoIds);

      // 4. Calcular status de cada aluno
      return alunosData.map(aluno => {
        const entregasAluno = entregas?.filter(e => e.aluno_id === aluno.id) || [];

        // Contar pendentes (nota IS NULL)
        const pendentes = entregasAluno.filter(e => e.nota === null).length;

        let status: 'pendente' | 'avaliado' | 'sem_entrega';

        if (entregasAluno.length === 0) {
          status = 'sem_entrega';
        } else if (pendentes > 0) {
          status = 'pendente';
        } else {
          status = 'avaliado';
        }

        return {
          id: aluno.id,
          nome: aluno.nome || '',
          sobrenome: aluno.sobrenome,
          serie: aluno.serie,
          turma: aluno.turma,
          avatar_url: aluno.avatar_url,
          status,
          entregasPendentes: pendentes
        };
      }).sort((a, b) => {
        // Ordenar: pendentes primeiro, depois avaliados, depois sem entrega
        const ordem = { pendente: 0, avaliado: 1, sem_entrega: 2 };
        return ordem[a.status] - ordem[b.status];
      });
    },
    enabled: !!profile?.institution_id && !!missoes
  });

  // Turmas disponíveis
  const turmasDisponiveis = useMemo(() => {
    if (!alunos) return [];
    const turmas = [...new Set(alunos.map(a => a.turma).filter(Boolean))];
    return turmas.sort() as string[];
  }, [alunos]);

  // Filtrar por turma
  const alunosFiltrados = useMemo(() => {
    if (!alunos) return [];
    if (!turmaFiltro) return alunos;
    return alunos.filter(a => a.turma === turmaFiltro);
  }, [alunos, turmaFiltro]);

  // Contadores
  const pendentes = alunosFiltrados.filter(a => a.status === 'pendente').length;

  const handleAlunoClick = (alunoId: string) => {
    const params = new URLSearchParams();
    params.append('serie', serie || '');
    params.append('semana', semana || '');
    params.append('tipo', isGeral ? 'geral' : 'casa');
    if (casaId) params.append('casaId', casaId);

    navigate(`/professor/entregas/aluno/${alunoId}?${params.toString()}`);
  };

  const handleVerMissao = () => {
    if (missoes && missoes.length > 0) {
      setShowMissaoModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-24">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/professor/entregas/serie/${serie}/semana/${semana}`)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-white font-semibold flex items-center gap-2">
                {isGeral ? '📋 Geral' : `${casa?.emoji || '🏠'} ${casa?.nome || 'Individual'}`}
              </h1>
              <p className="text-white/40 text-sm">
                {isExtra ? '⭐ Extra' : `Semana ${semana}`} • {serie}º Ano
              </p>
            </div>
          </div>

          {/* Botão Ver Missão */}
          {missoes && missoes.length > 0 && (
            <button
              onClick={handleVerMissao}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="text-xs">Ver Missão</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de pendentes */}
      {pendentes > 0 && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm text-center">
            🔴 {pendentes} {pendentes === 1 ? 'aluno aguardando' : 'alunos aguardando'} avaliação
          </p>
        </div>
      )}

      {/* Filtro por Turma */}
      {turmasDisponiveis.length > 1 && (
        <div className="p-4 border-b border-white/10">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Turma</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setTurmaFiltro(null)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                turmaFiltro === null
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              )}
            >
              Todas
            </button>
            {turmasDisponiveis.map(turma => (
              <button
                key={turma}
                onClick={() => setTurmaFiltro(turma)}
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
      )}

      {/* Lista de Alunos */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
          </div>
        ) : alunosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-white/40">Nenhum aluno encontrado</p>
          </div>
        ) : (
          <div className="space-y-1">
            {alunosFiltrados.map(aluno => (
              <AlunoLinha
                key={aluno.id}
                aluno={aluno}
                onClick={() => handleAlunoClick(aluno.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="p-4 border-t border-white/10">
        <div className="flex flex-wrap gap-4 justify-center text-xs text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Pendente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Avaliado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white/20" /> Sem entrega
          </span>
        </div>
      </div>

      {/* Modal Ver Missão */}
      <MissaoDetalhesModal
        isOpen={showMissaoModal}
        onClose={() => setShowMissaoModal(false)}
        missaoIds={missoes?.map(m => m.id) || []}
      />
    </div>
  );
};

export default EntregasMissaoListaPage;
