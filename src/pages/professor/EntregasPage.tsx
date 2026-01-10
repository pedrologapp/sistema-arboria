import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChevronRight, PenLine, Loader2 } from 'lucide-react';

interface Entrega {
  id: string;
  aluno_id: string;
  missao_id: string;
  status: string | null;
  nota: number | null;
  pontos_concedidos: number | null;
  created_at: string | null;
  data_entrega: string | null;
  data_avaliacao: string | null;
  aluno: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    serie: string | null;
    turma: string | null;
  } | null;
  missao: {
    id: string;
    titulo: string;
    tipo: string;
    pontos_base: number;
    tipo_missao: string | null;
    semana: number | null;
  } | null;
}

const EntregasPage = () => {
  const navigate = useNavigate();
  const { profile, casaMentor, casaColor } = useProfessor();
  const [filtro, setFiltro] = useState<'todas' | 'pendentes' | 'avaliadas'>('todas');
  const [filtroMissao, setFiltroMissao] = useState<string | null>(null);
  const [filtroSerie, setFiltroSerie] = useState<string | null>(null);

  // Buscar entregas
  const { data: entregas, isLoading } = useQuery({
    queryKey: ['entregas-professor', profile?.institution_id, casaMentor?.id],
    queryFn: async () => {
      if (!profile?.institution_id) return [];

      // 1. Buscar IDs das missões que o professor pode avaliar
      //    - Missões gerais da instituição
      //    - Missões individuais da casa que ele é mentor
      let missaoQuery = supabase
        .from('missoes')
        .select('id')
        .eq('institution_id', profile.institution_id);

      // Se tem casa mentor, filtrar por tipo_missao geral OU casa_id igual
      if (casaMentor?.id) {
        missaoQuery = missaoQuery.or(`tipo_missao.eq.geral,tipo_missao.is.null,casa_id.eq.${casaMentor.id}`);
      }

      const { data: missoes, error: missaoError } = await missaoQuery;

      if (missaoError) {
        console.error('Erro ao buscar missões:', missaoError);
        return [];
      }

      if (!missoes || missoes.length === 0) {
        console.log('Nenhuma missão encontrada para avaliar');
        return [];
      }

      const missaoIds = missoes.map(m => m.id);
      console.log('Missões para avaliar:', missaoIds.length);

      // 2. Buscar entregas dessas missões
      const { data: entregasData, error } = await supabase
        .from('entregas')
        .select(`
          id,
          aluno_id,
          missao_id,
          status,
          nota,
          pontos_concedidos,
          created_at,
          data_entrega,
          data_avaliacao,
          aluno:profiles!entregas_aluno_id_fkey(
            id,
            full_name,
            avatar_url,
            serie,
            turma
          ),
          missao:missoes!entregas_missao_id_fkey(
            id,
            titulo,
            tipo,
            pontos_base,
            tipo_missao,
            semana
          )
        `)
        .in('missao_id', missaoIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar entregas:', error);
        return [];
      }

      console.log('Entregas encontradas:', entregasData?.length);
      return (entregasData || []) as Entrega[];
    },
    enabled: !!profile?.institution_id
  });

  // Separar pendentes e avaliadas
  const pendentes = entregas?.filter(e => 
    e.status === 'pendente' || e.status === 'entregue' || (e.status !== 'aprovada' && e.status !== 'refazer' && e.nota === null)
  ).sort((a, b) => 
    new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()  // Mais antigas primeiro
  ) || [];

  const avaliadas = entregas?.filter(e => 
    e.status === 'aprovada' || e.status === 'refazer' || e.nota !== null
  ) || [];

  // Aplicar filtros
  const aplicarFiltros = (lista: Entrega[]) => {
    if (!lista) return [];
    
    let filtrada = lista;
    
    if (filtroMissao) {
      filtrada = filtrada.filter(e => e.missao_id === filtroMissao);
    }
    
    if (filtroSerie) {
      filtrada = filtrada.filter(e => e.aluno?.serie === filtroSerie);
    }
    
    return filtrada;
  };

  const pendentesFiltered = aplicarFiltros(pendentes);
  const avaliadasFiltered = aplicarFiltros(avaliadas);

  // Missões únicas para o filtro
  const missoesUnicas = [...new Map(entregas?.map(e => [e.missao_id, e.missao]) || []).values()].filter(Boolean);

  // Séries únicas para o filtro
  const seriesUnicas = [...new Set(entregas?.map(e => e.aluno?.serie).filter(Boolean) || [])];

  return (
    <div className="space-y-4 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${casaColor}20` }}
        >
          <PenLine size={20} style={{ color: casaColor }} />
        </div>
        <h1 className="text-xl font-bold text-white">Entregas para Avaliar</h1>
      </div>

      {/* Tabs de filtro */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFiltro('todas')}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
            filtro === 'todas' 
              ? "text-white" 
              : "bg-white/10 text-white/60 hover:bg-white/15"
          )}
          style={filtro === 'todas' ? { backgroundColor: casaColor } : undefined}
        >
          Todas {entregas?.length || 0}
        </button>
        <button
          onClick={() => setFiltro('pendentes')}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
            filtro === 'pendentes' 
              ? "bg-red-600 text-white" 
              : "bg-white/10 text-white/60 hover:bg-white/15"
          )}
        >
          Pendentes {pendentes.length}
        </button>
        <button
          onClick={() => setFiltro('avaliadas')}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
            filtro === 'avaliadas' 
              ? "bg-green-600 text-white" 
              : "bg-white/10 text-white/60 hover:bg-white/15"
          )}
        >
          Avaliadas {avaliadas.length}
        </button>
      </div>

      {/* Filtros extras */}
      <div className="flex gap-2">
        <select
          value={filtroMissao || ''}
          onChange={(e) => setFiltroMissao(e.target.value || null)}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          <option value="" className="bg-zinc-900">Todas as missões</option>
          {missoesUnicas.map(m => (
            <option key={m?.id} value={m?.id} className="bg-zinc-900">
              {m?.titulo}
            </option>
          ))}
        </select>

        <select
          value={filtroSerie || ''}
          onChange={(e) => setFiltroSerie(e.target.value || null)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          <option value="" className="bg-zinc-900">Série</option>
          {seriesUnicas.map(s => (
            <option key={s} value={s} className="bg-zinc-900">{s}</option>
          ))}
        </select>
      </div>

      {/* Conteúdo */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-white/50 mb-4" />
            <p className="text-white/50">Carregando entregas...</p>
          </div>
        ) : (
          <>
            {/* Pendentes */}
            {(filtro === 'todas' || filtro === 'pendentes') && pendentesFiltered.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Pendentes ({pendentesFiltered.length})
                </h2>

                <div className="space-y-2">
                  {pendentesFiltered.map(entrega => (
                    <EntregaCard
                      key={entrega.id}
                      entrega={entrega}
                      tipo="pendente"
                      casaColor={casaColor}
                      onClick={() => navigate(`/professor/entregas/${entrega.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Avaliadas */}
            {(filtro === 'todas' || filtro === 'avaliadas') && avaliadasFiltered.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-green-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Avaliadas ({avaliadasFiltered.length})
                </h2>

                <div className="space-y-2">
                  {avaliadasFiltered.map(entrega => (
                    <EntregaCard
                      key={entrega.id}
                      entrega={entrega}
                      tipo="avaliada"
                      casaColor={casaColor}
                      onClick={() => navigate(`/professor/entregas/${entrega.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Vazio geral */}
            {entregas?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${casaColor}20` }}
                >
                  <PenLine size={40} style={{ color: casaColor }} />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">
                  Nenhuma entrega encontrada
                </h2>
                <p className="text-white/50 text-sm max-w-xs">
                  Quando os alunos enviarem respostas, elas aparecerão aqui para avaliação
                </p>
              </div>
            )}

            {/* Vazio após filtro */}
            {entregas && entregas.length > 0 && 
             ((filtro === 'pendentes' && pendentesFiltered.length === 0) ||
              (filtro === 'avaliadas' && avaliadasFiltered.length === 0) ||
              (filtro === 'todas' && pendentesFiltered.length === 0 && avaliadasFiltered.length === 0)) && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-white/50 text-sm">
                  Nenhuma entrega encontrada com os filtros selecionados
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Componente do card de entrega
interface EntregaCardProps {
  entrega: Entrega;
  tipo: 'pendente' | 'avaliada';
  casaColor: string;
  onClick: () => void;
}

const EntregaCard = ({ entrega, tipo, casaColor, onClick }: EntregaCardProps) => {
  const isPendente = tipo === 'pendente';

  // Calcular tempo de espera
  const tempoEspera = entrega.created_at 
    ? formatDistanceToNow(new Date(entrega.created_at), {
        addSuffix: false,
        locale: ptBR
      })
    : 'N/A';

  // Formatar data
  const formatarData = (data: string | null) => {
    if (!data) return 'N/A';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
  };

  const formatarDataHora = (data: string | null) => {
    if (!data) return 'N/A';
    const d = new Date(data);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Calcular pontos se aprovada
  const pontosCalculados = entrega.pontos_concedidos || 
    (entrega.nota && entrega.missao ? Math.round((entrega.nota / 10) * entrega.missao.pontos_base) : 0);

  return (
    <button
      onClick={onClick}
      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/10 transition-colors flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        {/* Missão */}
        <p className="text-white font-medium truncate flex items-center gap-2">
          <span className="text-base">📋</span>
          {entrega.missao?.titulo || 'Missão'}
        </p>
        
        {/* Aluno */}
        <p className="text-white/70 text-sm mt-1 flex items-center gap-2">
          <span>👤</span>
          <span className="truncate">{entrega.aluno?.full_name || 'Aluno'}</span>
          <span 
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${casaColor}30`, color: casaColor }}
          >
            {entrega.aluno?.serie || '?'}º{entrega.aluno?.turma || '?'}
          </span>
        </p>

        {/* Info */}
        {isPendente ? (
          <div className="mt-2 space-y-0.5">
            <p className="text-white/50 text-xs">
              📅 Entregue: {formatarDataHora(entrega.created_at)}
            </p>
            <p className="text-amber-400 text-xs font-medium">
              ⏰ Aguardando há {tempoEspera}
            </p>
          </div>
        ) : (
          <div className="mt-2 space-y-0.5">
            <p className="text-green-400 text-sm font-medium">
              ⭐ Nota: {entrega.nota}/10 • {pontosCalculados} pts
            </p>
            <p className="text-white/50 text-xs">
              📅 Avaliado: {formatarData(entrega.data_avaliacao)}
            </p>
            {entrega.status === 'refazer' && (
              <span className="inline-block text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded mt-1">
                Precisa refazer
              </span>
            )}
          </div>
        )}
      </div>

      <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0" />
    </button>
  );
};

export default EntregasPage;
