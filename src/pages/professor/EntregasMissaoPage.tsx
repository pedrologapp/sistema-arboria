import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const EntregasMissaoPage = () => {
  const { missaoId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serieFilter = searchParams.get('serie');

  // Buscar dados da missão
  const { data: missao } = useQuery({
    queryKey: ['missao', missaoId],
    queryFn: async () => {
      const { data } = await supabase
        .from('missoes')
        .select('id, titulo, pontos_base, semana, tipo_missao, casa_id, serie_filtro')
        .eq('id', missaoId!)
        .single();
      return data;
    },
    enabled: !!missaoId
  });

  // Buscar entregas da missão
  const { data: entregas, isLoading } = useQuery({
    queryKey: ['entregas-missao', missaoId, serieFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from('entregas')
        .select(`
          id,
          status,
          nota,
          pontos_concedidos,
          created_at,
          data_avaliacao,
          aluno:profiles!entregas_aluno_id_fkey(
            id,
            full_name,
            serie,
            turma,
            avatar_url
          )
        `)
        .eq('missao_id', missaoId!)
        .order('created_at', { ascending: true });

      // Filtrar por série se especificado
      if (serieFilter) {
        return data?.filter(e => {
          const alunoSerie = parseInt(e.aluno?.serie?.replace(/\D/g, '') || '0');
          return alunoSerie === Number(serieFilter);
        }) || [];
      }

      return data || [];
    },
    enabled: !!missaoId
  });

  // Separar pendentes e avaliadas
  const pendentes = entregas?.filter(e => e.status === 'pendente' || e.nota === null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || [];
  
  const avaliadas = entregas?.filter(e => e.nota !== null) || [];

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button 
          onClick={() => {
            if (serieFilter && missao?.semana) {
              const isGeral = missao.tipo_missao === 'geral' || !missao.tipo_missao;
              if (isGeral) {
                navigate(`/professor/entregas/serie/${serieFilter}/semana/${missao.semana}/geral`);
              } else if (missao.casa_id) {
                navigate(`/professor/entregas/serie/${serieFilter}/semana/${missao.semana}/casa/${missao.casa_id}`);
              } else {
                navigate(-1);
              }
            } else {
              navigate(-1);
            }
          }} 
          className="text-white/60 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white truncate">{missao?.titulo || 'Carregando...'}</h1>
          {serieFilter && (
            <p className="text-white/40 text-sm">{serieFilter}º Ano</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Pendentes */}
          {pendentes.length > 0 && (
            <div>
              <h2 className="text-red-400 font-medium mb-3 flex items-center gap-2">
                🔴 Pendentes ({pendentes.length})
              </h2>
              <div className="space-y-2">
                {pendentes.map((entrega) => (
                  <EntregaCard
                    key={entrega.id}
                    entrega={entrega}
                    tipo="pendente"
                    pontosBase={missao?.pontos_base || 100}
                    onClick={() => navigate(`/professor/entregas/${entrega.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Avaliadas */}
          {avaliadas.length > 0 && (
            <div>
              <h2 className="text-green-400 font-medium mb-3 flex items-center gap-2">
                ✅ Avaliadas ({avaliadas.length})
              </h2>
              <div className="space-y-2">
                {avaliadas.map((entrega) => (
                  <EntregaCard
                    key={entrega.id}
                    entrega={entrega}
                    tipo="avaliada"
                    pontosBase={missao?.pontos_base || 100}
                    onClick={() => navigate(`/professor/entregas/${entrega.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {entregas?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-white/40">Nenhuma entrega para esta missão</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Componente do card de entrega
interface EntregaCardProps {
  entrega: {
    id: string;
    status: string | null;
    nota: number | null;
    pontos_concedidos: number | null;
    created_at: string | null;
    data_avaliacao: string | null;
    aluno: {
      id: string;
      full_name: string | null;
      serie: string | null;
      turma: string | null;
      avatar_url: string | null;
    } | null;
  };
  tipo: 'pendente' | 'avaliada';
  pontosBase: number;
  onClick: () => void;
}

const EntregaCard = ({ entrega, tipo, pontosBase, onClick }: EntregaCardProps) => {
  const isPendente = tipo === 'pendente';

  // Calcular tempo de espera
  const tempoEspera = entrega.created_at 
    ? formatDistanceToNow(new Date(entrega.created_at), {
        addSuffix: false,
        locale: ptBR
      })
    : '';

  // Calcular pontos
  const pontosCalculados = entrega.pontos_concedidos || 
    (entrega.nota ? Math.round((entrega.nota / 10) * pontosBase) : 0);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl text-left transition-colors flex items-center justify-between gap-3",
        isPendente 
          ? "bg-red-500/5 border border-red-500/20 hover:bg-red-500/10"
          : "bg-green-500/5 border border-green-500/20 hover:bg-green-500/10"
      )}
    >
      <div className="flex-1 min-w-0">
        {/* Aluno */}
        <p className="text-white font-medium truncate">
          👤 {entrega.aluno?.full_name || 'Aluno'}
        </p>
        <p className="text-white/40 text-sm">
          {entrega.aluno?.serie}º{entrega.aluno?.turma}
        </p>

        {/* Info */}
        {isPendente ? (
          <div className="mt-2 text-sm">
            <p className="text-white/40">
              📅 Entregue: {entrega.created_at 
                ? new Date(entrega.created_at).toLocaleDateString('pt-BR') 
                : 'N/A'}
            </p>
            <p className="text-amber-400">
              ⏰ Aguardando há {tempoEspera}
            </p>
          </div>
        ) : (
          <div className="mt-2 text-sm">
            <p className="text-green-400">
              ⭐ Nota: {entrega.nota}/10 • {pontosCalculados} pts
            </p>
            <p className="text-white/40">
              📅 Avaliado: {entrega.data_avaliacao 
                ? new Date(entrega.data_avaliacao).toLocaleDateString('pt-BR')
                : 'N/A'}
            </p>
          </div>
        )}
      </div>

      <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0" />
    </button>
  );
};

export default EntregasMissaoPage;
