import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Library, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { infantilTheme as t } from '@/styles/infantilTheme';

/**
 * PAINEL ARBORIA: o painel do DONO da plataforma (papel super_admin).
 * Separado do /admin, que é o painel da ESCOLA (coordenação).
 * V1 enxuta: Visão geral + Banco de atividades. Cresce daqui.
 */
const ArboriaAdminLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const abas = [
    { label: 'Visão geral', path: '/arboria', icon: <LayoutDashboard size={16} strokeWidth={1.75} /> },
    { label: 'Banco de atividades', path: '/arboria/atividades', icon: <Library size={16} strokeWidth={1.75} /> },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: t.bg, color: t.text }}>
      <header
        className="sticky top-0 z-40 glass-light"
        style={{ boxShadow: '0 1px 3px rgba(28,34,48,0.06)' }}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0" style={{ color: t.accent }} aria-hidden="true">
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
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide" style={{ color: t.textFaint }}>
                Painel Arboria
              </p>
              <p className="text-sm font-semibold truncate" style={{ color: t.text }}>
                Toda a plataforma
              </p>
            </div>
          </div>

          <button
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="p-2 rounded-full"
            style={{ color: t.textFaint }}
            aria-label="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Abas */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1.5 pb-2 overflow-x-auto">
          {abas.map((aba) => {
            const ativa =
              aba.path === '/arboria'
                ? location.pathname === '/arboria'
                : location.pathname.startsWith(aba.path);
            return (
              <button
                key={aba.path}
                onClick={() => navigate(aba.path)}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold flex-shrink-0 transition-colors"
                style={
                  ativa
                    ? { backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowSm }
                    : { backgroundColor: t.surface, color: t.textMuted, border: `1px solid ${t.border}` }
                }
              >
                {aba.icon}
                {aba.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 pb-16">{children}</main>
    </div>
  );
};

export default ArboriaAdminLayout;
