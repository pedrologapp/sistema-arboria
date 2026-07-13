import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Trophy, Target, Settings } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CasaBrasao } from '@/components/CasaBrasao';
import InteligenciaBar from '@/components/aluno/InteligenciaBar';
import InteligenciaDrawer from '@/components/aluno/InteligenciaDrawer';
import { F2_ALUNO_VISOR_NOVO } from '@/config/f2AlunoVisorNovo';
import { cn } from '@/lib/utils';
import '@/styles/missoes-scifi.css';

// "#a78bfa" -> "167, 139, 250" (alimenta --sf-accent-rgb com a cor da casa)
const hexToRgb = (hex: string): string | null => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : null;
};

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

  // Acento dos cards = cor da casa
  const accentColor = casaColor || casa?.cor_hex || '#a78bfa';
  const accentRgb = hexToRgb(accentColor) || '167, 139, 250';
  const scifiVars = { '--sf-accent': accentColor, '--sf-accent-rgb': accentRgb } as CSSProperties;

  // Aluno sem pontos e sem missoes concluidas: a jornada esta comecando.
  const isAlunoNovo = (ranking?.total_pontos || 0) === 0 && (ranking?.missoes_completadas || 0) === 0;

  // ==========================================================================
  // VISOR NOVO (atras da flag F2_ALUNO_VISOR_NOVO). So estilo: reaproveita
  // TODOS os dados/handlers/componentes de hoje (fullName, sortedInteligencias,
  // ranking, cargo, casa, drawer). Nenhuma query, rota ou estado muda. Com a
  // flag off, cai no return de sempre abaixo (nenhuma regressao).
  // ==========================================================================
  if (F2_ALUNO_VISOR_NOVO) {
    const lbl = 'text-[9.5px] tracking-[0.28em] uppercase text-white/30 px-0.5';

    return (
      <div className="scifi min-h-screen px-5 py-6 pb-24" style={scifiVars}>
        {/* Cabecalho: titulo serif + engrenagem discreta (igual as outras abas) */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-serif text-[22px] font-semibold text-white leading-tight">Perfil</h1>
          <button
            onClick={() => navigate('/aluno/configuracoes')}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Card do aluno: avatar com halo na cor da casa + nome + casa + serie + cargo */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 mb-4">
          <div className="flex items-center gap-4">
            {/* Avatar com halo suave na cor da casa */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: `radial-gradient(circle, ${accentColor}44, transparent 70%)`,
                boxShadow: `inset 0 0 0 1px ${accentColor}77, 0 0 30px ${accentColor}26`,
              }}
            >
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold" style={{ color: accentColor }}>
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-[19px] font-semibold text-white truncate leading-tight">{fullName}</h2>
              {casa && (
                <div className="flex items-center gap-2 mt-1.5">
                  <CasaBrasao brasaoUrl={casa.brasao_url} emoji={casa.emoji} nome={casa.nome} size="mini" />
                  <span className="text-[13px] font-medium" style={{ color: accentColor }}>Casa {casa.nome}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-white/40">
                  {profile?.serie || '-'}{profile?.turma ? ` · Turma ${profile.turma}` : ''}
                </span>
                {cargo && (
                  <span className="text-[11px] font-medium text-amber-300/80">{cargo}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Boas-vindas do aluno novo (mesma regra: no lugar do placar) */}
        {isAlunoNovo && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 text-center mb-4">
            <p className="text-sm text-white/70">Sua jornada está começando.</p>
            <p className="text-xs text-white/40 mt-1">Complete sua primeira missão para ver seus pontos crescerem aqui.</p>
          </div>
        )}

        {/* Placar do aluno: faixa limpa de 3 colunas com divisor hairline (escondida pro aluno novo) */}
        {!isAlunoNovo && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] flex items-stretch mb-6">
            <div className="flex-1 py-4 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span className="font-serif text-[22px] font-semibold text-white tabular-nums leading-none">
                  {ranking?.total_pontos || 0}
                </span>
              </div>
              <p className={cn(lbl, 'mt-2')}>Pontos</p>
            </div>
            <div className="w-px bg-white/[0.06] my-3.5" />
            <div className="flex-1 py-4 text-center">
              <span className="font-serif text-[22px] font-semibold text-white tabular-nums leading-none">
                {ranking?.posicao_na_casa || '--'}
                {ranking?.posicao_na_casa ? <span className="text-white/35 text-sm align-top">º</span> : null}
              </span>
              <p className={cn(lbl, 'mt-2')}>Na casa</p>
            </div>
            <div className="w-px bg-white/[0.06] my-3.5" />
            <div className="flex-1 py-4 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Target className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span className="font-serif text-[22px] font-semibold text-white tabular-nums leading-none">
                  {ranking?.missoes_completadas || 0}
                </span>
              </div>
              <p className={cn(lbl, 'mt-2')}>Missões</p>
            </div>
          </div>
        )}

        {/* Minhas Inteligencias: mesma lista/onClick/drawer, so a moldura muda */}
        <div>
          <h3 className={cn(lbl, 'mb-3')}>Minhas Inteligências</h3>

          {sortedInteligencias.length > 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-2.5 space-y-2">
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
              <p className="text-[10px] text-white/25 text-center pt-1 pb-0.5">
                Toque em uma barra para ver detalhes
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6 text-center">
              <p className="text-white/55 text-sm">Suas inteligências vão aparecer aqui conforme você avança nas missões.</p>
            </div>
          )}
        </div>

        {/* Drawer de detalhes: MESMO componente/handler de hoje */}
        <InteligenciaDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          inteligencia={selectedInteligencia}
          alunoId={user?.id || ''}
          ehMinhaCasa={selectedInteligencia?.ehMinhaCasa || false}
        />
      </div>
    );
  }

  return (
    <div className="scifi p-4 space-y-5 pb-24" style={scifiVars}>
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
      <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel sf-accent-border relative overflow-hidden p-5">
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

      {/* Mensagem de boas-vindas para aluno novo */}
      {(ranking?.total_pontos || 0) === 0 && (ranking?.missoes_completadas || 0) === 0 && (
        <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel p-4 text-center">
          <p className="text-sm text-white/70">Sua jornada está começando!</p>
          <p className="text-xs text-white/40 mt-1">Complete sua primeira missão para ver seus pontos crescerem aqui.</p>
        </div>
      )}

      {/* Stats: escondidos pro aluno novo (o card de boas-vindas já cobre o recado) */}
      {!((ranking?.total_pontos || 0) === 0 && (ranking?.missoes_completadas || 0) === 0) && (
      <div className="grid grid-cols-3 gap-3">
        <div data-augmented-ui="tl-clip br-clip border" className="sf-panel p-3.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xl font-bold text-white tabular-nums">{ranking?.total_pontos || 0}</span>
          </div>
          <p className="text-[10px] text-white/40">Pontos</p>
        </div>
        <div data-augmented-ui="tl-clip br-clip border" className="sf-panel p-3.5 text-center">
          <span className="text-xl font-bold text-white tabular-nums">{ranking?.posicao_na_casa || '--'}</span>
          <span className="text-white/40 text-xs align-top">º</span>
          <p className="text-[10px] text-white/40 mt-0.5">Na casa</p>
        </div>
        <div data-augmented-ui="tl-clip br-clip border" className="sf-panel p-3.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xl font-bold text-white tabular-nums">{ranking?.missoes_completadas || 0}</span>
          </div>
          <p className="text-[10px] text-white/40">Missões</p>
        </div>
      </div>
      )}

      {/* Inteligencias */}
      <div>
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">
          Minhas Inteligências
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
          <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel p-6 text-center">
            <p className="text-white/55 text-sm">Suas inteligências vão aparecer aqui conforme você avança nas missões.</p>
          </div>
        )}
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
