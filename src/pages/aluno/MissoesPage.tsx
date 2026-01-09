import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Missao {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  pontos_base: number;
  data_prazo: string;
  data_liberacao: string;
  casa_id: number | null;
  casa_nome: string | null;
  casa_emoji: string | null;
  casa_cor: string | null;
  status_entrega: string;
  ja_entregou: boolean;
  atrasada: boolean;
}

const MissoesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, casa, casaColor, ranking, isLoading: contextLoading } = useStudent();
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMissoes = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase.rpc('get_missoes_do_aluno', {
          p_aluno_id: user.id,
        });

        if (error) throw error;
        setMissoes(data || []);
      } catch (err) {
        console.error('Error fetching missoes:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMissoes();
  }, [user?.id]);

  const pendentes = missoes.filter(m => !m.ja_entregou);
  const concluidas = missoes.filter(m => m.ja_entregou);

  const getTimeRemaining = (prazo: string) => {
    const date = new Date(prazo);
    if (date < new Date()) return 'Atrasada';
    return formatDistanceToNow(date, { locale: ptBR, addSuffix: false });
  };

  const firstName = profile?.nome || profile?.full_name?.split(' ')[0] || 'Aluno';

  if (contextLoading || isLoading) {
    return (
      <div className="py-6 space-y-6">
        {/* Skeleton loader */}
        <div className="space-y-4">
          <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
          <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">
          Olá, {firstName}! 👋
        </h1>
        {casa && (
          <p className="text-white/60 flex items-center gap-2 mt-1">
            <span>{casa.emoji}</span>
            <span>Casa {casa.nome}</span>
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="p-4 rounded-xl border border-white/10 bg-white/5 text-center"
          style={{ borderColor: `${casaColor}30` }}
        >
          <div className="text-2xl font-bold" style={{ color: casaColor }}>
            {ranking.total_pontos}
          </div>
          <div className="text-xs text-white/60">pontos</div>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-center">
          <div className="text-2xl font-bold text-white">
            {pendentes.length}/{missoes.length}
          </div>
          <div className="text-xs text-white/60">missões</div>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-center">
          <div className="text-2xl font-bold text-white">
            #{ranking.posicao_na_casa || '-'}
          </div>
          <div className="text-xs text-white/60">na casa</div>
        </div>
      </div>

      {/* Pending Missions */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          🎯 Missões Pendentes
          {pendentes.length > 0 && (
            <span className="text-sm font-normal text-white/60">({pendentes.length})</span>
          )}
        </h2>
        {pendentes.length === 0 ? (
          <div className="p-6 rounded-xl border border-white/10 bg-white/5 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p className="text-white/60">Todas as missões concluídas!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendentes.map(missao => (
              <button
                key={missao.id}
                onClick={() => navigate(`/aluno/missoes/${missao.id}`)}
                className={cn(
                  'w-full p-4 rounded-xl border bg-white/5 text-left transition-all',
                  'hover:bg-white/10 active:scale-[0.98]',
                  missao.atrasada ? 'border-red-500/50' : 'border-white/10'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{missao.titulo}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-white/60">
                      <span className="capitalize">{missao.tipo}</span>
                      <span>•</span>
                      <span style={{ color: casaColor }}>{missao.pontos_base} pts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'flex items-center gap-1 text-sm px-2 py-1 rounded-full',
                      missao.atrasada ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/60'
                    )}>
                      {missao.atrasada ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>{getTimeRemaining(missao.data_prazo)}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Completed Missions */}
      {concluidas.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            ✅ Concluídas
            <span className="text-sm font-normal text-white/60">({concluidas.length})</span>
          </h2>
          <div className="space-y-3">
            {concluidas.slice(0, 3).map(missao => (
              <button
                key={missao.id}
                onClick={() => navigate(`/aluno/missoes/${missao.id}`)}
                className="w-full p-4 rounded-xl border border-white/10 bg-white/5 text-left opacity-60 hover:opacity-80 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{missao.titulo}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-white/60">
                      <span className="capitalize">{missao.tipo}</span>
                      <span>•</span>
                      <span className="text-green-400">{missao.status_entrega}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/40" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default MissoesPage;
