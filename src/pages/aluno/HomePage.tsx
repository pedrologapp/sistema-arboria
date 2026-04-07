import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Target, MessageCircle, Shield, User, Star, AlertTriangle, Trophy } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { CasaBrasao } from '@/components/CasaBrasao';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

const saudacoes = [
  'Bom te ver por aqui',
  'Que bom que voce veio',
  'Pronto para mais um dia',
  'Sua jornada continua',
  'O conhecimento te espera',
  'Cada dia conta',
];

const getSaudacao = () => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

const getFraseMotivacional = () => {
  const hoje = new Date().getDate();
  return saudacoes[hoje % saudacoes.length];
};

const HomePage = () => {
  const navigate = useNavigate();
  const { profile, casa, ranking, faseAtual, casaColor, isLoading } = useStudent();
  const { missoesPendentes, mensagensNaoLidas } = useNotificacoes();

  const { data: cargo } = useQuery({
    queryKey: ['cargo-aluno', profile?.id, casa?.id],
    queryFn: async () => {
      if (!profile?.id || !casa?.id) return 'Membro';
      const { data } = await supabase
        .from('cargos_casa')
        .select('cargo')
        .eq('aluno_id', profile.id)
        .eq('casa_id', casa.id)
        .eq('ativo', true)
        .maybeSingle();
      if (!data?.cargo) return 'Membro';
      const cargoMap: Record<string, string> = { 'lider': 'Lider', 'coordenador': 'Coordenador', 'embaixador': 'Embaixador' };
      return cargoMap[data.cargo.toLowerCase()] || 'Membro';
    },
    enabled: !!profile?.id && !!casa?.id,
  });

  // Missões urgentes (prazo em menos de 2 dias e não entregues)
  const { data: missoesUrgentes } = useQuery({
    queryKey: ['missoes-urgentes', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase.rpc('get_missoes_do_aluno', { p_aluno_id: profile.id });
      if (!data) return [];
      const agora = new Date();
      const limite = new Date(agora.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 dias
      return data.filter((m: any) =>
        !m.ja_entregou
        && m.status_entrega === 'pendente'
        && new Date(m.data_prazo) <= limite
        && new Date(m.data_prazo) > agora
      );
    },
    enabled: !!profile?.id,
    staleTime: 120000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/20" />
      </div>
    );
  }

  const firstName = profile?.nome?.split(' ')[0] || 'Aluno';

  const quickActions = [
    { id: 'missoes', icon: Target, label: 'Missoes', description: 'Ver missoes da fase', path: '/aluno/missoes', badge: missoesPendentes > 0 ? missoesPendentes : undefined, color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', description: 'Conversar com a casa', path: '/aluno/chat', badge: mensagensNaoLidas > 0 ? mensagensNaoLidas : undefined, color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.12)' },
    { id: 'casa', icon: Shield, label: 'Minha Casa', description: 'Membros e ranking', path: '/aluno/casa', color: '#10b981', bgColor: 'rgba(16,185,129,0.12)' },
    { id: 'conquistas', icon: Trophy, label: 'Conquistas', description: 'Desbloqueie premios', path: '/aluno/conquistas', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)' },
    { id: 'perfil', icon: User, label: 'Perfil', description: 'Suas inteligencias', path: '/aluno/perfil', color: '#ec4899', bgColor: 'rgba(236,72,153,0.12)' },
  ];

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Saudacao */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white">
          {getSaudacao()}, {firstName}!
        </h1>
        <p className="text-white/35 text-sm mt-0.5">
          {getFraseMotivacional()}
        </p>
      </div>

      {/* Card de Urgencia (so aparece se tem missao com prazo < 2 dias) */}
      {missoesUrgentes && missoesUrgentes.length > 0 && (
        <button
          onClick={() => navigate('/aluno/missoes')}
          className="w-full p-3.5 rounded-xl text-left
            bg-amber-500/10 border border-amber-500/25
            hover:bg-amber-500/15 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">
                {missoesUrgentes.length === 1
                  ? 'Voce tem 1 missao para entregar'
                  : `Voce tem ${missoesUrgentes.length} missoes para entregar`}
              </p>
              <p className="text-amber-400/60 text-xs mt-0.5">
                {missoesUrgentes.length === 1
                  ? `Prazo: ${new Date(missoesUrgentes[0].data_prazo).toLocaleDateString('pt-BR')}`
                  : 'Prazo nos proximos 2 dias'}
              </p>
            </div>
          </div>
        </button>
      )}

      {/* Card da Casa + Fase (unico ponto com cor da casa) */}
      {casa && (
        <div
          className="relative overflow-hidden p-5 rounded-2xl
            bg-[rgba(26,26,30,0.85)] backdrop-blur-xl
            border border-white/10"
          style={{ boxShadow: `0 16px 32px -8px ${casaColor}25` }}
        >
          <div
            className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: casaColor }}
          />

          <div className="relative z-10 flex items-center gap-4">
            <CasaBrasao
              brasaoUrl={casa.brasao_url}
              emoji={casa.emoji}
              nome={casa.nome}
              size="medium"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold" style={{ color: casaColor }}>
                Casa {casa.nome}
              </h2>
              <p className="text-white/40 text-sm">{cargo || 'Membro'}</p>
              {faseAtual && faseAtual.inteligencia && (
                <div className="mt-1.5">
                  <p className="text-white/60 text-xs">
                    Fase {faseAtual.numero_fase} — {faseAtual.inteligencia.nome}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-white/30 text-[11px]">Semana {faseAtual.semana_atual || 1}/4</span>
                    <div className="flex-1 max-w-[80px]">
                      <Progress value={((faseAtual.semana_atual || 0) / 4) * 100} className="h-1.5 bg-white/10" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats: Pontos + Posicao */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl text-center bg-[rgba(26,26,30,0.85)] border border-white/10">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
            <span className="text-2xl font-bold text-white">{ranking?.total_pontos || 0}</span>
          </div>
          <p className="text-xs text-white/40">Pontos</p>
        </div>
        <div className="p-4 rounded-xl text-center bg-[rgba(26,26,30,0.85)] border border-white/10">
          <span className="text-2xl font-bold text-white">{ranking?.posicao_na_casa || '--'}</span>
          <span className="text-white/40 text-sm align-top">o</span>
          <p className="text-xs text-white/40 mt-1">Na casa</p>
        </div>
      </div>

      {/* Acoes Rapidas - Grid 2x2 cor neutra */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest">
          Acoes Rapidas
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => navigate(action.path)}
                className="relative flex flex-col items-center gap-2.5 p-4 rounded-xl text-center group
                  bg-[rgba(26,26,30,0.85)] border border-white/10
                  hover:border-white/20 hover:bg-white/[0.06]
                  transition-all duration-200 active:scale-[0.97]"
              >
                {action.badge && (
                  <span className="absolute top-2 right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow-lg">
                    {action.badge > 99 ? '99+' : action.badge}
                  </span>
                )}
                <div
                  className="p-2.5 rounded-lg transition-transform group-hover:scale-110"
                  style={{ backgroundColor: action.bgColor }}
                >
                  <Icon className="w-6 h-6" style={{ color: action.color }} />
                </div>
                <div>
                  <span className="text-white/90 text-sm font-medium block">{action.label}</span>
                  <span className="text-white/35 text-[11px] leading-tight">{action.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
