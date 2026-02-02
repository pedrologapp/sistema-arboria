import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, PenLine, Sparkles, Users } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAlertasAlunos } from '@/hooks/useAlertasAlunos';

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
  const { casaColor, profile, casaMentor } = useProfessor();
  const { badgesAtivos } = useAlertasAlunos();
  
  // Calcular total de alertas para badge
  const totalAlertas = (badgesAtivos?.precisaAtencao || 0) + 
                       (badgesAtivos?.celebrar || 0) + 
                       (badgesAtivos?.naoEsquecer || 0) + 
                       (badgesAtivos?.atencaoFaseAnterior || 0) +
                       (badgesAtivos?.aguardandoExplicacao || 0);

  // Query: Entregas Pendentes
  const { data: entregasPendentes = 0 } = useQuery({
    queryKey: ['entregas-pendentes-count', profile?.institution_id, casaMentor?.id],
    queryFn: async () => {
      // Buscar missões relevantes para este mentor
      let missaoQuery = supabase
        .from('missoes')
        .select('id')
        .eq('institution_id', profile?.institution_id!);

      // Filtrar por casa do mentor (missões gerais OU da sua casa)
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
    { id: 'home', icon: <Home size={20} />, label: 'Home', path: '/professor' },
    { id: 'missoes', icon: <ClipboardList size={20} />, label: 'Missões', path: '/professor/missoes' },
    { id: 'avaliar', icon: <PenLine size={20} />, label: 'Avaliar', path: '/professor/entregas', badge: entregasPendentes >= 1 ? entregasPendentes : undefined },
    { id: 'circulo', icon: <Sparkles size={20} />, label: 'Círculo', path: '/professor/circulo' },
    { id: 'alunos', icon: <Users size={20} />, label: 'Alunos', path: '/professor/alunos', badge: totalAlertas > 0 ? totalAlertas : undefined },
  ];

  const getActiveIndex = (): number => {
    const currentPath = location.pathname;
    
    if (currentPath === '/professor') return 0;
    if (currentPath.startsWith('/professor/missoes')) return 1;
    if (currentPath.startsWith('/professor/entregas')) return 2;
    if (currentPath.startsWith('/professor/circulo')) return 3;
    if (currentPath.startsWith('/professor/alunos')) return 4;
    
    return 0;
  };

  const activeIndex = getActiveIndex();

  const handleNavClick = (item: NavItemConfig) => {
    navigate(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-4 mb-4 max-w-lg mx-auto">
        <div 
          className="relative flex justify-around items-center py-3 px-2 rounded-full border border-white/10 bg-black/80 backdrop-blur-lg shadow-lg"
        >
          {/* Limelight effect - na parte inferior como no aluno */}
          <div
            className="absolute bottom-0 h-1 rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${100 / navItems.length}%`,
              left: `${(activeIndex * 100) / navItems.length}%`,
              backgroundColor: casaColor,
              boxShadow: `0 0 20px ${casaColor}80, 0 0 40px ${casaColor}40`
            }}
          />

          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className="relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-200"
                style={{
                  color: isActive ? casaColor : 'rgba(255, 255, 255, 0.5)'
                }}
              >
                {/* Badge de notificação */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 right-0 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                <div
                  className="transition-transform duration-200"
                  style={{
                    transform: isActive ? 'scale(1.1)' : 'scale(1)'
                  }}
                >
                  {item.icon}
                </div>
                <span 
                  className="text-[10px] font-medium"
                  style={{
                    opacity: isActive ? 1 : 0.7
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default ProfessorBottomNav;
