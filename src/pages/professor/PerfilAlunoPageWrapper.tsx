import { useProfessor } from '@/contexts/ProfessorContext';
import PerfilAlunoPage from './PerfilAlunoPage';
import PerfilAlunoPageSimplificado from './PerfilAlunoPageSimplificado';
import InfantilAlunoThreadPage from './infantil/InfantilAlunoThreadPage';

/**
 * Wrapper que escolhe a página de perfil correta baseado no segmento
 * - Infantil: thread de observações estilo conversa; reforma 26/06
 * - Fundamental 1: versão simplificada (sem casa/missões)
 * - Fundamental 2: versão completa (com casa/missões)
 */
const PerfilAlunoPageWrapper = () => {
  const { segmento } = useProfessor();

  if (segmento === 'infantil') {
    return <InfantilAlunoThreadPage />;
  }

  // Fundamental 1 segue na versão simplificada
  if (segmento === 'fundamental1') {
    return <PerfilAlunoPageSimplificado />;
  }

  // Fundamental 2 usa versão completa
  return <PerfilAlunoPage />;
};

export default PerfilAlunoPageWrapper;
