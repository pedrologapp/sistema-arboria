import { useProfessor } from '@/contexts/ProfessorContext';
import { F2_REFORMA_ATIVA } from '@/config/f2Reforma';
import AlunosPage from './AlunosPage';
import InfantilAlunosPage from './infantil/InfantilAlunosPage';
import F1AlunosPage from './f1/F1AlunosPage';
import F2AlunosPage from './f2/F2AlunosPage';

/**
 * Wrapper que escolhe a página de alunos correta baseado no segmento
 * - Infantil: lista nova (pele clara); reforma 26/06
 * - Fundamental 1: aba Diário da Academia (cópia do Infantil com a língua do F1)
 * - Fundamental 2 (reforma ligada): Diário claro em 2 passos (escolhe a turma,
 *   depois a lista de alunos). Flag DESLIGADO = versão antiga escura intocada.
 */
const AlunosPageWrapper = () => {
  const { segmento } = useProfessor();

  if (segmento === 'infantil') {
    return <InfantilAlunosPage />;
  }

  if (segmento === 'fundamental1') {
    return <F1AlunosPage />;
  }

  if (segmento === 'fundamental2' && F2_REFORMA_ATIVA) {
    return <F2AlunosPage />;
  }

  // Fundamental 2 (reforma desligada) usa versão completa antiga
  return <AlunosPage />;
};

export default AlunosPageWrapper;
