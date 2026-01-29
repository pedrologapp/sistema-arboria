import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Sparkles, BookOpen, Users } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';

interface NavItemConfig {
  id: string;
  icon: React.ReactNode;
  label: string;
  path: string;
}

const ProfessorBottomNavSimplificado = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { casaColor } = useProfessor();
  
  // Cor fixa para professores sem casa (indigo padrão)
  const accentColor = casaColor || '#6366f1';

  const navItems: NavItemConfig[] = [
    { id: 'home', icon: <Home size={20} />, label: 'Home', path: '/professor' },
    { id: 'circulo', icon: <Sparkles size={20} />, label: 'Círculo', path: '/professor/circulo' },
    { id: 'conteudo', icon: <BookOpen size={20} />, label: 'Conteúdo', path: '/professor/conteudo' },
    { id: 'alunos', icon: <Users size={20} />, label: 'Alunos', path: '/professor/alunos' },
  ];

  const getActiveIndex = (): number => {
    const currentPath = location.pathname;
    
    if (currentPath === '/professor') return 0;
    if (currentPath.startsWith('/professor/circulo')) return 1;
    if (currentPath.startsWith('/professor/conteudo')) return 2;
    if (currentPath.startsWith('/professor/alunos')) return 3;
    
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
          {/* Limelight effect */}
          <div
            className="absolute bottom-0 h-1 rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${100 / navItems.length}%`,
              left: `${(activeIndex * 100) / navItems.length}%`,
              backgroundColor: accentColor,
              boxShadow: `0 0 20px ${accentColor}80, 0 0 40px ${accentColor}40`
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
                  color: isActive ? accentColor : 'rgba(255, 255, 255, 0.5)'
                }}
              >
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

export default ProfessorBottomNavSimplificado;
