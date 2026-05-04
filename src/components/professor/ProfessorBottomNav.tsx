import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, PenLine, Eye, Users, MessageCircle, BookOpen } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'home', icon: Home, label: 'Home', path: '/professor', color: '#3b82f6' },
  { id: 'missoes', icon: ClipboardList, label: 'Missoes', path: '/professor/missoes', color: '#f59e0b' },
  { id: 'avaliar', icon: PenLine, label: 'Avaliar', path: '/professor/entregas', color: '#10b981' },
  { id: 'capitulo', icon: BookOpen, label: 'Capitulo', path: '/professor/capitulo', color: '#a78bfa' },
  { id: 'observar', icon: Eye, label: 'Observar', path: '/professor/circulo', color: '#8b5cf6' },
  { id: 'alunos', icon: Users, label: 'Alunos', path: '/professor/alunos', color: '#ec4899' },
  { id: 'chat', icon: MessageCircle, label: 'Chat', path: '/professor/chat', color: '#06b6d4' },
];

const ProfessorBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, casaMentor } = useProfessor();

  // Entregas pendentes badge
  const { data: entregasPendentes = 0 } = useQuery({
    queryKey: ['entregas-pendentes-count', profile?.institution_id],
    queryFn: async () => {
      const { data: missoes } = await supabase
        .from('missoes')
        .select('id')
        .eq('institution_id', profile?.institution_id!)
        .eq('status', 'liberada');
      if (!missoes || missoes.length === 0) return 0;
      const { count } = await supabase
        .from('entregas')
        .select('*', { count: 'exact', head: true })
        .in('missao_id', missoes.map(m => m.id))
        .eq('status', 'pendente');
      return count || 0;
    },
    enabled: !!profile?.institution_id,
    staleTime: 120000,
    refetchInterval: 300000,
  });

  const badges: Record<string, number | undefined> = {
    avaliar: entregasPendentes > 0 ? entregasPendentes : undefined,
  };

  const getActiveIndex = (): number => {
    const p = location.pathname;
    if (p === '/professor') return 0;
    if (p.startsWith('/professor/missoes')) return 1;
    if (p.startsWith('/professor/entregas')) return 2;
    if (p.startsWith('/professor/capitulo')) return 3;
    if (p.startsWith('/professor/circulo')) return 4;
    if (p.startsWith('/professor/alunos')) return 5;
    if (p.startsWith('/professor/chat')) return 6;
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
            const badge = badges[item.id];

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="relative z-20 flex flex-col items-center justify-center p-2.5 min-w-[50px] transition-all duration-200"
              >
                <div className="relative">
                  <div className={cn('w-5 h-5 transition-all duration-200', isActive ? 'scale-110' : 'scale-100')}>
                    <Icon
                      className="w-full h-full"
                      style={{ color: isActive ? item.color : 'rgba(255,255,255,0.35)' }}
                    />
                  </div>
                  {badge && badge > 0 && (
                    <div className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 shadow-lg">
                      {badge > 99 ? '99+' : badge}
                    </div>
                  )}
                </div>
                <span
                  className="text-[9px] mt-0.5 transition-all duration-200"
                  style={{
                    color: isActive ? item.color : 'rgba(255,255,255,0.35)',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Indicador ativo */}
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

export default ProfessorBottomNav;
