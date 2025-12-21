import { useLocation, useNavigate } from 'react-router-dom';
import { LimelightNav, NavItem } from '@/components/ui/limelight-nav';
import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function AdminMobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      icon: <LayoutDashboard />,
      label: 'Dashboard',
      onClick: () => navigate('/admin'),
    },
    {
      id: 'usuarios',
      icon: <Users />,
      label: 'Usuários',
      onClick: () => navigate('/admin/usuarios'),
    },
    {
      id: 'configuracoes',
      icon: <Settings />,
      label: 'Configurações',
      onClick: () => navigate('/admin/configuracoes'),
    },
    {
      id: 'sair',
      icon: <LogOut />,
      label: 'Sair',
      onClick: async () => {
        await signOut();
        navigate('/login');
      },
    },
  ];

  // Determine which index is active based on the current route
  const getActiveIndex = () => {
    if (location.pathname === '/admin') return 0;
    if (location.pathname.includes('/usuarios')) return 1;
    if (location.pathname.includes('/configuracoes')) return 2;
    return 0;
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <LimelightNav
        items={navItems}
        defaultActiveIndex={getActiveIndex()}
        className="bg-black/90 border-white/10"
      />
    </div>
  );
}
