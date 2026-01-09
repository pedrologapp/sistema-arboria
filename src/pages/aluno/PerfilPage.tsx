import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Trophy, Target, Medal, Settings } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';
import { CasaBrasao } from '@/components/CasaBrasao';
import InteligenciaBar from '@/components/aluno/InteligenciaBar';
import InteligenciaDrawer from '@/components/aluno/InteligenciaDrawer';

const PerfilPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, casa, casaColor, ranking, inteligenciaScores, isLoading } = useStudent();

  const [selectedInteligencia, setSelectedInteligencia] = useState<{
    id: number;
    nome: string;
    codigo: string;
    emoji: string;
    cor: string;
    score: number;
    ehMinhaCasa: boolean;
  } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleOpenSettings = () => {
    navigate('/aluno/configuracoes');
  };

  const handleInteligenciaClick = (inteligencia: typeof selectedInteligencia) => {
    setSelectedInteligencia(inteligencia);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="py-6 space-y-6">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white/10 animate-pulse mb-4" />
          <div className="h-6 w-32 bg-white/10 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="h-32 bg-white/10 rounded-xl animate-pulse" />
        <div className="h-48 bg-white/10 rounded-xl animate-pulse" />
        <div className="h-24 bg-white/10 rounded-xl animate-pulse" />
      </div>
    );
  }

  const fullName = profile?.full_name || `${profile?.nome || ''} ${profile?.sobrenome || ''}`.trim() || 'Aluno';

  // Get position emoji
  const getPosicaoEmoji = (posicao: number) => {
    if (posicao === 1) return '🥇';
    if (posicao === 2) return '🥈';
    if (posicao === 3) return '🥉';
    return `${posicao}º`;
  };

  // Map scores to a format compatible with InteligenciaBar
  const inteligenciasFormatted = inteligenciaScores.map((score) => ({
    id: score.inteligencia_id,
    nome: score.inteligencia_nome,
    codigo: score.inteligencia_codigo,
    emoji: score.inteligencia_emoji || '🧠',
    cor: score.inteligencia_cor || '#888888',
    score: score.score_atual,
    ehMinhaCasa: score.eh_casa_do_aluno,
  }));

  // Sort: "Minha Casa" first, then by score descending
  const sortedInteligencias = [...inteligenciasFormatted].sort((a, b) => {
    if (a.ehMinhaCasa && !b.ehMinhaCasa) return -1;
    if (!a.ehMinhaCasa && b.ehMinhaCasa) return 1;
    return b.score - a.score;
  });

  return (
    <div className="py-6 space-y-6">
      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col items-center text-center"
      >
        {/* Settings Icon */}
        <button
          onClick={handleOpenSettings}
          className="absolute top-0 right-0 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Configurações"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4 overflow-hidden"
          style={{ backgroundColor: `${casaColor}20` }}
        >
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={fullName}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-10 h-10" style={{ color: casaColor }} />
          )}
        </div>
        <h1 className="text-xl font-bold">{fullName}</h1>
        
        {casa && (
          <div className="flex items-center gap-2 mt-2">
            <CasaBrasao
              brasaoUrl={casa.brasao_url}
              emoji={casa.emoji}
              nome={casa.nome}
              size="mini"
            />
            <span style={{ color: casaColor }} className="font-medium">
              {casa.nome}
            </span>
          </div>
        )}
        
        <p className="text-white/60 text-sm mt-1">
          {profile?.serie || '-'} {profile?.turma ? `• Turma ${profile.turma}` : ''}
        </p>
      </motion.div>

      {/* Points Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${casaColor}30 0%, ${casaColor}10 100%)`,
          border: `1px solid ${casaColor}30`,
        }}
      >
        <div className="p-4">
          <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4" />
            MEUS PONTOS
          </h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p 
                className="text-4xl font-bold"
                style={{ color: casaColor }}
              >
                {ranking?.total_pontos?.toLocaleString('pt-BR') || 0}
              </p>
              <p className="text-sm text-white/60">pontos totais</p>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <Medal className="w-5 h-5 text-white/40" />
                <span className="text-2xl font-bold">
                  {ranking?.posicao_na_casa 
                    ? getPosicaoEmoji(ranking.posicao_na_casa)
                    : '-'
                  }
                </span>
              </div>
              <p className="text-xs text-white/40">na casa</p>
            </div>
          </div>
          
          {ranking?.missoes_completadas !== undefined && ranking.missoes_completadas > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
              <Target className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/60">
                {ranking.missoes_completadas} missões completadas
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Inteligencias Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2 mb-3">
          📊 MINHAS INTELIGÊNCIAS
        </h2>
        
        <div className="space-y-2">
          {sortedInteligencias.map((inteligencia, index) => (
            <InteligenciaBar
              key={inteligencia.id}
              inteligenciaId={inteligencia.id}
              nome={inteligencia.nome}
              codigo={inteligencia.codigo}
              emoji={inteligencia.emoji}
              cor={inteligencia.cor}
              score={inteligencia.score}
              ehMinhaCasa={inteligencia.ehMinhaCasa}
              onClick={() => handleInteligenciaClick(inteligencia)}
              index={index}
            />
          ))}
        </div>
        
        <p className="text-xs text-white/40 text-center mt-3">
          Toque em uma barra para ver sua evolução
        </p>
      </motion.div>


      {/* Intelligence Drawer */}
      <InteligenciaDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        inteligencia={selectedInteligencia}
        alunoId={user?.id || ''}
        ehMinhaCasa={selectedInteligencia?.ehMinhaCasa || false}
      />
    </div>
  );
};

export default PerfilPage;
