import { useLocation, useNavigate } from 'react-router-dom';
import { Target, Home, MessageCircle, Shield, BookOpen } from 'lucide-react';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { useStudent } from '@/contexts/StudentContext';
import { cn } from '@/lib/utils';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalMissoesNotificacoes, mensagensNaoLidas } = useNotificacoes();
  const { casa } = useStudent();

  // 5 destinos da jornada do aluno. Perfil vive no avatar do topo (StudentHeader);
  // Dashboard vive como atalho na Home pra líder/coordenador.
  const navItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/aluno/home', color: '#3b82f6' },
    { id: 'missoes', icon: Target, label: 'Missões', path: '/aluno/missoes', color: '#f59e0b' },
    { id: 'capitulo', icon: BookOpen, label: 'Capítulo', path: '/aluno/capitulo', color: '#a78bfa' },
    { id: 'casa', icon: Shield, label: 'Casa', path: '/aluno/casa', color: '#10b981' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', path: '/aluno/chat', color: '#8b5cf6' },
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-4 mb-4">
        <div className="relative flex items-center justify-around rounded-full border border-violet-500/10 bg-[#12122A]/95 backdrop-blur-lg shadow-lg max-w-md mx-auto">
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            const Icon = item.icon;
            const badge = badges[item.id];

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="relative z-20 flex flex-col items-center justify-center p-2.5 min-w-[56px] transition-all duration-200"
                aria-label={item.label}
              >
                <div className="relative">
                  <div className={cn('w-5 h-5 transition-all duration-200', isActive ? 'scale-110' : 'scale-100')}>
                    <Icon
                      className="w-full h-full"
                      style={{ color: isActive ? (casa?.cor_hex || item.color) : 'rgba(255,255,255,0.35)' }}
                    />
                  </div>
                  {badge && badge > 0 && (
                    <div className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 shadow-lg">
                      {badge > 99 ? '99+' : badge}
                    </div>
                  )}
                </div>
                <span
                  className="text-[10px] mt-0.5 transition-all duration-200"
                  style={{
                    color: isActive ? (casa?.cor_hex || item.color) : 'rgba(255,255,255,0.3)',
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
              backgroundColor: `${casa?.cor_hex || navItems[activeIndex].color}50`,
              left: `calc(${(activeIndex * 100) / navItems.length}% + ${100 / navItems.length / 2}% - 16px)`,
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-0.5 z-10 h-1 w-6 rounded-full transition-all duration-300 ease-out"
            style={{
              backgroundColor: casa?.cor_hex || navItems[activeIndex].color,
              left: `calc(${(activeIndex * 100) / navItems.length}% + ${100 / navItems.length / 2}% - 12px)`,
            }}
          />
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
