import { useEffect, useState, useCallback } from 'react';
import { Trophy, Users, BookOpen, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { CasaBrasao } from '@/components/CasaBrasao';
import { motion } from 'framer-motion';

interface RankingMembro {
  aluno_id: string;
  aluno_nome: string;
  total_pontos: number;
  posicao_na_casa: number;
}

interface RankingCasa {
  casa_id: number;
  casa_nome: string;
  casa_emoji: string | null;
  casa_cor: string | null;
  total_pontos: number;
  posicao: number;
  total_alunos_ativos: number;
}

// Descrições padrão para cada inteligência
const descricoesPadrao: Record<string, string> = {
  'linguistica': 'Somos especialistas em palavras, comunicação e expressão. Nossa casa valoriza a arte de contar histórias, escrever e debater ideias com eloquência.',
  'logico-matematica': 'Somos os mestres da lógica, números e resolução de problemas. Nossa casa se destaca pelo raciocínio analítico e pensamento estratégico.',
  'espacial': 'Somos visionários do espaço e da forma. Nossa casa domina a arte visual, a arquitetura mental e a capacidade de pensar em três dimensões.',
  'musical': 'Somos os guardiões do ritmo e da harmonia. Nossa casa vive e respira música, padrões sonoros e a arte de criar melodias.',
  'corporal-cinestesica': 'Somos atletas do corpo e da mente. Nossa casa celebra o movimento, a coordenação física e a expressão corporal.',
  'naturalista': 'Somos os exploradores da natureza. Nossa casa compreende o mundo natural, os padrões biológicos e a conexão com o meio ambiente.',
  'interpessoal': 'Somos especialistas em conexões humanas, trabalho em equipe e compreensão das emoções dos outros. Lideramos pelo exemplo e pela empatia.',
  'intrapessoal': 'Somos mestres do autoconhecimento. Nossa casa valoriza a reflexão, a compreensão de si mesmo e o crescimento pessoal.',
};

const CasaPage = () => {
  const { user } = useAuth();
  const { casa, casaColor, profile, isLoading: contextLoading, refreshData } = useStudent();
  const [membros, setMembros] = useState<RankingMembro[]>([]);
  const [rankingCasas, setRankingCasas] = useState<RankingCasa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!casa?.id || !profile?.institution_id) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch ranking das casas e membros em paralelo
      const [rankingCasasRes, membrosRes] = await Promise.all([
        supabase
          .from('ranking_casas')
          .select('casa_id, casa_nome, casa_emoji, casa_cor, total_pontos, posicao, total_alunos_ativos')
          .eq('institution_id', profile.institution_id)
          .order('posicao', { ascending: true }),
        supabase
          .from('ranking_alunos_por_casa')
          .select('aluno_id, aluno_nome, total_pontos, posicao_na_casa')
          .eq('casa_id', casa.id)
          .eq('institution_id', profile.institution_id)
          .order('posicao_na_casa', { ascending: true })
          .limit(50),
      ]);

      if (rankingCasasRes.error) throw rankingCasasRes.error;
      if (membrosRes.error) throw membrosRes.error;

      setRankingCasas(rankingCasasRes.data || []);
      setMembros(membrosRes.data || []);
    } catch (err) {
      console.error('Error fetching casa data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [casa?.id, profile?.institution_id]);

  useEffect(() => {
    if (!contextLoading) {
      fetchData();
    }
  }, [contextLoading, fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchData(), refreshData()]);
    setIsRefreshing(false);
  };

  if (contextLoading || isLoading) {
    return (
      <div className="py-6 space-y-6">
        <div className="h-48 bg-white/10 rounded-2xl animate-pulse" />
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

  // Find my house in ranking
  const myCasaRanking = rankingCasas.find(c => c.casa_id === casa.id);
  const posicaoCasa = myCasaRanking?.posicao || 0;
  const pontosTotaisCasa = myCasaRanking?.total_pontos || 0;
  const totalMembros = membros.length;

  // Max points for progress bar calculation
  const maxPontos = Math.max(...rankingCasas.map(c => c.total_pontos || 0), 1);

  // Get description
  const codigoNormalizado = casa.codigo?.toLowerCase().replace(/_/g, '-') || '';
  const descricao = casa.descricao || descricoesPadrao[codigoNormalizado] || 'Uma casa dedicada ao desenvolvimento desta inteligência única.';

  // Ordinal suffix
  const getOrdinalSuffix = (n: number) => n === 1 ? 'º' : 'º';

  return (
    <div className="py-6 space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/60 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          Atualizar
        </button>
      </div>

      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-2xl text-center relative overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${casaColor}50 0%, ${casaColor}15 100%)`,
          borderWidth: 1,
          borderColor: `${casaColor}40`,
        }}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${casaColor} 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10">
          {/* Large Brasão */}
          <div className="flex justify-center mb-4">
            <CasaBrasao
              brasaoUrl={casa.brasao_url}
              emoji={casa.emoji}
              nome={casa.nome}
              size="large"
              className="w-24 h-24"
            />
          </div>

          {/* House Name */}
          <h1 className="text-2xl font-bold mb-1">Casa {casa.nome}</h1>
          <p className="text-white/60 text-sm mb-4">{casa.codigo?.replace(/_/g, ' ')}</p>

          {/* Ranking Position */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-5 h-5" style={{ color: casaColor }} />
            <span className="text-lg font-medium">
              {posicaoCasa}{getOrdinalSuffix(posicaoCasa)} lugar no ranking
            </span>
          </div>

          {/* Total Points */}
          <p className="text-3xl font-bold" style={{ color: casaColor }}>
            {pontosTotaisCasa.toLocaleString('pt-BR')}
          </p>
          <p className="text-white/40 text-sm">pontos</p>
        </div>
      </motion.div>

      {/* Sobre Nossa Casa */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5" style={{ color: casaColor }} />
          Sobre Nossa Casa
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-white/80 leading-relaxed">{descricao}</p>
        </div>
      </motion.section>

      {/* Ranking das Casas */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: casaColor }} />
          Ranking das Casas
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          {rankingCasas.map((casaRank, index) => {
            const isMyHouse = casaRank.casa_id === casa?.id;
            const percentage = maxPontos > 0 ? (casaRank.total_pontos / maxPontos) * 100 : 0;

            return (
              <motion.div
                key={casaRank.casa_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg transition-all',
                  isMyHouse && 'bg-white/5'
                )}
                style={{
                  boxShadow: isMyHouse ? `0 0 0 2px ${casaColor}` : undefined,
                }}
              >
                {/* Position */}
                <span className="w-8 text-center font-bold text-white/60">
                  {casaRank.posicao}º
                </span>

                {/* Emoji */}
                <span className="text-xl w-8 text-center">
                  {casaRank.casa_emoji || '🏠'}
                </span>

                {/* Name and Progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-sm truncate', isMyHouse && 'font-semibold')}>
                      {casaRank.casa_nome}
                    </span>
                    {isMyHouse && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 shrink-0">
                        ← Nós
                      </span>
                    )}
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + index * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: casaRank.casa_cor || '#888' }}
                    />
                  </div>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <span className="font-semibold" style={{ color: casaRank.casa_cor || '#888' }}>
                    {(casaRank.total_pontos || 0).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-white/40 text-xs ml-1">pts</span>
                </div>
              </motion.div>
            );
          })}

          {rankingCasas.length === 0 && (
            <div className="text-center text-white/60 py-4">
              Nenhuma casa no ranking ainda.
            </div>
          )}
        </div>
      </motion.section>

      {/* Membros da Casa */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="w-5 h-5" style={{ color: casaColor }} />
          Membros da Casa
          <span className="text-sm font-normal text-white/40">({totalMembros})</span>
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          {membros.map((membro, index) => {
            const isCurrentUser = membro.aluno_id === user?.id;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

            return (
              <motion.div
                key={membro.aluno_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.03 }}
                className={cn(
                  'flex items-center gap-3 p-3 border-b border-white/5 last:border-0',
                  isCurrentUser && 'bg-white/10'
                )}
              >
                {/* Position or Medal */}
                {medal ? (
                  <span className="text-xl w-8 text-center">{medal}</span>
                ) : (
                  <span className="w-8 text-center text-sm text-white/40 font-medium">
                    {membro.posicao_na_casa}º
                  </span>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={cn('font-medium truncate', isCurrentUser && 'text-white')}>
                    {membro.aluno_nome}
                  </p>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <span className="font-semibold" style={{ color: casaColor }}>
                    {(membro.total_pontos || 0).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-white/40 text-xs ml-1">pts</span>
                </div>

                {/* You indicator */}
                {isCurrentUser && (
                  <span className="text-xs text-white/60 shrink-0">← Você</span>
                )}
              </motion.div>
            );
          })}

          {membros.length === 0 && (
            <div className="p-6 text-center text-white/60">
              Nenhum membro no ranking ainda.
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
};

export default CasaPage;
