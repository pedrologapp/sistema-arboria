import { useEffect, useState, useCallback } from 'react';
import { Trophy, Users, BookOpen, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { CasaBrasao } from '@/components/CasaBrasao';
import { motion } from 'framer-motion';

interface MembroComCargo {
  aluno_id: string;
  aluno_nome: string;
  avatar_url: string | null;
  total_pontos: number;
  posicao_na_casa: number;
  cargo: 'lider' | 'coordenador' | 'embaixador' | 'membro';
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

const cargoConfig = {
  lider: { 
    emoji: '🦅', 
    label: 'LÍDER', 
    borderColor: 'rgba(245, 158, 11, 0.3)',
    bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))',
    glowColor: 'rgba(245, 158, 11, 0.15)'
  },
  coordenador: { 
    emoji: '⭐', 
    label: 'COORDENADORES', 
    borderColor: 'rgba(245, 158, 11, 0.2)',
    bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), transparent)',
    glowColor: 'rgba(245, 158, 11, 0.08)'
  },
  embaixador: { 
    emoji: '🌍', 
    label: 'EMBAIXADOR', 
    borderColor: 'rgba(6, 182, 212, 0.2)',
    bgGradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05), transparent)',
    glowColor: 'rgba(6, 182, 212, 0.08)'
  },
};

