import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { ArrowLeft, Edit, ChevronRight, Users, Clock, Target, Calendar, User, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';

interface Missao {
  id: string;
  titulo: string;
  descricao: string | null;
  instrucoes: string | null;
  tipo: string;
  tipo_missao: string | null;
  pontos_base: number;
  semana: number | null;
  serie_filtro: number | null;
  turma_filtro: string | null;
  data_prazo: string;
  data_liberacao: string;
  status: string | null;
  criado_por: string;
  inteligencia_cross: number | null;
  casa_id: number | null;
  institution_id: string;
  criador?: { full_name: string | null };
  inteligencia_cross_rel?: { nome: string; emoji: string | null };
}

interface Aluno {
  id: string;
  full_name: string | null;
  serie: string | null;
  turma: string | null;
  avatar_url: string | null;
}

interface Entrega {
  id: string;
  aluno_id: string;
  status: string | null;
  nota: number | null;
  created_at: string | null;
  data_entrega: string | null;
}

interface AlunoComEntrega extends Aluno {
  entrega: (Entrega & { tempo_resposta_horas: number | null }) | null;
  entregou: boolean;
  tempoResposta: number | null;
}

const MissaoDetalhesPage = () => {
  const { id: missaoId } = useParams();
  const navigate = useNavigate();
  const { profile, casaMentor } = useProfessor();

  // Buscar dados da missão
  const { data: missao, isLoading: loadingMissao } = useQuery({
    queryKey: ['missao-detalhes', missaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missoes')
        .select(`
          *,
          criador:profiles!criado_por(full_name),
          inteligencia_cross_rel:inteligencias!inteligencia_cross(nome, emoji)
        `)
        .eq('id', missaoId!)
        .single();

      if (error) throw error;
      return data as Missao;
    },
    enabled: !!missaoId
  });

  // Buscar checklist de alunos
  const { data: checklist, isLoading: loadingChecklist } = useQuery({
    queryKey: ['checklist-missao', missaoId, missao?.casa_id, missao?.serie_filtro, missao?.turma_filtro],
    queryFn: async () => {
      if (!missao) return null;

      // 1. Buscar alunos elegíveis (da casa do mentor com role 'user')
      let queryAlunos = supabase
        .from('profiles')
        .select('id, full_name, serie, turma, avatar_url')
        .eq('casa_id', missao.casa_id!)
        .eq('institution_id', missao.institution_id);

      // Filtrar por série se especificado
      if (missao.serie_filtro) {
        queryAlunos = queryAlunos.eq('serie', `${missao.serie_filtro}º`);
      }

      // Filtrar por turma se especificado
      if (missao.turma_filtro) {
        const turmas = missao.turma_filtro.split(',').map(t => t.trim().toUpperCase());
        queryAlunos = queryAlunos.in('turma', turmas);
      }

      const { data: alunos, error: alunosError } = await queryAlunos;
      if (alunosError) throw alunosError;

      // Filtrar apenas alunos (verificar user_roles)
      const alunoIds = alunos?.map(a => a.id) || [];
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'user')
        .in('user_id', alunoIds);

      const alunoIdsValidos = new Set(userRoles?.map(r => r.user_id) || []);
      const alunosFiltrados = alunos?.filter(a => alunoIdsValidos.has(a.id)) || [];

      // 2. Buscar entregas
      const { data: entregas, error: entregasError } = await supabase
        .from('entregas')
        .select('id, aluno_id, status, nota, created_at, data_entrega')
        .eq('missao_id', missaoId!);

      if (entregasError) throw entregasError;

      // 3. Calcular tempo de resposta e combinar
      const entregasMap = new Map(
        entregas?.map(e => {
          const tempoHoras = missao.data_liberacao && e.created_at
            ? Math.round(
                (new Date(e.created_at).getTime() - new Date(missao.data_liberacao).getTime()) / 
                (1000 * 60 * 60)
              )
            : null;
          return [e.aluno_id, { ...e, tempo_resposta_horas: tempoHoras }];
        }) || []
      );

      const lista: AlunoComEntrega[] = alunosFiltrados.map(aluno => ({
        ...aluno,
        entrega: entregasMap.get(aluno.id) || null,
        entregou: entregasMap.has(aluno.id),
        tempoResposta: entregasMap.get(aluno.id)?.tempo_resposta_horas || null
      }));

      const entregaram = lista
        .filter(a => a.entregou)
        .sort((a, b) => (a.tempoResposta || 999) - (b.tempoResposta || 999));
      const naoEntregaram = lista.filter(a => !a.entregou);

      return { entregaram, naoEntregaram, total: lista.length };
    },
    enabled: !!missao
  });

  // Formatar título da missão
  const getTituloCard = () => {
    if (!missao) return '';
    let titulo = `Semana ${missao.semana || '?'} - ${missao.tipo_missao === 'individual' ? 'Individual' : 'Geral'}`;
    if (missao.inteligencia_cross_rel) {
      titulo += ` - ${missao.inteligencia_cross_rel.nome} ${missao.inteligencia_cross_rel.emoji || ''}`;
    }
    return titulo;
  };

  // Formatar turmas
  const formatTurmas = () => {
    if (!missao?.turma_filtro) return 'Todas';
    return missao.turma_filtro;
  };

  // Quem criou
  const getCriador = () => {
    if (!missao) return '';
    if (missao.criado_por === profile?.id) return 'Você';
    return missao.criador?.full_name || 'Admin';
  };

  // Calcular métricas
  const metricas = checklist?.entregaram ? {
    rapidos: checklist.entregaram.filter(a => a.tempoResposta !== null && a.tempoResposta < 24).length,
    medios: checklist.entregaram.filter(a => a.tempoResposta !== null && a.tempoResposta >= 24 && a.tempoResposta < 72).length,
    lentos: checklist.entregaram.filter(a => a.tempoResposta !== null && a.tempoResposta >= 72).length,
    tempoMedio: checklist.entregaram.length > 0
      ? Math.round(checklist.entregaram.reduce((acc, a) => acc + (a.tempoResposta || 0), 0) / checklist.entregaram.length)
      : 0
  } : null;

  // Dias restantes
  const getDiasRestantes = () => {
    if (!missao?.data_prazo) return null;
    const prazo = new Date(missao.data_prazo);
    const hoje = new Date();
    return Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  };

  const diasRestantes = getDiasRestantes();
  const porcentagem = checklist ? Math.round((checklist.entregaram.length / Math.max(checklist.total, 1)) * 100) : 0;

  if (loadingMissao) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!missao) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Missão não encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              <ArrowLeft size={20} className="text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground truncate max-w-[200px]">
              {getTituloCard()}
            </h1>
          </div>

          <Link
            to={`/professor/missoes/${missaoId}/editar`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Edit size={16} />
            Editar
          </Link>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Card com título e descrição */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen size={24} className="text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{missao.titulo}</h2>
              {missao.descricao && (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {missao.descricao}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Informações */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target size={16} className="text-primary" />
            Informações
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Tipo</span>
              <span className="text-foreground font-medium capitalize">{missao.tipo || 'Principal'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Pontos</span>
              <span className="text-foreground font-medium">{missao.pontos_base} pts</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Série</span>
              <span className="text-foreground font-medium">
                {missao.serie_filtro ? `${missao.serie_filtro}º ano` : 'Todas'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Turmas</span>
              <span className="text-foreground font-medium">{formatTurmas()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Prazo</span>
              <span className="text-foreground font-medium flex items-center gap-1">
                <Calendar size={12} />
                {new Date(missao.data_prazo).toLocaleDateString('pt-BR')}
                {diasRestantes !== null && diasRestantes > 0 && (
                  <span className="text-xs text-muted-foreground">({diasRestantes}d)</span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Criado por</span>
              <span className="text-foreground font-medium flex items-center gap-1">
                <User size={12} />
                {getCriador()}
              </span>
            </div>
          </div>
        </div>

        {/* Instruções */}
        {missao.instrucoes && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              📝 Instruções
            </h3>
            <div className="prose prose-sm prose-invert max-w-none text-muted-foreground">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-lg font-bold text-foreground mt-4 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold text-foreground mt-3 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold text-foreground mt-2 mb-1">{children}</h3>,
                  p: ({ children }) => <p className="text-muted-foreground mb-2 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                  li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                  strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                  hr: () => <hr className="border-border my-3" />,
                }}
              >
                {missao.instrucoes}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Progresso */}
        {checklist && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                📊 Progresso
              </h3>
              <span className="text-sm font-medium text-foreground">
                {checklist.entregaram.length}/{checklist.total} ({porcentagem}%)
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  porcentagem >= 80 ? "bg-green-500" :
                  porcentagem >= 50 ? "bg-yellow-500" :
                  "bg-red-500"
                )}
                style={{ width: `${porcentagem}%` }}
              />
            </div>
          </div>
        )}

        {/* Checklist de Alunos */}
        {loadingChecklist ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : checklist && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users size={16} className="text-primary" />
              Alunos
            </h3>

            {/* Entregaram */}
            {checklist.entregaram.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-green-500 mb-2 flex items-center gap-1">
                  ✅ Entregaram ({checklist.entregaram.length})
                </p>
                <div className="space-y-2">
                  {checklist.entregaram.map((aluno) => (
                    <AlunoCard key={aluno.id} aluno={aluno} tipo="entregou" />
                  ))}
                </div>
              </div>
            )}

            {/* Não Entregaram */}
            {checklist.naoEntregaram.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-500 mb-2 flex items-center gap-1">
                  ❌ Não Entregaram ({checklist.naoEntregaram.length})
                </p>
                <div className="space-y-2">
                  {checklist.naoEntregaram.map((aluno) => (
                    <AlunoCard key={aluno.id} aluno={aluno} tipo="pendente" diasRestantes={diasRestantes} />
                  ))}
                </div>
              </div>
            )}

            {checklist.total === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                Nenhum aluno elegível encontrado
              </p>
            )}
          </div>
        )}

        {/* Métricas de Engajamento */}
        {metricas && checklist && checklist.entregaram.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              Métricas de Engajamento
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
                <span className="text-green-400 flex items-center gap-1">⚡ Rápidos (&lt;24h)</span>
                <span className="text-foreground font-medium">
                  {metricas.rapidos} ({Math.round((metricas.rapidos / checklist.entregaram.length) * 100)}%)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded-lg">
                <span className="text-yellow-400 flex items-center gap-1">🚶 Médio</span>
                <span className="text-foreground font-medium">
                  {metricas.medios} ({Math.round((metricas.medios / checklist.entregaram.length) * 100)}%)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                <span className="text-red-400 flex items-center gap-1">🐢 Lentos (&gt;72h)</span>
                <span className="text-foreground font-medium">
                  {metricas.lentos} ({Math.round((metricas.lentos / checklist.entregaram.length) * 100)}%)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <span className="text-muted-foreground">Tempo médio</span>
                <span className="text-foreground font-medium">{metricas.tempoMedio}h</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente do card do aluno
interface AlunoCardProps {
  aluno: AlunoComEntrega;
  tipo: 'entregou' | 'pendente';
  diasRestantes?: number | null;
}

const AlunoCard = ({ aluno, tipo, diasRestantes }: AlunoCardProps) => {
  const navigate = useNavigate();

  const getTempoIcon = (horas: number) => {
    if (horas < 24) return <span className="text-green-400 text-xs">⚡ {horas}h</span>;
    if (horas < 72) return <span className="text-yellow-400 text-xs">🚶 {horas}h</span>;
    return <span className="text-red-400 text-xs">🐢 {horas}h</span>;
  };

  const handleClick = () => {
    if (tipo === 'entregou' && aluno.entrega?.id) {
      navigate(`/professor/entregas/${aluno.entrega.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border transition-colors",
        tipo === 'entregou' 
          ? "bg-green-500/5 border-green-500/20 cursor-pointer hover:bg-green-500/10" 
          : "bg-muted/50 border-border"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
          tipo === 'entregou' ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
        )}>
          {tipo === 'entregou' ? "✓" : "✗"}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{aluno.full_name || 'Sem nome'}</p>
          <p className="text-xs text-muted-foreground">
            {aluno.serie}{aluno.turma}
            {tipo === 'entregou' && aluno.entrega?.created_at && (
              <> • {new Date(aluno.entrega.created_at).toLocaleDateString('pt-BR')}</>
            )}
            {tipo === 'pendente' && diasRestantes !== null && diasRestantes > 0 && (
              <> • Faltam {diasRestantes} dias</>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {tipo === 'entregou' && aluno.tempoResposta !== null && getTempoIcon(aluno.tempoResposta)}
        
        {tipo === 'entregou' && (
          <span className="text-xs flex items-center gap-1">
            {aluno.entrega?.nota !== null ? (
              <span className="text-foreground font-medium">{aluno.entrega.nota}/10</span>
            ) : (
              <span className="text-yellow-400">Avaliar</span>
            )}
            <ChevronRight size={14} className="text-muted-foreground" />
          </span>
        )}
      </div>
    </div>
  );
};

export default MissaoDetalhesPage;
