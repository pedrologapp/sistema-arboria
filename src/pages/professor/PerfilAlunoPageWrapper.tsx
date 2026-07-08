import { useProfessor } from '@/contexts/ProfessorContext';
import { F2_REFORMA_ATIVA } from '@/config/f2Reforma';
import PerfilAlunoPage from './PerfilAlunoPage';
import InfantilAlunoThreadPage from './infantil/InfantilAlunoThreadPage';
import F1AlunoThreadPage from './f1/F1AlunoThreadPage';
import F2AlunoThreadPage from './f2/F2AlunoThreadPage';

/**
 * Wrapper que escolhe a página de perfil correta baseado no segmento
 * - Infantil: thread de observações estilo conversa; reforma 26/06
 * - Fundamental 1: thread de observações (cópia do Infantil com a língua do F1)
 * - Fundamental 2 (reforma ligada): mesmo diário claro estilo conversa, língua
 *   do F2 (Casa). Flag DESLIGADO = perfil completo antigo intocado.
 */
const PerfilAlunoPageWrapper = () => {
  const { segmento } = useProfessor();

  if (segmento === 'infantil') {
    return <InfantilAlunoThreadPage />;
  }

  if (segmento === 'fundamental1') {
    return <F1AlunoThreadPage />;
  }

  if (segmento === 'fundamental2' && F2_REFORMA_ATIVA) {
    return <F2AlunoThreadPage />;
  }

  // Fundamental 2 (reforma desligada) usa versão completa antiga
  return <PerfilAlunoPage />;
};

export default PerfilAlunoPageWrapper;
