import { Plus, Clock, ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';

interface MissaoUrgente {
  id: string;
  titulo: string;
  semana: number | null;
  tipo_missao: string | null;
  serie_filtro: number | null;
  data_prazo: string;
  inteligencia_cross_rel: {
    nome: string;
    emoji: string;
  } | null;
}

const MissoesPage = () => {
  const navigate = useNavigate();
  const { casaMentor, casaColor, profile } = useProfessor();

  // Contar missões liberadas por série
  const { data: contagemPorSerie } = useQuery({
    queryKey: ['contagem-missoes-serie', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missoes')
        .select('serie_filtro')
        .eq('casa_id', casaMentor!.id)
        .eq('institution_id', profile!.institution_id!)
        .eq('status', 'liberada');

      if (error) throw error;

      const contagem: Record<number, number> = { 6: 0, 7: 0, 8: 0, 9: 0 };
      data?.forEach(m => {
        if (m.serie_filtro) {
          contagem[m.serie_filtro] = (contagem[m.serie_filtro] || 0) + 1;
        } else {
          // Missão para todas as séries
          [6, 7, 8, 9].forEach(s => contagem[s]++);
        }
      });
      return contagem;
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });

  // Missões urgentes (prazo < 7 dias)
  const { data: missoesUrgentes } = useQuery({
    queryKey: ['missoes-urgentes', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      const hoje = new Date();
      const em7dias = new Date();
      em7dias.setDate(hoje.getDate() + 7);

      const { data, error } = await supabase
        .from('missoes')
        .select(`
          id,
          titulo,
          semana,
          tipo_missao,
          serie_filtro,
          data_prazo,
          inteligencia_cross_rel:inteligencias!missoes_inteligencia_cross_fkey(nome, emoji)
        `)
        .eq('casa_id', casaMentor!.id)
        .eq('institution_id', profile!.institution_id!)
        .eq('status', 'liberada')
        .gte('data_prazo', hoje.toISOString())
        .lte('data_prazo', em7dias.toISOString())
        .order('data_prazo', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data as MissaoUrgente[];
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });

  // Calcular dias restantes
  const getDiasRestantes = (dataPrazo: string) => {
    return differenceInDays(new Date(dataPrazo), new Date());
  };

  // Cor e emoji do indicador de urgência
  const getIndicadorUrgencia = (dias: number) => {
    if (dias <= 2) return { cor: 'text-red-400', emoji: '🔴' };
    if (dias <= 5) return { cor: 'text-yellow-400', emoji: '🟡' };
    return { cor: 'text-green-400', emoji: '🟢' };
  };

  // Formatar título do card urgente
  const formatTituloUrgente = (missao: MissaoUrgente) => {
    let titulo = `Semana ${missao.semana || '?'} - ${
      missao.tipo_missao === 'individual' ? 'Individual' : 'Geral'
    }`;
    if (missao.inteligencia_cross_rel) {
      titulo += ` ${missao.inteligencia_cross_rel.emoji}`;
    }
    return titulo;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Missões</h1>
        <button
          onClick={() => navigate('/professor/missoes/nova')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{ backgroundColor: casaColor, color: '#fff' }}
        >
          <Plus size={18} />
          Nova
        </button>
      </div>

      {/* Selecione a Série */}
      <div>
        <p className="text-white/40 text-sm uppercase tracking-wide mb-3">
          Selecione a Série
        </p>

        <div className="grid grid-cols-2 gap-3">
          {[6, 7, 8, 9].map((serie) => (
            <button
              key={serie}
              onClick={() => navigate(`/professor/missoes/serie/${serie}`)}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-colors border border-white/5"
            >
              <p className="text-2xl font-bold text-white">{serie}º</p>
              <p className="text-white/60 text-sm">ANO</p>
              <p 
                className="text-xs mt-1 font-medium"
                style={{ color: casaColor }}
              >
                {contagemPorSerie?.[serie] || 0} ativas
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Prazos se Esgotando */}
      {missoesUrgentes && missoesUrgentes.length > 0 && (
        <div>
          <p className="text-white/40 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock size={14} />
            Prazos se Esgotando
          </p>

          <div className="space-y-2">
            {missoesUrgentes.map((missao) => {
              const dias = getDiasRestantes(missao.data_prazo);
              const indicador = getIndicadorUrgencia(dias);
              
              return (
                <Link
                  key={missao.id}
                  to={`/professor/missoes/${missao.id}`}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-lg">{indicador.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {formatTituloUrgente(missao)}
                      </p>
                      <p className="text-white/40 text-sm">
                        {missao.serie_filtro ? `${missao.serie_filtro}º ano` : 'Todas as séries'} • 
                        Vence em {dias} dia{dias !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-white/30 ml-2 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state quando não há missões */}
      {contagemPorSerie && 
       Object.values(contagemPorSerie).every(v => v === 0) && 
       (!missoesUrgentes || missoesUrgentes.length === 0) && (
        <div className="text-center py-8">
          <p className="text-white/40 text-sm">
            Nenhuma missão ativa no momento
          </p>
        </div>
      )}
    </div>
  );
};

export default MissoesPage;
