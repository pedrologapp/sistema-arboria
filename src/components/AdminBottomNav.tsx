import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Users, Shield, Calendar, MessageCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemConfig {
  id: string;
  icon: React.ReactNode;
  label: string;
  path: string;
}

const AdminBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Cor tema do Admin (indigo)
  const adminColor = '#6366f1';

  const navItems: NavItemConfig[] = [
    { id: 'monitor', icon: <Activity size={18} />, label: 'Monitor', path: '/admin/monitor' },
    { id: 'pessoas', icon: <Users size={18} />, label: 'Pessoas', path: '/admin/pessoas' },
    { id: 'casas', icon: <Shield size={18} />, label: 'Casas', path: '/admin/casas' },
    { id: 'fases', icon: <Calendar size={18} />, label: 'Fases', path: '/admin/fases' },
    { id: 'chat', icon: <MessageCircle size={18} />, label: 'Chat', path: '/admin/chat' },
    { id: 'config', icon: <Settings size={18} />, label: 'Config', path: '/admin/config' },
  ];

  const getActiveIndex = (): number => {
    const currentPath = location.pathname;
    const index = navItems.findIndex(item => currentPath.startsWith(item.path));
    return index >= 0 ? index : 0;
  };

  const activeIndex = getActiveIndex();

  const handleNavClick = (item: NavItemConfig) => {
    navigate(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe md:hidden">
      <div className="mx-3 mb-3">
        <div className="relative flex items-center justify-around rounded-full border border-white/10 bg-black/80 backdrop-blur-lg shadow-lg max-w-lg mx-auto">
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={cn(
                  'relative z-20 flex flex-col items-center justify-center py-2.5 px-1.5 min-w-[50px] transition-all duration-200'
                )}
                aria-label={item.label}
              >
                <div className="relative">
                  <div
                    className={cn(
                      'transition-all duration-200',
                      isActive ? 'scale-110' : 'scale-100'
                    )}
                    style={{
                      color: isActive ? adminColor : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {item.icon}
                  </div>
                </div>
                <span
                  className={cn(
                    'text-[9px] mt-0.5 transition-opacity duration-200 truncate'
                  )}
                  style={{
                    color: isActive ? adminColor : 'rgba(255,255,255,0.5)',
                    opacity: isActive ? 1 : 0.7,
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Limelight effect - top glow */}
          <div
            className="pointer-events-none absolute -top-2 z-10 h-2 w-10 rounded-full blur-md transition-all duration-300 ease-out"
            style={{
              backgroundColor: `${adminColor}60`,
              left: `calc(${(activeIndex * 100) / navItems.length}% + ${100 / navItems.length / 2}% - 20px)`,
            }}
          />

          {/* Limelight effect - bottom indicator */}
          <div
            className="pointer-events-none absolute -bottom-0.5 z-10 h-1 w-8 rounded-full transition-all duration-300 ease-out"
            style={{
              backgroundColor: adminColor,
              left: `calc(${(activeIndex * 100) / navItems.length}% + ${100 / navItems.length / 2}% - 16px)`,
            }}
          />
        </div>
      </div>
    </nav>
  );
};

export default AdminBottomNav;
