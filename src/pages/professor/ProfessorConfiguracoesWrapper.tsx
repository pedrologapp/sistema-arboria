import { useProfessor } from '@/contexts/ProfessorContext';
import ProfessorConfiguracoesPage from './ProfessorConfiguracoesPage';
import InfantilConfiguracoesPage from './infantil/InfantilConfiguracoesPage';

/**
 * Configurações do professor por segmento:
 * - Infantil e F1: pele do caderno claro (o F1 usa o mesmo shell claro do
 *   Infantil; a versão escura ficava branca/ilegível ali) + entrada do tutorial.
 * - F2: versão original (tema escuro), intacta.
 */
const ProfessorConfiguracoesWrapper = () => {
  const { segmento } = useProfessor();

  if (segmento === 'infantil' || segmento === 'fundamental1') {
    return <InfantilConfiguracoesPage />;
  }

  return <ProfessorConfiguracoesPage />;
};

export default ProfessorConfiguracoesWrapper;
