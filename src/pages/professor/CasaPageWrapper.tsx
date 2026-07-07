import { Navigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { F2_REFORMA_ATIVA } from '@/config/f2Reforma';
import F2CasaPage from './f2/F2CasaPage';

/**
 * Rota /professor/casa: aba "Sua Casa" do Fundamental 2 (reforma, atrás do flag).
 * Fora do F2 com o flag ligado, redireciona para a home (rota aditiva; não existe
 * no F2 atual e não é alcançável pela barra antiga).
 */
const CasaPageWrapper = () => {
  const { segmento, isLoading } = useProfessor();

  if (isLoading) return null;

  if (segmento === 'fundamental2' && F2_REFORMA_ATIVA) {
    return <F2CasaPage />;
  }

  return <Navigate to="/professor" replace />;
};

export default CasaPageWrapper;
