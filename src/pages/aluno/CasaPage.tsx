import { useEffect, useState } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface RankingMembro {
  aluno_id: string;
  aluno_nome: string;
  total_pontos: number;
  posicao_na_casa: number;
}

const CasaPage = () => {
  const { user } = useAuth();
  const { casa, casaColor, inteligenciaScores, ranking, isLoading: contextLoading } = useStudent();
  const [membros, setMembros] = useState<RankingMembro[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      if (!casa?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('ranking_alunos_por_casa')
          .select('aluno_id, aluno_nome, total_pontos, posicao_na_casa')
          .eq('casa_id', casa.id)
          .order('posicao_na_casa', { ascending: true })
          .limit(10);

        if (error) throw error;
        setMembros(data || []);
      } catch (err) {
        console.error('Error fetching ranking:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!contextLoading) {
      fetchRanking();
    }
  }, [casa?.id, contextLoading]);

  if (contextLoading || isLoading) {
    return (
      <div className="py-6 space-y-6">
        <div className="h-24 bg-white/10 rounded-xl animate-pulse" />
        <div className="h-64 bg-white/10 rounded-xl animate-pulse" />
        <div className="h-48 bg-white/10 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!casa) {
    return (
      <div className="py-6">
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 text-center">
          <p className="text-white/60">Você ainda não foi atribuído a uma casa.</p>
        </div>
      </div>
    );
  }

  // Find max score for radar chart scaling
  const maxScore = Math.max(...inteligenciaScores.map(s => s.score_atual), 100);

  return (
    <div className="py-6 space-y-6">
      {/* Casa Header */}
      <div
        className="p-6 rounded-xl border"
        style={{
          borderColor: `${casaColor}40`,
          background: `linear-gradient(135deg, ${casaColor}10 0%, transparent 100%)`,
        }}
      >
        <div className="flex items-center gap-4">
          <span className="text-5xl">{casa.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold">Casa {casa.nome}</h1>
            <p className="text-white/60 text-sm">{casa.descricao}</p>
          </div>
        </div>
      </div>

      {/* Ranking */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: casaColor }} />
          Ranking da Casa
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          {membros.map((membro, index) => {
            const isCurrentUser = membro.aluno_id === user?.id;
            const isTop3 = index < 3;

            return (
              <div
                key={membro.aluno_id}
                className={cn(
                  'flex items-center gap-3 p-3 border-b border-white/5 last:border-0',
                  isCurrentUser && 'bg-white/10'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    isTop3 ? 'text-black' : 'text-white/60 bg-white/10'
                  )}
                  style={{
                    backgroundColor: isTop3 ? casaColor : undefined,
                  }}
                >
                  {membro.posicao_na_casa}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-medium truncate', isCurrentUser && 'text-white')}>
                    {membro.aluno_nome}
                    {isCurrentUser && <span className="text-white/60 ml-2">(você)</span>}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-semibold" style={{ color: casaColor }}>
                    {membro.total_pontos || 0}
                  </span>
                  <span className="text-white/40 text-sm ml-1">pts</span>
                </div>
              </div>
            );
          })}
          {membros.length === 0 && (
            <div className="p-6 text-center text-white/60">
              Nenhum membro no ranking ainda.
            </div>
          )}
        </div>
      </section>

      {/* Intelligence Profile */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" style={{ color: casaColor }} />
          Meu Perfil de Inteligências
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="space-y-3">
            {inteligenciaScores.map(score => {
              const percentage = (score.score_atual / maxScore) * 100;
              const isMyCasa = score.eh_casa_do_aluno;

              return (
                <div key={score.inteligencia_id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{score.inteligencia_emoji}</span>
                      <span className={cn('text-sm', isMyCasa ? 'font-semibold' : 'text-white/80')}>
                        {score.inteligencia_nome}
                      </span>
                      {isMyCasa && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/10">Minha Casa</span>
                      )}
                    </div>
                    <span className="text-sm text-white/60">{Math.round(score.score_atual)}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: score.inteligencia_cor || casaColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {inteligenciaScores.length === 0 && (
            <div className="text-center text-white/60 py-4">
              Seu perfil de inteligências será construído ao longo do ano.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default CasaPage;
