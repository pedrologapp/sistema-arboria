import { useLocation, useNavigate } from 'react-router-dom';
import { Target, Home, MessageCircle, User } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { cn } from '@/lib/utils';

interface NavItemConfig {
  id: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  disabled?: boolean;
  badge?: number;
}

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { casaColor } = useStudent();
  const { missoesPendentes, mensagensNaoLidas } = useNotificacoes();

  const navItems: NavItemConfig[] = [
    { id: 'home', icon: <Home />, label: 'Home', path: '/aluno/home' },
    { id: 'missoes', icon: <Target />, label: 'Missões', path: '/aluno/missoes', badge: missoesPendentes > 0 ? missoesPendentes : undefined },
    { id: 'chat', icon: <MessageCircle />, label: 'Chat', path: '/aluno/chat', badge: mensagensNaoLidas > 0 ? mensagensNaoLidas : undefined },
    { id: 'perfil', icon: <User />, label: 'Perfil', path: '/aluno/perfil' },
  ];

  const getActiveIndex = () => {
    const currentPath = location.pathname;
    const index = navItems.findIndex(item => currentPath.startsWith(item.path));
    return index >= 0 ? index : 0;
  };

  const activeIndex = getActiveIndex();

  const handleNavClick = (item: NavItemConfig) => {
    if (item.disabled) return;
    navigate(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-4 mb-4">
        <div className="relative flex items-center justify-around rounded-full border border-white/10 bg-black/80 backdrop-blur-lg shadow-lg max-w-md mx-auto">
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            const isDisabled = item.disabled;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                disabled={isDisabled}
                className={cn(
                  'relative z-20 flex flex-col items-center justify-center p-3 min-w-[60px] transition-all duration-200',
                  isDisabled && 'opacity-30 cursor-not-allowed'
                )}
                aria-label={item.label}
              >
                <div className="relative">
                  <div
                    className={cn(
                      'w-6 h-6 transition-all duration-200',
                      isActive ? 'scale-110' : 'scale-100'
                    )}
                    style={{
                      color: isActive ? casaColor : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {item.icon}
                  </div>
                  
                  {/* Badge de notificação */}
                  {item.badge && item.badge > 0 && (
                    <div className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-lg">
                      {item.badge > 99 ? '99+' : item.badge}
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] mt-1 transition-opacity duration-200',
                    isActive ? 'opacity-100' : 'opacity-40'
                  )}
                  style={{
                    color: isActive ? casaColor : 'white',
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Limelight effect - top glow */}
          <div
            className="pointer-events-none absolute -top-2 z-10 h-2 w-12 rounded-full blur-md transition-all duration-300 ease-out"
            style={{
              backgroundColor: `${casaColor}60`,
              left: `calc(${(activeIndex * 100) / navItems.length}% + ${100 / navItems.length / 2}% - 24px)`,
            }}
          />

          {/* Limelight effect - bottom indicator */}
          <div
            className="pointer-events-none absolute -bottom-0.5 z-10 h-1 w-10 rounded-full transition-all duration-300 ease-out"
            style={{
              backgroundColor: casaColor,
              left: `calc(${(activeIndex * 100) / navItems.length}% + ${100 / navItems.length / 2}% - 20px)`,
            }}
          />
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
