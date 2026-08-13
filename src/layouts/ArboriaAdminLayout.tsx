import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Library, KeyRound, Route, BookOpen, Users, LogOut, RotateCcw, KanbanSquare, FolderOpen, ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { F2_COORDENADOR } from '@/config/f2Coordenador';

/**
 * PAINEL ARBORIA: o painel do DONO da plataforma (papel super_admin).
 * Separado do /admin, que é o painel da ESCOLA (coordenação).
 * Menu LATERAL vertical no desktop; barra horizontal no mobile (onde a lateral
 * não cabe bem).
 */
const ArboriaAdminLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const abas = [
    { label: 'Visão geral', path: '/arboria', icon: <LayoutDashboard size={17} strokeWidth={1.75} /> },
    { label: 'Meu quadro', path: '/arboria/tarefas', icon: <KanbanSquare size={17} strokeWidth={1.75} /> },
    { label: 'Repositório', path: '/arboria/repositorio', icon: <FolderOpen size={17} strokeWidth={1.75} /> },
    { label: 'Banco de atividades', path: '/arboria/atividades', icon: <Library size={17} strokeWidth={1.75} /> },
    { label: 'Capítulos', path: '/arboria/capitulos', icon: <BookOpen size={17} strokeWidth={1.75} /> },
    { label: 'Definição de Trilha', path: '/arboria/trilha', icon: <Route size={17} strokeWidth={1.75} /> },
    { label: 'Andamento das turmas', path: '/arboria/andamento', icon: <RotateCcw size={17} strokeWidth={1.75} /> },
    { label: 'Coleta', path: '/arboria/coleta', icon: <ClipboardList size={17} strokeWidth={1.75} /> },
    { label: 'Logins de professores', path: '/arboria/logins-professores', icon: <KeyRound size={17} strokeWidth={1.75} /> },
    ...(F2_COORDENADOR
      ? [{ label: 'Coordenadores', path: '/arboria/coordenadores', icon: <Users size={17} strokeWidth={1.75} /> }]
      : []),
  ];

  const ehAtiva = (path: string) =>
    path === '/arboria' ? location.pathname === '/arboria' : location.pathname.startsWith(path);

  const Marca = () => (
    <div className="flex items-center gap-2.5 min-w-0">
      <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0" style={{ color: t.accent }} aria-hidden="true">
        <path d="M30 79 L50 27 L70 79" stroke="currentColor" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M50 27 C50 16 58 9 68 8 C69 19 61 26 50 27 Z" fill="currentColor" />
      </svg>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide" style={{ color: t.textFaint }}>Painel Arboria</p>
        <p className="text-sm font-semibold truncate" style={{ color: t.text }}>Toda a plataforma</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen md:flex" style={{ backgroundColor: t.bg, color: t.text }}>
      {/* ===== SIDEBAR VERTICAL (desktop) ===== */}
      <aside
        className="hidden md:flex md:flex-col md:w-60 md:sticky md:top-0 md:h-screen md:flex-shrink-0"
        style={{ backgroundColor: t.surface, borderRight: `1px solid ${t.border}` }}
      >
        <div className="px-4 h-16 flex items-center" style={{ borderBottom: `1px solid ${t.border}` }}>
          <Marca />
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {abas.map((aba) => {
            const ativa = ehAtiva(aba.path);
            return (
              <button
                key={aba.path}
                onClick={() => navigate(aba.path)}
                className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-[13px] font-semibold text-left transition-colors"
                style={
                  ativa
                    ? { backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowSm }
                    : { backgroundColor: 'transparent', color: t.textMuted }
                }
              >
                <span className="flex-shrink-0">{aba.icon}</span>
                <span className="truncate">{aba.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3" style={{ borderTop: `1px solid ${t.border}` }}>
          <button
            onClick={async () => { await signOut(); navigate('/login'); }}
            className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-[13px] font-semibold"
            style={{ color: t.textMuted }}
          >
            <LogOut size={17} strokeWidth={1.75} /> Sair
          </button>
        </div>
      </aside>

      {/* ===== TOPO + ABAS HORIZONTAIS (mobile) ===== */}
      <div className="md:hidden">
        <header className="sticky top-0 z-40 glass-light" style={{ boxShadow: '0 1px 3px rgba(28,34,48,0.06)' }}>
          <div className="px-4 h-14 flex items-center justify-between">
            <Marca />
            <button onClick={async () => { await signOut(); navigate('/login'); }} className="p-2 rounded-full" style={{ color: t.textFaint }} aria-label="Sair">
              <LogOut size={18} />
            </button>
          </div>
          <div className="px-4 flex gap-1.5 pb-2 overflow-x-auto">
            {abas.map((aba) => {
              const ativa = ehAtiva(aba.path);
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
      </div>

      {/* ===== CONTEÚDO ===== */}
      <main className="flex-1 min-w-0">
        <div className="max-w-4xl mx-auto px-4 py-5 pb-16">{children}</div>
      </main>
    </div>
  );
};

export default ArboriaAdminLayout;
