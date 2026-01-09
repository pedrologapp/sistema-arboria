import { Bell } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';

interface StudentHeaderProps {
  notificationCount?: number;
}

const StudentHeader = ({ notificationCount = 0 }: StudentHeaderProps) => {
  const { faseAtual, institutionName, isLoading } = useStudent();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
      <div className="flex flex-col px-4 py-2 max-w-lg mx-auto">
        {/* Linha 1: Logo + Instituição + Notificações */}
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl">🌳</span>
            <span className="font-semibold text-white text-sm">Projeto Arboria</span>
          </div>

          {/* Instituição + Notificações */}
          <div className="flex items-center gap-2">
            {institutionName && (
              <span className="text-white/70 text-sm font-medium">
                {institutionName}
              </span>
            )}
            
            <button className="relative p-2 text-white/60 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Linha 2: Badge da Fase (abaixo do logo) */}
        <div className="flex mt-1">
          {isLoading ? (
            <div className="h-5 w-28 bg-white/10 rounded-full animate-pulse ml-7" />
          ) : faseAtual?.inteligencia ? (
            <div 
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ml-7"
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
      </div>
    </header>
  );
};

export default StudentHeader;
