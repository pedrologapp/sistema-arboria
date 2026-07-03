import { useProfessor } from '@/contexts/ProfessorContext';
import ProfessorDashboard from './ProfessorDashboard';
import ProfessorDashboardSimplificado from './ProfessorDashboardSimplificado';
import InfantilArboriaPage from './infantil/InfantilArboriaPage';

/**
 * Wrapper que escolhe o conteúdo da home do professor baseado no segmento
 * - Infantil: aba "Arboria" (cockpit); reforma 26/06
 * - Fundamental 1: versão simplificada (sem missões/entregas)
 * - Fundamental 2: versão completa (com casa/mentor)
 */
const ProfessorDashboardWrapper = () => {
  const { segmento } = useProfessor();

  if (segmento === 'infantil') {
    return <InfantilArboriaPage />;
  }

  // Fundamental 1 segue na versão simplificada
  if (segmento === 'fundamental1') {
    return <ProfessorDashboardSimplificado />;
  }

  // Fundamental 2 usa versão completa
  return <ProfessorDashboard />;
};

export default ProfessorDashboardWrapper;
