import { useProfessor } from '@/contexts/ProfessorContext';
import AlunosPage from './AlunosPage';
import AlunosPageSimplificado from './AlunosPageSimplificado';
import InfantilAlunosPage from './infantil/InfantilAlunosPage';

/**
 * Wrapper que escolhe a página de alunos correta baseado no segmento
 * - Infantil: lista nova (pele clara); reforma 26/06
 * - Fundamental 1: versão simplificada (sem casa/mentor)
 * - Fundamental 2: versão completa (com casa/mentor)
 */
const AlunosPageWrapper = () => {
  const { segmento } = useProfessor();

  if (segmento === 'infantil') {
    return <InfantilAlunosPage />;
  }

  // Fundamental 1 segue na versão simplificada
  if (segmento === 'fundamental1') {
    return <AlunosPageSimplificado />;
  }

  // Fundamental 2 usa versão completa
  return <AlunosPage />;
};

export default AlunosPageWrapper;
