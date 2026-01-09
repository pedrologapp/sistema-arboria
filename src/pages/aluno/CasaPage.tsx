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
          .eq('ano_letivo', 2025)
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
          background: `linear-gradient(180deg, ${casaColor}25 0%, ${casaColor}08 100%)`,
          border: `1px solid ${casaColor}20`,
        }}
      >
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
          className="rounded-2xl p-5"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <p className="text-white/70 leading-relaxed">{descricao}</p>
        </div>
      </motion.section>

      {/* Membros da Casa - Com Hierarquia */}
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

        <div className="space-y-4">
          {/* Líder */}
          {lider && (
            <CargoSection
              config={cargoConfig.lider}
              membros={[lider]}
              currentUserId={user?.id}
              casaColor={casaColor}
              showMedals={false}
            />
          )}

          {/* Coordenadores */}
          {coordenadores.length > 0 && (
            <CargoSection
              config={cargoConfig.coordenador}
              membros={coordenadores}
              currentUserId={user?.id}
              casaColor={casaColor}
              showMedals={false}
            />
          )}

          {/* Embaixador */}
          {embaixador && (
            <CargoSection
              config={cargoConfig.embaixador}
              membros={[embaixador]}
              currentUserId={user?.id}
              casaColor={casaColor}
              showMedals={false}
            />
          )}

          {/* Demais Membros */}
          {membrosSemCargo.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/50 flex items-center gap-2 mb-2">
                👤 DEMAIS MEMBROS
              </h3>
              <div 
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {membrosSemCargo.map((membro, index) => (
                  <MembroItem
                    key={membro.aluno_id}
                    membro={membro}
                    isCurrentUser={membro.aluno_id === user?.id}
                    casaColor={casaColor}
                    showMedal={true}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Fallback se não houver membros */}
          {membros.length === 0 && (
            <div 
              className="rounded-2xl p-6 text-center text-white/50"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              Nenhum membro no ranking ainda.
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
};

// Componente para seção de cargo
function CargoSection({
  config,
  membros,
  currentUserId,
  casaColor,
  showMedals,
}: {
  config: { emoji: string; label: string; borderColor: string; bgGradient: string; glowColor: string };
  membros: MembroComCargo[];
  currentUserId?: string;
  casaColor: string;
  showMedals: boolean;
}) {
  return (
    <div>
      <h3
        className="text-sm font-semibold flex items-center gap-2 mb-2"
        style={{ color: config.borderColor.replace('0.3', '0.8').replace('0.2', '0.7') }}
      >
        {config.emoji} {config.label}
      </h3>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: config.bgGradient,
          border: `1px solid ${config.borderColor}`,
          boxShadow: `0 0 20px ${config.glowColor}`,
        }}
      >
        {membros.map((membro, index) => (
          <MembroItem
            key={membro.aluno_id}
            membro={membro}
            isCurrentUser={membro.aluno_id === currentUserId}
            casaColor={casaColor}
            showMedal={showMedals}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

// Componente para item de membro
function MembroItem({
  membro,
  isCurrentUser,
  casaColor,
  showMedal,
  index,
}: {
  membro: MembroComCargo;
  isCurrentUser: boolean;
  casaColor: string;
  showMedal: boolean;
  index: number;
}) {
  const getMedal = (pos: number) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return null;
  };

  const medal = showMedal ? getMedal(index + 1) : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.03 }}
      className={cn(
        'flex items-center gap-3 p-3 border-b border-white/5 last:border-b-0',
        isCurrentUser && 'bg-white/5'
      )}
    >
      {/* Medalha ou Posição */}
      {showMedal && (
        medal ? (
          <span className="text-xl w-8 text-center">{medal}</span>
        ) : (
          <span className="w-8 text-center text-sm text-white/40 font-medium">
            {index + 1}º
          </span>
        )
      )}

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
        {membro.avatar_url ? (
          <img
            src={membro.avatar_url}
            alt={membro.aluno_nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-xs text-white/60 font-medium">
            {membro.aluno_nome.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Nome */}
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium truncate', isCurrentUser && 'text-white')}>
          {membro.aluno_nome}
        </p>
      </div>

      {/* Pontos */}
      <div className="text-right shrink-0">
        <span className="font-semibold" style={{ color: casaColor }}>
          {membro.total_pontos.toLocaleString('pt-BR')}
        </span>
        <span className="text-white/40 text-xs ml-1">pts</span>
      </div>

      {/* Indicador "Você" */}
      {isCurrentUser && (
        <span className="text-xs text-white/50 shrink-0">← Você</span>
      )}
    </motion.div>
  );
}

export default CasaPage;
