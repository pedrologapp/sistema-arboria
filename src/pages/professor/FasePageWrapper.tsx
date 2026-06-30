import { Navigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import InfantilFasePage from './infantil/InfantilFasePage';

/**
 * Rota /professor/fase — hoje só existe na navegação do Infantil.
 * Para outros segmentos, redireciona para a home (defensivo).
 */
const FasePageWrapper = () => {
  const { segmento, isLoading } = useProfessor();

  if (isLoading) return null;

  if (segmento === 'infantil') {
    return <InfantilFasePage />;
  }

  return <Navigate to="/professor" replace />;
};

export default FasePageWrapper;
