import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Trophy, Target, Settings, Award, TreePine } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CasaBrasao } from '@/components/CasaBrasao';
import InteligenciaBar from '@/components/aluno/InteligenciaBar';
import InteligenciaDrawer from '@/components/aluno/InteligenciaDrawer';

const PerfilPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, casa, casaColor, ranking, inteligenciaScores, isLoading } = useStudent();

  const [selectedInteligencia, setSelectedInteligencia] = useState<{
    id: number; nome: string; codigo: string; emoji: string; cor: string; score: number; ehMinhaCasa: boolean;
  } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Cargo do aluno
  const { data: cargo } = useQuery({
    queryKey: ['cargo-perfil', profile?.id, casa?.id],
    queryFn: async () => {
      if (!profile?.id || !casa?.id) return null;
      const { data } = await supabase
        .from('cargos_casa')
        .select('cargo')
        .eq('aluno_id', profile.id)
        .eq('casa_id', casa.id)
        .eq('ativo', true)
        .maybeSingle();
      if (!data?.cargo) return null;
      const map: Record<string, string> = { lider: 'Lider', coordenador: 'Coordenador', embaixador: 'Embaixador' };
      return map[data.cargo] || null;
    },
    enabled: !!profile?.id && !!casa?.id,
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
        <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  const fullName = profile?.full_name || `${profile?.nome || ''} ${profile?.sobrenome || ''}`.trim() || 'Aluno';
  const firstName = profile?.nome?.split(' ')[0] || 'Aluno';

  // Map e ordenar inteligencias
  const sortedInteligencias = inteligenciaScores
    .map((score) => ({
      id: score.inteligencia_id,
      nome: score.inteligencia_nome,
      codigo: score.inteligencia_codigo,
      emoji: score.inteligencia_emoji || '',
      cor: score.inteligencia_cor || '#888888',
      score: score.score_atual,
      ehMinhaCasa: score.eh_casa_do_aluno,
      brasaoUrl: score.inteligencia_brasao_url,
    }))
    .sort((a, b) => {
      if (a.ehMinhaCasa && !b.ehMinhaCasa) return -1;
      if (!a.ehMinhaCasa && b.ehMinhaCasa) return 1;
      return b.score - a.score;
    });

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Perfil</h1>
        <button
          onClick={() => navigate('/aluno/configuracoes')}
          className="p-2 rounded-full text-white/40 bg-white/5 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Card do aluno */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-[#252547] border border-violet-500/10">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-2xl text-white/40">
                {firstName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{fullName}</h2>
            <div className="flex items-center gap-2 mt-1">
              {casa && (
                <>
                  <CasaBrasao brasaoUrl={casa.brasao_url} emoji={casa.emoji} nome={casa.nome} size="mini" />
                  <span className="text-sm" style={{ color: casaColor }}>{casa.nome}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-white/40">
                {profile?.serie || '-'} {profile?.turma ? `- Turma ${profile.turma}` : ''}
              </span>
              {cargo && (
                <span className="text-xs text-amber-400/70 font-medium">{cargo}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xl font-bold text-white">{ranking?.total_pontos || 0}</span>
          </div>
          <p className="text-[10px] text-white/40">Pontos</p>
        </div>
        <div className="p-3.5 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <span className="text-xl font-bold text-white">{ranking?.posicao_na_casa || '--'}</span>
          <span className="text-white/40 text-xs align-top">º</span>
          <p className="text-[10px] text-white/40 mt-0.5">Na casa</p>
        </div>
        <div className="p-3.5 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xl font-bold text-white">{ranking?.missoes_completadas || 0}</span>
          </div>
          <p className="text-[10px] text-white/40">Missoes</p>
        </div>
      </div>

      {/* Inteligencias */}
      <div>
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">
          Minhas Inteligencias
        </h3>

        {sortedInteligencias.length > 0 ? (
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
                onClick={() => {
                  setSelectedInteligencia(inteligencia);
                  setDrawerOpen(true);
                }}
                index={index}
                brasaoUrl={inteligencia.brasaoUrl}
              />
            ))}
            <p className="text-[10px] text-white/25 text-center mt-2">
              Toque em uma barra para ver detalhes
            </p>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
            <p className="text-white/30 text-sm">Seus scores aparecerão conforme voce avanca</p>
          </div>
        )}
      </div>

      {/* Arvore de Talentos (placeholder) */}
      <div>
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">
          Arvore de Talentos
        </h3>
        <div className="p-6 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
          <TreePine className="w-8 h-8 text-white/15 mx-auto mb-2" />
          <p className="text-white/30 text-sm">Em breve</p>
          <p className="text-white/15 text-xs mt-1">Sua arvore de 52 habilidades crescera aqui</p>
        </div>
      </div>

      {/* Conquistas (placeholder) */}
      <div>
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">
          Conquistas
        </h3>
        <div className="p-6 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
          <Award className="w-8 h-8 text-white/15 mx-auto mb-2" />
          <p className="text-white/30 text-sm">Em breve</p>
          <p className="text-white/15 text-xs mt-1">Badges e conquistas desbloqueadas</p>
        </div>
      </div>

      {/* Drawer de detalhes */}
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
