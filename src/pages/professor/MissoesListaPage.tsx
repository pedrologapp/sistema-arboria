import { ArrowLeft, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CasaBrasao } from '@/components/CasaBrasao';

interface Missao {
  id: string;
  titulo: string;
  descricao: string | null;
  pontos_base: number;
  data_prazo: string;
  entregas: { count: number }[];
}

interface Inteligencia {
  id: number;
  nome: string;
  emoji: string;
  cor_hex: string;
  brasao_url: string | null;
}

const MissoesListaPage = () => {
  const { serie, semana, casaId } = useParams<{ serie: string; semana: string; casaId?: string }>();
  const navigate = useNavigate();
  const { casaMentor, casaColor, profile } = useProfessor();

  const isGeral = !casaId;
  const tipoMissao = isGeral ? 'geral' : 'individual';

  // Buscar dados da casa (se for individual)
  const { data: casa } = useQuery({
    queryKey: ['casa-info', casaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex, brasao_url')
        .eq('id', Number(casaId))
        .single();
      if (error) throw error;
      return data as Inteligencia;
    },
    enabled: !!casaId
  });

  // Buscar missões
  const { data: missoes, isLoading } = useQuery({
    queryKey: ['missoes-lista', serie, semana, casaId, tipoMissao, profile?.institution_id, casaMentor?.id],
    queryFn: async () => {
      let query = supabase
        .from('missoes')
        .select(`
          id,
          titulo,
          descricao,
          pontos_base,
          data_prazo,
          entregas(count)
        `)
        .eq('institution_id', profile!.institution_id!)
        .eq('casa_id', casaMentor!.id)
        .eq('semana', Number(semana))
        .eq('tipo_missao', tipoMissao)
        .or(`serie_filtro.eq.${serie},serie_filtro.is.null`);

      // Se for individual, filtrar pela casa específica
      if (!isGeral && casaId) {
        query = query.eq('inteligencia_cross', Number(casaId));
      }

      const { data, error } = await query.order('data_prazo', { ascending: true });

      if (error) throw error;
      return data as Missao[];
    },
    enabled: !!profile?.institution_id && !!casaMentor?.id && !!serie && !!semana
  });

  // Contar alunos elegíveis
  const { data: totalAlunos } = useQuery({
    queryKey: ['total-alunos-lista', serie, casaId, isGeral, profile?.institution_id, casaMentor?.id],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', profile!.institution_id!)
        .not('casa_id', 'is', null)
        .ilike('serie', `%${serie}%`);

      // Para missões individuais, contar apenas alunos da casa específica
      if (!isGeral && casaId) {
        query = query.eq('casa_id', Number(casaId));
      } else {
        // Para missões gerais, contar alunos da casa do mentor
        query = query.eq('casa_id', casaMentor!.id);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.institution_id && !!casaMentor?.id && !!serie
  });

  const getEntregasCount = (missao: Missao) => {
    if (!missao.entregas || missao.entregas.length === 0) return 0;
    return missao.entregas[0]?.count || 0;
  };

  // Header com brasão
  const renderHeaderIcon = () => {
    if (isGeral) return <span className="text-xl mr-1">📋</span>;
    return (
      <CasaBrasao 
        brasaoUrl={casa?.brasao_url}
        emoji={casa?.emoji}
        nome={casa?.nome}
        size="medium"
        className="mr-2"
      />
    );
  };

  const headerTitle = isGeral 
    ? `Geral • Semana ${semana}` 
    : `${casa?.nome || ''} • Semana ${semana}`;

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-white flex-1 flex items-center">
          {renderHeaderIcon()}
          {headerTitle}
        </h1>
        <button
          onClick={() => navigate('/professor/missoes/nova')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{ backgroundColor: casaColor, color: '#fff' }}
        >
          <Plus size={16} />
          Nova
        </button>
      </div>

      {/* Subtítulo */}
      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-white/40 text-sm">
          {serie}º ano • {missoes?.length || 0} {missoes?.length === 1 ? 'missão' : 'missões'}
        </p>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-28 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-28 bg-white/5 rounded-xl animate-pulse" />
          </div>
        ) : missoes?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${casaColor}20` }}
            >
              {isGeral ? (
                <span className="text-2xl">📋</span>
              ) : (
                <CasaBrasao 
                  brasaoUrl={casa?.brasao_url}
                  emoji={casa?.emoji}
                  nome={casa?.nome}
                  size="large"
                />
              )}
            </div>
            <p className="text-white/60 mb-4">
              Nenhuma missão {isGeral ? 'geral' : `de ${casa?.nome}`} encontrada
            </p>
            <button
              onClick={() => navigate('/professor/missoes/nova')}
              className="px-4 py-2 rounded-lg font-medium text-sm"
              style={{ backgroundColor: casaColor, color: '#fff' }}
            >
              + Criar missão
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {missoes?.map((missao) => {
              const entregasCount = getEntregasCount(missao);
              const porcentagem = totalAlunos && totalAlunos > 0 
                ? Math.round((entregasCount / totalAlunos) * 100) 
                : 0;

              return (
                <button
                  key={missao.id}
                  onClick={() => navigate(`/professor/missoes/${missao.id}`)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-colors"
                >
                  {/* Título */}
                  <h3 className="text-white font-medium mb-2">{missao.titulo}</h3>
                  
                  {/* Descrição truncada */}
                  {missao.descricao && (
                    <p className="text-white/40 text-sm line-clamp-2 mb-3">
                      {missao.descricao}
                    </p>
                  )}
                  
                  {/* Barra de progresso */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                      <span>{entregasCount}/{totalAlunos} entregaram</span>
                      <span>{porcentagem}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          porcentagem >= 80 ? "bg-green-500" :
                          porcentagem >= 50 ? "bg-yellow-500" :
                          "bg-red-500"
                        )}
                        style={{ width: `${porcentagem}%` }}
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex items-center gap-3 text-white/30 text-xs">
                    <span>{missao.pontos_base} pts</span>
                    <span>•</span>
                    <span>Prazo: {new Date(missao.data_prazo).toLocaleDateString('pt-BR')}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MissoesListaPage;
