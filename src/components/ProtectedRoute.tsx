import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  /** Painel Arboria (/arboria): só o dono da plataforma */
  requireSuperAdmin?: boolean;
  /** Visor do Coordenador (/coordenador): só o papel coordenador (leitura, por segmento) */
  requireCoordenador?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false, requireSuperAdmin = false, requireCoordenador = false }: ProtectedRouteProps) => {
  const { user, isAdmin, isSuperAdmin, isCoordenador, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireCoordenador && !isCoordenador) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
