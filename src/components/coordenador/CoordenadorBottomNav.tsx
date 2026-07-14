import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Sparkles, NotebookPen } from 'lucide-react';
import { coordenadorTheme as t } from '@/styles/coordenadorTheme';

interface NavItemConfig {
  id: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  match: (path: string) => boolean;
}

/**
 * Barra do COORDENADOR. DARK. 3 abas (espelha a barra do Infantil, decisão
 * 14/07): Gestão (o painel de monitoramento) · Inteligências (o santuário dos 8
 * mecanismos) · Diário (o diário próprio do coordenador).
 */
const CoordenadorBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Dentro do visor de uma turma, a barra some (foco na leitura da turma).
  if (/^\/coordenador\/turma\/.+/.test(location.pathname)) return null;

  const navItems: NavItemConfig[] = [
    {
      id: 'gestao',
      icon: <LayoutGrid size={22} strokeWidth={1.75} />,
      label: 'Gestão',
      path: '/coordenador',
      match: (p) => p === '/coordenador',
    },
    {
      id: 'inteligencias',
      icon: <Sparkles size={22} strokeWidth={1.75} />,
      label: 'Inteligências',
      path: '/coordenador/inteligencias',
      match: (p) => p.startsWith('/coordenador/inteligencias'),
    },
    {
      id: 'diario',
      icon: <NotebookPen size={22} strokeWidth={1.75} />,
      label: 'Diário',
      path: '/coordenador/diario',
      match: (p) => p.startsWith('/coordenador/diario'),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        backgroundColor: 'rgba(14,16,23,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: `1px solid ${t.line}`,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      }}
    >
      <div className="max-w-lg mx-auto flex items-stretch justify-around">
        {navItems.map((item) => {
          const isActive = item.match(location.pathname);
          const color = isActive ? t.accent2 : t.mut;
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
                style={{ backgroundColor: t.accent2, opacity: isActive ? 1 : 0 }}
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

export default CoordenadorBottomNav;
