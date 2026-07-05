import { useProfessor } from '@/contexts/ProfessorContext';
import PerfilAlunoPage from './PerfilAlunoPage';
import InfantilAlunoThreadPage from './infantil/InfantilAlunoThreadPage';
import F1AlunoThreadPage from './f1/F1AlunoThreadPage';

/**
 * Wrapper que escolhe a página de perfil correta baseado no segmento
 * - Infantil: thread de observações estilo conversa; reforma 26/06
 * - Fundamental 1: thread de observações (cópia do Infantil com a língua do F1)
 * - Fundamental 2: versão completa (com casa/missões)
 */
const PerfilAlunoPageWrapper = () => {
  const { segmento } = useProfessor();

  if (segmento === 'infantil') {
    return <InfantilAlunoThreadPage />;
  }

  if (segmento === 'fundamental1') {
    return <F1AlunoThreadPage />;
  }

  // Fundamental 2 usa versão completa
  return <PerfilAlunoPage />;
};

export default PerfilAlunoPageWrapper;
