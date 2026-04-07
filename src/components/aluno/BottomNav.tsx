import { useLocation, useNavigate } from 'react-router-dom';
import { Target, Home, MessageCircle, User, Shield, LayoutDashboard, Lock } from 'lucide-react';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { useStudent } from '@/contexts/StudentContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { toast } from 'sonner';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalMissoesNotificacoes, mensagensNaoLidas } = useNotificacoes();
  const { profile, casa } = useStudent();

  // Check cargo
  const { data: cargoAtivo = null } = useQuery({
    queryKey: ['meu-cargo-nav', profile?.id, casa?.id],
    queryFn: async () => {
      if (!profile?.id || !casa?.id) return null;
      const { data } = await supabase.from('cargos_casa')
        .select('cargo').eq('aluno_id', profile.id).eq('casa_id', casa.id).eq('ativo', true).maybeSingle();
      return data?.cargo || null;
    },
    enabled: !!profile?.id && !!casa?.id,
    staleTime: 300000,
  });

  const temAcessoDashboard = cargoAtivo === 'lider' || cargoAtivo === 'coordenador';

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/aluno/home', color: '#3b82f6' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/aluno/dashboard', color: '#06b6d4', locked: !temAcessoDashboard },
    { id: 'missoes', icon: Target, label: 'Missoes', path: '/aluno/missoes', color: '#f59e0b' },
    { id: 'casa', icon: Shield, label: 'Casa', path: '/aluno/casa', color: '#10b981' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', path: '/aluno/chat', color: '#8b5cf6' },
    { id: 'perfil', icon: User, label: 'Perfil', path: '/aluno/perfil', color: '#ec4899' },
  ];

  const badges: Record<string, number | undefined> = {
    missoes: totalMissoesNotificacoes > 0 ? totalMissoesNotificacoes : undefined,
    chat: mensagensNaoLidas > 0 ? mensagensNaoLidas : undefined,
  };

  const getActiveIndex = () => {
    const idx = navItems.findIndex(item => location.pathname.startsWith(item.path));
    return idx >= 0 ? idx : 0;
  };

  const activeIndex = getActiveIndex();

  const handleClick = (item: typeof navItems[0]) => {
    if (item.locked) {
      toast.info('Disponivel para lideres e coordenadores');
      return;
    }
    navigate(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-4 mb-4">
        <div className="relative flex items-center justify-around rounded-full border border-white/10 bg-black/80 backdrop-blur-lg shadow-lg max-w-md mx-auto">
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            const Icon = item.icon;
            const badge = badges[item.id];
            const isLocked = item.locked;

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className={cn(
                  'relative z-20 flex flex-col items-center justify-center p-2 min-w-[45px] transition-all duration-200',
                  isLocked && 'opacity-40'
                )}
                aria-label={item.label}
              >
                <div className="relative">
                  <div className={cn('w-5 h-5 transition-all duration-200', isActive && !isLocked ? 'scale-110' : 'scale-100')}>
                    <Icon
                      className="w-full h-full"
                      style={{ color: isActive && !isLocked ? item.color : 'rgba(255,255,255,0.35)' }}
                    />
                  </div>
                  {isLocked && (
                    <Lock className="w-2 h-2 text-white/30 absolute -bottom-0.5 -right-1" />
                  )}
                  {badge && badge > 0 && (
                    <div className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 shadow-lg">
                      {badge > 99 ? '99+' : badge}
                    </div>
                  )}
                </div>
                <span
                  className="text-[8px] mt-0.5 transition-all duration-200"
                  style={{
                    color: isActive && !isLocked ? item.color : 'rgba(255,255,255,0.3)',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          <div
            className="pointer-events-none absolute -top-1.5 z-10 h-1.5 w-8 rounded-full blur-sm transition-all duration-300 ease-out"
            style={{
              backgroundColor: `${navItems[activeIndex].color}50`,
              left: `calc(${(activeIndex * 100) / navItems.length}% + ${100 / navItems.length / 2}% - 16px)`,
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-0.5 z-10 h-1 w-6 rounded-full transition-all duration-300 ease-out"
            style={{
              backgroundColor: navItems[activeIndex].locked ? 'transparent' : navItems[activeIndex].color,
              left: `calc(${(activeIndex * 100) / navItems.length}% + ${100 / navItems.length / 2}% - 12px)`,
            }}
          />
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
