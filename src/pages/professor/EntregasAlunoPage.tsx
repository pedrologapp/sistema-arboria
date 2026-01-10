import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EntregasAlunoPage = () => {
  const { alunoId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const serie = searchParams.get('serie');
  const semana = searchParams.get('semana');
  const tipo = searchParams.get('tipo');
  const casaId = searchParams.get('casaId');

  const isExtra = semana === 'extra';
  const semanaNumber = isExtra ? 0 : Number(semana);

  // Buscar dados do aluno
  const { data: aluno } = useQuery({
    queryKey: ['aluno', alunoId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, serie, turma, avatar_url')
        .eq('id', alunoId)
        .maybeSingle();
      return data;
    },
    enabled: !!alunoId
  });

  // Buscar entregas do aluno para avaliar
  const { data: entregas, isLoading } = useQuery({
    queryKey: ['entregas-aluno', alunoId, serie, semana, tipo, casaId],
    queryFn: async () => {
      // 1. Buscar missões da semana/tipo
      let missoesQuery = supabase
        .from('missoes')
        .select('id, titulo, tipo_missao, pontos_base')
        .eq('semana', semanaNumber);

      // Filtrar por série
      if (serie) {
        missoesQuery = missoesQuery.or(`serie_filtro.eq.${serie},serie_filtro.is.null`);
      }

      if (tipo === 'geral') {
        missoesQuery = missoesQuery.or('tipo_missao.eq.geral,tipo_missao.is.null');
      } else if (casaId) {
        missoesQuery = missoesQuery.eq('tipo_missao', 'individual').eq('casa_id', Number(casaId));
      }

      const { data: missoes } = await missoesQuery;
      const missaoIds = missoes?.map(m => m.id) || [];

      if (missaoIds.length === 0) return [];

      // 2. Buscar entregas do aluno
      const { data } = await supabase
        .from('entregas')
        .select(`
          id,
          status,
          nota,
          pontos_concedidos,
          created_at,
          texto_resposta,
          missao:missoes(id, titulo, tipo_missao, pontos_base)
        `)
        .eq('aluno_id', alunoId)
        .in('missao_id', missaoIds)
        .order('created_at', { ascending: false });

      return data || [];
    },
    enabled: !!alunoId
  });

  const entregasPendentes = entregas?.filter(e => e.nota === null) || [];
  const entregasAvaliadas = entregas?.filter(e => e.nota !== null) || [];

  // URL para voltar
  const voltarUrl = tipo === 'casa' && casaId
    ? `/professor/entregas/serie/${serie}/semana/${semana}/casa/${casaId}`
    : `/professor/entregas/serie/${serie}/semana/${semana}/geral`;

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-24">
      {/* Header com dados do aluno */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(voltarUrl)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Avatar */}
          {aluno?.avatar_url ? (
            <img
              src={aluno.avatar_url}
              alt={aluno.nome || ''}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {aluno?.nome?.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <p className="text-white font-medium">
              {aluno?.nome} {aluno?.sobrenome}
            </p>
            <p className="text-white/40 text-xs">
              {aluno?.serie} • Turma {aluno?.turma}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      ) : (
        <>
          {/* Seção Pendentes */}
          {entregasPendentes.length > 0 && (
            <div className="p-4">
              <p className="text-red-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                🔴 Pendentes de Avaliação ({entregasPendentes.length})
              </p>
              <div className="space-y-3">
                {entregasPendentes.map(entrega => (
                  <button
                    key={entrega.id}
                    onClick={() => navigate(`/professor/entregas/${entrega.id}`)}
                    className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-left hover:bg-red-500/20 transition-colors"
                  >
                    <p className="text-white font-medium">{entrega.missao?.titulo}</p>
                    <p className="text-white/40 text-sm mt-1">
                      {entrega.missao?.tipo_missao === 'geral' ? '📋 Geral' : '🏠 Individual'} • {entrega.missao?.pontos_base} pts
                    </p>
                    <p className="text-white/40 text-xs mt-2">
                      Entregue em {format(new Date(entrega.created_at!), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Seção Avaliadas */}
          {entregasAvaliadas.length > 0 && (
            <div className="p-4">
              <p className="text-green-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                🟢 Avaliadas ({entregasAvaliadas.length})
              </p>
              <div className="space-y-3">
                {entregasAvaliadas.map(entrega => (
                  <button
                    key={entrega.id}
                    onClick={() => navigate(`/professor/entregas/${entrega.id}`)}
                    className="w-full p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-left hover:bg-green-500/20 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">{entrega.missao?.titulo}</p>
                        <p className="text-white/40 text-sm mt-1">
                          {entrega.missao?.tipo_missao === 'geral' ? '📋 Geral' : '🏠 Individual'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">{entrega.nota}/10</p>
                        <p className="text-green-400/60 text-xs">+{entrega.pontos_concedidos} pts</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sem entregas */}
          {entregas?.length === 0 && (
            <div className="p-4">
              <div className="text-center py-12">
                <p className="text-4xl mb-2">📭</p>
                <p className="text-white/40">Este aluno não enviou entregas para estas missões</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EntregasAlunoPage;
