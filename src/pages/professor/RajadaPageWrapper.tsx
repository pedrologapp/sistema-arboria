import { useProfessor } from '@/contexts/ProfessorContext';
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

  if (segmento === 'fundamental1') {
    return <F1RajadaPage />;
  }

  return <InfantilRajadaPage />;
};

export default RajadaPageWrapper;
