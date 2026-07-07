import { Navigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { F2_REFORMA_ATIVA } from '@/config/f2Reforma';
import InfantilFasePage from './infantil/InfantilFasePage';
import F1FasePage from './f1/F1FasePage';
import F2InteligenciasPage from './f2/F2InteligenciasPage';

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

  // Fundamental 2 (reforma, atrás do flag): aba Inteligências (placeholder).
  // Com o flag DESLIGADO, mantém o redirecionamento defensivo de hoje.
  if (segmento === 'fundamental2' && F2_REFORMA_ATIVA) {
    return <F2InteligenciasPage />;
  }

  return <Navigate to="/professor" replace />;
};

export default FasePageWrapper;
