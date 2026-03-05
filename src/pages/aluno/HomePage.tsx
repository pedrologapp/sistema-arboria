import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Target, MessageCircle, Shield, Star, ChevronRight, Calendar } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { CasaBrasao } from '@/components/CasaBrasao';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { calcularSemanaAtual } from '@/utils/timezone';

const HomePage = () => {
  const navigate = useNavigate();
  const { profile, casa, ranking, faseAtual, casaColor, isLoading } = useStudent();
  const { missoesPendentes, mensagensNaoLidas } = useNotificacoes();

  // Fetch student's cargo
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
      
      // Format cargo: capitalize first letter
      const cargoMap: Record<string, string> = {
        'lider': 'Líder',
        'coordenador': 'Coordenador',
        'embaixador': 'Embaixador',
      };
      return cargoMap[data.cargo.toLowerCase()] || 'Membro';
    },
    enabled: !!profile?.id && !!casa?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const firstName = profile?.nome?.split(' ')[0] || 'Aluno';

  const quickActions = [
    {
      id: 'missoes',
      icon: Target,
      label: 'Missões',
      description: 'Ver missões da fase',
      path: '/aluno/missoes',
      badge: missoesPendentes > 0 ? missoesPendentes : undefined,
    },
    {
      id: 'chat',
      icon: MessageCircle,
      label: 'Chat',
      description: 'Conversar com mentor',
      path: '/aluno/chat',
      badge: mensagensNaoLidas > 0 ? mensagensNaoLidas : undefined,
    },
    {
      id: 'casa',
      icon: Shield,
      label: 'Minha Casa',
      description: `Conhecer a Casa ${casa?.nome || ''}`,
      path: '/aluno/casa',
    },
  ];

  return (
    <div className="space-y-6 mt-4">
      {/* Main Card - House Info - Premium Glassmorphism */}
      <div 
        className="relative overflow-hidden p-6 rounded-2xl text-center
          bg-gradient-to-r from-white/[0.06] to-white/[0.02]
          backdrop-blur-sm border border-white/10
          shadow-xl transition-all duration-300"
        style={{
          boxShadow: `0 20px 40px -12px ${casaColor}30`
        }}
      >
        {/* Decorative glow - top right */}
        <div 
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: casaColor }}
        />
        {/* Decorative glow - bottom left */}
        <div 
          className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full blur-2xl opacity-15 pointer-events-none"
          style={{ backgroundColor: casaColor }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* House Emblem */}
          <div className="mb-4">
            <CasaBrasao
              brasaoUrl={casa?.brasao_url}
              emoji={casa?.emoji}
              nome={casa?.nome}
              size="large"
            />
          </div>

          {/* House Name - Dynamic Color */}
          <h2 
            className="text-xl font-bold mb-1"
            style={{ color: casaColor }}
          >
            Casa {casa?.nome || 'Desconhecida'}
          </h2>

          {/* Nome + Cargo */}
          <p className="text-white/50 text-sm font-light mb-4">
            {profile?.nome || 'Aluno'}, {cargo || 'Membro'}
          </p>

          {/* Points - Premium Badge */}
          <div 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-5 shadow-lg transition-all duration-300"
            style={{ 
              backgroundColor: `${casaColor}25`,
              boxShadow: `0 4px 15px -3px ${casaColor}40`
            }}
          >
            <Star className="w-5 h-5" style={{ color: casaColor }} fill={casaColor} />
            <span className="text-white font-semibold">
              {ranking?.total_pontos || 0} pontos
            </span>
          </div>

          {/* Current Phase Card - Enhanced */}
          {faseAtual && (
            <div 
              className="w-full rounded-xl px-4 py-3 border backdrop-blur-sm"
              style={{
                backgroundColor: `${faseAtual.inteligencia?.cor_hex || casaColor}12`,
                borderColor: `${faseAtual.inteligencia?.cor_hex || casaColor}25`,
                boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.05)`
              }}
            >
              <div className="text-center">
                <p className="text-sm text-white/80">
                  Fase atual: <span className="font-medium" style={{ color: faseAtual.inteligencia?.cor_hex || casaColor }}>{faseAtual.inteligencia?.nome || 'Carregando...'}</span>
                </p>
                <p className="text-xs text-white/50 mt-1">
                  Semana {faseAtual.semana_atual || 1} de 4
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phase Card */}
      <button
        onClick={() => navigate('/aluno/missoes')}
        className="w-full flex items-center gap-4 p-4 rounded-2xl text-left
          bg-gradient-to-r from-white/[0.06] to-white/[0.02]
          backdrop-blur-sm border border-white/10
          hover:scale-[1.02] hover:border-white/20
          transition-all duration-300 ease-out active:scale-[0.98]"
        style={{ boxShadow: `0 8px 24px -6px ${casaColor}20` }}
      >
        {faseAtual ? (() => {
          const semana = calcularSemanaAtual(faseAtual.data_inicio, faseAtual.data_fim);
          const totalSemanas = 4;
          const progressPercent = Math.min((semana / totalSemanas) * 100, 100);
          return (
            <>
              <div
                className="p-3 rounded-lg shrink-0"
                style={{ backgroundColor: `${casaColor}20` }}
              >
                <Calendar className="w-6 h-6" style={{ color: casaColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  Fase {faseAtual.numero_fase} — {faseAtual.inteligencia?.nome || 'Carregando...'}
                </p>
                <p className="text-white/50 text-xs mt-0.5">
                  Semana {semana} de {totalSemanas}
                </p>
              </div>
              <div className="w-16 shrink-0">
                <Progress
                  value={progressPercent}
                  className="h-2 bg-white/10"
                  indicatorColor={casaColor}
                />
              </div>
            </>
          );
        })() : (
          <>
            <div className="p-3 rounded-lg shrink-0 bg-white/10">
              <Calendar className="w-6 h-6 text-white/40" />
            </div>
            <p className="text-white/40 text-sm">Nenhuma fase ativa no momento</p>
          </>
        )}
      </button>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
          Ações Rápidas
        </h3>

        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => navigate(action.path)}
              className="relative w-full flex items-center gap-4 p-4 rounded-xl text-left group
                bg-gradient-to-r from-white/[0.06] to-white/[0.02]
                backdrop-blur-sm border border-white/10
                hover:scale-[1.02] hover:border-white/20
                transition-all duration-300 ease-out
                active:scale-[0.98]"
              style={{
                boxShadow: `0 4px 20px -4px ${casaColor}15`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 8px 30px -4px ${casaColor}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 4px 20px -4px ${casaColor}15`;
              }}
            >
              <div 
                className="p-3 rounded-lg shadow-lg transition-all duration-300 group-hover:scale-110"
                style={{ 
                  backgroundColor: `${casaColor}20`,
                  boxShadow: `0 4px 12px -2px ${casaColor}30`
                }}
              >
                <Icon className="w-6 h-6" style={{ color: casaColor }} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{action.label}</span>
                  {action.badge && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {action.badge > 99 ? '99+' : action.badge}
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-sm font-light">{action.description}</p>
              </div>

              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all duration-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HomePage;
