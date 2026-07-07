import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, BookOpen, NotebookPen, Home } from 'lucide-react';
import { infantilTheme as t } from '@/styles/infantilTheme';

interface NavItemConfig {
  id: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  match: (path: string) => boolean;
}

/**
 * Barra do professor. FUNDAMENTAL 2 (reforma, atrás do flag F2_REFORMA_ATIVA).
 * 4 abas: Arboria (a prática) · Inteligências (estudo) · Diário (threads) ·
 * Sua Casa (mentor). Mesma pele glass-light do Infantil; alvo de toque
 * confortável mesmo com 4 itens.
 *
 * Irmã da InfantilBottomNav: mantida separada para NÃO tocar a barra de 3 abas
 * que está em produção no Infantil/F1.
 */
const F2BottomNav = ({ dark = false }: { dark?: boolean }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Dentro de um aluno (thread) e durante a aula, a barra some: tela cheia,
  // um toque perdido não pode tirar o professor do meio do registro.
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
      id: 'inteligencias',
      icon: <BookOpen size={22} strokeWidth={1.75} />,
      label: 'Inteligências',
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
    {
      id: 'casa',
      icon: <Home size={22} strokeWidth={1.75} />,
      label: 'Sua Casa',
      path: '/professor/casa',
      match: (p) => p.startsWith('/professor/casa'),
    },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 ${dark ? 'glass-dark' : 'glass-light'}`}
      style={{
        boxShadow: '0 -1px 3px rgba(28,34,48,0.06)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      }}
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
              className="relative flex flex-1 flex-col items-center justify-center gap-1 pt-2.5 pb-1.5 min-h-[62px] transition-colors"
              style={{ color }}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className="absolute top-0 h-0.5 w-10 rounded-full transition-opacity duration-200"
                style={{ backgroundColor: dark ? '#FFFFFF' : t.accent, opacity: isActive ? 1 : 0 }}
              />
              {item.icon}
              <span className="text-[10.5px] font-medium leading-tight text-center">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default F2BottomNav;