const CasaPage = () => {
  const { user } = useAuth();
  const { casa, casaColor, profile, isLoading: contextLoading, refreshData } = useStudent();
  const [membros, setMembros] = useState<MembroComCargo[]>([]);
  const [pontosTotaisCasa, setPontosTotaisCasa] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!casa?.id || !profile?.institution_id) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch ranking da própria casa, membros e cargos em paralelo
      const [rankingCasaRes, membrosRes, cargosRes] = await Promise.all([
        supabase
          .from('ranking_casas')
          .select('total_pontos')
          .eq('casa_id', casa.id)
          .eq('institution_id', profile.institution_id)
          .single(),
        supabase
          .from('ranking_alunos_por_casa')
          .select('aluno_id, aluno_nome, total_pontos, posicao_na_casa')
          .eq('casa_id', casa.id)
          .eq('institution_id', profile.institution_id)
          .order('posicao_na_casa', { ascending: true })
          .limit(50),
        supabase
          .from('cargos_casa')
          .select('aluno_id, cargo')
          .eq('casa_id', casa.id)
          .eq('institution_id', profile.institution_id)
          .eq('ano_letivo', new Date().getFullYear())
          .eq('ativo', true),
      ]);

      if (membrosRes.error) throw membrosRes.error;

      // Set pontos totais da casa
      setPontosTotaisCasa(rankingCasaRes.data?.total_pontos || 0);

      // Buscar avatars dos membros
      const alunoIds = membrosRes.data?.map(m => m.aluno_id).filter(Boolean) || [];
      let avatarsMap: Record<string, string | null> = {};

      if (alunoIds.length > 0) {
        const { data: avatarsData } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', alunoIds);

        avatarsMap = Object.fromEntries(
          avatarsData?.map(a => [a.id, a.avatar_url]) || []
        );
      }

      // Criar mapa de cargos
      const cargosMap = Object.fromEntries(
        cargosRes.data?.map(c => [c.aluno_id, c.cargo]) || []
      );

      // Mesclar dados
      const membrosComCargo: MembroComCargo[] = (membrosRes.data || []).map(m => ({
        aluno_id: m.aluno_id || '',
        aluno_nome: m.aluno_nome || 'Sem nome',
        avatar_url: avatarsMap[m.aluno_id || ''] || null,
        total_pontos: Number(m.total_pontos) || 0,
        posicao_na_casa: Number(m.posicao_na_casa) || 0,
        cargo: (cargosMap[m.aluno_id || ''] as MembroComCargo['cargo']) || 'membro'
      }));

      setMembros(membrosComCargo);
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
        <div className="h-48 bg-white/5 rounded-2xl animate-pulse" />
        <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!casa) {
    return (
      <div className="py-6">
        <div 
          className="p-6 rounded-2xl text-center"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <p className="text-white/60">Você ainda não foi atribuído a uma casa.</p>
        </div>
      </div>
    );
  }

  const totalMembros = membros.length;

  // Get description
  const codigoNormalizado = casa.codigo?.toLowerCase().replace(/_/g, '-') || '';
  const descricao = casa.descricao || descricoesPadrao[codigoNormalizado] || 'Uma casa dedicada ao desenvolvimento desta inteligência única.';

  // Separar membros por cargo
  const lider = membros.find(m => m.cargo === 'lider');
  const coordenadores = membros.filter(m => m.cargo === 'coordenador');
  const embaixador = membros.find(m => m.cargo === 'embaixador');
  const membrosSemCargo = membros.filter(m => m.cargo === 'membro');

  return (
    <div className="py-6 space-y-6">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-2xl text-center relative overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${casaColor}25 0%, ${casaColor}08 100%)`,
          border: `1px solid ${casaColor}20`,
        }}
      >
        {/* Refresh Button - Icon only */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
        </button>

        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${casaColor} 0%, transparent 60%)`,
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
          <p className="text-white/50 text-sm mb-6">{casa.codigo?.replace(/_/g, ' ')}</p>

          {/* Total Points - Destaque Principal */}
          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-5 h-5" style={{ color: casaColor }} />
            <span className="text-3xl font-bold" style={{ color: casaColor }}>
              {pontosTotaisCasa.toLocaleString('pt-BR')}
            </span>
            <span className="text-white/40 text-sm">pontos da casa</span>
          </div>
        </div>
      </motion.div>

      {/* Sobre Nossa Casa */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white/80">
          <BookOpen className="w-5 h-5" style={{ color: casaColor }} />
          Sobre Nossa Casa
        </h2>
        <div 
          className="rounded-2xl p-6 text-center"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <p className="font-fantasy italic text-white/75 text-sm leading-relaxed">
            "{descricao}"
          </p>
        </div>
      </motion.section>

      {/* Membros da Casa - Layout Compacto Discord-style */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white/80">
          <Users className="w-5 h-5" style={{ color: casaColor }} />
          Membros da Casa
          <span className="text-sm font-normal text-white/40">({totalMembros})</span>
        </h2>

        <div 
          className="rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Líder */}
          <h3 className="text-xs font-medium text-amber-400/80 px-3 pt-3 pb-1">🦅 LÍDER</h3>
          {lider ? (
            <MembroItemCompacto
              membro={lider}
              isCurrentUser={lider.aluno_id === user?.id}
              casaColor={casaColor}
            />
          ) : (
            <div className="px-3 py-2.5 text-sm text-white/30 italic">
              Nenhum líder eleito ainda
            </div>
          )}

          {/* Coordenadores */}
          {coordenadores.length > 0 && (
            <>
              <h3 className="text-xs font-medium text-amber-400/60 px-3 pt-3 pb-1">⭐ COORDENADORES</h3>
              {coordenadores.map(m => (
                <MembroItemCompacto
                  key={m.aluno_id}
                  membro={m}
                  isCurrentUser={m.aluno_id === user?.id}
                  casaColor={casaColor}
                />
              ))}
            </>
          )}

          {/* Embaixador */}
          {embaixador && (
            <>
              <h3 className="text-xs font-medium text-cyan-400/80 px-3 pt-3 pb-1">🌍 EMBAIXADOR</h3>
              <MembroItemCompacto
                membro={embaixador}
                isCurrentUser={embaixador.aluno_id === user?.id}
                casaColor={casaColor}
              />
            </>
          )}

          {/* Demais Membros */}
          {membrosSemCargo.length > 0 && (
            <>
              <h3 className="text-xs font-medium text-white/50 px-3 pt-3 pb-1">
                👥 DEMAIS MEMBROS ({membrosSemCargo.length})
              </h3>
              {membrosSemCargo.map(m => (
                <MembroItemCompacto
                  key={m.aluno_id}
                  membro={m}
                  isCurrentUser={m.aluno_id === user?.id}
                  casaColor={casaColor}
                  showMedal
                />
              ))}
            </>
          )}

          {/* Fallback se não houver membros */}
          {membros.length === 0 && (
            <div className="p-4 text-center text-white/50 text-sm">
              Nenhum membro no ranking ainda.
            </div>
          )}
        </div>
      </motion.section>

      {/* Ranking de Pontuação */}
      <RankingSection
        membros={membros}
        userId={user?.id}
        casaColor={casaColor}
      />
    </div>
  );
};

