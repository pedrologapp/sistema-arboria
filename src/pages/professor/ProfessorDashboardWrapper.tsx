import { useProfessor } from '@/contexts/ProfessorContext';
import { F2_REFORMA_ATIVA } from '@/config/f2Reforma';
import ProfessorDashboard from './ProfessorDashboard';
import InfantilArboriaPage from './infantil/InfantilArboriaPage';
import F1ArboriaPage from './f1/F1ArboriaPage';
import F2ArboriaPage from './f2/F2ArboriaPage';

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

  // Fundamental 2 (reforma, atrás do flag): nova aba Arboria (grade + capa).
  // Com o flag DESLIGADO, o F2 atual (ProfessorDashboard) fica 100% intacto.
  if (segmento === 'fundamental2' && F2_REFORMA_ATIVA) {
    return <F2ArboriaPage />;
  }

  // Fundamental 2 (atual) usa versão completa
  return <ProfessorDashboard />;
};

export default ProfessorDashboardWrapper;
