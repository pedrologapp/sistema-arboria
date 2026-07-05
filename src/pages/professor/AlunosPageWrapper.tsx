import { useProfessor } from '@/contexts/ProfessorContext';
import AlunosPage from './AlunosPage';
import InfantilAlunosPage from './infantil/InfantilAlunosPage';
import F1AlunosPage from './f1/F1AlunosPage';

/**
 * Wrapper que escolhe a página de alunos correta baseado no segmento
 * - Infantil: lista nova (pele clara); reforma 26/06
 * - Fundamental 1: aba Diário da Academia (cópia do Infantil com a língua do F1)
 * - Fundamental 2: versão completa (com casa/mentor)
 */
const AlunosPageWrapper = () => {
  const { segmento } = useProfessor();

  if (segmento === 'infantil') {
    return <InfantilAlunosPage />;
  }

  if (segmento === 'fundamental1') {
    return <F1AlunosPage />;
  }

  // Fundamental 2 usa versão completa
  return <AlunosPage />;
};

export default AlunosPageWrapper;
