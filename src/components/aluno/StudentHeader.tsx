import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '@/contexts/StudentContext';

interface StudentHeaderProps {
  notificationCount?: number;
}

const StudentHeader = ({ notificationCount = 0 }: StudentHeaderProps) => {
  const navigate = useNavigate();
  const { faseAtual, institutionName, isLoading, profile, casa } = useStudent();
  const inicial = (profile?.nome || profile?.full_name || '?').trim().charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#1A1A2E] border-b border-violet-500/10">
      <div className="flex flex-col px-4 py-2 max-w-lg mx-auto">
        {/* Linha 1: Logo + Fase + Notificações */}
        <div className="flex items-center justify-between">
          {/* Logo. "A que Brota" (marca oficial, decisão do Fundador 02/07) */}
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" className="w-5 h-5 text-white" aria-hidden="true">
              <path
                d="M30 79 L50 27 L70 79"
                stroke="currentColor"
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path d="M50 27 C50 16 58 9 68 8 C69 19 61 26 50 27 Z" fill="currentColor" />
            </svg>
            <span className="font-semibold text-white text-sm">Projeto Arboria</span>
          </div>

          {/* Fase + Notificações */}
          <div className="flex items-center gap-3">
            {/* Fase (texto simples com cor) */}
            {isLoading ? (
              <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
            ) : faseAtual?.inteligencia ? (
              <div className="flex flex-col items-end">
                <span
                  className="text-sm font-medium"
                  style={{ color: faseAtual.inteligencia.cor_hex || '#fff' }}
                >
                  Fase {faseAtual.inteligencia.nome}
                </span>
              </div>
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

            {/* Avatar -> Perfil */}
            <button
              onClick={() => navigate('/aluno/perfil')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white bg-white/10 transition-transform active:scale-95"
              style={{ border: `1.5px solid ${casa?.cor_hex || 'rgba(255,255,255,0.2)'}` }}
              aria-label="Meu perfil"
            >
              {inicial}
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
