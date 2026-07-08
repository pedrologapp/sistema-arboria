import { Navigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { F2_REFORMA_ATIVA } from '@/config/f2Reforma';
import InfantilRajadaPage from './infantil/InfantilRajadaPage';
import F1RajadaPage from './f1/F1RajadaPage';

/**
 * Rota /professor/aula ("Iniciar aula" = registro em rajada) por segmento.
 * - Infantil: rajada original
 * - Fundamental 1: rajada da Academia (cópia com a língua do F1)
 * - Outros: fallback pra rajada do Infantil (comportamento anterior da rota)
 */
const RajadaPageWrapper = () => {
  const { segmento } = useProfessor();

  // F2 reformado NÃO tem rajada (não há aba pra ela na F2BottomNav). Por URL
  // direta cairia na rajada do Infantil (língua errada): redireciona pra home.
  if (segmento === 'fundamental2' && F2_REFORMA_ATIVA) {
    return <Navigate to="/professor" replace />;
  }

  if (segmento === 'fundamental1') {
    return <F1RajadaPage />;
  }

  return <InfantilRajadaPage />;
};

export default RajadaPageWrapper;
