import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Target, ClipboardCheck, Users, MessageCircle } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface NavItemConfig {
  id: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  badge?: number;
}

const ProfessorBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { casaColor, casaMentor, profile } = useProfessor();
  const corCasa = casaColor || casaMentor?.cor_hex || '#3B82F6';

  // Query: Entregas Pendentes
  const { data: entregasPendentes = 0 } = useQuery({
    queryKey: ['entregas-pendentes-count', profile?.institution_id, casaMentor?.id],
    queryFn: async () => {
      let missaoQuery = supabase
        .from('missoes')
        .select('id')
        .eq('institution_id', profile?.institution_id!);

      if (casaMentor?.id) {
        missaoQuery = missaoQuery.or(`tipo_missao.eq.geral,tipo_missao.is.null,casa_id.eq.${casaMentor.id}`);
      }

      const { data: missoes } = await missaoQuery;

      if (!missoes || missoes.length === 0) return 0;

      const { count } = await supabase
        .from('entregas')
        .select('*', { count: 'exact', head: true })
        .in('missao_id', missoes.map(m => m.id))
        .eq('status', 'pendente');

      return count || 0;
    },
    enabled: !!profile?.institution_id,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const navItems: NavItemConfig[] = [
    { id: 'home', icon: <Home size={22} strokeWidth={1.5} />, label: 'Home', path: '/professor' },
    { id: 'missoes', icon: <Target size={22} strokeWidth={1.5} />, label: 'Missões', path: '/professor/missoes' },
    { id: 'avaliar', icon: <ClipboardCheck size={22} strokeWidth={1.5} />, label: 'Avaliar', path: '/professor/entregas', badge: entregasPendentes >= 1 ? entregasPendentes : undefined },
    { id: 'circulo', icon: <MessageCircle size={22} strokeWidth={1.5} />, label: 'Círculo', path: '/professor/circulo' },
    { id: 'alunos', icon: <Users size={22} strokeWidth={1.5} />, label: 'Alunos', path: '/professor/alunos' },
  ];

  const getActiveIndex = (): number => {
    const currentPath = location.pathname;
    
    if (currentPath === '/professor' || currentPath === '/professor/configuracoes') return 0;
    if (currentPath.startsWith('/professor/missoes')) return 1;
    if (currentPath.startsWith('/professor/entregas') || currentPath.startsWith('/professor/avaliar')) return 2;
    if (currentPath.startsWith('/professor/circulo')) return 3;
    if (currentPath.startsWith('/professor/alunos')) return 4;
    
    return 0;
  };

  const activeIndex = getActiveIndex();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe
        bg-[rgba(13,13,13,0.95)] backdrop-blur-xl
        border-t border-white/10"
      style={{
        boxShadow: `0 -4px 24px -4px ${corCasa}10`
      }}
    >
      {/* Limelight indicator - mais proeminente */}
      <div
        className="absolute top-0 h-[3px] rounded-full transition-all duration-300 ease-out"
        style={{
          width: `${100 / navItems.length}%`,
          left: `${(activeIndex * 100) / navItems.length}%`,
          backgroundColor: corCasa,
          boxShadow: `0 0 20px ${corCasa}, 0 0 40px ${corCasa}60`
        }}
      />

      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full
                transition-all duration-300 ease-out"
            >
              {/* Icon container com glow no ativo */}
              <div
                className="relative transition-all duration-300 ease-out"
                style={{
                  transform: isActive ? 'scale(1.15) translateY(-2px)' : 'scale(1)',
                  filter: isActive ? `drop-shadow(0 0 8px ${corCasa}80)` : 'none',
                  color: isActive ? corCasa : 'rgba(255,255,255,0.5)'
                }}
              >
                {item.icon}
                
                {/* Badge */}
                {item.badge && item.badge > 0 && (
                  <span 
                    className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] 
                      flex items-center justify-center rounded-full 
                      text-[10px] font-bold text-white px-1
                      animate-pulse"
                    style={{ 
                      backgroundColor: '#F59E0B',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.5)'
                    }}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              {/* Label com destaque no ativo */}
              <span 
                className="text-[10px] transition-all duration-300 ease-out"
                style={{
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? corCasa : 'rgba(255,255,255,0.5)',
                  opacity: isActive ? 1 : 0.8
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default ProfessorBottomNav;
