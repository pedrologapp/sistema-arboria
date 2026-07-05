import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, BarChart3, Settings, TreePine } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/admin/monitor', color: '#3b82f6' },
  { id: 'fases', icon: Calendar, label: 'Fases', path: '/admin/fases', color: '#8b5cf6' },
  { id: 'pessoas', icon: Users, label: 'Pessoas', path: '/admin/pessoas', color: '#10b981' },
  { id: 'arboria', icon: TreePine, label: 'Arboria', path: '/admin/arboria', color: '#f59e0b' },
  { id: 'dados', icon: BarChart3, label: 'Dados', path: '/admin/dados', color: '#64748b' },
  { id: 'config', icon: Settings, label: 'Config', path: '/admin/config', color: '#ec4899' },
];

const AdminBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveIndex = (): number => {
    const p = location.pathname;
    if (p.startsWith('/admin/monitor')) return 0;
    if (p.startsWith('/admin/fases')) return 1;
    if (p.startsWith('/admin/pessoas') || p.startsWith('/admin/casas') || p.startsWith('/admin/logins-professores')) return 2;
    if (p.startsWith('/admin/arboria')) return 3;
    if (p.startsWith('/admin/dados') || p.startsWith('/admin/relatorios')) return 4;
    if (p.startsWith('/admin/config') || p.startsWith('/admin/atividades')) return 5;
    return 0;
  };

  const activeIndex = getActiveIndex();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-4 mb-4">
        <div className="relative flex items-center justify-around rounded-full border border-violet-500/10 bg-[#12122A]/95 backdrop-blur-lg shadow-lg max-w-lg mx-auto">
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="relative z-20 flex flex-col items-center justify-center p-2.5 min-w-[55px] transition-all duration-200"
              >
                <div className={cn('w-5 h-5 transition-all duration-200', isActive ? 'scale-110' : 'scale-100')}>
                  <Icon className="w-full h-full" style={{ color: isActive ? item.color : 'rgba(255,255,255,0.35)' }} />
                </div>
                <span
                  className="text-[9px] mt-0.5 transition-all duration-200"
                  style={{ color: isActive ? item.color : 'rgba(255,255,255,0.35)', fontWeight: isActive ? 500 : 400 }}
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
            className="pointer-events-none absolute -bottom-0.5 z-10 h-1 w-7 rounded-full transition-all duration-300 ease-out"
            style={{
              backgroundColor: navItems[activeIndex].color,
              left: `calc(${(activeIndex * 100) / navItems.length}% + ${100 / navItems.length / 2}% - 14px)`,
            }}
          />
        </div>
      </div>
    </nav>
  );
};

export default AdminBottomNav;
