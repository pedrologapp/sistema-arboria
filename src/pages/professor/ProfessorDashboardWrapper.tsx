import { useProfessor } from '@/contexts/ProfessorContext';
import ProfessorDashboard from './ProfessorDashboard';
import ProfessorDashboardSimplificado from './ProfessorDashboardSimplificado';

/**
 * Wrapper que escolhe o dashboard correto baseado no segmento
 * - Infantil e Fundamental 1: versão simplificada (sem missões/entregas)
 * - Fundamental 2: versão completa (com casa/mentor)
 */
const ProfessorDashboardWrapper = () => {
  const { segmento } = useProfessor();

  // Infantil e Fundamental 1 usam versão simplificada
  if (segmento === 'infantil' || segmento === 'fundamental1') {
    return <ProfessorDashboardSimplificado />;
  }

  // Fundamental 2 usa versão completa
  return <ProfessorDashboard />;
};

export default ProfessorDashboardWrapper;
