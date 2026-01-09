import { useLocation, useNavigate } from 'react-router-dom';
import { Target, Home, MessageCircle, User } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';
import { cn } from '@/lib/utils';

interface NavItemConfig {
  id: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  disabled?: boolean;
}

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { casaColor } = useStudent();

  const navItems: NavItemConfig[] = [
    { id: 'missoes', icon: <Target />, label: 'Missões', path: '/aluno/missoes' },
    { id: 'casa', icon: <Home />, label: 'Casa', path: '/aluno/casa' },
    { id: 'chat', icon: <MessageCircle />, label: 'Chat', path: '/aluno/chat' },
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
