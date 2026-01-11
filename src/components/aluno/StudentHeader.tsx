import { Bell } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';

interface StudentHeaderProps {
  notificationCount?: number;
}

const StudentHeader = ({ notificationCount = 0 }: StudentHeaderProps) => {
  const { faseAtual, institutionName, isLoading } = useStudent();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d] border-b border-white/10">
      <div className="flex flex-col px-4 py-2 max-w-lg mx-auto">
        {/* Linha 1: Logo + Fase + Notificações */}
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl">🌳</span>
            <span className="font-semibold text-white text-sm">Projeto Arboria</span>
          </div>

          {/* Fase + Notificações */}
          <div className="flex items-center gap-3">
            {/* Fase (texto simples com cor) */}
            {isLoading ? (
              <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
            ) : faseAtual?.inteligencia ? (
              <span 
                className="text-sm font-medium"
                style={{ color: faseAtual.inteligencia.cor_hex || '#fff' }}
              >
                Semana {faseAtual.semana_atual || 1}
              </span>
            ) : null}
            
            {/* Sino */}
            <button className="relative p-1 text-white/60 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[14px] h-3.5 px-1 flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Linha 2: Nome da instituição (discreto) */}
        {institutionName && (
          <p className="text-xs text-white/40 ml-7 -mt-0.5">
            {institutionName}
          </p>
        )}
      </div>
    </header>
  );
};

export default StudentHeader;
