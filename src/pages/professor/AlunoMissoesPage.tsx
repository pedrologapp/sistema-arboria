import { useMemo } from 'react';
import { ArrowLeft, ChevronRight, Clock, Check, AlertCircle, FileText } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CasaBrasao } from '@/components/CasaBrasao';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Missao {
  id: string;
  titulo: string;
  tipo_missao: string | null;
  inteligencia_cross: number | null;
  pontos_base: number;
  data_prazo: string;
  inteligencia_info?: {
    id: number;
    nome: string;
    emoji: string;
    brasao_url: string | null;
  } | null;
}

interface Entrega {
  id: string;
  missao_id: string;
  status: string | null;
  nota: number | null;
  pontos_concedidos: number | null;
  data_entrega: string | null;
  data_avaliacao: string | null;
}

interface MissaoComEntrega extends Missao {
  entrega?: Entrega | null;
}

interface Aluno {
  id: string;
  nome: string | null;
  sobrenome: string | null;
  serie: string | null;
  turma: string | null;
  avatar_url: string | null;
  casa_id: number | null;
}

const AlunoMissoesPage = () => {
  const { serie, semana, alunoId } = useParams<{ serie: string; semana: string; alunoId: string }>();
  const [searchParams] = useSearchParams();
  const origem = searchParams.get('origem') || 'geral';
  const casaIdOrigem = searchParams.get('casaId');
  const navigate = useNavigate();
  const { casaMentor, casaColor, profile } = useProfessor();

  // Buscar dados do aluno
  const { data: aluno } = useQuery({
    queryKey: ['aluno-perfil', alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, serie, turma, avatar_url, casa_id')
        .eq('id', alunoId)
        .maybeSingle();
      if (error) throw error;
      return data as Aluno | null;
    },
    enabled: !!alunoId
  });

  // Buscar missões da semana com entregas do aluno
  const { data: missoesComEntrega, isLoading } = useQuery({
    queryKey: ['missoes-aluno', alunoId, serie, semana, profile?.institution_id, casaMentor?.id],
    queryFn: async () => {
      if (!profile?.institution_id || !casaMentor?.id || !alunoId) return [];

      // Buscar missões da semana
      const { data: missoes, error: missoesError } = await supabase
        .from('missoes')
        .select(`
          id, 
          titulo, 
          tipo_missao, 
          inteligencia_cross, 
          pontos_base, 
          data_prazo
        `)
        .eq('institution_id', profile.institution_id)
        .eq('casa_id', casaMentor.id)
        .eq('semana', Number(semana))
        .or(`serie_filtro.eq.${serie},serie_filtro.is.null`);

      if (missoesError) throw missoesError;
      if (!missoes || missoes.length === 0) return [];

      // Buscar informações das inteligências
      const inteligenciasIds = [...new Set(missoes.map(m => m.inteligencia_cross).filter(Boolean))] as number[];
      let inteligenciasMap: Record<number, { id: number; nome: string; emoji: string; brasao_url: string | null }> = {};
      
      if (inteligenciasIds.length > 0) {
        const { data: inteligencias } = await supabase
          .from('inteligencias')
          .select('id, nome, emoji, brasao_url')
          .in('id', inteligenciasIds);
        
        inteligencias?.forEach(int => {
          inteligenciasMap[int.id] = int;
        });
      }

      // Buscar entregas do aluno para essas missões
      const missaoIds = missoes.map(m => m.id);
      const { data: entregas, error: entregasError } = await supabase
        .from('entregas')
        .select('id, missao_id, status, nota, pontos_concedidos, data_entrega, data_avaliacao')
        .eq('aluno_id', alunoId)
        .in('missao_id', missaoIds);

      if (entregasError) throw entregasError;

      // Mapear entregas por missão
      const entregasMap: Record<string, Entrega> = {};
      entregas?.forEach(e => {
        entregasMap[e.missao_id] = e;
      });

      // Combinar missões com entregas e info da inteligência
      const resultado: MissaoComEntrega[] = missoes.map(m => ({
        ...m,
        inteligencia_info: m.inteligencia_cross ? inteligenciasMap[m.inteligencia_cross] : null,
        entrega: entregasMap[m.id] || null
      }));

      return resultado;
    },
    enabled: !!profile?.institution_id && !!casaMentor?.id && !!alunoId && !!serie && !!semana
  });

  // Ordenar: missão da origem primeiro
  const missoesOrdenadas = useMemo(() => {
    if (!missoesComEntrega) return [];
    
    return [...missoesComEntrega].sort((a, b) => {
      if (origem === 'geral') {
        if (a.tipo_missao === 'geral' && b.tipo_missao !== 'geral') return -1;
        if (a.tipo_missao !== 'geral' && b.tipo_missao === 'geral') return 1;
      }
      if (origem === 'casa' && casaIdOrigem) {
        const casaIdNum = Number(casaIdOrigem);
        if (a.inteligencia_cross === casaIdNum && b.inteligencia_cross !== casaIdNum) return -1;
        if (a.inteligencia_cross !== casaIdNum && b.inteligencia_cross === casaIdNum) return 1;
      }
      return 0;
    });
  }, [missoesComEntrega, origem, casaIdOrigem]);

  const missaoPrincipal = missoesOrdenadas[0];
  const outrasMissoes = missoesOrdenadas.slice(1);

  const getStatusInfo = (missao: MissaoComEntrega) => {
    if (!missao.entrega) {
      return { 
        icon: AlertCircle, 
        color: 'text-red-400', 
        bg: 'bg-red-500/10', 
        border: 'border-red-500/30',
        label: 'Não entregue' 
      };
    }
    if (missao.entrega.nota !== null) {
      return { 
        icon: Check, 
        color: 'text-green-400', 
        bg: 'bg-green-500/10', 
        border: 'border-green-500/30',
        label: `Nota: ${missao.entrega.nota}/10 • +${missao.entrega.pontos_concedidos || 0} pts` 
      };
    }
    return { 
      icon: Clock, 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-500/10', 
      border: 'border-yellow-500/30',
      label: 'Entregue • Aguardando avaliação' 
    };
  };

  const handleMissaoClick = (missao: MissaoComEntrega) => {
    if (missao.entrega) {
      // Ir para avaliar/ver entrega
      navigate(`/professor/entregas/${missao.entrega.id}`);
    } else {
      // Ir para detalhes da missão
      navigate(`/professor/missoes/${missao.id}`);
    }
  };

  const voltarUrl = origem === 'casa' && casaIdOrigem 
    ? `/professor/missoes/serie/${serie}/semana/${semana}/casa/${casaIdOrigem}/alunos`
    : `/professor/missoes/serie/${serie}/semana/${semana}/geral/alunos`;

  return (
    <div className="min-h-screen bg-[#1A1A2E]">
      {/* Header com dados do aluno */}
      <div className="p-4 border-b border-violet-500/10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(voltarUrl)}
            className="p-2 -ml-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          {/* Avatar do aluno */}
          {aluno?.avatar_url ? (
            <img 
              src={aluno.avatar_url} 
              alt=""
              className="w-10 h-10 rounded-full object-cover" 
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ backgroundColor: casaColor }}
            >
              {aluno?.nome?.charAt(0).toUpperCase()}
            </div>
          )}
          
          <div>
            <h1 className="text-white font-bold">
              {aluno?.nome} {aluno?.sobrenome}
            </h1>
            <p className="text-white/40 text-xs">
              {aluno?.serie}º Ano {aluno?.turma}
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="p-4 space-y-4">
          <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Missão Principal */}
          {missaoPrincipal && (
            <div className="p-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
                Missão Principal
              </p>
              
              <MissaoCard 
                missao={missaoPrincipal} 
                destacado 
                casaColor={casaColor}
                onClick={() => handleMissaoClick(missaoPrincipal)}
                getStatusInfo={getStatusInfo}
              />
            </div>
          )}

          {/* Divisor */}
          {outrasMissoes.length > 0 && (
            <div className="mx-4 border-t border-violet-500/10" />
          )}

          {/* Outras Missões */}
          {outrasMissoes.length > 0 && (
            <div className="p-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
                Outras Missões da Semana
              </p>
              
              <div className="space-y-3">
                {outrasMissoes.map(missao => (
                  <MissaoCard 
                    key={missao.id}
                    missao={missao} 
                    casaColor={casaColor}
                    onClick={() => handleMissaoClick(missao)}
                    getStatusInfo={getStatusInfo}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {missoesOrdenadas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${casaColor}20` }}
              >
                <FileText className="w-8 h-8 text-white/40" />
              </div>
              <p className="text-white/60 mb-2">Nenhuma missão nesta semana</p>
              <p className="text-white/40 text-sm">
                O aluno não possui missões designadas para a Semana {semana}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Componente de Card de Missão
const MissaoCard = ({ 
  missao, 
  destacado = false, 
  casaColor,
  onClick,
  getStatusInfo
}: { 
  missao: MissaoComEntrega; 
  destacado?: boolean;
  casaColor: string;
  onClick: () => void;
  getStatusInfo: (missao: MissaoComEntrega) => {
    icon: any;
    color: string;
    bg: string;
    border: string;
    label: string;
  };
}) => {
  const statusInfo = getStatusInfo(missao);
  const StatusIcon = statusInfo.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl text-left transition-colors border",
        statusInfo.bg,
        statusInfo.border,
        destacado && "ring-2 ring-offset-2 ring-offset-[#0d0d0d]",
        destacado && `ring-[${casaColor}]`
      )}
      style={destacado ? { borderColor: casaColor } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Tipo de missão */}
          <div className="flex items-center gap-2 mb-2">
            {missao.tipo_missao === 'geral' ? (
              <span className="text-white/60 text-xs font-medium uppercase">📋 Geral</span>
            ) : (
              <div className="flex items-center gap-1.5">
                {missao.inteligencia_info && (
                  <CasaBrasao 
                    brasaoUrl={missao.inteligencia_info.brasao_url}
                    emoji={missao.inteligencia_info.emoji}
                    nome={missao.inteligencia_info.nome}
                    size="mini"
                  />
                )}
                <span className="text-white/60 text-xs font-medium uppercase">
                  {missao.inteligencia_info?.nome || 'Individual'}
                </span>
              </div>
            )}
          </div>
          
          {/* Título */}
          <p className="text-white font-medium truncate">{missao.titulo}</p>
          
          {/* Status */}
          <div className={cn("flex items-center gap-1.5 mt-2", statusInfo.color)}>
            <StatusIcon size={14} />
            <span className="text-xs">{statusInfo.label}</span>
          </div>
          
          {/* Data de entrega/avaliação */}
          {missao.entrega?.data_avaliacao && (
            <p className="text-white/40 text-xs mt-1">
              📅 Avaliado: {format(new Date(missao.entrega.data_avaliacao), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          )}
          {missao.entrega?.data_entrega && !missao.entrega.data_avaliacao && (
            <p className="text-white/40 text-xs mt-1">
              📅 Entregue: {format(new Date(missao.entrega.data_entrega), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          )}
        </div>
        
        <ChevronRight className="w-5 h-5 text-white/20 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
};

export default AlunoMissoesPage;
