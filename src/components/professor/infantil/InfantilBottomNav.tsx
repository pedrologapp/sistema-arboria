import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, BookOpen, NotebookPen } from 'lucide-react';
import { infantilTheme as t } from '@/styles/infantilTheme';

interface NavItemConfig {
  id: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  match: (path: string) => boolean;
}

/**
 * Barra do professor — INFANTIL. 3 abas, conforme decisão de 26/06:
 * Arboria (a prática) · Fase (estudo/apoio) · Alunos (threads).
 * Sem Chat (chat é das Casas = F2). Pele neutra, alvo de toque confortável.
 */
const InfantilBottomNav = ({ dark = false }: { dark?: boolean }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Dentro de um aluno (thread) e durante a AULA (rajada), a barra some —
  // tela cheia: no meio do caos da sala, um toque perdido não sai da aula.
  if (/^\/professor\/alunos\/.+/.test(location.pathname)) return null;
  if (location.pathname === '/professor/aula') return null;

  const navItems: NavItemConfig[] = [
    {
      id: 'arboria',
      icon: <Compass size={22} strokeWidth={1.75} />,
      label: 'Arboria',
      path: '/professor',
      match: (p) => p === '/professor',
    },
    {
      id: 'fase',
      icon: <BookOpen size={22} strokeWidth={1.75} />,
      label: 'Fase',
      path: '/professor/fase',
      match: (p) => p.startsWith('/professor/fase'),
    },
    {
      id: 'diario',
      icon: <NotebookPen size={22} strokeWidth={1.75} />,
      label: 'Diário',
      path: '/professor/alunos',
      match: (p) => p.startsWith('/professor/alunos'),
    },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 pb-safe ${dark ? 'glass-dark' : 'glass-light'}`}
      style={{ boxShadow: '0 -1px 3px rgba(28,34,48,0.06)' }}
    >
      <div className="max-w-lg mx-auto flex items-stretch justify-around">
        {navItems.map((item) => {
          const isActive = item.match(location.pathname);
          const color = dark
            ? isActive
              ? '#FFFFFF'
              : 'rgba(255,255,255,0.55)'
            : isActive
              ? t.accent
              : t.textFaint;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors"
              style={{ color }}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Indicador ativo */}
              <span
                className="absolute top-0 h-0.5 w-10 rounded-full transition-opacity duration-200"
                style={{ backgroundColor: dark ? '#FFFFFF' : t.accent, opacity: isActive ? 1 : 0 }}
              />
              {item.icon}
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default InfantilBottomNav;
