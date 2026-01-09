import { Bell } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';

interface StudentHeaderProps {
  notificationCount?: number;
}

const StudentHeader = ({ notificationCount = 0 }: StudentHeaderProps) => {
  const { faseAtual, isLoading } = useStudent();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-black/80 backdrop-blur-lg border-b border-white/10">
      <div className="flex items-center justify-between h-full px-4 max-w-lg mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌳</span>
          <span className="font-semibold text-white">Arbória</span>
        </div>

        {/* Fase Atual - Badge colorido */}
        <div className="flex-1 flex justify-center">
          {isLoading ? (
            <div className="h-6 w-32 bg-white/10 rounded-full animate-pulse" />
          ) : faseAtual?.inteligencia ? (
            <div 
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: `${faseAtual.inteligencia.cor_hex}20`,
                color: faseAtual.inteligencia.cor_hex || '#fff',
                border: `1px solid ${faseAtual.inteligencia.cor_hex}40`
              }}
            >
              <span>{faseAtual.inteligencia.emoji}</span>
              <span>Fase {faseAtual.inteligencia.nome}</span>
            </div>
          ) : null}
        </div>

        {/* Notificações */}
        <button className="relative p-2 text-white/60 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default StudentHeader;
