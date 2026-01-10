import { ArrowLeft, Plus, Check } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Missao {
  id: string;
  titulo: string;
  semana: number | null;
  tipo_missao: string | null;
  turma_filtro: string | null;
  data_prazo: string;
  status: string | null;
  inteligencia_cross_rel: {
    nome: string;
    emoji: string;
    cor_hex: string;
  } | null;
}

const MissoesSeriePage = () => {
  const { serie } = useParams<{ serie: string }>();
  const navigate = useNavigate();
  const { casaMentor, casaColor, profile, faseAtual } = useProfessor();

  const { data: missoes, isLoading } = useQuery({
    queryKey: ['missoes-serie', serie, casaMentor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missoes')
        .select(`
          id,
          titulo,
          semana,
          tipo_missao,
          turma_filtro,
          data_prazo,
          status,
          inteligencia_cross_rel:inteligencias!missoes_inteligencia_cross_fkey(nome, emoji, cor_hex)
        `)
        .eq('casa_id', casaMentor!.id)
        .eq('institution_id', profile!.institution_id!)
        .or(`serie_filtro.eq.${serie},serie_filtro.is.null`)
        .order('semana', { ascending: true, nullsFirst: false })
        .order('tipo_missao', { ascending: true });

      if (error) throw error;
      return data as Missao[];
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id && !!serie
  });

  // Formatar título do card
  const formatTituloCard = (missao: Missao) => {
    let titulo = `Semana ${missao.semana || '?'} - ${
      missao.tipo_missao === 'individual' ? 'Individual' : 'Geral'
    }`;
    
    if (missao.inteligencia_cross_rel) {
      titulo += ` - ${missao.inteligencia_cross_rel.nome} ${missao.inteligencia_cross_rel.emoji}`;
    }
    
    return titulo;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header com voltar */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate('/professor/missoes')}
          className="p-2 -ml-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-white flex-1">{serie}º Ano</h1>
        <button
          onClick={() => navigate('/professor/missoes/nova')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{ backgroundColor: casaColor, color: '#fff' }}
        >
          <Plus size={18} />
          Nova
        </button>
      </div>

      {/* Fase atual */}
      {faseAtual && (
        <p className="text-white/40 text-sm">
          {faseAtual.inteligencia?.emoji} FASE {faseAtual.inteligencia?.nome?.toUpperCase()} • Semanas 1-4
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Lista de missões */}
      {!isLoading && missoes && missoes.length > 0 && (
        <div className="space-y-2">
          {missoes.map((missao) => (
            <Link
              key={missao.id}
              to={`/professor/missoes/${missao.id}`}
              className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium truncate">{formatTituloCard(missao)}</p>
                <p className="text-white/40 text-sm mt-0.5">
                  Turmas: {missao.turma_filtro || 'Todas'} • Prazo: {format(new Date(missao.data_prazo), 'dd/MM', { locale: ptBR })}
                </p>
              </div>
              
              {/* Indicador de status */}
              {missao.status === 'liberada' && (
                <span className="text-green-400 ml-3">
                  <Check size={18} />
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && missoes?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: `${casaColor}20` }}
          >
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-white/60 mb-4">Nenhuma missão para o {serie}º ano</p>
          <button
            onClick={() => navigate('/professor/missoes/nova')}
            className="px-4 py-2 rounded-lg font-medium text-sm"
            style={{ backgroundColor: casaColor, color: '#fff' }}
          >
            Criar primeira missão
          </button>
        </div>
      )}
    </div>
  );
};

export default MissoesSeriePage;
