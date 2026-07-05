import { Navigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import InfantilFasePage from './infantil/InfantilFasePage';
import F1FasePage from './f1/F1FasePage';

/**
 * Rota /professor/fase, existe na navegação do Infantil e do Fundamental 1.
 * Para outros segmentos, redireciona para a home (defensivo).
 */
const FasePageWrapper = () => {
  const { segmento, isLoading } = useProfessor();

  if (isLoading) return null;

  if (segmento === 'infantil') {
    return <InfantilFasePage />;
  }

  if (segmento === 'fundamental1') {
    return <F1FasePage />;
  }

  return <Navigate to="/professor" replace />;
};

export default FasePageWrapper;
