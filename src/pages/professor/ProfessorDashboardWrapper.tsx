import { useProfessor } from '@/contexts/ProfessorContext';
import ProfessorDashboard from './ProfessorDashboard';
import InfantilArboriaPage from './infantil/InfantilArboriaPage';
import F1ArboriaPage from './f1/F1ArboriaPage';

/**
 * Wrapper que escolhe o conteúdo da home do professor baseado no segmento
 * - Infantil: aba "Arboria" (cockpit); reforma 26/06
 * - Fundamental 1: aba "Arboria" da Academia (cópia do Infantil com a língua do F1)
 * - Fundamental 2: versão completa (com casa/mentor)
 */
const ProfessorDashboardWrapper = () => {
  const { segmento } = useProfessor();

  if (segmento === 'infantil') {
    return <InfantilArboriaPage />;
  }

  if (segmento === 'fundamental1') {
    return <F1ArboriaPage />;
  }

  // Fundamental 2 usa versão completa
  return <ProfessorDashboard />;
};

export default ProfessorDashboardWrapper;
