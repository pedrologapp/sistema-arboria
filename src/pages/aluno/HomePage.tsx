import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Target, MessageCircle, Shield, Star, ChevronRight } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { CasaBrasao } from '@/components/CasaBrasao';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
    <div className="space-y-6">
      {/* Greeting */}
      <h1 className="text-2xl font-bold text-white">
        Olá, {firstName}!
      </h1>

      {/* Main Card - House Info */}
      <div 
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: `linear-gradient(135deg, ${casaColor}15 0%, ${casaColor}05 100%)`,
          boxShadow: `0 0 40px ${casaColor}20`,
        }}
      >
        {/* Background glow */}
        <div 
          className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: casaColor }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* House Emblem */}
          <div className="mb-4">
            <CasaBrasao
              brasaoUrl={casa?.brasao_url}
              emoji={casa?.emoji}
              nome={casa?.nome}
              size="large"
            />
          </div>

          {/* House Name */}
          <h2 className="text-xl font-semibold text-white mb-1">
            Casa {casa?.nome || 'Desconhecida'}
          </h2>

          {/* Cargo */}
          <p className="text-white/60 text-sm mb-3">
            {cargo || 'Membro'}
          </p>

          {/* Points */}
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ backgroundColor: `${casaColor}20` }}
          >
            <Star className="w-5 h-5" style={{ color: casaColor }} fill={casaColor} />
            <span className="text-white font-semibold">
              {ranking?.total_pontos || 0} pontos
            </span>
          </div>

          {/* Current Phase Card */}
          {faseAtual && (
            <div 
              className="w-full rounded-xl p-4 border"
              style={{
                backgroundColor: `${faseAtual.inteligencia?.cor_hex || casaColor}15`,
                borderColor: `${faseAtual.inteligencia?.cor_hex || casaColor}30`,
              }}
            >
              <p className="text-white font-medium">
                Fase atual: {faseAtual.inteligencia?.nome?.toUpperCase() || 'Carregando...'}
              </p>
              <p className="text-white/60 text-sm mt-1">
                Semana {faseAtual.semana_atual || 1} de 4
              </p>
            </div>
          )}
        </div>
      </div>

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
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200",
                "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
                "active:scale-[0.98]"
              )}
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${casaColor}20` }}
              >
                <Icon className="w-6 h-6" style={{ color: casaColor }} />
              </div>
              
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{action.label}</span>
                  {action.badge && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {action.badge > 99 ? '99+' : action.badge}
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-sm">{action.description}</p>
              </div>

              <ChevronRight className="w-5 h-5 text-white/30" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HomePage;
