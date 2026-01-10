import { ClipboardList, Plus, ChevronRight, Calendar, Award } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Missao {
  id: string;
  titulo: string;
  descricao: string | null;
  status: string | null;
  tipo: string;
  pontos_base: number;
  data_prazo: string;
  data_criacao: string | null;
}

interface MissaoCardProps {
  missao: Missao;
  casaColor: string;
}

const MissaoCard = ({ missao, casaColor }: MissaoCardProps) => {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    liberada: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Liberada' },
    rascunho: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Rascunho' },
    encerrada: { bg: 'bg-white/10', text: 'text-white/40', label: 'Encerrada' }
  };

  const status = statusConfig[missao.status || 'rascunho'] || statusConfig.rascunho;

  return (
    <Link
      to={`/professor/missoes/${missao.id}`}
      className="block p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate">{missao.titulo}</h3>
          {missao.descricao && (
            <p className="text-white/40 text-sm mt-1 line-clamp-2">
              {missao.descricao}
            </p>
          )}
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.text} whitespace-nowrap`}>
          {status.label}
        </span>
      </div>
      
      <div className="flex items-center gap-4 mt-3 text-white/40 text-xs">
        <span className="flex items-center gap-1">
          <Award size={12} />
          {missao.pontos_base} pts
        </span>
        <span className="capitalize">{missao.tipo}</span>
        {missao.data_prazo && (
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {format(new Date(missao.data_prazo), "dd/MM", { locale: ptBR })}
          </span>
        )}
        <ChevronRight size={16} className="ml-auto" />
      </div>
    </Link>
  );
};

const MissoesPage = () => {
  const navigate = useNavigate();
  const { casaMentor, casaColor, profile } = useProfessor();

  const { data: missoes, isLoading, error } = useQuery({
    queryKey: ['missoes-professor', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missoes')
        .select('*')
        .eq('casa_id', casaMentor!.id)
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      return data as Missao[];
    },
    enabled: !!casaMentor?.id
  });

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Missões</h1>
        <button
          onClick={() => navigate('/professor/missoes/nova')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: casaColor,
            color: '#fff'
          }}
        >
          <Plus size={18} />
          Nova
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          Erro ao carregar missões
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && missoes?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: `${casaColor}20` }}
          >
            <ClipboardList size={40} style={{ color: casaColor }} />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            Nenhuma missão criada
          </h2>
          <p className="text-white/50 text-sm mb-6 max-w-xs">
            Crie sua primeira missão para os alunos da sua casa
          </p>
          <button
            onClick={() => navigate('/professor/missoes/nova')}
            className="px-6 py-3 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: casaColor,
              color: '#fff'
            }}
          >
            Criar Primeira Missão
          </button>
        </div>
      )}

      {/* Missions List */}
      {!isLoading && !error && missoes && missoes.length > 0 && (
        <div className="space-y-3">
          {missoes.map((missao) => (
            <MissaoCard key={missao.id} missao={missao} casaColor={casaColor} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MissoesPage;