// Componente de Ranking de Pontuação
function RankingSection({
  membros,
  userId,
  casaColor,
}: {
  membros: MembroComCargo[];
  userId: string | undefined;
  casaColor: string;
}) {
  const [showAll, setShowAll] = useState(false);
  
  // Ordenar por posição na casa (ranking de pontos)
  // Ordenar por total_pontos (descendente) para calcular posição correta
  const rankingOrdenado = [...membros].sort((a, b) => b.total_pontos - a.total_pontos);
  
  // Top 8 ou todos
  const exibir = showAll ? rankingOrdenado : rankingOrdenado.slice(0, 8);
  
  // Posição do usuário
  const minhaPosicao = rankingOrdenado.findIndex(m => m.aluno_id === userId) + 1;
  const meusDados = rankingOrdenado.find(m => m.aluno_id === userId);
  const mostraMinhaPosicaoSeparada = !showAll && minhaPosicao > 8 && meusDados;

  if (rankingOrdenado.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white/80">
        <Trophy className="w-5 h-5" style={{ color: casaColor }} />
        Ranking de Pontuação
      </h2>

      <div 
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Lista do ranking */}
        <div className="divide-y divide-white/5">
          {exibir.map((membro, index) => {
            // Posição baseada no índice do array ordenado por pontos
            const posicao = index + 1;
            const isMe = membro.aluno_id === userId;

            return (
              <div
                key={membro.aluno_id}
                className={cn(
                  'flex items-center justify-between py-2.5 px-3',
                  isMe ? 'bg-white/10' : 'hover:bg-white/5'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Posição - APENAS NÚMERO */}
                  <span className="w-6 text-center shrink-0 text-sm text-white/60">
                    {posicao}
                  </span>

                  {/* Avatar */}
                  <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden shrink-0">
                    {membro.avatar_url ? (
                      <img src={membro.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-xs text-white/60">
                        {membro.aluno_nome.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Nome */}
                  <span className={cn(
                    'text-sm truncate',
                    isMe ? 'text-white font-medium' : 'text-white/80'
                  )}>
                    {membro.aluno_nome}
                    {isMe && <span className="text-white/40 ml-1">(você)</span>}
                  </span>
                </div>

                {/* Pontos - cor uniforme */}
                <span className="text-sm font-medium shrink-0 text-green-400">
                  {membro.total_pontos.toLocaleString('pt-BR')} pts
                </span>
              </div>
            );
          })}
        </div>

        {/* Minha posição (se não estiver no top 8) */}
        {mostraMinhaPosicaoSeparada && meusDados && (
          <div className="border-t border-white/10 px-3 py-2">
            <div className="flex items-center justify-between py-2 px-3 bg-white/10 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-sm text-white/40">{minhaPosicao}</span>
                <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden">
                  {meusDados.avatar_url ? (
                    <img src={meusDados.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-xs">
                      {meusDados.aluno_nome.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-white text-sm font-medium">
                  {meusDados.aluno_nome} <span className="text-white/40">(você)</span>
                </span>
              </div>
              <span className="text-white/60 text-sm font-medium">
                {meusDados.total_pontos.toLocaleString('pt-BR')} pts
              </span>
            </div>
          </div>
        )}

        {/* Botão ver mais */}
        {rankingOrdenado.length > 8 && !showAll && (
          <button 
            onClick={() => setShowAll(true)}
            className="w-full py-3 text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors border-t border-white/5"
          >
            Ver ranking completo ({rankingOrdenado.length} membros)
          </button>
        )}
      </div>
    </motion.section>
  );
}

// Componente compacto para membro (estilo Discord)
function MembroItemCompacto({
  membro,
  isCurrentUser,
  casaColor,
  showMedal = false,
}: {
  membro: MembroComCargo;
  isCurrentUser: boolean;
  casaColor: string;
  showMedal?: boolean;
}) {
  // Medalha só para top 3 COM pontos > 0
  const getMedal = (posicao: number, pontos: number) => {
    if (pontos <= 0) return null;
    if (posicao === 1) return '🥇';
    if (posicao === 2) return '🥈';
    if (posicao === 3) return '🥉';
    return null;
  };

  const medal = showMedal ? getMedal(membro.posicao_na_casa, membro.total_pontos) : null;

  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 px-3 hover:bg-white/5 transition-colors',
        isCurrentUser && 'bg-white/5'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Medalha (se tiver) */}
        {medal && <span className="text-sm w-5 shrink-0">{medal}</span>}

        {/* Avatar pequeno 24px */}
        <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
          {membro.avatar_url ? (
            <img
              src={membro.avatar_url}
              alt={membro.aluno_nome}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="flex items-center justify-center w-full h-full text-xs text-white/60">
              {membro.aluno_nome.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Nome */}
        <span className="text-white text-sm truncate">{membro.aluno_nome}</span>

        {/* Indicador "Você" */}
        {isCurrentUser && <span className="text-white/40 text-xs shrink-0">← Você</span>}
      </div>

      {/* Pontos */}
      <span className="text-white/60 text-sm shrink-0 ml-2">
        {membro.total_pontos.toLocaleString('pt-BR')} pts
      </span>
    </div>
  );
}

export default CasaPage;
