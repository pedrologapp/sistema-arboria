import { useProfessor } from '@/contexts/ProfessorContext';
import PerfilAlunoPage from './PerfilAlunoPage';
import PerfilAlunoPageSimplificado from './PerfilAlunoPageSimplificado';

/**
 * Wrapper que escolhe a página de perfil correta baseado no segmento
 * - Infantil e Fundamental 1: versão simplificada (sem casa/missões)
 * - Fundamental 2: versão completa (com casa/missões)
 */
const PerfilAlunoPageWrapper = () => {
  const { segmento } = useProfessor();

  // Infantil e Fundamental 1 usam versão simplificada
  if (segmento === 'infantil' || segmento === 'fundamental1') {
    return <PerfilAlunoPageSimplificado />;
  }

  // Fundamental 2 usa versão completa
  return <PerfilAlunoPage />;
};

export default PerfilAlunoPageWrapper;
