import { useProfessor } from '@/contexts/ProfessorContext';
import AlunosPage from './AlunosPage';
import AlunosPageSimplificado from './AlunosPageSimplificado';

/**
 * Wrapper que escolhe a página de alunos correta baseado no segmento
 * - Infantil e Fundamental 1: versão simplificada (sem casa/mentor)
 * - Fundamental 2: versão completa (com casa/mentor)
 */
const AlunosPageWrapper = () => {
  const { segmento } = useProfessor();

  // Infantil e Fundamental 1 usam versão simplificada
  if (segmento === 'infantil' || segmento === 'fundamental1') {
    return <AlunosPageSimplificado />;
  }

  // Fundamental 2 usa versão completa
  return <AlunosPage />;
};

export default AlunosPageWrapper;
